import { ClientDateTime } from '@/components/ui/client-date-time';
import type { Review } from '@/lib/db';

interface InfoCardsProps {
  review: Review;
}

export function InfoCards({ review }: InfoCardsProps) {
  return (
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
          {review.createdAt ? <ClientDateTime date={review.createdAt} mode="absolute" /> : '-'}
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
  );
}
