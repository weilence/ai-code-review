// lib/features/gitlab/index.ts
/**
 * GitLab Integration Feature Module
 * 提供 GitLab API 和 Webhook 集成
 */

export { GitLabClient } from './client';
export { filterReviewableFiles, formatDiffForPrompt, type ParsedFile, type ParsedChunk } from './review-files';

// Re-export types
export type {
  GitLabUser,
  GitlabProject,
  MergeRequest,
  MergeRequestChanges,
  FileChange,
  InlineCommentPosition,
  CreateInlineComment,
  GitLabNote,
  GitLabDiscussion,
} from '@/types/gitlab';
