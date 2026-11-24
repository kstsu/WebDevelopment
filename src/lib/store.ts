'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { buildSeedData } from '@/lib/seed-data'
import type {
  ActionResult,
  Category,
  Product,
  StockMovement,
  StockStatus,
  Supplier,
} from '@/lib/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function genId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12)
  return `${prefix}-${rand}`
}

const nowIso = () => new Date().toISOString()
export const databaseApiEnabled = process.env.NEXT_PUBLIC_DATABASE_ENABLED === 'true'

let writesAllowed = false
export function setInventoryWriteAccess(allowed: boolean) { writesAllowed = allowed }
const writeDenied = 'Owner or admin access required.'

async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new Error(body?.detail ?? 'The server could not complete the request.')
  }
  if (response.status === 204) return undefined as T
  const payload = (await response.json()) as { data: T }
  return payload.data
}

function syncApi(path: string, init: RequestInit, operation: string, resourceId?: string): void {
  if (!databaseApiEnabled) return

  void requestApi<unknown>(path, init).catch((error: unknown) => {
    console.error(JSON.stringify({
      event: 'inventory.sync_failed',
      operation,
      ...(resourceId ? { resource_id: resourceId } : {}),
      error: error instanceof Error ? error.message : 'unknown_error',
    }))
  })
}

const productPayload = (data: NewProductData, id?: string) => ({
  ...data,
  sku: data.sku.toUpperCase(),
  ...(id ? { id } : {}),
})

// ─── Store shape ────────────────────────────────────────────────────────────

export type NewProductData = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>

export interface NewCategoryData {
  name: string
  description: string
}

export type NewSupplierData = Omit<Supplier, 'id' | 'createdAt'>

interface InventoryState {
  products: Product[]
  categories: Category[]
  suppliers: Supplier[]
  movements: StockMovement[]

  // Products CRUD
  addProduct: (data: NewProductData) => Product
  updateProduct: (id: string, data: NewProductData) => void
  deleteProduct: (id: string) => ActionResult

  // Stock operations (create movement records)
  stockIn: (productId: string, qty: number, note: string) => void
  stockOut: (productId: string, qty: number, note: string) => ActionResult
  adjustStock: (productId: string, countedQty: number, note: string) => void

  // Categories CRUD
  addCategory: (data: NewCategoryData) => void
  updateCategory: (id: string, data: NewCategoryData) => void
  deleteCategory: (id: string) => ActionResult

  // Suppliers CRUD
  addSupplier: (data: NewSupplierData) => void
  updateSupplier: (id: string, data: NewSupplierData) => void
  deleteSupplier: (id: string) => ActionResult

  // Utility
  resetData: () => void
  hydrateFromApi: () => Promise<void>
}

const seed = buildSeedData()

