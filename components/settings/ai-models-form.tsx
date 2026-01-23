'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { AIModelConfig } from '@/lib/features/config/schema';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

interface ModelConfig extends AIModelConfig {
  id: string; // 格式: "provider:model-id"
}

interface AIModelsFormProps {
  initialModels: Record<string, AIModelConfig>;
  onChange: (models: Record<string, AIModelConfig>) => void;
}

/**
 * AI 模型配置卡片列表
 * 支持添加、删除、编辑多个模型配置
 */
export function AIModelsForm({ initialModels, onChange }: AIModelsFormProps) {
  // 将对象转换为数组，方便渲染
  const [models, setModels] = useState<ModelConfig[]>(
    Object.entries(initialModels).map(([id, config]) => ({
      id,
      ...config,
    }))
  );

  // 添加新模型
  const addModel = () => {
    const newModel: ModelConfig = {
      id: 'anthropic:claude-sonnet-4-5',
      provider: 'anthropic',
    };
    const newModels = [...models, newModel];
    setModels(newModels);
    notifyChange(newModels);
  };

  // 删除模型
  const removeModel = (index: number) => {
    const newModels = models.filter((_, i) => i !== index);
    setModels(newModels);
    notifyChange(newModels);
  };

  // 上移模型
  const moveModelUp = (index: number) => {
    if (index === 0) return; // 已经在顶部
    const newModels = [...models];
    [newModels[index - 1], newModels[index]] = [newModels[index], newModels[index - 1]];
    setModels(newModels);
    notifyChange(newModels);
  };

  // 下移模型
  const moveModelDown = (index: number) => {
    if (index === models.length - 1) return; // 已经在底部
    const newModels = [...models];
    [newModels[index], newModels[index + 1]] = [newModels[index + 1], newModels[index]];
    setModels(newModels);
    notifyChange(newModels);
  };

  // 更新模型配置
  const updateModel = (index: number, field: keyof ModelConfig, value: string) => {
    const newModels = [...models];
    newModels[index] = { ...newModels[index], [field]: value };

    // 如果更新的是 id，自动解析 provider
    if (field === 'id' && value.includes(':')) {
      const [provider] = value.split(':');
      newModels[index].provider = provider;
    }

    setModels(newModels);
    notifyChange(newModels);
  };

  // 通知父组件配置已更改
  const notifyChange = (newModels: ModelConfig[]) => {
    const modelsObj: Record<string, AIModelConfig> = {};
    for (const model of newModels) {
      const { id, ...config } = model;
      modelsObj[id] = config;
    }
    onChange(modelsObj);
  };

  return (
    <div className="space-y-4">
      {models.map((model, index) => (
        <ModelCard
          key={index}
          model={model}
          index={index}
          totalModels={models.length}
          onUpdate={(field, value) => updateModel(index, field, value)}
          onRemove={() => removeModel(index)}
          onMoveUp={() => moveModelUp(index)}
          onMoveDown={() => moveModelDown(index)}
          canRemove={models.length > 1}
        />
      ))}

      {/* 添加模型按钮 */}
      <button
        type="button"
        onClick={addModel}
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'w-full gap-2 border-dashed'
        )}
      >
        <Plus className="h-4 w-4" />
        添加模型
      </button>
    </div>
  );
}

interface ModelCardProps {
  model: ModelConfig;
  index: number;
  totalModels: number;
  onUpdate: (field: keyof ModelConfig, value: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canRemove: boolean;
}

/**
 * 单个模型配置卡片
 */
function ModelCard({ model, index, totalModels, onUpdate, onRemove, onMoveUp, onMoveDown, canRemove }: ModelCardProps) {
  const [isExpanded, setIsExpanded] = useState(index === 0);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      {/* 卡片头部 */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2 font-semibold hover:text-primary transition-colors">
            <span className="text-muted-foreground">{index + 1}.</span>
            <span>{model.id || '未命名模型'}</span>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {model.provider}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* 上移按钮 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={index === 0}
            className="p-2 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
            title="上移"
          >
            <ChevronUp className="h-4 w-4" />
          </button>

          {/* 下移按钮 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={index === totalModels - 1}
            className="p-2 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
            title="下移"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* 删除按钮 */}
          {canRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="删除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 卡片内容（可折叠） */}
      {isExpanded && (
        <div className="mt-4 space-y-3">
          {/* Model ID */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              模型 ID
            </label>
            <input
              type="text"
              value={model.id}
              onChange={(e) => onUpdate('id', e.target.value)}
              placeholder="anthropic:claude-sonnet-4-5"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              格式: provider:model-id（例如: anthropic:claude-sonnet-4-5）
            </p>
          </div>

          {/* Provider（自动解析，也可手动修改） */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Provider（自动解析）
            </label>
            <input
              type="text"
              value={model.provider}
              onChange={(e) => onUpdate('provider', e.target.value)}
              placeholder="anthropic"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              API Key
            </label>
            <input
              type="password"
              value={model.apiKey || ''}
              onChange={(e) => onUpdate('apiKey', e.target.value)}
              placeholder="sk-ant-xxxxxxxxxxxxxx"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>

          {/* Base URL（可选） */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Base URL（可选）
            </label>
            <input
              type="url"
              value={model.baseUrl || ''}
              onChange={(e) => onUpdate('baseUrl', e.target.value)}
              placeholder="https://api.anthropic.com"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              留空使用默认地址。仅自定义端点时需要。
            </p>
          </div>

          {/* Temperature 和 Max Tokens */}
          <div className="grid gap-3 grid-cols-2">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Temperature（可选）
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={model.temperature ?? ''}
                onChange={(e) => onUpdate('temperature', e.target.value)}
                placeholder="0.7"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Max Tokens（可选）
              </label>
              <input
                type="number"
                min="1"
                value={model.maxTokens ?? ''}
                onChange={(e) => onUpdate('maxTokens', e.target.value)}
                placeholder="8192"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
