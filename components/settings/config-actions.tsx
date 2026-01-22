'use client';

import { useState, useTransition } from 'react';
import { Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { exportSettings, importSettings } from '@/actions/config';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

export function ConfigActions() {
  const [isPending, startTransition] = useTransition();
  const [isImporting, setIsImporting] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // 导出配置
  const handleExport = () => {
    startTransition(async () => {
      const result = await exportSettings();

      if (result.success && result.data) {
        // 创建 JSON 文件并触发下载
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ai-code-review-config-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        await confirm({
          title: '导出失败',
          description: result.error || '未知错误',
          confirmText: '确定',
          cancelText: '关闭',
          variant: 'destructive',
        });
      }
    });
  };

  // 导入配置 - 文件选择后显示确认对话框
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result;
        if (typeof content !== 'string') {
          throw new Error('无效的文件内容');
        }

        const data = JSON.parse(content);

        // 验证数据格式
        if (!data.dbSettings || typeof data.dbSettings !== 'object') {
          throw new Error('无效的配置文件格式');
        }

        // 显示确认对话框
        const confirmed = await confirm({
          title: '确认导入配置',
          description: `这将覆盖当前的所有配置设置。\n\n导出时间: ${data.exportedAt || '未知'}`,
          confirmText: '导入',
          cancelText: '取消',
          variant: 'warning',
        });

        if (confirmed) {
          startTransition(async () => {
            const result = await importSettings(data.dbSettings);

            if (result.success) {
              await confirm({
                title: '导入成功',
                description: '配置导入成功！页面将重新加载。',
                confirmText: '确定',
                cancelText: '',
                variant: 'info',
              });
              window.location.reload();
            } else {
              await confirm({
                title: '导入失败',
                description: result.error || '未知错误',
                confirmText: '确定',
                cancelText: '',
                variant: 'destructive',
              });
            }
          });
        }
      } catch (error) {
        await confirm({
          title: '导入失败',
          description: error instanceof Error ? error.message : '无效的 JSON 文件',
          confirmText: '确定',
          cancelText: '',
          variant: 'destructive',
        });
      } finally {
        setIsImporting(false);
        // 重置 input 以允许再次选择同一文件
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <>
      <div className="flex gap-2">
        {/* 导出按钮 */}
        <button
          type="button"
          onClick={handleExport}
          disabled={isPending}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'gap-2',
          )}
        >
          <Download className="h-4 w-4" />
          导出配置
        </button>

        {/* 导入按钮 */}
        <label
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'gap-2 cursor-pointer',
          )}
        >
          <Upload className="h-4 w-4" />
          导入配置
          <input
            type="file"
            accept="application/json"
            onChange={handleImport}
            disabled={isPending || isImporting}
            className="hidden"
          />
        </label>
      </div>
      {ConfirmDialogComponent}
    </>
  );
}
