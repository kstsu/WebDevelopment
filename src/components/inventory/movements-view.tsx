'use client'

import * as React from 'react'
import { useMemo, useState } from 'react'
import { ArrowLeftRight, PackageMinus, PackagePlus, Scale, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
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
import { formatDateTime, formatNumber, movementMeta } from '@/lib/format'
import { useInventoryStore } from '@/lib/store'
import type { MovementType, StockMovement } from '@/lib/types'

const MOVEMENT_ICON: Record<MovementType, React.ElementType> = {
  IN: PackagePlus,
  OUT: PackageMinus,
  ADJUST: Scale,
}

export function MovementsView() {
  const movements = useInventoryStore((s) => s.movements)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const sorted = [...movements].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    return sorted.filter((m) => {
      const matchesSearch = q === '' || m.productName.toLowerCase().includes(q) || m.note.toLowerCase().includes(q)
      const matchesType = typeFilter === 'all' || m.type === (typeFilter as MovementType)
      return matchesSearch && matchesType
    })
  }, [movements, search, typeFilter])

  const hasFilters = search.trim() !== '' || typeFilter !== 'all'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
             placeholder="Search by product or note…"
            className="pl-9"
            aria-label="Search movements"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by movement type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="IN">Stock In</SelectItem>
            <SelectItem value="OUT">Stock Out</SelectItem>
            <SelectItem value="ADJUST">Adjustment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="py-0">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <ArrowLeftRight className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
              <div>
                <p className="font-medium">
                   {movements.length === 0 ? 'No restock activity yet' : 'No activity matches your filters'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {movements.length === 0
                     ? 'Stock changes will appear here as you receive, use or adjust supplies.'
                    : 'Try a different search term or type filter.'}
                </p>
              </div>
              {hasFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setTypeFilter('all')
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-40">Date &amp; Time</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Stock After</TableHead>
                    <TableHead className="hidden min-w-48 lg:table-cell">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((movement: StockMovement) => {
                    const meta = movementMeta[movement.type]
                    const Icon = MOVEMENT_ICON[movement.type]
                    return (
                      <TableRow key={movement.id}>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                          {formatDateTime(movement.date)}
                        </TableCell>
                        <TableCell className="font-medium">{movement.productName}</TableCell>
                        <TableCell>
                          <Badge className={meta.badgeClass} variant="outline">
                            <Icon className="mr-1 h-3 w-3" aria-hidden="true" />
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold tabular-nums ${
                            movement.type === 'IN'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : movement.type === 'OUT'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {meta.sign(movement.quantity)}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">
                          {formatNumber(movement.resultQuantity)}
                        </TableCell>
                        <TableCell className="hidden max-w-72 truncate text-sm text-muted-foreground lg:table-cell">
                          {movement.note}
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
         Showing {filtered.length} of {movements.length} stock changes
      </p>
    </div>
  )
}
