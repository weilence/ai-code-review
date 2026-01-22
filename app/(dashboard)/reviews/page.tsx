import Link from 'next/link';
import { getReviews } from '@/actions/review';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { ClientDateTime } from '@/components/ui/client-date-time';
import type { PageProps } from '@/types/next';
import { getStringParam } from '@/types/next';

export default async function ReviewsPage({
  searchParams,
}: PageProps) {
  // 使用辅助函数获取 search 参数，自动处理数组情况
  const statusParam = await getStringParam(
    searchParams || Promise.resolve({}),
    'status'
  );

  // 只接受有效的状态值
  const validStatuses = ['pending', 'running', 'completed', 'failed'] as const;
  type ValidStatus = typeof validStatuses[number];
  const status = statusParam && validStatuses.includes(statusParam as ValidStatus)
    ? (statusParam as 'pending' | 'running' | 'completed' | 'failed')
    : undefined;

  const result = await getReviews({ status, limit: 50 });

  const reviews = result.success && result.data ? result.data : [];
  const total = result.success && result.total !== undefined ? result.total : 0;

  const statusConfig = {
    pending: { label: '待处理', icon: Clock, color: 'text-gray-500' },
    running: { label: '进行中', icon: AlertCircle, color: 'text-yellow-500' },
    completed: { label: '已完成', icon: CheckCircle2, color: 'text-green-500' },
    failed: { label: '失败', icon: XCircle, color: 'text-red-500' },
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">审查记录</h1>
          <p className="text-muted-foreground">
            共 {total} 条记录
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          <Link
            href="/reviews"
            className={cn(
              'rounded-lg border px-4 py-2 text-sm transition-colors',
              !status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            全部
          </Link>
          {Object.entries(statusConfig).map(([key, config]) => (
            <Link
              key={key}
              href={`/reviews?status=${key}`}
              className={cn(
                'rounded-lg border px-4 py-2 text-sm transition-colors',
                status === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              {config.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="divide-y">
          {reviews.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              暂无审查记录
            </div>
          ) : (
            reviews.map((review) => {
              const config = statusConfig[review.status as keyof typeof statusConfig];
              const StatusIcon = config?.icon || Clock;

              return (
                <Link
                  key={review.id}
                  href={`/reviews/${review.id}`}
                  className="block hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between p-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{review.mrTitle}</h3>
                        <span
                          className={cn(
                            'flex items-center gap-1 text-xs',
                            config?.color,
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {config?.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {review.projectPath} !{review.mrIid}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        分支: {review.sourceBranch} → {review.targetBranch}
                      </p>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">作者</p>
                        <p className="mt-1 text-sm">{review.mrAuthor}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">触发方式</p>
                        <p className="mt-1 text-sm">{review.triggeredBy}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">创建时间</p>
                        <p className="mt-1 text-sm">
                          {review.createdAt ? <ClientDateTime date={review.createdAt} mode="absolute" /> : '-'}
                        </p>
                      </div>

                      {review.completedAt && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">耗时</p>
                          <p className="mt-1 text-sm">
                            {review.startedAt
                              ? `${Math.round((new Date(review.completedAt).getTime() - new Date(review.startedAt).getTime()) / 1000)}s`
                              : '-'}
                          </p>
                        </div>
                      )}

                      <svg
                        className="h-5 w-5 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
