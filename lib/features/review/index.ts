// lib/features/review/index.ts
/**
 * Review Feature Module
 * 提供代码审查的核心功能
 */

export { ReviewEngine } from './engine';
export { CodeReviewAnalyzer } from './analyzer';

export {
  AI_COMMENT_MARKER,
  buildSystemPrompt,
  buildUserPrompt,
  formatSummaryComment,
  formatInlineComment,
  formatPendingComment,
  formatErrorComment,
} from './prompts';

export type { ReviewContext } from './prompts';

// Re-export types from schema
export type {
  InlineComment,
  Summary,
  CodeReviewResult,
} from './schema';
