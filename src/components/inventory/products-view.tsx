'use client'

import * as React from 'react'
import { useMemo, useState } from 'react'
import {
  ArrowUpDown,
  MoreHorizontal,
  Package,
  PackageMinus,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatNumber, stockStatusMeta, timeAgo } from '@/lib/format'
import { getStockStatus, useInventoryStore } from '@/lib/store'
import type { Product, StockStatus } from '@/lib/types'
import type { QuickStockFn } from '@/components/inventory/app-shell'
import { ProductDialog } from '@/components/inventory/product-dialog'

type SortOption = 'name-asc' | 'stock-asc' | 'stock-desc' | 'value-desc'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'stock-asc', label: 'Stock (low → high)' },
  { value: 'stock-desc', label: 'Stock (high → low)' },
  { value: 'value-desc', label: 'Inventory value (high → low)' },
]

interface ProductsViewProps {
  onQuickStock: QuickStockFn
}

export function ProductsView({ onQuickStock }: ProductsViewProps) {
  const products = useInventoryStore((s) => s.products)
  const categories = useInventoryStore((s) => s.categories)
  const suppliers = useInventoryStore((s) => s.suppliers)
  const deleteProduct = useInventoryStore((s) => s.deleteProduct)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sort, setSort] = useState<SortOption>('name-asc')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  // Clear the target only after the dialog's fade-out so content stays stable
  const scheduleClearTarget = () => window.setTimeout(() => setDeleteTarget(null), 300)

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  )
  const supplierMap = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s.name])),
    [suppliers],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = products.filter((p) => {
      const matchesSearch =
        q === '' ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      const matchesCategory = categoryFilter === 'all' || p.categoryId === categoryFilter
      const matchesStatus = statusFilter === 'all' || getStockStatus(p) === (statusFilter as StockStatus)
      return matchesSearch && matchesCategory && matchesStatus
    })

    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case 'stock-asc':
          return a.quantity - b.quantity
        case 'stock-desc':
          return b.quantity - a.quantity
        case 'value-desc':
          return b.quantity * b.costPrice - a.quantity * a.costPrice
        default:
          return a.name.localeCompare(b.name)
      }
    })
    return rows
  }, [products, search, categoryFilter, statusFilter, sort])

  const openCreate = () => {
    setEditingProduct(null)
    setDialogOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const result = deleteProduct(deleteTarget.id)
    if (result.ok) {
      toast.success('Product deleted', { description: result.message })
    } else {
      toast.error('Could not delete product', { description: result.message })
    }
    setDeleteOpen(false)
    scheduleClearTarget()
  }

  const hasFilters = search.trim() !== '' || categoryFilter !== 'all' || statusFilter !== 'all'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="workspace-card flex flex-col gap-3 rounded-md border bg-card p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU or description…"
            className="h-10 border-transparent bg-background/80 pl-9 shadow-none focus-visible:border-ring"
            aria-label="Search products"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full lg:w-44" aria-label="Filter by category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-40" aria-label="Filter by stock status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="IN_STOCK">In Stock</SelectItem>
              <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="col-span-2 w-full sm:col-span-1 lg:w-48" aria-label="Sort products">
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Add Product
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Package className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
              <div>
                <p className="font-medium">
                  {products.length === 0
                    ? 'No products yet'
                    : hasFilters
                      ? 'No products match your filters'
                      : 'No products to show'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {products.length === 0
                    ? 'Add your first product to start tracking inventory.'
                    : 'Try adjusting the search or filters below.'}
                </p>
              </div>
              {hasFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setCategoryFilter('all')
                    setStatusFilter('all')
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Add Product
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-56">Product</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                     <TableHead className="hidden xl:table-cell">Supplier</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="min-w-28">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Updated</TableHead>
                    <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((product) => {
                    const status = getStockStatus(product)
                    const meta = stockStatusMeta[status]
                    const reorderBase = Math.max(product.reorderPoint * 2, 1)
                    const fillPct = Math.min((product.quantity / reorderBase) * 100, 100)
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.sku}
                            {product.location && ` · Loc ${product.location}`}
                          </p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="font-normal text-muted-foreground">
                            {categoryMap.get(product.categoryId) ?? 'Uncategorized'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                          {supplierMap.get(product.supplierId) ?? '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <p className="font-medium">{formatCurrency(product.sellingPrice)}</p>
                          <p className="text-xs text-muted-foreground">
                            cost {formatCurrency(product.costPrice)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium tabular-nums">
                            {formatNumber(product.quantity)}{' '}
                            <span className="text-xs font-normal text-muted-foreground">{product.unit}</span>
                          </p>
                          <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                            <div
                              className={`h-full rounded-full ${meta.dotClass}`}
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={meta.badgeClass} variant="outline">
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          {timeAgo(product.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${product.name}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => onQuickStock(product, 'IN')}>
                                <PackagePlus className="mr-2 h-4 w-4" /> Stock in
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onQuickStock(product, 'OUT')}
                                disabled={product.quantity <= 0}
                              >
                                <PackageMinus className="mr-2 h-4 w-4" /> Stock out
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEdit(product)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeleteTarget(product)
                                  setDeleteOpen(true)
                                }}
                                className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        Showing {filtered.length} of {products.length} products
      </p>

      {/* Add / edit dialog */}
      <ProductDialog open={dialogOpen} product={editingProduct} onClose={() => setDialogOpen(false)} />

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o)
          if (!o) scheduleClearTarget()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the product from your catalog. Past stock movements are kept in
              the history for auditing. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={confirmDelete}
            >
              Delete product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
