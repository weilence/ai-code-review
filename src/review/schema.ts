import { z } from 'zod';

// Severity levels for review comments
export const SeveritySchema = z.enum(['critical', 'major', 'minor', 'suggestion']);
export type Severity = z.infer<typeof SeveritySchema>;

// Categories for review issues
export const CategorySchema = z.enum([
  'bug',
  'security',
  'performance',
  'maintainability',
  'style',
  'best-practice',
  'documentation',
  'error-handling',
  'testing',
]);
export type Category = z.infer<typeof CategorySchema>;

// Single inline comment
export const InlineCommentSchema = z.object({
  file: z.string(),
  line: z.number(),
  severity: SeveritySchema,
  category: CategorySchema,
  message: z.string(),
  suggestion: z.string(),
});
export type InlineComment = z.infer<typeof InlineCommentSchema>;

// Summary of the review
export const SummarySchema = z.object({
  overallAssessment: z.string(),
  positiveAspects: z.string().array(),
  concerns: z.string().array(),
  recommendations: z.string().array(),
  criticalIssuesCount: z.number(),
  majorIssuesCount: z.number(),
  minorIssuesCount: z.number(),
  suggestionsCount: z.number(),
});
export type Summary = z.infer<typeof SummarySchema>;

// Complete code review result
export const CodeReviewResultSchema = z.object({
  inlineComments: InlineCommentSchema.array(),
  summary: SummarySchema,
});
export type CodeReviewResult = z.infer<typeof CodeReviewResultSchema>;

// Simplified review for smaller diffs
export const SimpleReviewResultSchema = z.object({
  comments: z.array(
    z.object({
      file: z.string(),
      line: z.number(),
      message: z.string(),
      severity: SeveritySchema,
    }),
  ),
  summary: z.string(),
});
export type SimpleReviewResult = z.infer<typeof SimpleReviewResultSchema>;
