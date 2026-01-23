'use client';

import { CheckCircle2, XCircle } from 'lucide-react';

type FormStatus = 'idle' | 'saving' | 'success' | 'error';

interface FormStatusMessageProps {
  status: FormStatus;
  errorMessage?: string;
}

export function FormStatusMessage({ status, errorMessage }: FormStatusMessageProps) {
  if (status === 'idle' || status === 'saving') {
    return null;
  }

  return (
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
          <span className="text-sm">{errorMessage || '保存失败'}</span>
        </div>
      )}
    </div>
  );
}
