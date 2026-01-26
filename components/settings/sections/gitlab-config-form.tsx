'use client';

import type { DBConfig } from '@/lib/features/config/schema';

interface GitLabConfigFormProps {
  config: DBConfig['gitlab'];
  onChange: (config: DBConfig['gitlab']) => void;
}

export function GitLabConfigForm({ config, onChange }: GitLabConfigFormProps) {
  const handleChange = (field: keyof DBConfig['gitlab'], value: string) => {
    onChange({ ...config, [field]: value });
  };

  return (
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
            value={config.url || ''}
            onChange={(e) => handleChange('url', e.target.value)}
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
            value={config.token || ''}
            onChange={(e) => handleChange('token', e.target.value)}
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
            value={config.webhookSecret || ''}
            onChange={(e) => handleChange('webhookSecret', e.target.value)}
            placeholder="Webhook 验证密钥"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>
    </div>
  );
}
