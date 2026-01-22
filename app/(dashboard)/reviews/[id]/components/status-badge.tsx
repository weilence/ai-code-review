import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
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
