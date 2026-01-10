import type { AIProviderRegistry } from '../ai/registry';
import type { GitLabClient } from '../gitlab/client';
import parseDiff from 'parse-diff';
import { filterReviewableFiles, type ParsedFile, type ParsedChunk } from '../gitlab/review-files';
import type { GitLabMergeRequestChanges } from '../gitlab/types';
import { CodeReviewAnalyzer, type AnalysisResult } from './analyzer';
import { formatSummaryComment, formatInlineComment, type ReviewContext } from './prompts';
import type { InlineComment } from './schema';
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

    // Fetch MR changes from GitLab
    const mrChanges = await this.gitlabClient.getMergeRequestChanges(projectId, mrIid);

    // Parse and filter files
    const parsedFiles = this.parseChanges(mrChanges);
    const reviewableFiles = filterReviewableFiles(parsedFiles, this.reviewConfig);

    if (reviewableFiles.length === 0) {
      logger.info({ projectId, mrIid }, 'No reviewable files after filtering');

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
        summaryPosted: false,
        errors: [],
      };
    }

    // Build review context
    const context: ReviewContext = {
      projectName: mrChanges.web_url.split('/').slice(3, 5).join('/'),
      mrTitle: mrChanges.title,
      mrDescription: mrChanges.description || undefined,
      author: mrChanges.author.username,
      sourceBranch: mrChanges.source_branch,
      targetBranch: mrChanges.target_branch,
    };

    // Run AI analysis
    const analysis = await this.analyzer.analyze({
      files: reviewableFiles,
      context,
    });

    let inlineCommentsPosted = 0;
    let summaryPosted = false;

    // Post inline comments if enabled
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

    // Post summary comment if enabled
    if (this.reviewConfig.summaryComment) {
      try {
        const summaryBody = formatSummaryComment(analysis.review.summary, context);

        await this.gitlabClient.postNote(projectId, mrIid, summaryBody);
        summaryPosted = true;
        logger.info({ projectId, mrIid }, 'Posted summary comment');
      } catch (error) {
        const errorMsg = `Failed to post summary comment: ${error as string}`;

        logger.error({ error }, errorMsg);
        errors.push(errorMsg);
      }
    }

    logger.info(
      {
        projectId,
        mrIid,
        inlineCommentsPosted,
        summaryPosted,
        errorsCount: errors.length,
        providerUsed: analysis.providerUsed,
      },
      'Merge request review completed',
    );

    return {
      analysis,
      inlineCommentsPosted,
      summaryPosted,
      errors,
    };
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
      suggestion: comment.suggestion,
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
}
