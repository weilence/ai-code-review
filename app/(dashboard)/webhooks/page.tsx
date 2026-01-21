import { desc } from 'drizzle-orm';
import { getDb, webhooks } from '@/lib/db';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock } from 'lucide-react';
import { PayloadViewer } from '@/components/webhooks/payload-viewer';

export default async function WebhooksPage() {
  const db = getDb();
  const webhookList = await db
    .select()
    .from(webhooks)
    .orderBy(desc(webhooks.createdAt))
    .limit(50);

  const eventTypeConfig = {
    mr: { label: 'MR 事件', color: 'text-blue-500' },
    push: { label: 'Push 事件', color: 'text-green-500' },
    note: { label: '评论事件', color: 'text-purple-500' },
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Webhook 监控</h1>
        <p className="text-muted-foreground">
          GitLab Webhook 事件日志
        </p>
      </div>

      {/* Webhooks List */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="divide-y">
          {webhookList.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              暂无 Webhook 日志
            </div>
          ) : (
            webhookList.map((webhook) => {
              const config = eventTypeConfig[webhook.eventType as keyof typeof eventTypeConfig];

              return (
                <div
                  key={webhook.id}
                  className="flex items-center justify-between p-6"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={cn('text-sm font-medium', config?.color)}>
                        {config?.label}
                      </span>
                      {webhook.processed ? (
                        <span className="flex items-center gap-1 text-xs text-green-500">
                          <CheckCircle2 className="h-3 w-3" />
                          已处理
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-yellow-500">
                          <Clock className="h-3 w-3" />
                          未处理
                        </span>
                      )}
                    </div>

                    {webhook.projectId && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        项目 ID: {webhook.projectId}
                      </p>
                    )}

                    {webhook.mrIid && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        MR !{webhook.mrIid}
                      </p>
                    )}

                    <p className="mt-1 text-sm text-muted-foreground">
                      {webhook.createdAt ? new Date(webhook.createdAt).toLocaleString('zh-CN') : '-'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Payload</p>
                    <PayloadViewer payload={webhook.payload} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
