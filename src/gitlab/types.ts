// GitLab API Types

export interface GitLabUser {
  id: number;
  name: string;
  username: string;
  email?: string;
  avatar_url?: string;
}

export interface GitLabDiffRefs {
  base_sha: string;
  head_sha: string;
  start_sha: string;
}

export interface GitLabMergeRequest {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: 'opened' | 'closed' | 'merged' | 'locked';
  source_branch: string;
  target_branch: string;
  author: GitLabUser;
  diff_refs: GitLabDiffRefs;
  web_url: string;
  draft?: boolean;
}

export interface GitLabChange {
  old_path: string;
  new_path: string;
  a_mode: string;
  b_mode: string;
  diff: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
}

export interface GitLabMergeRequestChanges extends GitLabMergeRequest {
  changes: GitLabChange[];
  changes_count: number;
}

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

export interface GitLabDiscussion {
  id: string;
  individual_note: boolean;
  notes: GitLabNote[];
}

export interface GitLabPosition {
  position_type: 'text' | 'image';
  base_sha: string;
  head_sha: string;
  start_sha: string;
  old_path?: string;
  new_path: string;
  old_line?: number;
  new_line?: number;
}
