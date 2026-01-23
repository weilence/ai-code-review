'use client';

import type { AppConfig } from '@/lib/features/config/schema';

interface WebhookConfigFormProps {
  config: AppConfig['webhook'];
  onChange: (config: AppConfig['webhook']) => void;
}

export function WebhookConfigForm({ config, onChange }: WebhookConfigFormProps) {
  const handleMrChange = (
    field: 'enabled' | 'reviewDrafts',
    value: boolean
  ) => {
    onChange({
      ...config,
      mr: { ...config.mr, [field]: value }
    });
  };

  const handleMrEventsChange = (value: string) => {
    onChange({
      ...config,
      mr: { ...config.mr, events: value.split(',').map(x => x.trim()).filter(Boolean) }
    });
  };

  const handlePushChange = (
    field: 'enabled',
    value: boolean
  ) => {
    onChange({
      ...config,
      push: { ...config.push, [field]: value }
    });
  };

  const handlePushBranchesChange = (value: string) => {
    onChange({
      ...config,
      push: { ...config.push, branches: value.split(',').map(x => x.trim()).filter(Boolean) }
    });
  };

  const handleNoteChange = (
    field: 'enabled',
    value: boolean
  ) => {
    onChange({
      ...config,
      note: { ...config.note, [field]: value }
    });
  };

  const handleNoteCommandsChange = (value: string) => {
    onChange({
      ...config,
      note: { ...config.note, commands: value.split(',').map(x => x.trim()).filter(Boolean) }
    });
  };

  const mrEvents = Array.isArray(config.mr.events)
    ? config.mr.events.join(', ')
    : config.mr.events || 'open, update';

  const pushBranches = Array.isArray(config.push.branches)
    ? config.push.branches.join(', ')
    : config.push.branches || '';

  const noteCommands = Array.isArray(config.note.commands)
    ? config.note.commands.join(', ')
    : config.note.commands || '/review, /ai-review';

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">Webhook 配置</h2>

      {/* MR Events */}
      <div className="mb-6 space-y-3">
        <h3 className="font-semibold">Merge Request 事件</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.mr.enabled ?? true}
              onChange={(e) => handleMrChange('enabled', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">启用 MR 事件</span>
          </label>
        </div>
        <div>
          <label htmlFor="webhook-mr-events" className="block text-sm text-muted-foreground">
            事件类型（逗号分隔）
          </label>
          <input
            id="webhook-mr-events"
            type="text"
            value={mrEvents}
            onChange={(e) => handleMrEventsChange(e.target.value)}
            placeholder="open, update"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.mr.reviewDrafts ?? false}
            onChange={(e) => handleMrChange('reviewDrafts', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">审查 Draft MR</span>
        </label>
      </div>

      {/* Push Events */}
      <div className="mb-6 space-y-3">
        <h3 className="font-semibold">Push 事件</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.push.enabled ?? false}
              onChange={(e) => handlePushChange('enabled', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">启用 Push 事件</span>
          </label>
        </div>
        <div>
          <label htmlFor="webhook-push-branches" className="block text-sm text-muted-foreground">
            监听分支（逗号分隔，空则监听所有）
          </label>
          <input
            id="webhook-push-branches"
            type="text"
            value={pushBranches}
            onChange={(e) => handlePushBranchesChange(e.target.value)}
            placeholder="main, develop"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>

      {/* Note Events */}
      <div className="space-y-3">
        <h3 className="font-semibold">Note 事件</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.note.enabled ?? true}
              onChange={(e) => handleNoteChange('enabled', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">启用 Note 事件</span>
          </label>
        </div>
        <div>
          <label htmlFor="webhook-note-commands" className="block text-sm text-muted-foreground">
            触发命令（逗号分隔）
          </label>
          <input
            id="webhook-note-commands"
            type="text"
            value={noteCommands}
            onChange={(e) => handleNoteCommandsChange(e.target.value)}
            placeholder="/review, /ai-review"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>
    </div>
  );
}
