// lib/review/schema.ts
// 此文件仅保留数据库相关的 Zod schema，业务类型已迁移到 types/

import { z } from 'zod';

// ============================================================================
// Severity levels
// ============================================================================

export const SeveritySchema = z.enum(['critical', 'major', 'minor', 'suggestion']);
export type Severity = z.infer<typeof SeveritySchema>;

// ============================================================================
// Inline Comment
// ============================================================================

export const InlineCommentSchema = z.object({
  file: z.string().describe('File path'),
  line: z.number().describe('Line number in the new file'),
  severity: SeveritySchema,
  message: z.string().describe('What needs to be changed and why'),
  suggestedCode: z.string()
    .describe('The literal replacement code. Only provide if a concrete fix exists.')
    .optional(),
});
export type InlineComment = z.infer<typeof InlineCommentSchema>;

// ============================================================================
// Summary
// ============================================================================

export const SummarySchema = z.object({
  overallAssessment: z.string().describe('Brief overall assessment of the changes'),
  positiveAspects: z.string().array().describe('What looks good (keep it short)'),
  concerns: z.string().array().describe('Issues that should be addressed'),
  issuesCount: z.object({
    critical: z.number(),
    major: z.number(),
    minor: z.number(),
    suggestion: z.number(),
  }),
});
export type Summary = z.infer<typeof SummarySchema>;

// ============================================================================
// Complete Code Review Result
// ============================================================================

export const CodeReviewResultSchema = z.object({
  inlineComments: InlineCommentSchema.array(),
  summary: SummarySchema,
});
export type CodeReviewResult = z.infer<typeof CodeReviewResultSchema>;
