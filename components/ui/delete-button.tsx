'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfirmDialog } from './confirm-dialog';

interface DeleteButtonProps {
  action: () => Promise<{ success: boolean; message?: string; error?: string }>;
  title?: string;
  confirmMessage?: string;
  redirectTo?: string;
  className?: string;
  variant?: 'default' | 'destructive' | 'warning';
}

export function DeleteButton({
  action,
  title = '确认删除',
  confirmMessage = '确定要执行此操作吗？',
  redirectTo,
  className,
  variant = 'destructive',
}: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClick = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 显示确认对话框
    const confirmed = await confirm({
      title,
      description: confirmMessage,
      confirmText: '删除',
      cancelText: '取消',
      variant,
    });

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    startTransition(async () => {
      const result = await action();
      if (result.success && redirectTo) {
        window.location.href = redirectTo;
      } else {
        // 刷新当前页面
        window.location.reload();
      }
    });
  };

  return (
    <>
      <form onSubmit={handleClick}>
        <button
          type="submit"
          disabled={isDeleting || isPending}
          className={cn(
            'p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          )}
          aria-label="删除"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </form>
      {ConfirmDialogComponent}
    </>
  );
}
