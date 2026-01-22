'use client';

import { useState, useEffect } from 'react';

interface ClientDateTimeProps {
  date: Date | string | number;
  /**
   * 显示相对时间（如 "3分钟前"）还是绝对时间
   * @default 'relative'
   */
  mode?: 'relative' | 'absolute' | 'both';
  /**
   * 语言环境
   * @default 'zh-CN'
   */
  locale?: Intl.LocalesArgument;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 客户端时间显示组件
 *
 * 在浏览器中渲染时间，自动使用客户端时区设置。
 * 解决服务端渲染时使用服务器时区（UTC）导致的时差问题。
 *
 * @example
 * // 相对时间（默认）
 * <ClientDateTime date={new Date()} />
 * // 输出: "3分钟前"
 *
 * @example
 * // 绝对时间
 * <ClientDateTime date={new Date()} mode="absolute" />
 * // 输出: "2025/01/22 14:30:45"
 *
 * @example
 * // 相对 + 绝对时间（tooltip 显示绝对时间）
 * <ClientDateTime date={new Date()} mode="both" />
 * // 输出: "3分钟前"（鼠标悬停显示完整时间）
 */
export function ClientDateTime({
  date,
  mode = 'relative',
  locale = 'zh-CN',
  className = '',
}: ClientDateTimeProps) {
  const [mounted, setMounted] = useState(false);

  // 检测客户端挂载，避免水合不匹配（React 官方推荐模式）
  useEffect(() => {
    // https://react.dev/reference/react/useEffect#displaying-different-content-on-the-server-and-the-client
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // 在客户端挂载前显示占位符，避免水合不匹配
  if (!mounted) {
    return <span className={className}>--</span>;
  }

  const dateObj = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // 相对时间格式化
  const getRelativeTime = (): string => {
    if (diffSec < 60) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffHour < 24) return `${diffHour}小时前`;
    if (diffDay < 7) return `${diffDay}天前`;
    // 超过 7 天显示日期
    return dateObj.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 绝对时间格式化
  const getAbsoluteTime = (): string => {
    return dateObj.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const relativeTime = getRelativeTime();
  const absoluteTime = getAbsoluteTime();

  // 只显示相对时间
  if (mode === 'relative') {
    return (
      <span className={className} title={absoluteTime}>
        {relativeTime}
      </span>
    );
  }

  // 只显示绝对时间
  if (mode === 'absolute') {
    return (
      <span className={className} title={relativeTime}>
        {absoluteTime}
      </span>
    );
  }

  // 同时显示相对时间和绝对时间（在 tooltip 中）
  return (
    <span className={className} title={absoluteTime}>
      {relativeTime}
    </span>
  );
}
