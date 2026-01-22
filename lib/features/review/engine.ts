import { eq } from 'drizzle-orm';
import parseDiff from 'parse-diff';
import type { LanguageModelId, Registry } from '@/lib/features/ai';
import type { ReviewConfig } from '@/lib/features/config';
import { getDb, reviews, reviewResults, reviewErrors } from '@/lib/db';
import type { MergeRequestChanges } from '@/types/gitlab';
import { createLogger } from '@/lib/utils/logger';
import { CodeReviewAnalyzer, type AnalysisResult } from './analyzer';
import { formatSummaryComment, formatInlineComment, formatPendingComment, formatErrorComment, type ReviewContext, AI_COMMENT_MARKER } from './prompts';
import type { InlineComment, Summary, Severity } from './schema';
import { filterReviewableFiles, ParsedChunk, ParsedFile } from '../gitlab/review-files';
import { GitLabClient } from '../gitlab/client';

const logger = createLogger('review-engine');

export interface ReviewOptions {
  projectId: number | string;
  mrIid: number;
  skipPatterns?: string[];
  triggeredBy?: 'webhook' | 'manual' | 'command';
  triggerEvent?: string;
  webhookEventId?: number;
}

export interface ReviewResult {
  analysis: AnalysisResult;
  inlineCommentsPosted: number;
  summaryPosted: boolean;
  errors: string[];
}

export class ReviewEngine {
  private analyzer: CodeReviewAnalyzer;

  constructor(
    aiRegistry: Registry,
    private modelId: LanguageModelId,
    private gitlabClient: GitLabClient,
    private reviewConfig: ReviewConfig,
  ) {
    this.analyzer = new CodeReviewAnalyzer(aiRegistry);
  }

