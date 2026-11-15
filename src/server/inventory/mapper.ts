import type { Category, Product, StockMovement, Supplier } from '@/lib/types'

const dollars = (cents: number): number => cents / 100

export function mapCategory(row: { id: string; name: string; description: string; createdAt: Date; updatedAt: Date }): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  }
}

export function mapSupplier(row: { id: string; name: string; contactPerson: string; email: string; phone: string; address: string; createdAt: Date; updatedAt: Date }): Supplier {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contactPerson,
    email: row.email,
    phone: row.phone,
    address: row.address,
    createdAt: row.createdAt.toISOString(),
  }
}

export function mapProduct(row: {
  id: string
  sku: string
  name: string
  description: string
  categoryId: string
  supplierId: string
  unit: string
  costPriceCents: number
  sellingPriceCents: number
  quantity: number
  reorderPoint: number
  location: string
  createdAt: Date
  updatedAt: Date
}): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    categoryId: row.categoryId,
    supplierId: row.supplierId,
    unit: row.unit,
    costPrice: dollars(row.costPriceCents),
    sellingPrice: dollars(row.sellingPriceCents),
    quantity: row.quantity,
    reorderPoint: row.reorderPoint,
    location: row.location,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function mapMovement(row: { id: string; productId: string | null; productName: string; type: string; quantity: number; resultQuantity: number; note: string; date: Date }): StockMovement {
  return {
    id: row.id,
    productId: row.productId ?? '',
    productName: row.productName,
    type: row.type as StockMovement['type'],
    quantity: row.quantity,
    resultQuantity: row.resultQuantity,
    note: row.note,
    date: row.date.toISOString(),
  }
}
