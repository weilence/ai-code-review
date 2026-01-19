// types/gitlab.ts

/**
 * GitLab 用户信息
 */
export interface GitLabUser {
  id: number;
  name: string;
  username: string;
  email?: string;
  avatar_url?: string;
}

/**
 * GitLab 项目信息
 */
export interface GitlabProject {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
}

/**
 * Merge Request 基本信息
 */
export interface MergeRequest {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  state: 'opened' | 'closed' | 'merged' | 'locked';
  source_branch: string;
  target_branch: string;
  author: {
    id: number;
    username: string;
    name: string;
  };
  diff_refs: {
    base_sha: string;
    head_sha: string;
    start_sha: string;
  };
  created_at: string;
  updated_at: string;
  web_url: string;
  draft?: boolean;
}

/**
 * Merge Request 变更 Diff
 */
export interface MergeRequestChanges extends MergeRequest {
  changes: FileChange[];
  changes_count: number;
}

/**
 * 单个文件的变更
 */
export interface FileChange {
  old_path: string;
  new_path: string;
  a_mode?: string;
  b_mode?: string;
  diff: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
}

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
