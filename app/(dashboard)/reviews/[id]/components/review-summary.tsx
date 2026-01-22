import type { Summary } from '@/lib/features/review/schema';

interface ReviewSummaryProps {
  summary: Summary;
}

export function ReviewSummary({ summary }: ReviewSummaryProps) {
  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      <p className="text-sm">{summary.overallAssessment}</p>

      {summary.positiveAspects && summary.positiveAspects.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium">优点:</p>
          <ul className="mt-2 space-y-1">
            {summary.positiveAspects.map((aspect, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                • {aspect}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.concerns && summary.concerns.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium">问题:</p>
          <ul className="mt-2 space-y-1">
            {summary.concerns.map((concern, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                • {concern}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex gap-4 text-sm">
        <span>严重: {summary.issuesCount.critical}</span>
        <span>主要: {summary.issuesCount.major}</span>
        <span>次要: {summary.issuesCount.minor}</span>
        <span>建议: {summary.issuesCount.suggestion}</span>
      </div>
    </div>
  );
}
