'use client';

import type { DBConfig, AIModelConfig } from '@/lib/features/config/schema';
import { AIModelsForm } from '../ai-models-form';

interface AIConfigFormProps {
  config: DBConfig['ai'];
  onChange: (config: DBConfig['ai']) => void;
}

export function AIConfigForm({ config, onChange }: AIConfigFormProps) {
  const handleModelsChange = (models: Record<string, AIModelConfig>) => {
    onChange({ ...config, models });
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">AI 配置</h2>
      <AIModelsForm
        initialModels={config.models || {}}
        onChange={handleModelsChange}
      />
    </div>
  );
}
