'use client'

import * as React from 'react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Brand } from './brand'
import { ThemeToggle } from './theme-toggle'
import { canManageInventory, type AccountIdentity, type AccountSummary } from '@/lib/auth-types'
import { AccountsView } from '@/components/inventory/accounts-view'

import {
  ArrowLeftRight,
  LayoutDashboard,
  Menu,
  Package,
  RotateCcw,
  Tags,
  Truck,
  Users,
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
import { logoutAction } from '@/app/auth-actions'
import { databaseApiEnabled, setInventoryWriteAccess, useInventoryStore } from '@/lib/store'
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
  { id: 'movements', label: 'Inventory History', icon: ArrowLeftRight },
  { id: 'accounts', label: 'Accounts', icon: Users },
]

const VIEW_META: Record<ViewId, { title: string; subtitle: string }> = {
  accounts: { title: 'Accounts', subtitle: 'Manage staff access to your inventory' },
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
    title: 'Inventory History',
    subtitle: 'Review every change made to your inventory',
  },
}

export type QuickStockFn = (product: Product, mode: 'IN' | 'OUT') => void

// ─── Nav list (shared between sidebar and mobile sheet) ─────────────────────

function NavList({
  active,
  canManage,
  onSelect,
}: {
  active: ViewId
  canManage: boolean
  onSelect: (id: ViewId) => void
}) {
  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1">
      {NAV_ITEMS.filter((item) => canManage || item.id !== 'accounts').map(({ id, label, icon: Icon }) => {
        const isActive = id === active
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-primary font-medium text-primary-foreground'
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
  const [progress, setProgress] = useState(0)

  React.useEffect(() => {
    let frame: number
    const start = performance.now()
    const update = (now: number) => {
      const next = Math.min(100, Math.round(((now - start) / 1000) * 100))
      setProgress(next)
      if (next < 100) frame = window.requestAnimationFrame(update)
    }
    frame = window.requestAnimationFrame(update)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <div role="status" aria-label="Loading workspace" className="fixed inset-0 z-50 flex min-h-svh items-center justify-center bg-background text-foreground">
      <div className="flex w-48 flex-col items-center gap-6">
        <p className="text-[32px] font-semibold leading-none tracking-[-0.05em]">naokoffi</p>
        <div aria-hidden="true" className="h-px w-full overflow-hidden bg-foreground/15">
          <div className="h-full w-full origin-left bg-foreground" style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        <span aria-hidden="true" className="-mt-3 text-center text-[10px] tabular-nums tracking-[0.08em] text-muted-foreground">{progress}%</span>
      </div>
    </div>
  )
}

// ─── App shell ──────────────────────────────────────────────────────────────

export function AppShell({ user, initialView = 'dashboard', accounts = [] }: { user: AccountIdentity; initialView?: ViewId; accounts?: AccountSummary[] }) {
  const canManage = canManageInventory(user.role)
  React.useEffect(() => {
    setInventoryWriteAccess(canManage)
    return () => setInventoryWriteAccess(false)
  }, [canManage])
  const [selectedView, setView] = useState<ViewId>(initialView)
  const view = !canManage && selectedView === 'accounts' ? 'dashboard' : selectedView
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [stockTarget, setStockTarget] = useState<{
    product: Product
    mode: 'IN' | 'OUT'
  } | null>(null)
  const [splashComplete, setSplashComplete] = useState(false)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setSplashComplete(true), 1100)
    return () => window.clearTimeout(timer)
  }, [])

  React.useEffect(() => {
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
  }, [])

  const openQuickStock: QuickStockFn = React.useCallback((product, mode) => {
    setStockTarget({ product, mode })
  }, [])

  const selectView = (id: ViewId) => {
    if (id === 'accounts' && !canManage) return
    setView(id)
    setMobileNavOpen(false)
  }

  if (!splashComplete) return <BootSplash />

  const meta = VIEW_META[view]

  return (
      <div className="min-h-screen bg-transparent">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-20 items-center border-b border-sidebar-border/80 px-5">
          <Brand />
        </div>
        <div className="px-5 pb-2 pt-7">
          <p className="eyebrow">Workspace</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          <NavList active={view} canManage={canManage} onSelect={selectView} />
        </div>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Appearance</p>
            <ThemeToggle />
          </div>
          {canManage && <ResetDataButton full />}
            <form action={logoutAction}><Button type="submit" variant="ghost" className="w-full justify-start">Logout</Button></form>
        </div>
      </aside>

      {/* Content column */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background px-4 lg:hidden">
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
                  <NavList active={view} canManage={canManage} onSelect={selectView} />
                </div>
                <div className="border-t p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Appearance</p>
                    <ThemeToggle />
                  </div>
                  {canManage && <ResetDataButton full />}
            <form action={logoutAction}><Button type="submit" variant="ghost" className="w-full justify-start">Logout</Button></form>
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
        <div className="border-b border-border bg-background px-4 py-8 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
             <p className="eyebrow">
               {view === 'accounts' ? 'naokoffi' : 'naokoffi☕'} <span className="mx-1 text-muted-foreground/50">/</span> {view === 'accounts' ? 'Administration' : 'Operations'}
             </p>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
              {meta.title}
            </h1>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">{meta.subtitle}</p>
          </div>
        </div>

        {/* View content */}
        <main className="flex-1 px-4 py-8 md:px-6 lg:px-8">
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
                  <DashboardView onNavigate={selectView} onQuickStock={canManage ? openQuickStock : undefined} />
                )}
                {view === 'products' && <ProductsView onQuickStock={canManage ? openQuickStock : undefined} />}
                {view === 'categories' && <CategoriesView canManage={canManage} />}
                {view === 'suppliers' && <SuppliersView canManage={canManage} />}
                {view === 'accounts' && canManage && <AccountsView accounts={accounts} user={user} />}
                {view === 'movements' && <MovementsView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

      </div>

      {/* Quick stock dialog, shared by dashboard + products views */}
      {canManage && stockTarget && <StockDialog
        open={!!stockTarget}
        product={stockTarget?.product ?? null}
        mode={stockTarget?.mode ?? 'IN'}
        onClose={() => setStockTarget(null)}
      />}
    </div>
  )
}
