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

  const enabled = config.enabled ?? true;
  const pollingIntervalMs = config.pollingIntervalMs?.toString() || '5000';
  const maxConcurrentTasks = config.maxConcurrentTasks?.toString() || '3';
  const taskTimeoutMs = config.taskTimeoutMs?.toString() || '300000';
  const maxRetries = config.maxRetries?.toString() || '3';
  const retryBackoffMs = config.retryBackoffMs?.toString() || '60000';
  const retryBackoffMultiplier = config.retryBackoffMultiplier?.toString() || '2.0';
  const maxRetryBackoffMs = config.maxRetryBackoffMs?.toString() || '600000';
  const cleanupIntervalMs = config.cleanupIntervalMs?.toString() || '3600000';
  const retainCompletedDays = config.retainCompletedDays?.toString() || '7';

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">队列配置</h2>
      <div className="space-y-4">
        {/* 启用/禁用队列系统 */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleChange('enabled', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">启用后台任务队列系统</span>
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            关闭后审查任务将在 webhook 触发时直接执行（不推荐）
          </p>
        </div>

        {/* 基础配置 */}
        <div className="grid gap-4 md:grid-cols-3">
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
          <div>
            <label htmlFor="queue-max-concurrent" className="block text-sm text-muted-foreground">
              最大并发任务数
            </label>
            <input
              id="queue-max-concurrent"
              type="number"
              min="1"
              max="10"
              value={maxConcurrentTasks}
              onChange={(e) => handleChange('maxConcurrentTasks', Number(e.target.value))}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">默认 3 个</p>
          </div>
          <div>
            <label htmlFor="queue-task-timeout" className="block text-sm text-muted-foreground">
              任务超时（毫秒）
            </label>
            <input
              id="queue-task-timeout"
              type="number"
              min="60000"
              step="60000"
              value={taskTimeoutMs}
              onChange={(e) => handleChange('taskTimeoutMs', Number(e.target.value))}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">默认 300000（5分钟）</p>
          </div>
        </div>

        {/* 重试配置 */}
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="queue-max-retries" className="block text-sm text-muted-foreground">
              最大重试次数
            </label>
            <input
              id="queue-max-retries"
              type="number"
              min="0"
              max="10"
              value={maxRetries}
              onChange={(e) => handleChange('maxRetries', Number(e.target.value))}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">默认 3 次</p>
          </div>
          <div>
            <label htmlFor="queue-retry-backoff" className="block text-sm text-muted-foreground">
              重试基础延迟（毫秒）
            </label>
            <input
              id="queue-retry-backoff"
              type="number"
              min="1000"
              step="1000"
              value={retryBackoffMs}
              onChange={(e) => handleChange('retryBackoffMs', Number(e.target.value))}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">默认 60000（60秒）</p>
          </div>
          <div>
            <label htmlFor="queue-retry-multiplier" className="block text-sm text-muted-foreground">
              重试退避乘数
            </label>
            <input
              id="queue-retry-multiplier"
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={retryBackoffMultiplier}
              onChange={(e) => handleChange('retryBackoffMultiplier', Number(e.target.value))}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">默认 2.0 倍</p>
          </div>
        </div>

        {/* 高级配置 */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="queue-max-backoff" className="block text-sm text-muted-foreground">
              最大重试延迟（毫秒）
            </label>
            <input
              id="queue-max-backoff"
              type="number"
              min="60000"
              step="60000"
              value={maxRetryBackoffMs}
              onChange={(e) => handleChange('maxRetryBackoffMs', Number(e.target.value))}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">默认 600000（10分钟）</p>
          </div>
          <div>
            <label htmlFor="queue-cleanup-interval" className="block text-sm text-muted-foreground">
              清理间隔（毫秒）
            </label>
            <input
              id="queue-cleanup-interval"
              type="number"
              min="3600000"
              step="3600000"
              value={cleanupIntervalMs}
              onChange={(e) => handleChange('cleanupIntervalMs', Number(e.target.value))}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">默认 3600000（1小时）</p>
          </div>
        </div>

        <div>
          <label htmlFor="queue-retain-days" className="block text-sm text-muted-foreground">
            保留已完成任务天数
          </label>
          <input
            id="queue-retain-days"
            type="number"
            min="1"
            max="365"
            value={retainCompletedDays}
            onChange={(e) => handleChange('retainCompletedDays', Number(e.target.value))}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">默认 7 天，之后自动清理</p>
        </div>

        {/* 配置说明 */}
        <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <p className="font-semibold mb-1">配置说明：</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>轮询间隔</strong>：队列扫描待处理任务的频率，值越小响应越快但数据库负载越高</li>
            <li><strong>并发任务数</strong>：同时执行的最大任务数，受 AI API 速率限制影响</li>
            <li><strong>任务超时</strong>：单个任务的最大执行时间，超时后自动重试</li>
            <li><strong>重试策略</strong>：使用指数退避算法（60s → 120s → 240s → 480s → 600s）</li>
            <li><strong>清理策略</strong>：定期删除已完成的队列记录以节省数据库空间</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
