'use client';

import type { AppConfig } from '@/lib/features/config/schema';

interface ReviewConfigFormProps {
  config: AppConfig['review'];
  onChange: (config: AppConfig['review']) => void;
}

export function ReviewConfigForm({ config, onChange }: ReviewConfigFormProps) {
  const handleChange = <K extends keyof AppConfig['review']>(
    field: K,
    value: AppConfig['review'][K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  const maxFiles = config.maxFiles?.toString() || '50';
  const maxLinesPerFile = config.maxLinesPerFile?.toString() || '1000';
  const skipFiles = Array.isArray(config.skipFiles)
    ? config.skipFiles.join(', ')
    : config.skipFiles || '*.lock, *.min.js, *.min.css';

  return (
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
              value={maxFiles}
              onChange={(e) => handleChange('maxFiles', Number(e.target.value))}
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
              value={maxLinesPerFile}
              onChange={(e) => handleChange('maxLinesPerFile', Number(e.target.value))}
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
            value={skipFiles}
            onChange={(e) => handleChange('skipFiles', e.target.value.split(',').map(x => x.trim()).filter(Boolean))}
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
              value={config.language || '简体中文'}
              onChange={(e) => handleChange('language', e.target.value as '简体中文' | 'English')}
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
              value={config.failureBehavior || 'non-blocking'}
              onChange={(e) => handleChange('failureBehavior', e.target.value as 'blocking' | 'non-blocking')}
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
              value={config.failureThreshold || 'critical'}
              onChange={(e) => handleChange('failureThreshold', e.target.value as 'critical' | 'major' | 'minor' | 'suggestion')}
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
  );
}
