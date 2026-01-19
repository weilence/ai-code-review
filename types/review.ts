// types/review.ts

/**
 * 审查状态
 */
export enum ReviewStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 审查结果详情
 */
export interface ReviewResult {
  inlineComments: number;
  summaryComment: number;
  filesAnalyzed: number;
  linesAnalyzed: number;
  duration: number; // 毫秒
}

/**
 * 审查错误详情
 */
export interface ReviewError {
  message: string;
  stack?: string;
  retryable: boolean;
  timestamp: Date;
}

/**
 * 审查记录（从数据库映射）
 */
export interface Review {
  id: number;
  projectId: number;
  mrIid: number;
  status: ReviewStatus;
  triggeredBy: 'webhook' | 'manual' | 'api';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * 用于创建审查的 DTO
 */
export interface CreateReviewDTO {
  projectId: number;
  mrIid: number;
  sourceBranch: string;
  targetBranch: string;
  triggeredBy: Review['triggeredBy'];
}
