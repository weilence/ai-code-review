'use client';

import type { DBConfig } from '@/lib/features/config/schema';

interface QueueConfigFormProps {
  config: DBConfig['queue'];
  onChange: (config: DBConfig['queue']) => void;
}

export function QueueConfigForm({ config, onChange }: QueueConfigFormProps) {
  const handleChange = <K extends keyof DBConfig['queue']>(
    field: K,
    value: DBConfig['queue'][K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  const pollingIntervalMs = config.pollingIntervalMs?.toString() || '5000';

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">队列配置</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="queue-polling-interval" className="block text-sm text-muted-foreground">
            轮询间隔（毫秒）
          </label>
          <input
            id="queue-polling-interval"
            type="number"
            min="1000"
            step="1000"
            value={pollingIntervalMs}
            onChange={(e) => handleChange('pollingIntervalMs', Number(e.target.value))}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">默认 5000（5秒）</p>
        </div>

        {/* 配置说明 */}
        <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <p className="font-semibold mb-1">配置说明：</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>轮询间隔</strong>：队列扫描待处理任务的频率，值越小响应越快但数据库负载越高</li>
            <li>当前使用单线程串行调度模式，确保任务按顺序执行</li>
            <li>任务失败后不会自动重试，需要用户手动点击重试按钮</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
