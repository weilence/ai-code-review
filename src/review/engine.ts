import type { AIProviderRegistry } from '../ai/registry';
import type { GitLabClient } from '../gitlab/client';
import parseDiff from 'parse-diff';
import { filterReviewableFiles, type ParsedFile, type ParsedChunk } from '../gitlab/review-files';
import type { GitLabMergeRequestChanges } from '../gitlab/types';
import { CodeReviewAnalyzer, type AnalysisResult } from './analyzer';
import { formatSummaryComment, formatInlineComment, formatPendingComment, formatErrorComment, type ReviewContext, AI_COMMENT_MARKER } from './prompts';
import type { InlineComment, Summary, Severity } from './schema';
import type { ReviewConfig } from '../config/schema';
import { createLogger } from '../utils/logger';

const logger = createLogger('review-engine');

export interface ReviewOptions {
  projectId: number | string;
  mrIid: number;
  skipPatterns?: string[];
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
    private gitlabClient: GitLabClient,
    private aiRegistry: AIProviderRegistry,
    private reviewConfig: ReviewConfig,
  ) {
    this.analyzer = new CodeReviewAnalyzer(aiRegistry);
  }

  async reviewMergeRequest(options: ReviewOptions): Promise<ReviewResult> {
    const { projectId, mrIid } = options;
    const errors: string[] = [];

    logger.info({ projectId, mrIid }, 'Starting merge request review');

    const mrChanges = await this.gitlabClient.getMergeRequestChanges(projectId, mrIid);
    const commitSha = mrChanges.diff_refs.head_sha;

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

      await this.setFinalStatus(projectId, mrIid, commitSha, statusNoteId, 'success', {
        overallAssessment: 'No reviewable code changes found in this merge request.',
        positiveAspects: [],
        concerns: [],
        recommendations: [],
        criticalIssuesCount: 0,
        majorIssuesCount: 0,
        minorIssuesCount: 0,
        suggestionsCount: 0,
      }, mrChanges);

      return {
        analysis: {
          review: {
            inlineComments: [],
            summary: {
              overallAssessment: 'No reviewable code changes found in this merge request.',
              positiveAspects: [],
              concerns: [],
              recommendations: [],
              criticalIssuesCount: 0,
              majorIssuesCount: 0,
              minorIssuesCount: 0,
              suggestionsCount: 0,
            },
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
        files: reviewableFiles,
        context,
        language: this.reviewConfig.language,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error({ error, projectId, mrIid }, 'AI analysis failed');

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

    const shouldFail = this.hasIssuesAboveThreshold(analysis.review.summary);
    const state = shouldFail && this.reviewConfig.failureBehavior === 'blocking' ? 'failed' : 'success';

    await this.setFinalStatus(projectId, mrIid, commitSha, statusNoteId, state, analysis.review.summary, mrChanges);

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
    mrChanges: GitLabMergeRequestChanges,
  ): Promise<void> {
    const context: ReviewContext = {
      projectName: mrChanges.web_url.split('/').slice(3, 5).join('/'),
      mrTitle: mrChanges.title,
      mrDescription: mrChanges.description || undefined,
      author: mrChanges.author.username,
      sourceBranch: mrChanges.source_branch,
      targetBranch: mrChanges.target_branch,
    };

    const totalIssues = summary.criticalIssuesCount + summary.majorIssuesCount + summary.minorIssuesCount;
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
        const summaryBody = formatSummaryComment(summary, context);

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

  private parseChanges(mrChanges: GitLabMergeRequestChanges): ParsedFile[] {
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
    mrChanges: GitLabMergeRequestChanges,
    comment: InlineComment,
    files: ParsedFile[],
  ): Promise<void> {
    const file = files.find(f => f.path === comment.file);

    if (!file) {
      throw new Error(`File not found: ${comment.file}`);
    }

    const body = formatInlineComment({
      severity: comment.severity,
      category: comment.category,
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
        baseSha: mrChanges.diff_refs.base_sha,
        headSha: mrChanges.diff_refs.head_sha,
        startSha: mrChanges.diff_refs.start_sha,
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

    const counts: Record<Severity, number> = {
      critical: summary.criticalIssuesCount,
      major: summary.majorIssuesCount,
      minor: summary.minorIssuesCount,
      suggestion: summary.suggestionsCount,
    };

    for (let i = 0; i <= thresholdIndex; i++) {
      const severity = severityOrder[i];

      if (severity && counts[severity] > 0) {
        return true;
      }
    }

    return false;
  }
}
