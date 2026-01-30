import type { GitLabClient } from '@/lib/features/gitlab/client';
import type { ReviewEngine } from '@/lib/features/review/engine';
import type { ReviewScheduler } from '@/lib/features/review/scheduler';
import type { Db } from '@/lib/db';

declare global {
  var __GITLAB_CLIENT__: GitLabClient | undefined;
  var __REVIEW_ENGINE__: ReviewEngine | undefined;
  var __REVIEW_SCHEDULER__: ReviewScheduler | undefined;
  var __DB__: Db | undefined;
}

export {};