  async reviewMergeRequest(options: ReviewOptions): Promise<ReviewResult> {
    const { projectId, mrIid, triggeredBy = 'webhook', triggerEvent, webhookEventId } = options;
    const errors: string[] = [];

    logger.info({ projectId, mrIid }, 'Starting merge request review');

    const mrChanges = await this.gitlabClient.getMergeRequestChanges(projectId, mrIid);
    const commitSha = mrChanges.diff_refs.head_sha;

    const db = getDb();
    const reviewRecord = await db.insert(reviews).values({
      projectId: projectId.toString(),
      projectPath: mrChanges.web_url.split('/').slice(3, 5).join('/'),
      mrIid,
      mrTitle: mrChanges.title,
      mrAuthor: mrChanges.author.username,
      mrDescription: mrChanges.description || null,
      sourceBranch: mrChanges.source_branch,
      targetBranch: mrChanges.target_branch,
      status: 'running',
      triggeredBy,
      triggerEvent,
      webhookEventId,
      startedAt: new Date(),
      retryCount: 0,
    }).returning();

    const insertedReview = reviewRecord[0];

    if (!insertedReview) {
      throw new Error('Failed to create review record');
    }

    const reviewId = insertedReview.id;
    const { summaryNoteId } = await this.cleanupOldComments(projectId, mrIid);

    let statusNoteId: number | null = summaryNoteId;

    try {
      await this.gitlabClient.setCommitStatus(projectId, commitSha, 'running', {
        description: 'AI code review in progress',
      });

      if (!statusNoteId) {
        const note = await this.gitlabClient.postNote(projectId, mrIid, formatPendingComment());

        statusNoteId = note.id;
      } else {
        await this.gitlabClient.updateNote(projectId, mrIid, statusNoteId, formatPendingComment());
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to set initial status');
    }

    const parsedFiles = this.parseChanges(mrChanges);
    const reviewableFiles = filterReviewableFiles(parsedFiles, this.reviewConfig);

    if (reviewableFiles.length === 0) {
      logger.info({ projectId, mrIid }, 'No reviewable files after filtering');

      const reviewSummary: Summary = {
        overallAssessment: 'No reviewable code changes found in this merge request.',
        positiveAspects: [],
        concerns: [],
        issuesCount: { critical: 0, major: 0, minor: 0, suggestion: 0 },
      };

      await this.setFinalStatus(projectId, mrIid, commitSha, statusNoteId, 'success', reviewSummary);

      return {
        analysis: {
          review: {
            inlineComments: [],
            summary: reviewSummary,
          },
          providerUsed: 'none',
          modelUsed: 'none',
          durationMs: 0,
        },
        inlineCommentsPosted: 0,
        summaryPosted: true,
        errors: [],
      };
    }

    const context: ReviewContext = {
      projectName: mrChanges.web_url.split('/').slice(3, 5).join('/'),
      mrTitle: mrChanges.title,
      mrDescription: mrChanges.description || undefined,
      author: mrChanges.author.username,
      sourceBranch: mrChanges.source_branch,
      targetBranch: mrChanges.target_branch,
    };

    let analysis: AnalysisResult;

    try {
      analysis = await this.analyzer.analyze({
        modelId: this.modelId,
        language: this.reviewConfig.language,
        files: reviewableFiles,
        context,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error({ error, projectId, mrIid }, 'AI analysis failed');

      await db.insert(reviewErrors).values({
        reviewId,
        errorType: error instanceof Error ? error.constructor.name : 'Error',
        errorMessage,
        errorStack: error instanceof Error ? error.stack : null,
        retryable: true,
      });

      await db.update(reviews)
        .set({
          status: 'failed',
          lastErrorMessage: errorMessage,
          completedAt: new Date(),
        })
        .where(eq(reviews.id, reviewId));

      await this.setFailedStatus(projectId, commitSha, statusNoteId, mrIid, errorMessage);

      throw error;
    }

    let inlineCommentsPosted = 0;

    if (this.reviewConfig.inlineComments && analysis.review.inlineComments.length > 0) {
      for (const comment of analysis.review.inlineComments) {
        try {
          await this.postInlineComment(
            projectId,
            mrIid,
            mrChanges,
            comment,
            reviewableFiles,
          );
          inlineCommentsPosted++;
        } catch (error) {
          const errorMsg = `Failed to post inline comment on ${comment.file}:${comment.line}: ${error as string}`;

          logger.error({ error, comment }, errorMsg);
          errors.push(errorMsg);
        }
      }
    }

    await db.insert(reviewResults).values({
      reviewId,
      inlineComments: analysis.review.inlineComments,
      summary: analysis.review.summary,
      providerUsed: analysis.providerUsed,
      modelUsed: analysis.modelUsed,
      durationMs: analysis.durationMs,
      inlineCommentsPosted,
      summaryPosted: 1,
    });

    const shouldFail = this.hasIssuesAboveThreshold(analysis.review.summary);
    const state = shouldFail && this.reviewConfig.failureBehavior === 'blocking' ? 'failed' : 'completed';

    await db.update(reviews)
      .set({
        status: state,
        completedAt: new Date(),
      })
      .where(eq(reviews.id, reviewId));

    const gitLabState = state === 'failed' ? 'failed' : 'success';

    await this.setFinalStatus(projectId, mrIid, commitSha, statusNoteId, gitLabState, analysis.review.summary);

    logger.info(
      {
        projectId,
        mrIid,
        inlineCommentsPosted,
        summaryPosted: true,
        errorsCount: errors.length,
        providerUsed: analysis.providerUsed,
      },
      'Merge request review completed',
    );

    return {
      analysis,
      inlineCommentsPosted,
      summaryPosted: true,
      errors,
    };
  }

  private async setFinalStatus(
    projectId: number | string,
    mrIid: number,
    commitSha: string,
    noteId: number | null,
    state: 'success' | 'failed',
    summary: Summary,
  ): Promise<void> {
    const totalIssues = summary.issuesCount.critical + summary.issuesCount.major + summary.issuesCount.minor;
    let description: string;

    if (totalIssues === 0) {
      description = 'No issues found';
    } else if (state === 'failed') {
      description = `Found ${totalIssues} issue(s)`;
    } else {
      description = `⚠️ Found ${totalIssues} issue(s)`;
    }

    try {
      await this.gitlabClient.setCommitStatus(projectId, commitSha, state, { description });
    } catch (error) {
      logger.warn({ error }, 'Failed to set commit status');
    }

    if (this.reviewConfig.summaryComment) {
      try {
        const summaryBody = formatSummaryComment(summary);

        if (noteId) {
          await this.gitlabClient.updateNote(projectId, mrIid, noteId, summaryBody);
        } else {
          await this.gitlabClient.postNote(projectId, mrIid, summaryBody);
        }
      } catch (error) {
        logger.warn({ error }, 'Failed to update summary comment');
      }
    }
  }

  private async setFailedStatus(
    projectId: number | string,
    commitSha: string,
    noteId: number | null,
    mrIid: number,
    errorMessage: string,
  ): Promise<void> {
    const description = `Review failed: ${errorMessage.substring(0, 240)}`;

    try {
      await this.gitlabClient.setCommitStatus(projectId, commitSha, 'failed', { description });
    } catch (error) {
      logger.warn({ error }, 'Failed to set commit status');
    }

    try {
      const errorBody = formatErrorComment(errorMessage);

      if (noteId) {
        await this.gitlabClient.updateNote(projectId, mrIid, noteId, errorBody);
      } else {
        await this.gitlabClient.postNote(projectId, mrIid, errorBody);
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to post error comment');
    }
  }

  private parseChanges(mrChanges: MergeRequestChanges): ParsedFile[] {
    return mrChanges.changes
      .filter(change => change.diff)
      .map((change) => {
        const files = parseDiff(change.diff);
        const file = files[0];

        const chunks: ParsedChunk[] = file
          ? file.chunks.map(chunk => ({
            oldStart: chunk.oldStart,
            oldLines: chunk.oldLines,
            newStart: chunk.newStart,
            newLines: chunk.newLines,
            changes: chunk.changes.map((c) => {
              let lineNumber: number;
              let oldLineNumber: number | undefined;

              if (c.type === 'add') {
                lineNumber = c.ln;
              } else if (c.type === 'del') {
                lineNumber = c.ln;
                oldLineNumber = c.ln;
              } else {
                lineNumber = c.ln2 || c.ln1;
                oldLineNumber = c.ln1;
              }

              return {
                type: c.type,
                content: c.content,
                lineNumber,
                oldLineNumber,
              };
            }),
          }))
          : [];

        return {
          path: change.new_path,
          oldPath: change.renamed_file ? change.old_path : undefined,
          isNew: change.new_file,
          isDeleted: change.deleted_file,
          isRenamed: change.renamed_file,
          chunks,
        };
      });
  }

  private async postInlineComment(
    projectId: number | string,
    mrIid: number,
    mrChanges: MergeRequestChanges,
    comment: InlineComment,
    files: ParsedFile[],
  ): Promise<void> {
    const file = files.find(f => f.path === comment.file);

    if (!file) {
      throw new Error(`File not found: ${comment.file}`);
    }

    const body = formatInlineComment({
      severity: comment.severity,
      message: comment.message,
      suggestedCode: comment.suggestedCode,
    });

    await this.gitlabClient.postInlineComment(
      projectId,
      mrIid,
      body,
      comment.file,
      comment.line,
      {
        base_sha: mrChanges.diff_refs.base_sha,
        head_sha: mrChanges.diff_refs.head_sha,
        start_sha: mrChanges.diff_refs.start_sha,
      },
      true,
      file.oldPath,
    );

    logger.debug(
      { filePath: comment.file, lineNumber: comment.line, severity: comment.severity },
      'Posted inline comment',
    );
  }

  private async cleanupOldComments(
    projectId: number | string,
    mrIid: number,
  ): Promise<{ inlineDeleted: number; summaryNoteId: number | null }> {
    let inlineDeleted = 0;
    let summaryNoteId: number | null = null;

    const discussions = await this.gitlabClient.getDiscussions(projectId, mrIid);

    for (const discussion of discussions) {
      const firstNote = discussion.notes[0];

      if (!firstNote?.body.includes(AI_COMMENT_MARKER)) {
        continue;
      }

      if (discussion.individual_note) {
        summaryNoteId = firstNote.id;
      } else {
        for (const note of discussion.notes) {
          if (note.body.includes(AI_COMMENT_MARKER)) {
            try {
              await this.gitlabClient.deleteDiscussionNote(projectId, mrIid, discussion.id, note.id);
              inlineDeleted++;
            } catch (error) {
              logger.warn({ error, discussionId: discussion.id, noteId: note.id }, 'Failed to delete discussion note');
            }
          }
        }
      }
    }

    logger.info({ projectId, mrIid, inlineDeleted, hasSummary: summaryNoteId !== null }, 'Cleaned up old AI comments');

    return { inlineDeleted, summaryNoteId };
  }

  private hasIssuesAboveThreshold(summary: Summary): boolean {
    const threshold = this.reviewConfig.failureThreshold;
    const severityOrder: Severity[] = ['critical', 'major', 'minor', 'suggestion'];
    const thresholdIndex = severityOrder.indexOf(threshold);

    for (let i = 0; i <= thresholdIndex; i++) {
      const severity = severityOrder[i];

      if (severity && summary.issuesCount[severity] > 0) {
        return true;
      }
    }

    return false;
  }
}
