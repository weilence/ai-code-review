'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSettings } from '@/actions/config';
import type { AppConfig } from '@/lib/features/config/schema';
import type { AIModelConfig } from '@/lib/features/config/schema';
import { cn } from '@/lib/utils';
import { Loader2, Save, CheckCircle2, XCircle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { AIModelsForm } from './ai-models-form';

interface SettingsFormProps {
  config: AppConfig;
}

type FormStatus = 'idle' | 'saving' | 'success' | 'error';

export function SettingsForm({ config }: SettingsFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // GitLab 配置
  const [gitlabUrl, setGitlabUrl] = useState(config.gitlab.url || '');
  const [gitlabToken, setGitlabToken] = useState(config.gitlab.token || '');
  const [gitlabWebhookSecret, setGitlabWebhookSecret] = useState(config.gitlab.webhookSecret || '');

  // AI 配置 - 模型配置字典
  const [aiModels, setAiModels] = useState<Record<string, AIModelConfig>>(
    config.ai.models || {}
  );

  // Webhook 配置
  const [webhookMrEnabled, setWebhookMrEnabled] = useState(config.webhook.mr.enabled ?? true);
  const [webhookMrEvents, setWebhookMrEvents] = useState(
    Array.isArray(config.webhook.mr.events) ? config.webhook.mr.events.join(', ') : 'open, update'
  );
  const [webhookMrReviewDrafts, setWebhookMrReviewDrafts] = useState(config.webhook.mr.reviewDrafts ?? false);

  const [webhookPushEnabled, setWebhookPushEnabled] = useState(config.webhook.push.enabled ?? false);
  const [webhookPushBranches, setWebhookPushBranches] = useState(
    Array.isArray(config.webhook.push.branches) ? config.webhook.push.branches.join(', ') : ''
  );

  const [webhookNoteEnabled, setWebhookNoteEnabled] = useState(config.webhook.note.enabled ?? true);
  const [webhookNoteCommands, setWebhookNoteCommands] = useState(
    Array.isArray(config.webhook.note.commands) ? config.webhook.note.commands.join(', ') : '/review, /ai-review'
  );

  // Review 配置
  const [reviewMaxFiles, setReviewMaxFiles] = useState(config.review.maxFiles?.toString() || '50');
  const [reviewMaxLinesPerFile, setReviewMaxLinesPerFile] = useState(config.review.maxLinesPerFile?.toString() || '1000');
  const [reviewSkipFiles, setReviewSkipFiles] = useState(
    Array.isArray(config.review.skipFiles) ? config.review.skipFiles.join(', ') : '*.lock, *.min.js, *.min.css'
  );
  const [reviewLanguage, setReviewLanguage] = useState(config.review.language || '简体中文');
  const [reviewFailureBehavior, setReviewFailureBehavior] = useState(config.review.failureBehavior || 'non-blocking');
  const [reviewFailureThreshold, setReviewFailureThreshold] = useState(config.review.failureThreshold || 'critical');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    setErrorMessage('');

    try {
      const values: Record<string, unknown> = {
        // GitLab 配置
        'gitlab.url': gitlabUrl.trim() || 'https://gitlab.com',
        'gitlab.token': gitlabToken.trim(),
        'gitlab.webhookSecret': gitlabWebhookSecret.trim(),

        // AI 配置 - 将模型配置字典转换为 JSON 存储
        'ai.models': JSON.stringify(aiModels),

        // Webhook 配置 - 保存为字符串，让 Zod schema 负责转换
        'webhook.mr.enabled': webhookMrEnabled ? 'true' : 'false',
        'webhook.mr.events': webhookMrEvents,
        'webhook.mr.reviewDrafts': webhookMrReviewDrafts ? 'true' : 'false',

        'webhook.push.enabled': webhookPushEnabled ? 'true' : 'false',
        'webhook.push.branches': webhookPushBranches,

        'webhook.note.enabled': webhookNoteEnabled ? 'true' : 'false',
        'webhook.note.commands': webhookNoteCommands,

        // Review 配置
        'review.maxFiles': Number(reviewMaxFiles),
        'review.maxLinesPerFile': Number(reviewMaxLinesPerFile),
        'review.skipFiles': reviewSkipFiles,  // 保持为字符串，让 Zod schema 转换
        'review.language': reviewLanguage as '简体中文' | 'English',
        'review.failureBehavior': reviewFailureBehavior as 'blocking' | 'non-blocking',
        'review.failureThreshold': reviewFailureThreshold as 'critical' | 'major' | 'minor' | 'suggestion',
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
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">GitLab 配置</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="gitlab-url" className="block text-sm text-muted-foreground">
              GitLab URL
            </label>
            <input
              id="gitlab-url"
              type="url"
              value={gitlabUrl}
              onChange={(e) => setGitlabUrl(e.target.value)}
              placeholder="https://gitlab.com"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="gitlab-token" className="block text-sm text-muted-foreground">
              Personal Access Token
            </label>
            <input
              id="gitlab-token"
              type="password"
              value={gitlabToken}
              onChange={(e) => setGitlabToken(e.target.value)}
              placeholder="glpat-xxxxxxxxxxxxxx"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label htmlFor="gitlab-webhook-secret" className="block text-sm text-muted-foreground">
              Webhook Secret
            </label>
            <input
              id="gitlab-webhook-secret"
              type="password"
              value={gitlabWebhookSecret}
              onChange={(e) => setGitlabWebhookSecret(e.target.value)}
              placeholder="Webhook 验证密钥"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">AI 配置</h2>
        <AIModelsForm
          initialModels={config.ai.models || {}}
          onChange={(models) => setAiModels(models)}
        />
      </div>

      {/* Webhook Configuration */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Webhook 配置</h2>

        {/* MR Events */}
        <div className="mb-6 space-y-3">
          <h3 className="font-semibold">Merge Request 事件</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={webhookMrEnabled}
                onChange={(e) => setWebhookMrEnabled(e.target.checked)}
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
              value={webhookMrEvents}
              onChange={(e) => setWebhookMrEvents(e.target.value)}
              placeholder="open, update"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={webhookMrReviewDrafts}
              onChange={(e) => setWebhookMrReviewDrafts(e.target.checked)}
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
                checked={webhookPushEnabled}
                onChange={(e) => setWebhookPushEnabled(e.target.checked)}
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
              value={webhookPushBranches}
              onChange={(e) => setWebhookPushBranches(e.target.value)}
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
                checked={webhookNoteEnabled}
                onChange={(e) => setWebhookNoteEnabled(e.target.checked)}
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
              value={webhookNoteCommands}
              onChange={(e) => setWebhookNoteCommands(e.target.value)}
              placeholder="/review, /ai-review"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* Review Configuration */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">审查配置</h2>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="review-max-files" className="block text-sm text-muted-foreground">
                最大文件数
              </label>
              <input
                id="review-max-files"
                type="number"
                min="1"
                value={reviewMaxFiles}
                onChange={(e) => setReviewMaxFiles(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="review-max-lines" className="block text-sm text-muted-foreground">
                每文件最大行数
              </label>
              <input
                id="review-max-lines"
                type="number"
                min="1"
                value={reviewMaxLinesPerFile}
                onChange={(e) => setReviewMaxLinesPerFile(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="review-skip-files" className="block text-sm text-muted-foreground">
              跳过文件模式（逗号分隔）
            </label>
            <input
              id="review-skip-files"
              type="text"
              value={reviewSkipFiles}
              onChange={(e) => setReviewSkipFiles(e.target.value)}
              placeholder="*.lock, *.min.js, package-lock.json"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="review-language" className="block text-sm text-muted-foreground">
                审查语言
              </label>
              <select
                id="review-language"
                value={reviewLanguage}
                onChange={(e) => setReviewLanguage(e.target.value as '简体中文' | 'English')}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="简体中文">简体中文</option>
                <option value="English">English</option>
              </select>
            </div>
            <div>
              <label htmlFor="review-failure-behavior" className="block text-sm text-muted-foreground">
                失败行为
              </label>
              <select
                id="review-failure-behavior"
                value={reviewFailureBehavior}
                onChange={(e) => setReviewFailureBehavior(e.target.value as 'blocking' | 'non-blocking')}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="blocking">阻止合并</option>
                <option value="non-blocking">不阻止合并</option>
              </select>
            </div>
            <div>
              <label htmlFor="review-failure-threshold" className="block text-sm text-muted-foreground">
                失败阈值
              </label>
              <select
                id="review-failure-threshold"
                value={reviewFailureThreshold}
                onChange={(e) => setReviewFailureThreshold(e.target.value as 'critical' | 'major' | 'minor' | 'suggestion')}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="critical">严重</option>
                <option value="major">主要</option>
                <option value="minor">次要</option>
                <option value="suggestion">建议</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between rounded-xl border bg-card p-6 shadow-sm">
        <div>
          {status === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">保存成功！</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">{errorMessage}</span>
            </div>
          )}
        </div>
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
