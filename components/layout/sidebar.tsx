'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Settings,
  Activity,
} from 'lucide-react';

const navigation = [
  { name: '仪表盘', href: '/' as Route, icon: LayoutDashboard },
  { name: '审查记录', href: '/reviews' as Route, icon: FileText },
  { name: 'Webhook 监控', href: '/webhooks' as Route, icon: Activity },
  { name: '设置', href: '/settings' as Route, icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r bg-muted/40">
      <div className="flex h-16 items-center justify-center border-b">
        <h2 className="text-lg font-semibold">控制面板</h2>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          <p>AI 代码审查系统</p>
          <p className="mt-1">Powered by Next.js 16</p>
        </div>
      </div>
    </aside>
  );
}
