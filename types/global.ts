import type { GitLabClient } from '@/lib/features/gitlab/client';
import type { ReviewEngine } from '@/lib/features/review/engine';
import type { QueueManager } from '@/lib/features/queue';
import type { Db } from '@/lib/db';

declare global {
  var __GITLAB_CLIENT__: GitLabClient | undefined;
  var __REVIEW_ENGINE__: ReviewEngine | undefined;
  var __QUEUE_MANAGER__: QueueManager | undefined;
  var __DB__: Db | undefined;
}

export {};
