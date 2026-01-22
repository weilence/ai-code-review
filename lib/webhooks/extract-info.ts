/**
 * 从 GitLab Webhook payload 中提取可读信息
 */

import type { GitLabWebhook, MergeRequestWebhook, PushWebhook, NoteWebhook } from './types';

export interface WebhookDisplayInfo {
  // 项目信息
  projectName: string;
  projectPath: string;
  projectUrl: string;

  // 用户信息
  userName: string;
  userAvatar?: string;
  userEmail?: string;

  // GitLab 链接
  gitlabUrl?: string;

  // 事件特定信息
  mrTitle?: string;
  mrAction?: string;
  mrUrl?: string;
  sourceBranch?: string;
  targetBranch?: string;
  ref?: string;
  commitCount?: number;
  beforeSha?: string;
  afterSha?: string;
  noteContent?: string;
  noteType?: string;

  // 原始 payload
  payload: GitLabWebhook;
}

/**
 * 从 webhook payload 提取显示信息
 */
export function extractWebhookInfo(webhook: { objectKind: string; payload: GitLabWebhook }): WebhookDisplayInfo {
  const p = webhook.payload;

  // 通用信息提取
  const project = 'project' in p ? p.project : undefined;
  const user = 'user' in p ? p.user : undefined;

  const baseInfo: WebhookDisplayInfo = {
    projectName: project?.name || 'Unknown',
    projectPath: project?.path_with_namespace || 'Unknown',
    projectUrl: project?.web_url || '#',
    userName: user?.name || ('user_name' in p ? p.user_name : 'Unknown'),
    userAvatar: user?.avatar_url || ('user_avatar' in p ? p.user_avatar : undefined),
    userEmail: user?.email || ('user_email' in p ? p.user_email : undefined),
    payload: p,
  };

  // 根据 object_kind 提取特定信息
  if (webhook.objectKind === 'merge_request' && isMergeRequestWebhook(p)) {
    return {
      ...baseInfo,
      gitlabUrl: p.object_attributes.url,
      mrTitle: p.object_attributes.title,
      mrAction: p.object_attributes.action,
      mrUrl: p.object_attributes.url,
      sourceBranch: p.object_attributes.source_branch,
      targetBranch: p.object_attributes.target_branch,
    };
  }

  if ((webhook.objectKind === 'push' || webhook.objectKind === 'tag_push') && isPushWebhook(p)) {
    // Push 事件链接到最新的 commit 或 tag
    let gitlabUrl: string | undefined;
    if (webhook.objectKind === 'tag_push') {
      // Tag Push 事件链接到 tag
      const tagName = p.ref?.replace('refs/tags/', '');
      gitlabUrl = project?.web_url ? `${project.web_url}/-/tags/${tagName}` : undefined;
    } else {
      // 普通 Push 事件链接到最新 commit
      gitlabUrl = p.after ? `${project?.web_url}/-/commit/${p.after}` : project?.web_url;
    }

    return {
      ...baseInfo,
      gitlabUrl,
      ref: p.ref,
      commitCount: p.total_commits_count,
      beforeSha: p.before?.substring(0, 8),
      afterSha: p.after?.substring(0, 8),
    };
  }

  if (webhook.objectKind === 'note' && isNoteWebhook(p)) {
    const noteContent = p.object_attributes.note || '';
    return {
      ...baseInfo,
      gitlabUrl: p.object_attributes.url,
      noteContent: noteContent.length > 100 ? noteContent.substring(0, 100) + '...' : noteContent,
      noteType: p.object_attributes.noteable_type,
      // Note 事件可能包含关联的 MR 信息
      mrTitle: p.merge_request?.title,
      mrUrl: p.merge_request?.url,
    };
  }

  return baseInfo;
}

// 类型守卫（从 types.ts 重新导出）
function isMergeRequestWebhook(webhook: GitLabWebhook): webhook is MergeRequestWebhook {
  return webhook.object_kind === 'merge_request';
}

function isPushWebhook(webhook: GitLabWebhook): webhook is PushWebhook {
  return webhook.object_kind === 'push';
}

function isNoteWebhook(webhook: GitLabWebhook): webhook is NoteWebhook {
  return webhook.object_kind === 'note';
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;

  return date.toLocaleDateString('zh-CN');
}

/**
 * 格式化绝对时间
 */
export function formatAbsoluteTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 获取 MR 动作中文标签
 */
export function getMrActionLabel(action: string): string {
  const actionMap: Record<string, string> = {
    open: '打开',
    close: '关闭',
    reopen: '重新打开',
    update: '更新',
    approved: '批准',
    unapproved: '取消批准',
    merge: '合并',
  };
  return actionMap[action] || action;
}

/**
 * 获取 Note 类型中文标签
 */
export function getNoteTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    MergeRequest: 'MR 评论',
    Issue: 'Issue 评论',
    Commit: 'Commit 评论',
    Snippet: 'Snippet 评论',
  };
  return typeMap[type] || type;
}
