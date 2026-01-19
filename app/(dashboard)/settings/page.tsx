import { getAllSettings } from '@/actions/config';

export default async function SettingsPage() {
  const settingsResult = await getAllSettings();

  if (!settingsResult.success || !settingsResult.config) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">设置</h1>
        <div className="rounded-xl border bg-red-50 p-6 text-red-900">
          加载设置失败: {settingsResult.error}
        </div>
      </div>
    );
  }

  const { config } = settingsResult;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">系统设置</h1>
        <p className="text-muted-foreground">
          配置 AI 代码审查系统
        </p>
      </div>

      {/* Settings Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* GitLab Configuration */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">GitLab 配置</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">GitLab URL</label>
              <p className="mt-1 font-mono text-sm">{config.gitlab.url}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Token</label>
              <p className="mt-1 font-mono text-sm">
                {config.gitlab.token ? '••••••••••••••••' : '未设置'}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Webhook Secret</label>
              <p className="mt-1 font-mono text-sm">
                {config.gitlab.webhookSecret ? '••••••••••••••••' : '未设置'}
              </p>
            </div>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">AI 配置</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">模型</label>
              <p className="mt-1 font-mono text-sm">
                {Array.isArray(config.ai.models) ? config.ai.models.join(', ') : config.ai.models}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Temperature</label>
              <p className="mt-1 text-sm">
                {config.ai.temperature ?? '使用默认值'}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Max Tokens</label>
              <p className="mt-1 text-sm">
                {config.ai.maxTokens ?? '使用默认值'}
              </p>
            </div>
          </div>
        </div>

        {/* Review Configuration */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">审查配置</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">最大文件数</label>
              <p className="mt-1 text-sm">{config.review.maxFiles}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">每文件最大行数</label>
              <p className="mt-1 text-sm">{config.review.maxLinesPerFile}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">语言</label>
              <p className="mt-1 text-sm">{config.review.language ?? '使用默认值'}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">失败行为</label>
              <p className="mt-1 text-sm">{config.review.failureBehavior}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">失败阈值</label>
              <p className="mt-1 text-sm">{config.review.failureThreshold}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">跳过文件</label>
              <p className="mt-1 text-sm">
                {Array.isArray(config.review.skipFiles) ? config.review.skipFiles.join(', ') : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Webhook Configuration */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Webhook 配置</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">MR 事件</label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">启用</span>
                  <span className="text-sm">{config.webhook.mr.enabled ? '是' : '否'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">事件</span>
                  <span className="text-sm">
                    {Array.isArray(config.webhook.mr.events) ? config.webhook.mr.events.join(', ') : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">审查 Draft MR</span>
                  <span className="text-sm">{config.webhook.mr.reviewDrafts ? '是' : '否'}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Note 事件</label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">启用</span>
                  <span className="text-sm">{config.webhook.note.enabled ? '是' : '否'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">命令</span>
                  <span className="text-sm">
                    {Array.isArray(config.webhook.note.commands) ? config.webhook.note.commands.join(', ') : '-'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Push 事件</label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">启用</span>
                  <span className="text-sm">{config.webhook.push.enabled ? '是' : '否'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">分支</span>
                  <span className="text-sm">
                    {Array.isArray(config.webhook.push.branches) && config.webhook.push.branches.length > 0
                      ? config.webhook.push.branches.join(', ')
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
        <p className="text-sm text-blue-900">
          💡 提示：如需修改配置，请通过环境变量或数据库进行配置。
          配置优先级：数据库配置 {'>'} 环境变量。
        </p>
      </div>
    </div>
  );
}
