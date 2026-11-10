'use client'

import * as React from 'react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  ArrowLeftRight,
  Boxes,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  RotateCcw,
  Sun,
  Tags,
  Truck,
  Warehouse,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useInventoryStore } from '@/lib/store'
import { toast } from 'sonner'
import type { Product, ViewId } from '@/lib/types'
import { StockDialog } from '@/components/inventory/stock-dialog'
import { DashboardView } from '@/components/inventory/dashboard-view'
import { ProductsView } from '@/components/inventory/products-view'
import { CategoriesView } from '@/components/inventory/categories-view'
import { SuppliersView } from '@/components/inventory/suppliers-view'
import { MovementsView } from '@/components/inventory/movements-view'

const NAV_ITEMS: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'movements', label: 'Stock Movements', icon: ArrowLeftRight },
]

const VIEW_META: Record<ViewId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Overview of inventory health and recent activity',
  },
  products: {
    title: 'Products',
    subtitle: 'Manage your product catalog and stock levels',
  },
  categories: {
    title: 'Categories',
    subtitle: 'Organize products into groups',
  },
  suppliers: {
    title: 'Suppliers',
    subtitle: 'Vendor directory and contact details',
  },
  movements: {
    title: 'Stock Movements',
    subtitle: 'Complete audit trail of every stock change',
  },
}

export type QuickStockFn = (product: Product, mode: 'IN' | 'OUT') => void

// ─── Brand mark ─────────────────────────────────────────────────────────────

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Warehouse className="h-5 w-5" aria-hidden="true" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-semibold tracking-tight">Shopee</p>
          <p className="text-xs text-muted-foreground">Inventory Management</p>
        </div>
      )}
    </div>
  )
}

// ─── Theme toggle ───────────────────────────────────────────────────────────

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle color theme"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {mounted && resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}

// ─── Nav list (shared between sidebar and mobile sheet) ─────────────────────

function NavList({
  active,
  onSelect,
}: {
  active: ViewId
  onSelect: (id: ViewId) => void
}) {
  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = id === active
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-primary font-medium text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </nav>
  )
}

// ─── Reset demo data button ─────────────────────────────────────────────────

function ResetDataButton({ full }: { full?: boolean }) {
  const resetData = useInventoryStore((s) => s.resetData)
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={full ? 'w-full justify-start gap-2' : 'gap-2'}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset demo data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will restore the original sample catalog — products, categories,
            suppliers and stock history — replacing everything you changed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              resetData()
              toast.success('Demo data has been reset to the original sample catalog.')
            }}
          >
            Reset everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Boot splash (shown until client store hydrates) ────────────────────────

function BootSplash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
        <Warehouse className="h-7 w-7" aria-hidden="true" />
      </div>
      <div className="space-y-1 text-center">
        <p className="font-semibold">Shopee</p>
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    </div>
  )
}

// ─── App shell ──────────────────────────────────────────────────────────────

export function AppShell() {
  const [view, setView] = useState<ViewId>('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [stockTarget, setStockTarget] = useState<{
    product: Product
    mode: 'IN' | 'OUT'
  } | null>(null)

  React.useEffect(() => setMounted(true), [])

  const openQuickStock: QuickStockFn = React.useCallback((product, mode) => {
    setStockTarget({ product, mode })
  }, [])

  const selectView = (id: ViewId) => {
    setView(id)
    setMobileNavOpen(false)
  }

  if (!mounted) return <BootSplash />

  const meta = VIEW_META[view]

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          <NavList active={view} onSelect={selectView} />
        </div>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Appearance</p>
            <ThemeToggle />
          </div>
          <ResetDataButton full />
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Data is stored locally in your browser — no backend required.
          </p>
        </div>
      </aside>

      {/* Content column */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="h-16 justify-center border-b px-5">
                <SheetTitle asChild>
                  <div>
                    <Brand />
                  </div>
                </SheetTitle>
                <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
              </SheetHeader>
              <div className="flex h-full flex-col">
                <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
                  <NavList active={view} onSelect={selectView} />
                </div>
                <div className="border-t p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Appearance</p>
                    <ThemeToggle />
                  </div>
                  <ResetDataButton full />
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Brand />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        {/* Page header */}
        <div className="border-b bg-background px-4 py-5 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              {meta.title}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{meta.subtitle}</p>
          </div>
        </div>

        {/* View content */}
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {view === 'dashboard' && (
                  <DashboardView onNavigate={selectView} onQuickStock={openQuickStock} />
                )}
                {view === 'products' && <ProductsView onQuickStock={openQuickStock} />}
                {view === 'categories' && <CategoriesView />}
                {view === 'suppliers' && <SuppliersView />}
                {view === 'movements' && <MovementsView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Sticky footer */}
        <footer className="mt-auto border-t px-4 py-4 md:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
            <p className="flex items-center gap-1.5">
              <Boxes className="h-3.5 w-3.5" aria-hidden="true" />
              Shopee · Frontend demo — data persists in your browser
            </p>
            <p>© {new Date().getFullYear()} Northgate Supply Co.</p>
          </div>
        </footer>
      </div>

      {/* Quick stock dialog, shared by dashboard + products views */}
      <StockDialog
        open={!!stockTarget}
        product={stockTarget?.product ?? null}
        mode={stockTarget?.mode ?? 'IN'}
        onClose={() => setStockTarget(null)}
      />
    </div>
  )
}
