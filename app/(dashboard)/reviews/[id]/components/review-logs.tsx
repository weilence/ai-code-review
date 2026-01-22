import { FileText, AlertTriangle } from 'lucide-react';
import { ClientDateTime } from '@/components/ui/client-date-time';
import { LogResult } from './log-result';
import { LogError } from './log-error';
import type { ReviewLog } from '@/lib/db';

interface ReviewLogsProps {
  logs: ReviewLog[];
}

export function ReviewLogs({ logs }: ReviewLogsProps) {
  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">审查日志</h2>

      {logs.map((log) => (
        <div key={log.id} className="rounded-xl border bg-card p-6 shadow-sm">
          {/* 日志头部 */}
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              {log.logType === 'result' ? (
                <>
                  <FileText className="h-5 w-5 text-green-500" />
                  <span className="font-semibold text-green-600">审查结果</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="font-semibold text-red-600">错误日志</span>
                </>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              <ClientDateTime date={log.createdAt} mode="absolute" />
            </span>
          </div>

          {/* 根据类型展示内容 */}
          {log.logType === 'result' && <LogResult log={log} />}
          {log.logType === 'error' && <LogError log={log} />}
        </div>
      ))}
    </div>
  );
}
