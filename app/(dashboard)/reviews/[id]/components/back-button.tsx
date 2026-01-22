import Link from 'next/link';

export function BackButton() {
  return (
    <Link
      href="/reviews"
      className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
    >
      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      返回列表
    </Link>
  );
}
