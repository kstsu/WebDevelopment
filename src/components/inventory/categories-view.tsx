'use client'

import * as React from 'react'
import { useMemo, useState } from 'react'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
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
import { useInventoryStore } from '@/lib/store'
import type { Category } from '@/lib/types'

interface CategoryDialogProps {
  open: boolean
  category: Category | null
  onClose: () => void
}

function CategoryDialog({ open, category, onClose }: CategoryDialogProps) {
  const addCategory = useInventoryStore((s) => s.addCategory)
  const updateCategory = useInventoryStore((s) => s.updateCategory)
  const categories = useInventoryStore((s) => s.categories)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const isEdit = !!category

  React.useEffect(() => {
    if (open) {
      setName(category?.name ?? '')
      setDescription(category?.description ?? '')
      setError(null)
    }
  }, [open, category])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Category name must be at least 2 characters.')
      return
    }
    const duplicate = categories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== category?.id,
    )
    if (duplicate) {
      setError(`A category named “${duplicate.name}” already exists.`)
      return
    }
    if (isEdit && category) {
      updateCategory(category.id, { name: trimmed, description: description.trim() })
      toast.success('Category updated', { description: `“${trimmed}” was saved.` })
    } else {
      addCategory({ name: trimmed, description: description.trim() })
      toast.success('Category added', { description: `“${trimmed}” is ready to use.` })
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Category' : 'Add Category'}</DialogTitle>
          <DialogDescription>
            Categories help you group products and analyze stock by segment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              placeholder="e.g. Coffee Beans"
              aria-invalid={!!error}
            />
            {error && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-desc">Description (optional)</Label>
            <Textarea
              id="cat-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What kind of products belong here?"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? 'Save changes' : 'Add category'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CategoriesView() {
  const categories = useInventoryStore((s) => s.categories)
  const products = useInventoryStore((s) => s.products)
  const deleteCategory = useInventoryStore((s) => s.deleteCategory)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  // Clear the target only after the dialog's fade-out so content stays stable
  const scheduleClearTarget = () => window.setTimeout(() => setDeleteTarget(null), 300)

  const productCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of products) {
      map.set(p.categoryId, (map.get(p.categoryId) ?? 0) + 1)
    }
    return map
  }, [products])

  const confirmDelete = () => {
    if (!deleteTarget) return
    const result = deleteCategory(deleteTarget.id)
    if (result.ok) {
      toast.success('Category deleted', { description: result.message })
    } else {
      toast.error('Cannot delete category', { description: result.message })
    }
    setDeleteOpen(false)
    scheduleClearTarget()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} ·{' '}
          {products.length} products organized
        </p>
        <Button
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card className="py-0">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Tags className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            <div>
              <p className="font-medium">No categories yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first category to start organizing products.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Add Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((cat) => {
            const count = productCounts.get(cat.id) ?? 0
            return (
              <Card
                key={cat.id}
                className="group"
              >
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{cat.name}</h3>
                      <p className="mt-0.5 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                        {cat.description || 'No description provided.'}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Edit ${cat.name}`}
                        onClick={() => {
                          setEditing(cat)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400"
                        aria-label={`Delete ${cat.name}`}
                        onClick={() => {
                          setDeleteTarget(cat)
                          setDeleteOpen(true)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <Badge variant="secondary">
                      {count} product{count === 1 ? '' : 's'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ID {cat.id.slice(0, 8)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <CategoryDialog open={dialogOpen} category={editing} onClose={() => setDialogOpen(false)} />

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
              {(productCounts.get(deleteTarget?.id ?? '') ?? 0) > 0
                ? 'This category still has products assigned to it, so deletion will be blocked.'
                : 'This category is not used by any product and will be removed permanently.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={confirmDelete}
            >
              Delete category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
