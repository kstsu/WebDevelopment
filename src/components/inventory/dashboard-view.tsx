'use client'

import * as React from 'react'
import { useMemo } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Package,
  PackageMinus,
  PackagePlus,
  Scale,
  Sparkles,
  XCircle,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatCurrency, formatNumber, movementMeta, stockStatusMeta, timeAgo } from '@/lib/format'
import { getStockStatus, useInventoryStore } from '@/lib/store'
import type { Product, StockMovement, ViewId } from '@/lib/types'
import type { QuickStockFn } from '@/components/inventory/app-shell'

const CHART_COLORS = ['#292524', '#57534e', '#78716c', '#a8a29e', '#d6d3d1']

interface DashboardViewProps {
  onNavigate: (view: ViewId) => void
  onQuickStock?: QuickStockFn
}

// ─── Shared chart tooltip ───────────────────────────────────────────────────

interface TooltipPayloadItem {
  name?: string | number
  value?: number | string
  payload?: { name?: string; fill?: string }
}

function ChartTooltip({
  active,
  payload,
  formatter,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  formatter?: (value: number) => string
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const raw = typeof item.value === 'number' ? item.value : Number(item.value ?? 0)
  const name = (item.payload?.name ?? String(item.name ?? '')) as string
  const color = item.payload?.fill
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs">
      <p className="flex items-center gap-1.5 font-medium text-popover-foreground">
        {color && (
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        )}
        {name}
      </p>
      <p className="mt-0.5 text-muted-foreground">
        {formatter ? formatter(raw) : formatNumber(raw)}
      </p>
    </div>
  )
}

