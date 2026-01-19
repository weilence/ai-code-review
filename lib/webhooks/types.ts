// GitLab Webhook Payload Types

export interface WebhookUser {
  id: number;
  name: string;
  username: string;
  email?: string;
  avatar_url?: string;
}

export interface WebhookProject {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
  default_branch: string;
  namespace: string;
}

export interface WebhookRepository {
  name: string;
  url: string;
  description?: string;
  homepage?: string;
}

// Merge Request Webhook
export interface MergeRequestAttributes {
  id: number;
  iid: number;
  title: string;
  description?: string;
  state: 'opened' | 'closed' | 'merged' | 'locked';
  source_branch: string;
  target_branch: string;
  source_project_id: number;
  target_project_id: number;
  author_id: number;
  assignee_id?: number;
  work_in_progress: boolean;
  draft?: boolean;
  action: 'open' | 'close' | 'reopen' | 'update' | 'approved' | 'unapproved' | 'merge';
  url: string;
  last_commit?: {
    id: string;
    message: string;
    title: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
    };
  };
}

export interface MergeRequestWebhook {
  object_kind: 'merge_request';
  event_type: 'merge_request';
  user: WebhookUser;
  project: WebhookProject;
  repository: WebhookRepository;
  object_attributes: MergeRequestAttributes;
}

// Push Webhook
export interface PushCommit {
  id: string;
  message: string;
  title: string;
  timestamp: string;
  url: string;
  author: {
    name: string;
    email: string;
  };
  added: string[];
  modified: string[];
  removed: string[];
}

export interface PushWebhook {
  object_kind: 'push';
  event_name: 'push';
  before: string;
  after: string;
  ref: string;
  checkout_sha: string;
  user_id: number;
  user_name: string;
  user_username: string;
  user_email?: string;
  user_avatar?: string;
  project_id: number;
  project: WebhookProject;
  repository: WebhookRepository;
  commits: PushCommit[];
  total_commits_count: number;
}

// Note (Comment) Webhook
export interface NoteAttributes {
  id: number;
  note: string;
  noteable_type: 'MergeRequest' | 'Issue' | 'Commit' | 'Snippet';
  author_id: number;
  project_id: number;
  noteable_id?: number;
  commit_id?: string;
  system: boolean;
  url: string;
  type?: string;
  description?: string;
}

export interface NoteWebhook {
  object_kind: 'note';
  event_type: 'note';
  user: WebhookUser;
  project_id: number;
  project: WebhookProject;
  repository: WebhookRepository;
  object_attributes: NoteAttributes;
  merge_request?: MergeRequestAttributes;
  issue?: {
    id: number;
    iid: number;
    title: string;
    description?: string;
    state: string;
  };
  commit?: {
    id: string;
    message: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
    };
  };
}

// Generic webhook type
export type GitLabWebhook = MergeRequestWebhook | PushWebhook | NoteWebhook;

// Type guards
export function isMergeRequestWebhook(webhook: GitLabWebhook): webhook is MergeRequestWebhook {
  return webhook.object_kind === 'merge_request';
}

export function isPushWebhook(webhook: GitLabWebhook): webhook is PushWebhook {
  return webhook.object_kind === 'push';
}

export function isNoteWebhook(webhook: GitLabWebhook): webhook is NoteWebhook {
  return webhook.object_kind === 'note';
}

// Webhook event metadata
export interface WebhookMeta {
  eventType: string;
  deliveryId?: string;
  timestamp: Date;
  projectId: number;
  projectPath: string;
}

export function extractWebhookMeta(webhook: GitLabWebhook, deliveryId?: string): WebhookMeta {
  return {
    eventType: webhook.object_kind,
    deliveryId,
    timestamp: new Date(),
    projectId: webhook.project.id,
    projectPath: webhook.project.path_with_namespace,
  };
}
