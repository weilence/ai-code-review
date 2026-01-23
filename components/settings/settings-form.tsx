'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSettings } from '@/actions/config';
import type { AppConfig } from '@/lib/features/config/schema';
import { cn } from '@/lib/utils';
import { Loader2, Save } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { FormStatusMessage } from './form-status-message';
import {
  GitLabConfigForm,
  AIConfigForm,
  WebhookConfigForm,
  ReviewConfigForm,
  QueueConfigForm,
} from './sections';

interface SettingsFormProps {
  config: AppConfig;
}

type FormStatus = 'idle' | 'saving' | 'success' | 'error';

/**
 * 配置管理主表单组件
 * 负责协调各配置域子组件，处理表单提交逻辑
 */
export function SettingsForm({ config }: SettingsFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // 配置状态管理
  const [gitlabConfig, setGitlabConfig] = useState(config.gitlab);
  const [aiConfig, setAiConfig] = useState(config.ai);
  const [webhookConfig, setWebhookConfig] = useState(config.webhook);
  const [reviewConfig, setReviewConfig] = useState(config.review);
  const [queueConfig, setQueueConfig] = useState(config.queue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    setErrorMessage('');

    try {
      const values: Record<string, unknown> = {
        // GitLab 配置
        'gitlab.url': gitlabConfig.url?.trim() || 'https://gitlab.com',
        'gitlab.token': gitlabConfig.token?.trim() || '',
        'gitlab.webhookSecret': gitlabConfig.webhookSecret?.trim() || '',

        // AI 配置 - 将模型配置字典转换为 JSON 存储
        'ai.models': JSON.stringify(aiConfig.models || {}),

        // Webhook 配置 - 保存为字符串，让 Zod schema 负责转换
        'webhook.mr.enabled': webhookConfig.mr.enabled ? 'true' : 'false',
        'webhook.mr.events':
          typeof webhookConfig.mr.events === 'string'
            ? webhookConfig.mr.events
            : Array.isArray(webhookConfig.mr.events)
              ? webhookConfig.mr.events.join(', ')
              : 'open, update',
        'webhook.mr.reviewDrafts': webhookConfig.mr.reviewDrafts ? 'true' : 'false',

        'webhook.push.enabled': webhookConfig.push.enabled ? 'true' : 'false',
        'webhook.push.branches':
          typeof webhookConfig.push.branches === 'string'
            ? webhookConfig.push.branches
            : Array.isArray(webhookConfig.push.branches)
              ? webhookConfig.push.branches.join(', ')
              : '',

        'webhook.note.enabled': webhookConfig.note.enabled ? 'true' : 'false',
        'webhook.note.commands':
          typeof webhookConfig.note.commands === 'string'
            ? webhookConfig.note.commands
            : Array.isArray(webhookConfig.note.commands)
              ? webhookConfig.note.commands.join(', ')
              : '/review, /ai-review',

        // Review 配置
        'review.maxFiles': reviewConfig.maxFiles ?? 50,
        'review.maxLinesPerFile': reviewConfig.maxLinesPerFile ?? 1000,
        'review.skipFiles':
          typeof reviewConfig.skipFiles === 'string'
            ? reviewConfig.skipFiles
            : Array.isArray(reviewConfig.skipFiles)
              ? reviewConfig.skipFiles.join(', ')
              : '*.lock, *.min.js, *.min.css',
        'review.language': reviewConfig.language || '简体中文',
        'review.failureBehavior': reviewConfig.failureBehavior || 'non-blocking',
        'review.failureThreshold': reviewConfig.failureThreshold || 'critical',

        // Queue 配置
        'queue.enabled': queueConfig.enabled ? 'true' : 'false',
        'queue.pollingIntervalMs': queueConfig.pollingIntervalMs ?? 5000,
        'queue.maxConcurrentTasks': queueConfig.maxConcurrentTasks ?? 3,
        'queue.taskTimeoutMs': queueConfig.taskTimeoutMs ?? 300000,
        'queue.maxRetries': queueConfig.maxRetries ?? 3,
        'queue.retryBackoffMs': queueConfig.retryBackoffMs ?? 60000,
        'queue.retryBackoffMultiplier': queueConfig.retryBackoffMultiplier ?? 2.0,
        'queue.maxRetryBackoffMs': queueConfig.maxRetryBackoffMs ?? 600000,
        'queue.cleanupIntervalMs': queueConfig.cleanupIntervalMs ?? 3600000,
        'queue.retainCompletedDays': queueConfig.retainCompletedDays ?? 7,
      };

      const result = await updateSettings(values);

      if (result.success) {
        setStatus('success');
        router.refresh();
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setStatus('error');
        setErrorMessage(result.error || '保存失败');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '保存失败');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* GitLab Configuration */}
      <GitLabConfigForm config={gitlabConfig} onChange={setGitlabConfig} />

      {/* AI Configuration */}
      <AIConfigForm config={aiConfig} onChange={setAiConfig} />

      {/* Webhook Configuration */}
      <WebhookConfigForm config={webhookConfig} onChange={setWebhookConfig} />

      {/* Review Configuration */}
      <ReviewConfigForm config={reviewConfig} onChange={setReviewConfig} />

      {/* Queue Configuration */}
      <QueueConfigForm config={queueConfig} onChange={setQueueConfig} />

      {/* Actions */}
      <div className="flex items-center justify-between rounded-xl border bg-card p-6 shadow-sm">
        <FormStatusMessage status={status} errorMessage={errorMessage} />
        <button
          type="submit"
          disabled={status === 'saving'}
          className={cn(
            buttonVariants({ variant: 'default' }),
            'gap-2',
          )}
        >
          {status === 'saving' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              保存配置
            </>
          )}
        </button>
      </div>
    </form>
  );
}