// ─── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  sub: string
  icon: React.ElementType
    tone: 'emerald' | 'teal' | 'amber' | 'red'
}) {
  const tones = {
    emerald: 'text-foreground',
    teal: 'text-foreground',
    amber: 'text-amber-700 dark:text-amber-300',
    red: 'text-red-700 dark:text-red-300',
  }
  return (
    <Card className="group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>
          </div>
           <Icon className={`mt-1 h-5 w-5 shrink-0 ${tones[tone]}`} aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main view ──────────────────────────────────────────────────────────────

export function DashboardView({ onNavigate, onQuickStock }: DashboardViewProps) {
  const products = useInventoryStore((s) => s.products)
  const categories = useInventoryStore((s) => s.categories)
  const movements = useInventoryStore((s) => s.movements)

  const stats = useMemo(() => {
    const totalUnits = products.reduce((sum, p) => sum + p.quantity, 0)
    const stockValue = products.reduce((sum, p) => sum + p.quantity * p.costPrice, 0)
    const retailValue = products.reduce((sum, p) => sum + p.quantity * p.sellingPrice, 0)
    const lowStock = products.filter((p) => getStockStatus(p) === 'LOW_STOCK')
    const outOfStock = products.filter((p) => getStockStatus(p) === 'OUT_OF_STOCK')
    return { totalUnits, stockValue, retailValue, lowStock, outOfStock }
  }, [products])

  const stockByCategory = useMemo(
    () =>
      categories.map((cat) => ({
        name: cat.name,
        units: products
          .filter((p) => p.categoryId === cat.id)
          .reduce((sum, p) => sum + p.quantity, 0),
      })),
    [categories, products],
  )

  const valueByCategory = useMemo(() => {
    const rows = categories
      .map((cat, index) => ({
        name: cat.name,
        value: products
          .filter((p) => p.categoryId === cat.id)
          .reduce((sum, p) => sum + p.quantity * p.costPrice, 0),
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .filter((row) => row.value > 0)
    return rows
  }, [categories, products])

  const attentionList = useMemo(
    () =>
      [...stats.lowStock, ...stats.outOfStock].sort((a, b) => a.quantity - b.quantity),
    [stats.lowStock, stats.outOfStock],
  )

  const recentMovements = useMemo(
    () =>
      [...movements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 7),
    [movements],
  )

  const healthyProducts = products.filter((product) => getStockStatus(product) === 'IN_STOCK').length
  const stockCoverage = products.length ? Math.round((healthyProducts / products.length) * 100) : 0

  const movementIcon = (type: StockMovement['type']) => {
    if (type === 'IN') return PackagePlus
    if (type === 'OUT') return PackageMinus
    return Scale
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-md border border-border bg-card px-6 py-6 md:px-8 md:py-7">
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Operations snapshot
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Ready for the next coffee rush.</h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Keep beans, pastries and cafe essentials stocked for every service.
            </p>
            <Button
              variant="default"
              size="sm"
              className="mt-5"
              onClick={() => onNavigate('products')}
            >
              Browse catalog
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
          <div className="flex w-full max-w-xs items-center gap-4 rounded-md border border-border bg-background p-4 md:w-auto md:min-w-64">
            <div
              className="relative flex h-16 w-16 shrink-0 items-center justify-center text-lg font-semibold text-foreground"
              role="img"
              aria-label={`${stockCoverage}% of products are above the reorder point`}
            >
              <svg
                className="absolute inset-0 h-full w-full -rotate-90"
                viewBox="0 0 40 40"
                aria-hidden="true"
              >
                <circle
                  cx="20"
                  cy="20"
                  r="17"
                  fill="none"
                  className="stroke-border"
                  strokeWidth="3"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="17"
                  fill="none"
                  className="stroke-primary"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${stockCoverage} ${100 - stockCoverage}`}
                  pathLength="100"
                />
              </svg>
              <span>{stockCoverage}%</span>
            </div>
            <div>
              <p className="text-sm font-medium">Stock health</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{healthyProducts} of {products.length} products above reorder point</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section aria-label="Inventory statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Products"
          value={formatNumber(products.length)}
          sub={`${formatNumber(stats.totalUnits)} units · ${categories.length} categories`}
          icon={Package}
          tone="emerald"
        />
        <StatCard
          label="Inventory Value"
          value={formatCurrency(stats.stockValue)}
          sub={`${formatCurrency(stats.retailValue)} at retail`}
          icon={Banknote}
          tone="teal"
        />
        <StatCard
          label="Low Stock"
          value={formatNumber(stats.lowStock.length)}
          sub="at or below reorder point"
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          label="Out of Stock"
          value={formatNumber(stats.outOfStock.length)}
          sub="needs immediate restock"
          icon={XCircle}
          tone="red"
        />
      </section>

      {/* Charts */}
      <section aria-label="Charts" className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base">Stock Units by Category</CardTitle>
            <CardDescription>Current on-hand quantity per category</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="h-72 w-full text-muted-foreground">
              {stockByCategory.some((row) => row.units > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockByCategory} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.18} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'currentColor', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                      height={52}
                    />
                    <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'currentColor', fillOpacity: 0.06 }}
                      content={<ChartTooltip />}
                    />
                    <Bar dataKey="units" radius={[4, 4, 0, 0]} fill="#10b981" maxBarSize={56} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No stock recorded yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base">Value by Category</CardTitle>
            <CardDescription>Inventory value at cost price</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="h-72 w-full">
              {valueByCategory.length > 0 ? (
                <div className="flex h-full flex-col">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                        <Pie
                          data={valueByCategory}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="58%"
                          outerRadius="85%"
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {valueByCategory.map((row) => (
                            <Cell key={row.name} fill={row.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 text-xs custom-scrollbar">
                    {valueByCategory.map((row) => (
                      <li key={row.name} className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: row.fill }}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate">{row.name}</span>
                        <span className="font-medium tabular-nums">{formatCurrency(row.value)}</span>
                        <span className="w-10 text-right text-muted-foreground tabular-nums">
                          {Math.round((row.value / stats.stockValue) * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No inventory value recorded yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Alerts + recent activity */}
      <section aria-label="Attention and activity" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base">Needs Attention</CardTitle>
            <CardDescription>Low or out-of-stock products</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('products')}>
                View products
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {attentionList.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
                <Package className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  All products are healthy — nothing to restock.
                </p>
              </div>
            ) : (
              <ul className="max-h-80 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                {attentionList.map((product: Product) => {
                  const status = getStockStatus(product)
                  const meta = stockStatusMeta[status]
                  return (
                    <li
                      key={product.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.sku} · {formatNumber(product.quantity)} / reorder at{' '}
                          {formatNumber(product.reorderPoint)}
                        </p>
                      </div>
                      <Badge className={meta.badgeClass} variant="outline">
                        {meta.label}
                      </Badge>
                      {onQuickStock && <Button
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0"
                        onClick={() => onQuickStock(product, 'IN')}
                      >
                        Restock
                      </Button>}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base">Recent Movements</CardTitle>
            <CardDescription>Latest stock activity</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('movements')}>
                View all
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {recentMovements.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
                <PackagePlus className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">No stock movements yet.</p>
              </div>
            ) : (
              <ul className="max-h-80 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                {recentMovements.map((movement) => {
                  const Icon = movementIcon(movement.type)
                  const mMeta = movementMeta[movement.type]
                  return (
                    <li
                      key={movement.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                          movement.type === 'IN'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : movement.type === 'OUT'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{movement.productName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {movement.note} · {timeAgo(movement.date)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-sm font-semibold tabular-nums ${
                          movement.type === 'IN'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : movement.type === 'OUT'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {mMeta.sign(movement.quantity)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
