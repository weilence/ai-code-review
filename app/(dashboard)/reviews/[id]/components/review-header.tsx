import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { StatusBadge } from './status-badge';
import type { Review } from '@/lib/db';

interface ReviewHeaderProps {
  review: Review;
  onRetry?: () => Promise<void>;
}

export function ReviewHeader({ review, onRetry }: ReviewHeaderProps) {
  return (
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

      {review.status === 'failed' && onRetry && (
        <form action={onRetry}>
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
  );
}
