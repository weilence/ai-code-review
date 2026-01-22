import { ReviewSummary } from './review-summary';
import { InlineComments } from './inline-comments';
import type { ReviewLog } from '@/lib/db';

interface LogResultProps {
  log: ReviewLog;
}

export function LogResult({ log }: LogResultProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-sm text-muted-foreground">AI 提供商</p>
          <p className="mt-1 text-sm font-medium">{log.providerUsed || '-'}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">模型</p>
          <p className="mt-1 text-sm font-medium">{log.modelUsed || '-'}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">耗时</p>
          <p className="mt-1 text-sm font-medium">{log.durationMs ? `${log.durationMs}ms` : '-'}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">内联评论数</p>
          <p className="mt-1 text-sm font-medium">{log.inlineCommentsPosted ?? '-'}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">摘要评论</p>
          <p className="mt-1 text-sm font-medium">{log.summaryPosted ? '已发布' : '未发布'}</p>
        </div>
      </div>

      {log.summary && (
        <div className="mt-4">
          <h3 className="mb-3 font-semibold">审查摘要</h3>
          <ReviewSummary summary={log.summary} />
        </div>
      )}

      {log.inlineComments && log.inlineComments.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-3 font-semibold">内联评论 ({log.inlineComments.length})</h3>
          <InlineComments comments={log.inlineComments} />
        </div>
      )}
    </div>
  );
}
