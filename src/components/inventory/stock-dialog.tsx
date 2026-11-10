'use client'

import * as React from 'react'
import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, PackageMinus, PackagePlus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatNumber } from '@/lib/format'
import { useInventoryStore } from '@/lib/store'
import type { Product } from '@/lib/types'

const QUICK_AMOUNTS = [1, 5, 10, 25, 50]

interface StockDialogProps {
  open: boolean
  product: Product | null
  mode: 'IN' | 'OUT'
  onClose: () => void
}

export function StockDialog({ open, product, mode, onClose }: StockDialogProps) {
  const stockIn = useInventoryStore((s) => s.stockIn)
  const stockOut = useInventoryStore((s) => s.stockOut)

  const [qty, setQty] = useState('1')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset the form whenever the dialog opens for a (new) product
  React.useEffect(() => {
    if (open) {
      setQty('1')
      setNote('')
      setError(null)
    }
  }, [open, product?.id, mode])

  if (!product) return null

  const isOut = mode === 'OUT'
  const parsedQty = Number(qty)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      setError('Enter a whole number greater than zero.')
      return
    }
    if (isOut && parsedQty > product.quantity) {
      setError(`Only ${product.quantity} ${product.unit} available in stock.`)
      return
    }

    if (isOut) {
      const result = stockOut(product.id, parsedQty, note)
      if (!result.ok) {
        setError(result.message ?? 'Could not record stock out.')
        return
      }
      toast.success('Stock out recorded', {
        description: `${parsedQty} ${product.unit} of “${product.name}” issued. Remaining: ${formatNumber(product.quantity - parsedQty)}.`,
      })
    } else {
      stockIn(product.id, parsedQty, note)
      toast.success('Stock in recorded', {
        description: `${parsedQty} ${product.unit} of “${product.name}” received. New total: ${formatNumber(product.quantity + parsedQty)}.`,
      })
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isOut ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                <PackageMinus className="h-4 w-4" aria-hidden="true" />
              </span>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <PackagePlus className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
            {isOut ? 'Record Stock Out' : 'Record Stock In'}
          </DialogTitle>
          <DialogDescription>
            {product.name} · SKU {product.sku}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Current stock</span>
            <span className="font-semibold">
              {formatNumber(product.quantity)} {product.unit}
              {isOut && product.quantity > 0 && (
                <span className="ml-2 font-normal text-muted-foreground">
                  → {formatNumber(Math.max(product.quantity - (Number.isInteger(parsedQty) ? Math.max(parsedQty, 0) : 0)))} {product.unit}
                </span>
              )}
              {!isOut && (
                <span className="ml-2 font-normal text-muted-foreground">
                  → {formatNumber(product.quantity + (Number.isInteger(parsedQty) ? parsedQty : 0))} {product.unit}
                </span>
              )}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock-qty">Quantity to {isOut ? 'issue' : 'receive'}</Label>
            <div className="relative">
              <Input
                id="stock-qty"
                type="number"
                min={1}
                step={1}
                value={qty}
                onChange={(e) => {
                  setQty(e.target.value)
                  setError(null)
                }}
                className="pr-14"
                aria-invalid={!!error}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                {product.unit}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => {
                    setQty(String(amount))
                    setError(null)
                  }}
                >
                  {isOut ? <ArrowUpFromLine className="mr-1 h-3 w-3" /> : <ArrowDownToLine className="mr-1 h-3 w-3" />}
                  {amount}
                </Button>
              ))}
            </div>
            {error && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock-note">Note (optional)</Label>
            <Textarea
              id="stock-note"
              placeholder={
                isOut
                  ? 'e.g. Store order #SO-2231, walk-in customer…'
                  : 'e.g. Purchase order #PO-1042, supplier delivery…'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className={isOut ? 'bg-red-600 text-white hover:bg-red-700' : ''}>
              {isOut ? 'Confirm stock out' : 'Confirm stock in'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
