// types/gitlab.ts

import { MergeRequestChangesSchema, MergeRequestDiffSchema } from "@gitbeaker/rest";

/**
 * GitLab API 类型定义
 * 使用 @gitbeaker/core 提供的类型，确保与 GitLab API 同步
 */

// 从 gitbeaker 导入核心 GitLab API 响应类型
export interface GitLabUser {
  id: number;
  name: string;
  username: string;
  email?: string;
  avatar_url?: string;
}

/**
 * Merge Request 变更（包含 diff 信息）
 * 使用 gitbeaker 的 MergeRequestChangesSchema，移除 overflow 字段
 * 并确保关键字段类型正确
 */
export type MergeRequestChanges = Omit<MergeRequestChangesSchema, 'overflow'> & {
  // 确保这些关键字段有明确的类型
  diff_refs: {
    base_sha: string;
    head_sha: string;
    start_sha: string;
  };
  changes: MergeRequestDiffSchema[];
  web_url: string;
  author: {
    id: number;
    username: string;
    name: string;
  };
  // 显式定义 gitbeaker 可能返回 unknown 的字段
  title: string;
  description?: string | null;
  source_branch: string;
  target_branch: string;
};

/**
 * 单个文件的变更
 * 使用 gitbeaker 的 MergeRequestDiffSchema
 */
export type FileChange = MergeRequestDiffSchema;

/**
 * 内联评论位置
 */
export interface InlineCommentPosition {
  position_type: 'text' | 'image';
  base_sha: string;
  head_sha: string;
  start_sha: string;
  old_path?: string;
  new_path: string;
  old_line?: number;
  new_line?: number;
}

/**
 * 发布内联评论的请求
 */
export interface CreateInlineComment {
  note: string;
  position: InlineCommentPosition;
  commitId: string;
}

/**
 * GitLab Note（评论）
 */
export interface GitLabNote {
  id: number;
  body: string;
  author: GitLabUser;
  created_at: string;
  updated_at: string;
  system: boolean;
  noteable_id: number;
  noteable_type: 'MergeRequest' | 'Issue' | 'Commit' | 'Snippet';
  noteable_iid?: number;
  resolvable: boolean;
  resolved?: boolean;
  resolved_by?: GitLabUser;
}

/**
 * GitLab Discussion（讨论）
 */
export interface GitLabDiscussion {
  id: string;
  individual_note: boolean;
  notes: GitLabNote[];
}
