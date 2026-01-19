// types/ai.ts

import type { ReviewRulesConfig } from './config';

/**
 * AI 提供商类型
 */
export enum AIProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GITHUB = 'github',
  OPENAI_COMPATIBLE = 'openai-compatible',
}

/**
 * AI 代码审查结果
 */
export interface AIReviewResult {
  file: string;
  line: number;
  severity: 'critical' | 'major' | 'minor' | 'suggestion';
  message: string;
  suggestion?: string;
}

/**
 * AI 审查摘要
 */
export interface AIReviewSummary {
  overall: string; // 整体评价
  issues: AIReviewResult[];
  metrics: {
    totalIssues: number;
    criticalCount: number;
    majorCount: number;
    minorCount: number;
    suggestionCount: number;
  };
}

/**
 * AI 模型调用参数
 */
export interface AIModelCallParams {
  model: string; // 格式: "provider:model-name"
  diff: string;
  rules: ReviewRulesConfig;
  maxTokens?: number;
  temperature?: number;
}
