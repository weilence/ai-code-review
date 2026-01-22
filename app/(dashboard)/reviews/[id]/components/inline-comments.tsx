import { cn } from '@/lib/utils';
import type { InlineComment } from '@/lib/features/review/schema';

interface InlineCommentsProps {
  comments: InlineComment[];
}

export function InlineComments({ comments }: InlineCommentsProps) {
  return (
    <div className="space-y-2">
      {comments.map((comment, i) => (
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
  );
}
