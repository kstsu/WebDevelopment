import { db } from '@/lib/db'
import { buildSeedData } from '@/lib/seed-data'
import type { CategoryInput, ProductInput, StockInput, SupplierInput } from './schemas'

const toCents = (value: number): number => Math.round(value * 100)
const auditId = (): string => `audit-${crypto.randomUUID()}`
const movementId = (): string => `mov-${crypto.randomUUID()}`
const productId = (): string => `prd-${crypto.randomUUID()}`
const categoryId = (): string => `cat-${crypto.randomUUID()}`
const supplierId = (): string => `sup-${crypto.randomUUID()}`

export async function ensureSeeded(): Promise<void> {
  const existing = await db.category.count()
  if (existing > 0) return

  const seed = buildSeedData()
  await db.$transaction(async (tx) => {
    await tx.category.createMany({ data: seed.categories.map((category) => ({
      id: category.id, name: category.name, description: category.description,
      createdAt: new Date(category.createdAt), updatedAt: new Date(category.createdAt),
    })) })
    await tx.supplier.createMany({ data: seed.suppliers.map((supplier) => ({
      id: supplier.id, name: supplier.name, contactPerson: supplier.contactPerson,
      email: supplier.email, phone: supplier.phone, address: supplier.address,
      createdAt: new Date(supplier.createdAt), updatedAt: new Date(supplier.createdAt),
    })) })
    await tx.product.createMany({ data: seed.products.map((product) => ({
      id: product.id, sku: product.sku, name: product.name, description: product.description,
      categoryId: product.categoryId, supplierId: product.supplierId, unit: product.unit,
      costPriceCents: Math.round(product.costPrice * 100), sellingPriceCents: Math.round(product.sellingPrice * 100),
      quantity: product.quantity, reorderPoint: product.reorderPoint, location: product.location,
      createdAt: new Date(product.createdAt), updatedAt: new Date(product.updatedAt),
    })) })
    await tx.stockMovement.createMany({ data: seed.movements.map((movement) => ({
      id: movement.id, productId: movement.productId, productName: movement.productName,
      type: movement.type, quantity: movement.quantity, resultQuantity: movement.resultQuantity,
      note: movement.note, date: new Date(movement.date),
    })) })
  })
}

export async function resetInventory(): Promise<void> {
  const seed = buildSeedData()
  await db.$transaction(async (tx) => {
    await tx.stockMovement.deleteMany()
    await tx.product.deleteMany()
    await tx.category.deleteMany()
    await tx.supplier.deleteMany()
    await tx.auditLog.deleteMany()
    await tx.category.createMany({ data: seed.categories.map((category) => ({
      id: category.id, name: category.name, description: category.description,
      createdAt: new Date(category.createdAt), updatedAt: new Date(category.createdAt),
    })) })
    await tx.supplier.createMany({ data: seed.suppliers.map((supplier) => ({
      id: supplier.id, name: supplier.name, contactPerson: supplier.contactPerson,
      email: supplier.email, phone: supplier.phone, address: supplier.address,
      createdAt: new Date(supplier.createdAt), updatedAt: new Date(supplier.createdAt),
    })) })
    await tx.product.createMany({ data: seed.products.map((product) => ({
      id: product.id, sku: product.sku, name: product.name, description: product.description,
      categoryId: product.categoryId, supplierId: product.supplierId, unit: product.unit,
      costPriceCents: Math.round(product.costPrice * 100), sellingPriceCents: Math.round(product.sellingPrice * 100),
      quantity: product.quantity, reorderPoint: product.reorderPoint, location: product.location,
      createdAt: new Date(product.createdAt), updatedAt: new Date(product.updatedAt),
    })) })
    await tx.stockMovement.createMany({ data: seed.movements.map((movement) => ({
      id: movement.id, productId: movement.productId, productName: movement.productName,
      type: movement.type, quantity: movement.quantity, resultQuantity: movement.resultQuantity,
      note: movement.note, date: new Date(movement.date),
    })) })
  })
}

export async function listInventory() {
  const [categories, suppliers, products, movements] = await Promise.all([
    db.category.findMany({ orderBy: { name: 'asc' } }),
    db.supplier.findMany({ orderBy: { name: 'asc' } }),
    db.product.findMany({ orderBy: { name: 'asc' } }),
    db.stockMovement.findMany({ orderBy: [{ date: 'desc' }, { id: 'desc' }], take: 500 }),
  ])
  return { categories, suppliers, products, movements }
}

export async function createProduct(input: ProductInput) {
  const id = input.id ?? productId()
  return db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        id,
        name: input.name,
        sku: input.sku.toUpperCase(),
        description: input.description,
        categoryId: input.categoryId,
        supplierId: input.supplierId,
        unit: input.unit,
        costPriceCents: toCents(input.costPrice),
        sellingPriceCents: toCents(input.sellingPrice),
        quantity: input.quantity,
        reorderPoint: input.reorderPoint,
        location: input.location,
      },
    })
    if (input.quantity > 0) {
      await tx.stockMovement.create({
        data: {
          id: movementId(), productId: id, productName: product.name,
          type: 'IN', quantity: input.quantity, resultQuantity: input.quantity,
          note: 'Initial stock recorded on product creation', date: new Date(),
        },
      })
    }
    await tx.auditLog.create({
      data: { id: auditId(), actorType: 'system', action: 'product.created', subjectType: 'product', subjectId: id },
    })
    return product
  })
}

