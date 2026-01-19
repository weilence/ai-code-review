import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getReview, getReviewResults, getReviewErrors, retryReview } from '@/actions/review';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { label: '待处理', icon: Clock, color: 'text-gray-500 bg-gray-500/10' },
    running: { label: '进行中', icon: AlertCircle, color: 'text-yellow-500 bg-yellow-500/10' },
    completed: { label: '已完成', icon: CheckCircle2, color: 'text-green-500 bg-green-500/10' },
    failed: { label: '失败', icon: XCircle, color: 'text-red-500 bg-red-500/10' },
  };

  const statusConfig = config[status as keyof typeof config] || config.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium', statusConfig.color)}>
      <StatusIcon className="h-3 w-3" />
      {statusConfig.label}
    </span>
  );
}

export default async function ReviewDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const reviewResult = await getReview(id);

  if (!reviewResult.success || !reviewResult.data) {
    notFound();
  }

  const review = reviewResult.data;

  const resultsResult = await getReviewResults(id);
  const results = resultsResult.success ? resultsResult.data : null;

  const errorsResult = await getReviewErrors(id);
  const errors = errorsResult.success && errorsResult.data ? errorsResult.data : [];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/reviews"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回列表
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{review.mrTitle}</h1>
            <StatusBadge status={review.status} />
          </div>
          <p className="mt-2 text-muted-foreground">
            {review.projectPath} !{review.mrIid}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            分支: {review.sourceBranch} → {review.targetBranch}
          </p>
        </div>

        {review.status === 'failed' && (
          <form action={async () => {
            'use server';
            await retryReview(id);
          }}>
            <button
              type="submit"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'gap-2',
              )}
            >
              <RefreshCw className="h-4 w-4" />
              重试
            </button>
          </form>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">作者</p>
          <p className="mt-2 text-lg font-semibold">{review.mrAuthor}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">触发方式</p>
          <p className="mt-2 text-lg font-semibold">{review.triggeredBy}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">创建时间</p>
          <p className="mt-2 text-sm">
            {review.createdAt ? new Date(review.createdAt).toLocaleString('zh-CN') : '-'}
          </p>
        </div>

        {review.completedAt && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">耗时</p>
            <p className="mt-2 text-lg font-semibold">
              {review.startedAt
                ? `${Math.round((new Date(review.completedAt).getTime() - new Date(review.startedAt).getTime()) / 1000)}s`
                : '-'}
            </p>
          </div>
        )}
      </div>

      {/* Review Results */}
      {results && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">审查结果</h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">AI 提供商</p>
              <p className="mt-1">{results.providerUsed}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">模型</p>
              <p className="mt-1">{results.modelUsed}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">耗时</p>
              <p className="mt-1">{results.durationMs}ms</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">内联评论数</p>
              <p className="mt-1">{results.inlineCommentsPosted}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">摘要评论</p>
              <p className="mt-1">{results.summaryPosted ? '已发布' : '未发布'}</p>
            </div>

            {results.summary && (
              <div className="mt-6">
                <h3 className="mb-3 font-semibold">审查摘要</h3>
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm">{results.summary.overallAssessment}</p>

                  {results.summary.positiveAspects.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium">优点:</p>
                      <ul className="mt-2 space-y-1">
                        {results.summary.positiveAspects.map((aspect: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            • {aspect}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.summary.concerns.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium">问题:</p>
                      <ul className="mt-2 space-y-1">
                        {results.summary.concerns.map((concern: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            • {concern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 flex gap-4 text-sm">
                    <span>严重: {results.summary.issuesCount.critical}</span>
                    <span>主要: {results.summary.issuesCount.major}</span>
                    <span>次要: {results.summary.issuesCount.minor}</span>
                    <span>建议: {results.summary.issuesCount.suggestion}</span>
                  </div>
                </div>
              </div>
            )}

            {results.inlineComments && results.inlineComments.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 font-semibold">内联评论 ({results.inlineComments.length})</h3>
                <div className="space-y-2">
                  {results.inlineComments.map((comment, i: number) => (
                    <div key={i} className="rounded-lg border bg-muted/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm">{comment.file}:{comment.line}</span>
                        <span className={cn(
                          'text-xs rounded px-2 py-1',
                          comment.severity === 'critical' && 'bg-red-500/10 text-red-500',
                          comment.severity === 'major' && 'bg-orange-500/10 text-orange-500',
                          comment.severity === 'minor' && 'bg-yellow-500/10 text-yellow-500',
                          comment.severity === 'suggestion' && 'bg-blue-500/10 text-blue-500',
                        )}>
                          {comment.severity}
                        </span>
                      </div>
                      <p className="mt-2 text-sm">{comment.message}</p>
                      {comment.suggestedCode && (
                        <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-xs">
                          <code>{comment.suggestedCode}</code>
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-red-500">错误日志</h2>
          <div className="space-y-3">
            {errors.map((error) => (
              <div key={error.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-900">{error.errorType}</span>
                  <span className="text-xs text-red-600">
                    {error.createdAt ? new Date(error.createdAt).toLocaleString('zh-CN') : '-'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-red-800">{error.errorMessage}</p>
                {error.errorStack && (
                  <pre className="mt-2 overflow-x-auto rounded bg-red-100 p-2 text-xs text-red-900">
                    {error.errorStack}
                  </pre>
                )}
                <span className="mt-2 text-xs text-red-600">
                  可重试: {error.retryable ? '是' : '否'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MR Description */}
      {review.mrDescription && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">MR 描述</h2>
          <div className="prose prose-sm max-w-none">
            <p>{review.mrDescription}</p>
          </div>
        </div>
      )}
    </div>
  );
}
