import type { ReviewLog } from '@/lib/db';

interface LogErrorProps {
  log: ReviewLog;
}

export function LogError({ log }: LogErrorProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-red-900">{log.errorType || '未知错误'}</span>
        <span className="text-xs text-red-600">
          可重试: {log.retryable ? '是' : '否'}
        </span>
      </div>
      <p className="text-sm text-red-800">{log.errorMessage}</p>
      {log.errorStack && (
        <pre className="mt-3 overflow-x-auto rounded bg-red-100 p-3 text-xs text-red-900">
          {log.errorStack}
        </pre>
      )}
    </div>
  );
}
