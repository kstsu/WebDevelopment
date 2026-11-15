import { z } from 'zod'

const id = z.string().trim().min(1).max(80)
const text = (max: number) => z.string().trim().min(1).max(max)
const optionalText = (max: number) => z.string().trim().max(max)

export const productInputSchema = z.object({
  id: id.optional(),
  name: text(160),
  sku: z.string().trim().min(2).max(24).regex(/^[A-Za-z0-9-]+$/),
  description: optionalText(1000),
  categoryId: id,
  supplierId: id,
  unit: text(32),
  costPrice: z.number().finite().min(0).max(1_000_000),
  sellingPrice: z.number().finite().min(0).max(1_000_000),
  quantity: z.number().int().min(0).max(2_000_000),
  reorderPoint: z.number().int().min(0).max(2_000_000),
  location: optionalText(80),
}).strict()

export const categoryInputSchema = z.object({
  id: id.optional(),
  name: text(100),
  description: optionalText(500),
}).strict()

export const supplierInputSchema = z.object({
  id: id.optional(),
  name: text(160),
  contactPerson: text(120),
  email: z.string().trim().email().max(255),
  phone: text(40),
  address: text(300),
}).strict()

export const stockInputSchema = z.object({
  mode: z.enum(['IN', 'OUT', 'ADJUST']),
  quantity: z.number().int().min(0).max(2_000_000),
  note: optionalText(500),
}).strict()

export const idSchema = z.object({ id }).strict()

export type ProductInput = z.infer<typeof productInputSchema>
export type CategoryInput = z.infer<typeof categoryInputSchema>
export type SupplierInput = z.infer<typeof supplierInputSchema>
export type StockInput = z.infer<typeof stockInputSchema>
