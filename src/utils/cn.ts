import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx (for conditional classes) and tailwind-merge (to avoid conflicts)
 *
 * @example
 * cn('bg-red-500', 'bg-blue-500') // => 'bg-blue-500' (last wins)
 * cn('p-4', { 'text-white': true, 'text-black': false }) // => 'p-4 text-white'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
