'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Button from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ConfirmDialogVariant = 'default' | 'destructive' | 'warning' | 'info';

export interface ConfirmDialogOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
}

const defaultOptions: Required<ConfirmDialogOptions> = {
  title: '确认操作',
  description: '您确定要执行此操作吗？',
  confirmText: '确认',
  cancelText: '取消',
  variant: 'default',
};

const variantConfig = {
  default: {
    icon: Info,
    iconColor: 'text-blue-500',
    iconBgColor: 'bg-blue-100 dark:bg-blue-900/30',
    buttonVariant: 'default' as const,
  },
  destructive: {
    icon: XCircle,
    iconColor: 'text-red-500',
    iconBgColor: 'bg-red-100 dark:bg-red-900/30',
    buttonVariant: 'default' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    iconBgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    buttonVariant: 'default' as const,
  },
  info: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    iconBgColor: 'bg-green-100 dark:bg-green-900/30',
    buttonVariant: 'default' as const,
  },
};

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options?: ConfirmDialogOptions;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  options = {},
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  const finalOptions = { ...defaultOptions, ...options };
  const config = variantConfig[finalOptions.variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', config.iconBgColor)}>
              <Icon className={cn('h-5 w-5', config.iconColor)} />
            </div>
            <DialogTitle className="text-lg">
              {finalOptions.title}
            </DialogTitle>
          </div>
          <DialogDescription className="pl-13">
            {finalOptions.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pl-13">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {finalOptions.cancelText}
          </Button>
          <Button
            type="button"
            variant={finalOptions.variant === 'destructive' ? 'default' : 'default'}
            className={finalOptions.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? '处理中...' : finalOptions.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 使用确认对话框的 Hook
 * @returns 包含 confirm 函数和 ConfirmDialog 组件的对象
 *
 * @example
 * const { confirm, ConfirmDialogComponent } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: '删除确认',
 *     description: '确定要删除这条记录吗？此操作无法撤销。',
 *     variant: 'destructive',
 *   });
 *
 *   if (confirmed) {
 *     // 执行删除操作
 *   }
 * };
 */
export function useConfirmDialog() {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ConfirmDialogOptions>({});
  const [resolvePromise, setResolvePromise] = React.useState<
    ((value: boolean) => void) | null
  >(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const confirm = React.useCallback(
    (opts: ConfirmDialogOptions): Promise<boolean> => {
      setOptions(opts);
      setOpen(true);

      return new Promise((resolve) => {
        setResolvePromise(() => resolve);
      });
    },
    []
  );

  const handleConfirm = React.useCallback(() => {
    setIsLoading(true);
    // 执行确认后的逻辑（由外部控制）
    if (resolvePromise) {
      resolvePromise(true);
    }
  }, [resolvePromise]);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      setIsLoading(false);
      if (!newOpen && resolvePromise) {
        resolvePromise(false);
      }
    },
    [resolvePromise]
  );

  const ConfirmDialogComponent = React.useMemo(
    () => (
      <ConfirmDialog
        open={open}
        onOpenChange={handleOpenChange}
        options={options}
        onConfirm={handleConfirm}
        isLoading={isLoading}
      />
    ),
    [open, handleOpenChange, options, handleConfirm, isLoading]
  );

  return {
    confirm,
    ConfirmDialogComponent,
  };
}