export const useInventoryStore = create<InventoryState>()(
  persist<InventoryState>(
    (apply, get) => {
      const set = (change: Partial<InventoryState> | ((s: InventoryState) => Partial<InventoryState>)) => {
        if (!writesAllowed) throw new Error(writeDenied)
        apply(change)
      }
      return ({
      products: seed.products,
      categories: seed.categories,
      suppliers: seed.suppliers,
      movements: seed.movements,

      hydrateFromApi: async () => {
        if (!databaseApiEnabled) return
        const data = await requestApi<Pick<InventoryState, 'products' | 'categories' | 'suppliers' | 'movements'>>('/api/inventory')
        apply(data)
      },

      // ── Products ────────────────────────────────────────────────────────
      addProduct: (data) => {
        const product: Product = {
          ...data,
          id: genId('prd'),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }
        set((s) => ({
          products: [product, ...s.products],
          movements:
            product.quantity > 0
              ? [
                  {
                    id: genId('mov'),
                    productId: product.id,
                    productName: product.name,
                    type: 'IN',
                    quantity: product.quantity,
                    resultQuantity: product.quantity,
                    note: 'Initial stock recorded on product creation',
                    date: nowIso(),
                  },
                  ...s.movements,
                ]
              : s.movements,
        }))
        syncApi('/api/products', { method: 'POST', body: JSON.stringify(productPayload(data, product.id)) }, 'product.created', product.id)
        return product
      },

      updateProduct: (id, data) => {
        set((s) => {
          const current = s.products.find((p) => p.id === id)
          if (!current) return s

          const updated: Product = { ...current, ...data, updatedAt: nowIso() }

          // Quantity changed via the edit form → log an ADJUST movement so the
          // audit trail stays truthful.
          let movements = s.movements
          if (data.quantity !== current.quantity) {
            movements = [
              {
                id: genId('mov'),
                productId: id,
                productName: updated.name,
                type: 'ADJUST',
                quantity: data.quantity - current.quantity,
                resultQuantity: data.quantity,
                note: 'Stock level corrected via product edit',
                date: nowIso(),
              },
              ...movements,
            ]
          }
          return {
            products: s.products.map((p) => (p.id === id ? updated : p)),
            movements,
          }
        })
        syncApi(`/api/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(productPayload(data)) }, 'product.updated', id)
      },

      deleteProduct: (id) => {
        if (!writesAllowed) return { ok: false, message: writeDenied }
        const product = get().products.find((p) => p.id === id)
        if (!product) return { ok: false, message: 'Product not found.' }
        set((s) => ({ products: s.products.filter((p) => p.id !== id) }))
        syncApi(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' }, 'product.deleted', id)
        return { ok: true, message: `“${product.name}” was deleted.` }
      },

      // ── Stock operations ────────────────────────────────────────────────
      stockIn: (productId, qty, note) => {
        set((s) => {
          const product = s.products.find((p) => p.id === productId)
          if (!product || qty <= 0) return s
          const resultQuantity = product.quantity + qty
          return {
            products: s.products.map((p) =>
              p.id === productId
                ? { ...p, quantity: resultQuantity, updatedAt: nowIso() }
                : p,
            ),
            movements: [
              {
                id: genId('mov'),
                productId,
                productName: product.name,
                type: 'IN',
                quantity: qty,
                resultQuantity,
                note: note.trim() || 'Stock received',
                date: nowIso(),
              },
              ...s.movements,
            ],
          }
        })
        syncApi(`/api/products/${encodeURIComponent(productId)}/stock`, { method: 'POST', body: JSON.stringify({ mode: 'IN', quantity: qty, note }) }, 'stock.in', productId)
      },

      stockOut: (productId, qty, note) => {
        if (!writesAllowed) return { ok: false, message: writeDenied }
        const product = get().products.find((p) => p.id === productId)
        if (!product) return { ok: false, message: 'Product not found.' }
        if (qty <= 0) return { ok: false, message: 'Quantity must be greater than zero.' }
        if (qty > product.quantity) {
          return {
            ok: false,
            message: `Only ${product.quantity} ${product.unit} available in stock.`,
          }
        }
        const resultQuantity = product.quantity - qty
        set((s) => ({
          products: s.products.map((p) =>
            p.id === productId
              ? { ...p, quantity: resultQuantity, updatedAt: nowIso() }
              : p,
          ),
          movements: [
            {
              id: genId('mov'),
              productId,
              productName: product.name,
              type: 'OUT',
              quantity: -qty,
              resultQuantity,
              note: note.trim() || 'Stock issued',
              date: nowIso(),
            },
            ...s.movements,
          ],
        }))
        syncApi(`/api/products/${encodeURIComponent(productId)}/stock`, { method: 'POST', body: JSON.stringify({ mode: 'OUT', quantity: qty, note }) }, 'stock.out', productId)
        return { ok: true }
      },

      adjustStock: (productId, countedQty, note) => {
        set((s) => {
          const product = s.products.find((p) => p.id === productId)
          if (!product || countedQty < 0 || countedQty === product.quantity) return s
          return {
            products: s.products.map((p) =>
              p.id === productId
                ? { ...p, quantity: countedQty, updatedAt: nowIso() }
                : p,
            ),
            movements: [
              {
                id: genId('mov'),
                productId,
                productName: product.name,
                type: 'ADJUST',
                quantity: countedQty - product.quantity,
                resultQuantity: countedQty,
                note: note.trim() || 'Manual stock adjustment',
                date: nowIso(),
              },
              ...s.movements,
            ],
          }
        })
      },

      // ── Categories ──────────────────────────────────────────────────────
      addCategory: (data) => {
        const category = { id: genId('cat'), name: data.name.trim(), description: data.description.trim(), createdAt: nowIso() }
        set((s) => ({
          categories: [
            ...s.categories,
            category,
          ],
        }))
        syncApi('/api/categories', { method: 'POST', body: JSON.stringify({ ...data, id: category.id }) }, 'category.created', category.id)
      },

      updateCategory: (id, data) => {
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === id
              ? { ...c, name: data.name.trim(), description: data.description.trim() }
              : c,
          ),
        }))
        syncApi(`/api/categories/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }, 'category.updated', id)
      },

      deleteCategory: (id) => {
        if (!writesAllowed) return { ok: false, message: writeDenied }
        const { products, categories } = get()
        const inUse = products.filter((p) => p.categoryId === id).length
        if (inUse > 0) {
          const cat = categories.find((c) => c.id === id)
          return {
            ok: false,
            message: `Cannot delete “${cat?.name ?? 'category'}” — ${inUse} product${inUse === 1 ? ' is' : 's are'} still assigned to it.`,
          }
        }
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }))
        syncApi(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }, 'category.deleted', id)
        return { ok: true, message: 'Category deleted.' }
      },

      // ── Suppliers ───────────────────────────────────────────────────────
      addSupplier: (data) => {
        const supplier = { ...data, name: data.name.trim(), id: genId('sup'), createdAt: nowIso() }
        set((s) => ({
          suppliers: [
            ...s.suppliers,
            supplier,
          ],
        }))
        syncApi('/api/suppliers', { method: 'POST', body: JSON.stringify(data) }, 'supplier.created', supplier.id)
      },

      updateSupplier: (id, data) => {
        set((s) => ({
          suppliers: s.suppliers.map((sup) =>
            sup.id === id ? { ...sup, ...data, name: data.name.trim() } : sup,
          ),
        }))
        syncApi(`/api/suppliers/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }, 'supplier.updated', id)
      },

      deleteSupplier: (id) => {
        if (!writesAllowed) return { ok: false, message: writeDenied }
        const { products, suppliers } = get()
        const inUse = products.filter((p) => p.supplierId === id).length
        if (inUse > 0) {
          const sup = suppliers.find((x) => x.id === id)
          return {
            ok: false,
            message: `Cannot delete “${sup?.name ?? 'supplier'}” — ${inUse} product${inUse === 1 ? ' is' : 's are'} still linked to it.`,
          }
        }
        set((s) => ({ suppliers: s.suppliers.filter((x) => x.id !== id) }))
        syncApi(`/api/suppliers/${encodeURIComponent(id)}`, { method: 'DELETE' }, 'supplier.deleted', id)
        return { ok: true, message: 'Supplier deleted.' }
      },

      // ── Utility ─────────────────────────────────────────────────────────
      resetData: () => {
        const fresh = buildSeedData()
        set({
          products: fresh.products,
          categories: fresh.categories,
          suppliers: fresh.suppliers,
          movements: fresh.movements,
        })
        if (databaseApiEnabled) {
          void requestApi('/api/inventory/reset', { method: 'POST' }).then(() => useInventoryStore.getState().hydrateFromApi()).catch((error: unknown) => {
            console.error(JSON.stringify({ event: 'inventory.sync_failed', operation: 'inventory.reset', error: error instanceof Error ? error.message : 'unknown_error' }))
          })
        }
      },
      })
    },
    {
      // Keep the previous general-supply catalog intact under its old key.
      // The cafe workspace starts with its own inventory and saved changes.
      name: 'cafe-shop-inventory-v2',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)

// ─── Derived selectors / helpers ────────────────────────────────────────────

export function getStockStatus(product: Product): StockStatus {
  if (product.quantity <= 0) return 'OUT_OF_STOCK'
  if (product.quantity <= product.reorderPoint) return 'LOW_STOCK'
  return 'IN_STOCK'
}
