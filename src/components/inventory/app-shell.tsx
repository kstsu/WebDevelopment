'use client'

import * as React from 'react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  ArrowLeftRight,
  Coffee,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  RotateCcw,
  Sun,
  Tags,
  Truck,
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
import { databaseApiEnabled, useInventoryStore } from '@/lib/store'
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-teal-700 to-emerald-800 text-primary-foreground shadow-[0_8px_20px_-8px_oklch(0.3_0.12_174/0.9)]">
        <Coffee className="h-5 w-5" aria-hidden="true" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-semibold tracking-tight text-foreground">Cafe Shop</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Inventory OS</p>
        </div>
      )}
    </div>
  )
}

// ─── Theme toggle ───────────────────────────────────────────────────────────

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const isAnimating = React.useRef(false)
  React.useEffect(() => setMounted(true), [])

  const toggleTheme = () => {
    if (isAnimating.current) return

    const root = document.documentElement
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    isAnimating.current = true

    const applyTheme = () => {
      // Update the DOM inside the snapshot callback, not in a later React
      // effect, so the new snapshot actually captures the new palette.
      root.classList.remove('light', 'dark')
      root.classList.add(nextTheme)
      root.style.colorScheme = nextTheme
      setTheme(nextTheme)
    }

    const finish = () => {
      root.classList.remove('theme-crossfade', 'theme-color-fade')
      isAnimating.current = false
    }

    if (typeof document.startViewTransition === 'function') {
      root.classList.add('theme-crossfade')
      const transition = document.startViewTransition(applyTheme)
      void transition.finished.then(finish, finish)
      return
    }

    // Commit the transition rules before changing colors in older browsers.
    root.classList.add('theme-color-fade')
    void getComputedStyle(document.body).backgroundColor
    applyTheme()
    window.setTimeout(finish, 700)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle color theme"
      onClick={toggleTheme}
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
                ? 'bg-primary font-medium text-primary-foreground shadow-[0_8px_18px_-10px_oklch(0.3_0.12_174/0.9)]'
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
          Reset sample inventory
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset sample inventory?</AlertDialogTitle>
          <AlertDialogDescription>
            This will restore the cafe sample catalog — products, categories,
            suppliers and stock history — replacing everything you changed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              resetData()
              toast.success('Cafe sample inventory has been restored.')
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
        <Coffee className="h-7 w-7" aria-hidden="true" />
      </div>
      <div className="space-y-1 text-center">
        <p className="font-semibold">Cafe Shop</p>
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

  React.useEffect(() => {
    if (!mounted) return
    if (!databaseApiEnabled) {
      toast.info('Using browser storage', {
        description: 'MongoDB API sync is disabled. Configure the database environment variables to enable it.',
      })
      return
    }
    void useInventoryStore.getState().hydrateFromApi().catch((error: unknown) => {
      toast.error('Could not connect to the inventory database', {
        description: error instanceof Error ? error.message : 'Please try again shortly.',
      })
    })
  }, [mounted])

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
      <div className="min-h-screen bg-transparent">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border/80 bg-sidebar/90 shadow-[18px_0_40px_-36px_oklch(0.2_0.04_174/0.55)] backdrop-blur-xl lg:flex">
        <div className="flex h-20 items-center border-b border-sidebar-border/80 px-5">
          <Brand />
        </div>
        <div className="px-5 pb-2 pt-7">
          <p className="eyebrow">Workspace</p>
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
        </div>
      </aside>

      {/* Content column */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:hidden">
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
        <div className="border-b border-border/70 bg-background/35 px-4 py-7 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <p className="eyebrow">Cafe Shop <span className="mx-1 text-muted-foreground/50">/</span> Operations</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              {meta.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{meta.subtitle}</p>
          </div>
        </div>

        {/* View content */}
        <main className="flex-1 px-4 py-7 md:px-6 lg:px-8">
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
