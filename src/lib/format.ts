import { format, formatDistanceToNow } from 'date-fns'
import type { MovementType, StockStatus } from '@/lib/types'

// ─── Formatting helpers ─────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatDate(iso: string): string {
  return format(new Date(iso), 'MMM d, yyyy')
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'MMM d, yyyy · HH:mm')
}

export function timeAgo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

// ─── Stock status presentation ──────────────────────────────────────────────

export const stockStatusMeta: Record<
  StockStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  IN_STOCK: {
    label: 'In Stock',
    badgeClass:
      'bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-950 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  LOW_STOCK: {
    label: 'Low Stock',
    badgeClass:
      'bg-amber-100 text-amber-800 border-transparent dark:bg-amber-950 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  OUT_OF_STOCK: {
    label: 'Out of Stock',
    badgeClass:
      'bg-red-100 text-red-800 border-transparent dark:bg-red-950 dark:text-red-300',
    dotClass: 'bg-red-500',
  },
}

// ─── Movement type presentation ─────────────────────────────────────────────

export const movementMeta: Record<
  MovementType,
  { label: string; badgeClass: string; sign: (q: number) => string }
> = {
  IN: {
    label: 'Stock In',
    badgeClass:
      'bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-950 dark:text-emerald-300',
    sign: (q) => `+${formatNumber(Math.abs(q))}`,
  },
  OUT: {
    label: 'Stock Out',
    badgeClass:
      'bg-red-100 text-red-800 border-transparent dark:bg-red-950 dark:text-red-300',
    sign: (q) => `-${formatNumber(Math.abs(q))}`,
  },
  ADJUST: {
    label: 'Adjustment',
    badgeClass:
      'bg-amber-100 text-amber-800 border-transparent dark:bg-amber-950 dark:text-amber-300',
    sign: (q) => (q >= 0 ? `+${formatNumber(q)}` : `-${formatNumber(Math.abs(q))}`),
  },
}
