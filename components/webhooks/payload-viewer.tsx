'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Button from '@/components/ui/button';

interface PayloadViewerProps {
  payload: unknown;
}

export function PayloadViewer({ payload }: PayloadViewerProps) {
  const [open, setOpen] = useState(false);
  const formatted = JSON.stringify(payload, null, 2);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-sm text-blue-500 underline">
          查看详情
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Webhook Payload</DialogTitle>
          <DialogDescription>完整的 Webhook 事件数据</DialogDescription>
        </DialogHeader>
        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
          <code>{formatted}</code>
        </pre>
      </DialogContent>
    </Dialog>
  );
}
