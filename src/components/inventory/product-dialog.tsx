'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useInventoryStore } from '@/lib/store'
import type { Product } from '@/lib/types'

// ─── Validation schema (inputs are strings; converted on submit) ────────────

const notEmptyNumber = (label: string) =>
  z
    .string()
    .refine((v) => v.trim() !== '' && Number(v) >= 0, `Enter a valid ${label}`)

const wholeNumber = z
  .string()
  .refine(
    (v) => v.trim() !== '' && Number.isInteger(Number(v)) && Number(v) >= 0,
    'Enter a whole number of 0 or more',
  )

const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  sku: z
    .string()
    .min(2, 'SKU is required')
    .max(24, 'SKU must be 24 characters or fewer')
    .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and dashes only'),
  categoryId: z.string().min(1, 'Select a category'),
  supplierId: z.string().min(1, 'Select a supplier'),
  unit: z.string().min(1, 'Unit is required'),
  location: z.string(),
  costPrice: notEmptyNumber('cost price'),
  sellingPrice: notEmptyNumber('selling price'),
  quantity: wholeNumber,
  reorderPoint: wholeNumber,
  description: z.string(),
})

type ProductFormValues = z.infer<typeof productSchema>

const CREATE_DEFAULTS: ProductFormValues = {
  name: '',
  sku: '',
  categoryId: '',
  supplierId: '',
  unit: 'pcs',
  location: '',
  costPrice: '',
  sellingPrice: '',
  quantity: '0',
  reorderPoint: '10',
  description: '',
}

interface ProductDialogProps {
  open: boolean
  product: Product | null // null → create mode
  onClose: () => void
}

export function ProductDialog({ open, product, onClose }: ProductDialogProps) {
  const categories = useInventoryStore((s) => s.categories)
  const suppliers = useInventoryStore((s) => s.suppliers)
  const products = useInventoryStore((s) => s.products)
  const addProduct = useInventoryStore((s) => s.addProduct)
  const updateProduct = useInventoryStore((s) => s.updateProduct)

  const isEdit = !!product

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: CREATE_DEFAULTS,
  })

  // Re-seed the form each time the dialog opens
  React.useEffect(() => {
    if (!open) return
    if (product) {
      form.reset({
        name: product.name,
        sku: product.sku,
        categoryId: product.categoryId,
        supplierId: product.supplierId,
        unit: product.unit,
        location: product.location,
        costPrice: String(product.costPrice),
        sellingPrice: String(product.sellingPrice),
        quantity: String(product.quantity),
        reorderPoint: String(product.reorderPoint),
        description: product.description,
      })
    } else {
      form.reset(CREATE_DEFAULTS)
    }
  }, [open, product, form])

  const onSubmit = (values: ProductFormValues) => {
    // Business rule: SKU must be unique
    const duplicate = products.find(
      (p) => p.sku.toLowerCase() === values.sku.trim().toLowerCase() && p.id !== product?.id,
    )
    if (duplicate) {
      form.setError('sku', {
        message: `SKU “${values.sku}” is already used by “${duplicate.name}”`,
      })
      return
    }

    const payload = {
      name: values.name.trim(),
      sku: values.sku.trim().toUpperCase(),
      categoryId: values.categoryId,
      supplierId: values.supplierId,
      unit: values.unit.trim(),
      location: values.location.trim(),
      costPrice: Number(values.costPrice),
      sellingPrice: Number(values.sellingPrice),
      quantity: Number(values.quantity),
      reorderPoint: Number(values.reorderPoint),
      description: values.description.trim(),
    }

    if (isEdit && product) {
      updateProduct(product.id, payload)
      toast.success('Product updated', { description: `“${payload.name}” was saved successfully.` })
    } else {
      addProduct(payload)
      toast.success('Product added', {
        description: `“${payload.name}” is now part of your catalog.`,
      })
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto custom-scrollbar sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the product details below. Quantity changes are logged as stock adjustments.'
              : 'Fill in the details to add a new product to your inventory.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Product name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. House Blend Coffee Beans (1 kg)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SKU */}
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. COF-1020" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Unit */}
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. bag, bottle, tray" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No categories yet — create one first.
                        </div>
                      ) : (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Supplier */}
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No suppliers yet — create one first.
                        </div>
                      ) : (
                        suppliers.map((sup) => (
                          <SelectItem key={sup.id} value={sup.id}>
                            {sup.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cost price */}
            <FormField
              control={form.control}
              name="costPrice"
              render={({ field }) => (
                <FormItem>
                   <FormLabel>Cost price (PHP)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                        $
                      </span>
                      <Input type="number" min={0} step="0.01" className="pl-7" placeholder="0.00" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selling price */}
            <FormField
              control={form.control}
              name="sellingPrice"
              render={({ field }) => (
                <FormItem>
                   <FormLabel>Selling price (PHP)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                        $
                      </span>
                      <Input type="number" min={0} step="0.01" className="pl-7" placeholder="0.00" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity in stock</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={1} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reorder point */}
            <FormField
              control={form.control}
              name="reorderPoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder point</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={1} placeholder="10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage location (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. A-01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Short description of the product…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:col-span-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">{isEdit ? 'Save changes' : 'Add product'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
