import { getReviewStatistics } from '@/actions/review';
import { Activity, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { ClientDateTime } from '@/components/ui/client-date-time';
import Link from 'next/link';

export default async function DashboardPage() {
  const statsResult = await getReviewStatistics();

  const stats = statsResult.success && statsResult.data ? statsResult.data : {
    totalReviews: 0,
    byStatus: {} as Record<string, number>,
    successRate: 0,
    recentReviews: [],
  };

  const statCards = [
    {
      title: '总审查数',
      value: stats.totalReviews,
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: '成功率',
      value: `${stats.successRate.toFixed(1)}%`,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: '进行中',
      value: stats.byStatus['running'] || 0,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: '失败',
      value: stats.byStatus['failed'] || 0,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">仪表盘</h1>
        <p className="text-muted-foreground">
          AI 代码审查系统概览
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-xl border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="mt-2 text-3xl font-bold">{card.value}</p>
                </div>
                <div className={cn('rounded-lg p-3', card.bgColor)}>
                  <Icon className={cn('h-6 w-6', card.color)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Reviews */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-semibold">最近审查</h2>
        </div>
        <div className="divide-y">
          {stats.recentReviews.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              暂无审查记录
            </div>
          ) : (
            stats.recentReviews.map((review) => (
              <Link
                key={review.id}
                href={`/reviews/${review.id}`}
                className="flex items-center justify-between p-6 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{review.mrTitle}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {review.projectPath} !{review.mrIid}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">状态</p>
                    <p
                      className={cn(
                        'mt-1 text-sm font-medium',
                        review.status === 'completed' && 'text-green-500',
                        review.status === 'failed' && 'text-red-500',
                        review.status === 'running' && 'text-yellow-500',
                      )}
                    >
                      {review.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">触发方式</p>
                    <p className="mt-1 text-sm">{review.triggeredBy}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">时间</p>
                    <p className="mt-1 text-sm">
                      {review.createdAt ? <ClientDateTime date={review.createdAt} mode="absolute" /> : '-'}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">快速操作</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/reviews"
            className="flex items-center justify-center rounded-lg border p-4 hover:bg-muted transition-colors"
          >
            查看所有审查
          </Link>
          <Link
            href="/settings"
            className="flex items-center justify-center rounded-lg border p-4 hover:bg-muted transition-colors"
          >
            系统设置
          </Link>
          <Link
            href="/webhooks"
            className="flex items-center justify-center rounded-lg border p-4 hover:bg-muted transition-colors"
          >
            Webhook 日志
          </Link>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
