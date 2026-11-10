// ─── Core domain types for the Inventory System ─────────────────────────────

export interface Category {
  id: string
  name: string
  description: string
  createdAt: string
}

export interface Supplier {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  createdAt: string
}

export interface Product {
  id: string
  sku: string
  name: string
  description: string
  categoryId: string
  supplierId: string
  unit: string
  costPrice: number
  sellingPrice: number
  quantity: number
  reorderPoint: number
  location: string
  createdAt: string
  updatedAt: string
}

export type MovementType = 'IN' | 'OUT' | 'ADJUST'

export interface StockMovement {
  id: string
  productId: string
  /** Snapshot of the product name so history survives product deletion */
  productName: string
  type: MovementType
  /** Signed delta: positive for IN, negative for OUT, signed for ADJUST */
  quantity: number
  /** Stock level after the movement was applied */
  resultQuantity: number
  note: string
  date: string
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

export type ViewId = 'dashboard' | 'products' | 'categories' | 'suppliers' | 'movements'

/** Standard result for actions that can be rejected by business rules */
export interface ActionResult {
  ok: boolean
  message?: string
}
