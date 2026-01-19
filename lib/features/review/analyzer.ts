import { generateWithAgent } from './agent';
import type { LanguageModelId, Registry } from '@/lib/features/ai';
import type { Language } from '@/lib/features/config';
import type { ParsedFile } from '@/lib/features/gitlab';
import { createLogger } from '@/lib/utils/logger';
import { buildSystemPrompt, buildUserPrompt, type ReviewContext } from './prompts';
import { CodeReviewResultSchema, type CodeReviewResult } from './schema';

const logger = createLogger('code-analyzer');

export interface AnalyzeOptions {
  context: ReviewContext;
  modelId: LanguageModelId;
  files: ParsedFile[];
  temperature?: number;
  maxTokens?: number;
  language?: Language;
}

export interface AnalysisResult {
  review: CodeReviewResult;
  providerUsed: string;
  modelUsed: string;
  durationMs: number;
}

export class CodeReviewAnalyzer {
  constructor(private registry: Registry) { }

  async analyze(options: AnalyzeOptions): Promise<AnalysisResult> {
    const { files, context, temperature, maxTokens, language } = options;

    if (files.length === 0) {
      logger.warn('No files to analyze');

      return {
        review: {
          inlineComments: [],
          summary: {
            overallAssessment: 'No reviewable files found in this merge request.',
            positiveAspects: [],
            concerns: [],
            issuesCount: {
              critical: 0,
              major: 0,
              minor: 0,
              suggestion: 0,
            },
          },
        },
        providerUsed: 'none',
        modelUsed: 'none',
        durationMs: 0,
      };
    }

    const systemPrompt = buildSystemPrompt(language);
    const userPrompt = buildUserPrompt(files, context);

    logger.info(
      {
        filesCount: files.length,
        project: context.projectName,
        mrTitle: context.mrTitle,
      },
      'Starting code analysis',
    );

    const startTime = Date.now();
    const model = this.registry.languageModel(options.modelId);

    try {
      const result = await generateWithAgent(model, {
        schema: CodeReviewResultSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature,
        maxTokens,
      });

      const durationMs = Date.now() - startTime;
      const validatedReview = this.validateReview(result, files);

      logger.info(
        {
          provider: model.provider,
          model: model.modelId,
          durationMs,
          inlineCommentsCount: validatedReview.inlineComments.length,
          issuesCount: validatedReview.summary.issuesCount,
        },
        'Code analysis completed',
      );

      return {
        review: validatedReview,
        providerUsed: model.provider,
        modelUsed: model.modelId,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;

      logger.error(
        { error, durationMs, project: context.projectName },
        'Code analysis failed',
      );
      throw error;
    }
  }

  private validateReview(review: CodeReviewResult, files: ParsedFile[]): CodeReviewResult {
    const fileLineRanges = new Map<string, { minLine: number; maxLine: number }>();

    for (const file of files) {
      let minLine = Infinity;
      let maxLine = 0;

      for (const chunk of file.chunks) {
        for (const change of chunk.changes) {
          if (change.type !== 'del' && change.lineNumber !== undefined) {
            minLine = Math.min(minLine, change.lineNumber);
            maxLine = Math.max(maxLine, change.lineNumber);
          }
        }
      }

      if (minLine !== Infinity) {
        fileLineRanges.set(file.path, { minLine, maxLine });
      }
    }

    const validatedComments = review.inlineComments.filter((comment) => {
      const range = fileLineRanges.get(comment.file);

      if (!range) {
        logger.warn(
          { filePath: comment.file },
          'Comment references unknown file, skipping',
        );

        return false;
      }

      const tolerance = 10;

      if (
        comment.line < Math.max(1, range.minLine - tolerance)
        || comment.line > range.maxLine + tolerance
      ) {
        logger.warn(
          { filePath: comment.file, lineNumber: comment.line, range },
          'Comment line number out of range, skipping',
        );

        return false;
      }

      return true;
    });

    const filteredCount = review.inlineComments.length - validatedComments.length;

    if (filteredCount > 0) {
      logger.info({ filteredCount }, 'Filtered invalid comments');
    }

    return {
      ...review,
      inlineComments: validatedComments,
    };
  }
}
