// lib/features/ai/index.ts
/**
 * AI Integration Feature Module
 * 提供 AI 提供商和模型集成
 */

export { AICodeReviewRegistry, type LanguageModelId, type Registry } from './registry';

// GitHub Copilot integration
export { CopilotTokenStorage } from './github-copilot';
export type { CopilotTokenStorage as CopilotTokenStorageType } from './github-copilot';

// Re-export types from types/ai
export type {
  AIProvider,
  AIReviewResult,
  AIReviewSummary,
  AIModelCallParams,
} from '@/types/ai';