export async function updateProduct(id: string, input: ProductInput) {
  return db.$transaction(async (tx) => {
    const current = await tx.product.findUnique({ where: { id } })
    if (!current) return null
    const product = await tx.product.update({
      where: { id },
      data: {
        name: input.name, sku: input.sku.toUpperCase(), description: input.description,
        categoryId: input.categoryId, supplierId: input.supplierId, unit: input.unit,
        costPriceCents: toCents(input.costPrice), sellingPriceCents: toCents(input.sellingPrice),
        quantity: input.quantity, reorderPoint: input.reorderPoint, location: input.location,
      },
    })
    if (input.quantity !== current.quantity) {
      await tx.stockMovement.create({
        data: {
          id: movementId(), productId: id, productName: product.name, type: 'ADJUST',
          quantity: input.quantity - current.quantity, resultQuantity: input.quantity,
          note: 'Stock level corrected via product edit', date: new Date(),
        },
      })
    }
    await tx.auditLog.create({
      data: { id: auditId(), actorType: 'system', action: 'product.updated', subjectType: 'product', subjectId: id },
    })
    return product
  })
}

export async function deleteProduct(id: string) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id } })
    if (!product) return null
    await tx.product.delete({ where: { id } })
    await tx.auditLog.create({
      data: { id: auditId(), actorType: 'system', action: 'product.deleted', subjectType: 'product', subjectId: id },
    })
    return product
  })
}

export async function createCategory(input: CategoryInput) {
  const category = await db.category.create({ data: { id: input.id ?? categoryId(), name: input.name, description: input.description } })
  await db.auditLog.create({ data: { id: auditId(), actorType: 'system', action: 'category.created', subjectType: 'category', subjectId: category.id } })
  return category
}

export async function updateCategory(id: string, input: CategoryInput) {
  const existing = await db.category.findUnique({ where: { id } })
  if (!existing) return null
  const category = await db.category.update({ where: { id }, data: { name: input.name, description: input.description } })
  await db.auditLog.create({ data: { id: auditId(), actorType: 'system', action: 'category.updated', subjectType: 'category', subjectId: id } })
  return category
}

export async function deleteCategory(id: string) {
  const category = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } })
  if (!category) return null
  if (category._count.products > 0) return { conflict: true, count: category._count.products, category }
  await db.category.delete({ where: { id } })
  await db.auditLog.create({ data: { id: auditId(), actorType: 'system', action: 'category.deleted', subjectType: 'category', subjectId: id } })
  return { conflict: false, category }
}

export async function createSupplier(input: SupplierInput) {
  const supplier = await db.supplier.create({ data: { id: input.id ?? supplierId(), name: input.name, contactPerson: input.contactPerson, email: input.email, phone: input.phone, address: input.address } })
  await db.auditLog.create({ data: { id: auditId(), actorType: 'system', action: 'supplier.created', subjectType: 'supplier', subjectId: supplier.id } })
  return supplier
}

export async function updateSupplier(id: string, input: SupplierInput) {
  const existing = await db.supplier.findUnique({ where: { id } })
  if (!existing) return null
  const supplier = await db.supplier.update({
    where: { id },
    data: {
      name: input.name,
      contactPerson: input.contactPerson,
      email: input.email,
      phone: input.phone,
      address: input.address,
    },
  })
  await db.auditLog.create({ data: { id: auditId(), actorType: 'system', action: 'supplier.updated', subjectType: 'supplier', subjectId: id } })
  return supplier
}

export async function deleteSupplier(id: string) {
  const supplier = await db.supplier.findUnique({ where: { id }, include: { _count: { select: { products: true } } } })
  if (!supplier) return null
  if (supplier._count.products > 0) return { conflict: true, count: supplier._count.products, supplier }
  await db.supplier.delete({ where: { id } })
  await db.auditLog.create({ data: { id: auditId(), actorType: 'system', action: 'supplier.deleted', subjectType: 'supplier', subjectId: id } })
  return { conflict: false, supplier }
}

export async function applyStock(id: string, input: StockInput) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id } })
    if (!product) return null
    const nextQuantity = input.mode === 'IN'
      ? product.quantity + input.quantity
      : input.mode === 'OUT'
        ? product.quantity - input.quantity
        : input.quantity
    if (nextQuantity < 0) return { insufficient: true, available: product.quantity }
    const updated = await tx.product.update({ where: { id }, data: { quantity: nextQuantity } })
    const movement = await tx.stockMovement.create({
      data: {
        id: movementId(), productId: id, productName: product.name, type: input.mode,
        quantity: input.mode === 'OUT' ? -input.quantity : input.mode === 'ADJUST' ? input.quantity - product.quantity : input.quantity,
        resultQuantity: nextQuantity, note: input.note || 'Stock updated', date: new Date(),
      },
    })
    await tx.auditLog.create({ data: { id: auditId(), actorType: 'system', action: `stock.${input.mode.toLowerCase()}`, subjectType: 'product', subjectId: id } })
    return { insufficient: false, product: updated, movement }
  })
}
