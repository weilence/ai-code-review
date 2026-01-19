import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and tailwind-merge
 * This is the standard approach for conditional Tailwind CSS classes
 *
 * @example
 * ```ts
 * cn('px-2', isActive && 'bg-blue-500', 'py-1')
 * // => 'px-2 py-1 bg-blue-500' (if isActive)
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
