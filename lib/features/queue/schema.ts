/**
 * Queue feature - Type definitions and interfaces
 */

// ============================================================================
// Queue Task Types
// ============================================================================

export type QueueTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TriggeredBy = 'webhook' | 'manual' | 'command';
export type ErrorType = 'transient' | 'rate-limit' | 'permanent' | 'unknown';

// ============================================================================
// Enqueue Options
// ============================================================================

export interface EnqueueOptions {
  projectId: number | string;
  mrIid: number;
  projectPath?: string;
  mrTitle?: string;
  mrAuthor?: string;
  mrDescription?: string;
  sourceBranch?: string;
  targetBranch?: string;
  priority?: number; // 1-10, 1=highest
  scheduledAt?: Date;
  triggeredBy: TriggeredBy;
  triggerEvent?: string;
  webhookEventId?: number;
}

// ============================================================================
// Execution Result
// ============================================================================

export interface ExecutionResult {
  success: boolean;
  taskId: number;
  reviewId?: number;
  error?: Error;
  durationMs: number;
}

// ============================================================================
// Queue Statistics
// ============================================================================

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface WorkerStats {
  workerId: string;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  startTime: Date;
}

// ============================================================================
// Queue Configuration
// ============================================================================

export interface QueueConfig {
  enabled: boolean;
  pollingIntervalMs: number;
  maxConcurrentTasks: number;
  taskTimeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
  retryBackoffMultiplier: number;
  maxRetryBackoffMs: number;
  cleanupIntervalMs: number;
  retainCompletedDays: number;
}
