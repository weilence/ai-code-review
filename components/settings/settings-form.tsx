'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSettings } from '@/actions/config';
import type { DBConfig } from '@/lib/features/config/schema';
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
  config: DBConfig;
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
      // 新格式：直接传递分组对象
      const groupedValues: Partial<DBConfig> = {
        gitlab: {
          url: gitlabConfig.url?.trim() || 'https://gitlab.com',
          token: gitlabConfig.token?.trim() || '',
          webhookSecret: gitlabConfig.webhookSecret?.trim() || '',
        },
        ai: {
          models: aiConfig.models || {},
        },
        webhook: {
          mr: {
            enabled: webhookConfig.mr.enabled,
            events: ensureArray(webhookConfig.mr.events),
            reviewDrafts: webhookConfig.mr.reviewDrafts,
          },
          push: {
            enabled: webhookConfig.push.enabled,
            branches: ensureArray(webhookConfig.push.branches),
          },
          note: {
            enabled: webhookConfig.note.enabled,
            commands: ensureArray(webhookConfig.note.commands),
          },
        },
        review: {
          maxFiles: reviewConfig.maxFiles ?? 50,
          maxLinesPerFile: reviewConfig.maxLinesPerFile ?? 1000,
          skipFiles: ensureArray(reviewConfig.skipFiles),
          language: reviewConfig.language,
          failureBehavior: reviewConfig.failureBehavior ?? 'non-blocking',
          failureThreshold: reviewConfig.failureThreshold ?? 'critical',
        },
        queue: {
          enabled: queueConfig.enabled ?? true,
          pollingIntervalMs: queueConfig.pollingIntervalMs ?? 5000,
          maxConcurrentTasks: queueConfig.maxConcurrentTasks ?? 3,
          taskTimeoutMs: queueConfig.taskTimeoutMs ?? 300000,
          maxRetries: queueConfig.maxRetries ?? 3,
          retryBackoffMs: queueConfig.retryBackoffMs ?? 60000,
          retryBackoffMultiplier: queueConfig.retryBackoffMultiplier ?? 2.0,
          maxRetryBackoffMs: queueConfig.maxRetryBackoffMs ?? 600000,
          cleanupIntervalMs: queueConfig.cleanupIntervalMs ?? 3600000,
          retainCompletedDays: queueConfig.retainCompletedDays ?? 7,
        },
      };

      const result = await updateSettings(groupedValues);

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

  // 辅助函数：确保值为数组
  function ensureArray(value: string[] | string | undefined): string[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  }

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
