import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { getWebhooks, deleteWebhook, clearAllWebhooks } from '@/actions/webhook';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  GitBranch,
  GitCommit,
  MessageSquare,
  User,
  GitMerge,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { PayloadViewer } from '@/components/webhooks/payload-viewer';
import { Pagination } from '@/components/ui/pagination';
import { ClientDateTime } from '@/components/ui/client-date-time';
import { buttonVariants } from '@/components/ui/button';
import { DeleteButton } from '@/components/ui/delete-button';
import type { PageProps } from '@/types/next';
import { getNumberParam } from '@/types/next';
import {
  extractWebhookInfo,
  getMrActionLabel,
  getNoteTypeLabel,
} from '@/lib/webhooks/extract-info';

export default async function WebhooksPage({ searchParams }: PageProps) {
  // 从 URL 获取分页参数
  const params = await searchParams || {};
  const limit = (await getNumberParam(Promise.resolve(params), 'limit')) || 50;
  const offset = (await getNumberParam(Promise.resolve(params), 'offset')) || 0;

  const result = await getWebhooks({ limit, offset });

  const webhooksList = result.success && result.data ? result.data : [];
  const total = result.success && result.total !== undefined ? result.total : 0;

  // 根据 objectKind 确定事件类型配置
  function getEventTypeConfig(objectKind: string) {
    if (objectKind === 'merge_request') {
      return { label: 'MR 事件', color: 'text-blue-500', icon: GitMerge };
    }
    if (objectKind === 'tag_push') {
      return { label: 'Tag 推送', color: 'text-green-500', icon: GitCommit };
    }
    if (objectKind === 'push') {
      return { label: 'Push 事件', color: 'text-green-500', icon: GitCommit };
    }
    if (objectKind === 'note') {
      return { label: '评论事件', color: 'text-purple-500', icon: MessageSquare };
    }
    return { label: objectKind, color: 'text-gray-500', icon: Clock };
  }

  const reviewStatusConfig = {
    pending: { label: '待处理', color: 'text-gray-500', icon: Clock },
    running: { label: '进行中', color: 'text-yellow-500', icon: AlertCircle },
    completed: { label: '已完成', color: 'text-green-500', icon: CheckCircle2 },
    failed: { label: '失败', color: 'text-red-500', icon: XCircle },
  };

  // 获取统一的处理状态配置（基于 review 状态）
  function getProcessingStatus(webhook: typeof webhooksList[0]) {
    // 没有 review → 未处理
    if (!webhook.review) {
      return { label: '未处理', color: 'text-yellow-500', icon: Clock };
    }
    // 有 review → 使用 review 的状态
    const reviewStatus = webhook.review.status as keyof typeof reviewStatusConfig;
    return reviewStatusConfig[reviewStatus] || reviewStatusConfig.pending;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div suppressHydrationWarning>
          <h1 className="text-3xl font-bold">Webhook 监控</h1>
          <p className="text-muted-foreground" >
            共 {total} 条日志
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <form
            action={async () => {
              'use server';
              await clearAllWebhooks();
              revalidatePath('/webhooks');
            }}
          >
            <button
              type="submit"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'gap-2 text-red-600 hover:text-red-700',
              )}
            >
              <Trash2 className="h-4 w-4" />
              清空所有
            </button>
          </form>
        </div>
      </div>

      {/* Webhooks List */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="divide-y">
          {webhooksList.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              暂无 Webhook 日志
            </div>
          ) : (
            webhooksList.map((webhook) => {
              const config = getEventTypeConfig(webhook.objectKind);
              const EventIcon = config.icon;
              const info = extractWebhookInfo(webhook);

              return (
                <div
                  key={webhook.id}
                  className="group flex items-center justify-between gap-4 p-6 hover:bg-muted/30 transition-colors"
                >
                  {/* 左侧：主要信息 */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* 事件类型 */}
                    <span className={cn('flex items-center gap-1.5 text-sm font-medium shrink-0', config?.color)}>
                      <EventIcon className="h-4 w-4" />
                      {config?.label}
                    </span>

                    {/* 处理状态（统一基于 review 状态） */}
                    {(() => {
                      const statusConfig = getProcessingStatus(webhook);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <span className={cn('flex items-center gap-1 text-xs shrink-0', statusConfig.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                      );
                    })()}

                    {/* 项目路径 */}
                    <a
                      href={info.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      {info.projectPath}
                      <ExternalLink className="h-3 w-3" />
                    </a>

                    {/* 触发用户 */}
                    <div className="flex items-center gap-2 text-sm shrink-0">
                      {info.userAvatar && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={info.userAvatar}
                          alt={info.userName}
                          className="h-5 w-5 rounded-full"
                        />
                      )}
                      <span className="text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {info.userName}
                      </span>
                    </div>

                    {/* 事件特定信息 - MR */}
                    {webhook.objectKind === 'merge_request' && info.mrTitle && (
                      <div className="flex items-center gap-2 text-sm truncate">
                        {info.gitlabUrl && (
                          <a
                            href={info.gitlabUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            title="在 GitLab 中查看"
                          >
                            <GitMerge className="h-4 w-4" />
                          </a>
                        )}
                        <span className="font-medium truncate">{info.mrTitle}</span>
                        {info.mrAction && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                            {getMrActionLabel(info.mrAction)}
                          </span>
                        )}
                        {info.sourceBranch && info.targetBranch && (
                          <span className="text-muted-foreground shrink-0">
                            <GitBranch className="h-3 w-3 inline" />
                            <span className="font-mono text-xs ml-1">{info.sourceBranch} → {info.targetBranch}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* 事件特定信息 - Push */}
                    {(webhook.objectKind === 'push' || webhook.objectKind === 'tag_push') && info.ref && (
                      <div className="flex items-center gap-2 text-sm">
                        {info.gitlabUrl && (
                          <a
                            href={info.gitlabUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            title="在 GitLab 中查看"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {/* Tag Push 显示标签名，Push 显示分支名 */}
                        <span className="font-mono">
                          {webhook.objectKind === 'tag_push'
                            ? info.ref.replace('refs/tags/', '')
                            : info.ref.replace('refs/heads/', '')
                          }
                        </span>
                        {webhook.objectKind === 'tag_push' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            标签
                          </span>
                        )}
                        {info.commitCount !== undefined && webhook.objectKind === 'push' && (
                          <span className="text-muted-foreground">
                            · {info.commitCount} 个提交
                          </span>
                        )}
                        {(info.beforeSha || info.afterSha) && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {info.beforeSha && <span>{info.beforeSha}</span>}
                            {(info.beforeSha && info.afterSha) && <span> → </span>}
                            {info.afterSha && <span>{info.afterSha}</span>}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 事件特定信息 - Note */}
                    {webhook.objectKind === 'note' && (info.noteType || info.mrTitle) && (
                      <div className="flex items-center gap-2 text-sm">
                        {info.gitlabUrl && (
                          <a
                            href={info.gitlabUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            title="在 GitLab 中查看"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </a>
                        )}
                        {info.noteType && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 shrink-0">
                            {getNoteTypeLabel(info.noteType)}
                          </span>
                        )}
                        {info.mrTitle && (
                          <span className="text-muted-foreground truncate">
                            {info.mrTitle}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 右侧：时间 + 审查关联 + Payload + 删除按钮 */}
                  <div className="flex items-center gap-6 shrink-0">
                    {/* 时间信息 */}
                    <div className="text-sm">
                      <ClientDateTime date={webhook.createdAt} mode="relative" className="text-muted-foreground" />
                    </div>

                    {/* 审查关联 */}
                    {webhook.review && (
                      <Link
                        href={`/reviews/${webhook.review.id}`}
                        className="flex items-center gap-2 text-sm group hover:text-foreground transition-colors"
                      >
                        <span className="text-muted-foreground">审查 #{webhook.review.id}</span>
                        {webhook.review.completedAt && webhook.review.startedAt && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round((webhook.review.completedAt.getTime() - webhook.review.startedAt.getTime()) / 1000)}s
                          </span>
                        )}
                      </Link>
                    )}

                    {/* Payload */}
                    <PayloadViewer payload={webhook.payload} />

                    {/* 删除按钮 */}
                    <DeleteButton
                      action={async () => {
                        'use server';
                        return await deleteWebhook(webhook.id);
                      }}
                      confirmMessage="确定要删除这条 webhook 日志吗？"
                      redirectTo="/webhooks"
                      className="opacity-0 group-hover:opacity-100"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 分页 */}
      {total > 0 && (
        <Pagination
          total={total}
          limit={limit}
          offset={offset}
          baseUrl="/webhooks"
        />
      )}
    </div>
  );
}
