'use client'

import * as React from 'react'
import { useMemo, useState } from 'react'
import { Building2, Mail, MapPin, Pencil, Phone, Plus, Trash2, Truck, UserRound } from 'lucide-react'
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
import type { Supplier } from '@/lib/types'

interface SupplierDialogProps {
  open: boolean
  supplier: Supplier | null
  onClose: () => void
}

interface SupplierFormState {
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
}

const EMPTY_FORM: SupplierFormState = {
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
}

function SupplierDialog({ open, supplier, onClose }: SupplierDialogProps) {
  const addSupplier = useInventoryStore((s) => s.addSupplier)
  const updateSupplier = useInventoryStore((s) => s.updateSupplier)
  const suppliers = useInventoryStore((s) => s.suppliers)

  const [form, setForm] = useState<SupplierFormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const isEdit = !!supplier

  React.useEffect(() => {
    if (open) {
      setForm(
        supplier
          ? {
              name: supplier.name,
              contactPerson: supplier.contactPerson,
              email: supplier.email,
              phone: supplier.phone,
              address: supplier.address,
            }
          : EMPTY_FORM,
      )
      setError(null)
    }
  }, [open, supplier])

  const setField = (key: keyof SupplierFormState) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (form.name.trim().length < 2) {
      setError('Supplier name must be at least 2 characters.')
      return
    }
    const duplicate = suppliers.find(
      (s) => s.name.toLowerCase() === form.name.trim().toLowerCase() && s.id !== supplier?.id,
    )
    if (duplicate) {
      setError(`A supplier named “${duplicate.name}” already exists.`)
      return
    }
    if (form.email.trim() !== '' && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    if (isEdit && supplier) {
      updateSupplier(supplier.id, {
        name: form.name,
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      })
      toast.success('Supplier updated', { description: `“${form.name.trim()}” was saved.` })
    } else {
      addSupplier({
        name: form.name,
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      })
      toast.success('Supplier added', {
        description: `“${form.name.trim()}” can now be linked to products.`,
      })
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto custom-scrollbar sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          <DialogDescription>
            Vendors you purchase stock from. Products link to one supplier.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sup-name">Company name</Label>
            <Input
              id="sup-name"
              value={form.name}
              onChange={(e) => setField('name')(e.target.value)}
              placeholder="e.g. Brightline Electronics"
              aria-invalid={!!error}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sup-contact">Contact person</Label>
              <Input
                id="sup-contact"
                value={form.contactPerson}
                onChange={(e) => setField('contactPerson')(e.target.value)}
                placeholder="e.g. Maya Chen"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-phone">Phone</Label>
              <Input
                id="sup-phone"
                value={form.phone}
                onChange={(e) => setField('phone')(e.target.value)}
                placeholder="e.g. +1 (555) 014-2298"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-email">Email</Label>
            <Input
              id="sup-email"
              type="email"
              value={form.email}
              onChange={(e) => setField('email')(e.target.value)}
              placeholder="e.g. orders@supplier.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-address">Address</Label>
            <Textarea
              id="sup-address"
              rows={2}
              value={form.address}
              onChange={(e) => setField('address')(e.target.value)}
              placeholder="Street, city, state, ZIP"
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? 'Save changes' : 'Add supplier'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SuppliersView() {
  const suppliers = useInventoryStore((s) => s.suppliers)
  const products = useInventoryStore((s) => s.products)
  const deleteSupplier = useInventoryStore((s) => s.deleteSupplier)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)

  // Clear the target only after the dialog's fade-out so content stays stable
  const scheduleClearTarget = () => window.setTimeout(() => setDeleteTarget(null), 300)

  const suppliedCounts = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>()
    for (const p of products) {
      const entry = map.get(p.supplierId) ?? { count: 0, value: 0 }
      entry.count += 1
      entry.value += p.quantity * p.costPrice
      map.set(p.supplierId, entry)
    }
    return map
  }, [products])

  const confirmDelete = () => {
    if (!deleteTarget) return
    const result = deleteSupplier(deleteTarget.id)
    if (result.ok) {
      toast.success('Supplier deleted', { description: result.message })
    } else {
      toast.error('Cannot delete supplier', { description: result.message })
    }
    setDeleteOpen(false)
    scheduleClearTarget()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {suppliers.length} supplier{suppliers.length === 1 ? '' : 's'} in your directory
        </p>
        <Button
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Add Supplier
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <Card className="py-0">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Truck className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            <div>
              <p className="font-medium">No suppliers yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first vendor to track where stock comes from.
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
              Add Supplier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((sup) => {
            const info = suppliedCounts.get(sup.id)
            return (
              <Card key={sup.id} className="group transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                        <Building2 className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{sup.name}</h3>
                        <p className="truncate text-sm text-muted-foreground">
                          {sup.contactPerson || 'No contact person'}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Edit ${sup.name}`}
                        onClick={() => {
                          setEditing(sup)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400"
                        aria-label={`Delete ${sup.name}`}
                        onClick={() => {
                          setDeleteTarget(sup)
                          setDeleteOpen(true)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{sup.email || 'No email on file'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{sup.phone || 'No phone on file'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="line-clamp-2">{sup.address || 'No address on file'}</span>
                    </li>
                  </ul>

                  <div className="mt-auto flex items-center justify-between">
                    <Badge variant="secondary">
                      {info?.count ?? 0} product{(info?.count ?? 0) === 1 ? '' : 's'} supplied
                    </Badge>
                    {(info?.value ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UserRound className="h-3 w-3" aria-hidden="true" />
                        stock value on file
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <SupplierDialog open={dialogOpen} supplier={editing} onClose={() => setDialogOpen(false)} />

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
              {(products.filter((p) => p.supplierId === deleteTarget?.id).length ?? 0) > 0
                ? 'Products are still linked to this supplier, so deletion will be blocked.'
                : 'This supplier is not linked to any product and will be removed permanently.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={confirmDelete}
            >
              Delete supplier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
