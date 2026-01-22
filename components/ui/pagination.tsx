import Link from 'next/link';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  baseUrl: string;
  className?: string;
}

/**
 * 分页组件
 * 支持通过 URL 参数进行分页
 */
export function Pagination({ total, limit, offset, baseUrl, className }: PaginationProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  // 如果只有一页，不显示分页
  if (totalPages <= 1) {
    return null;
  }

  const createPageUrl = (page: number) => {
    const newOffset = (page - 1) * limit;
    const params = new URLSearchParams();
    params.set('offset', String(newOffset));
    params.set('limit', String(limit));
    return `${baseUrl}?${params.toString()}`;
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      // 显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 智能显示页码
      if (currentPage <= 4) {
        // 当前页在前面
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // 当前页在后面
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 当前页在中间
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {/* 总数信息 */}
      <div className="text-sm text-muted-foreground">
        显示 {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} 条，
        共 {total} 条
      </div>

      {/* 分页按钮 */}
      <nav className="flex items-center gap-2">
        {/* 首页 */}
        <PaginationLink
          href={createPageUrl(1)}
          isDisabled={currentPage === 1}
          aria-label="首页"
        >
          <ChevronsLeft className="h-4 w-4" />
        </PaginationLink>

        {/* 上一页 */}
        <PaginationLink
          href={createPageUrl(currentPage - 1)}
          isDisabled={currentPage === 1}
          aria-label="上一页"
        >
          <ChevronLeft className="h-4 w-4" />
        </PaginationLink>

        {/* 页码 */}
        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-muted-foreground">
                ...
              </span>
            );
          }

          return (
            <PageNumberLink
              key={page}
              href={createPageUrl(page as number)}
              isActive={page === currentPage}
            >
              {page}
            </PageNumberLink>
          );
        })}

        {/* 下一页 */}
        <PaginationLink
          href={createPageUrl(currentPage + 1)}
          isDisabled={currentPage === totalPages}
          aria-label="下一页"
        >
          <ChevronRight className="h-4 w-4" />
        </PaginationLink>

        {/* 末页 */}
        <PaginationLink
          href={createPageUrl(totalPages)}
          isDisabled={currentPage === totalPages}
          aria-label="末页"
        >
          <ChevronsRight className="h-4 w-4" />
        </PaginationLink>
      </nav>
    </div>
  );
}

interface PaginationLinkProps {
  href: string;
  isDisabled?: boolean;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

function PaginationLink({
  href,
  isDisabled = false,
  children,
  className,
  'aria-label': ariaLabel,
}: PaginationLinkProps) {
  if (isDisabled) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm text-muted-foreground cursor-not-allowed opacity-50',
          className
        )}
        aria-label={ariaLabel}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      href={href as any}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted',
        className
      )}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}

interface PageNumberLinkProps {
  href: string;
  isActive: boolean;
  children: ReactNode;
}

function PageNumberLink({ href, isActive, children }: PageNumberLinkProps) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      href={href as any}
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground font-medium'
          : 'border hover:bg-muted'
      )}
    >
      {children}
    </Link>
  );
}
