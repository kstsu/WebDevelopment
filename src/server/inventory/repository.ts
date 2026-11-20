import { ReturnDocument, type ClientSession } from 'mongodb'
import { ensureIndexes, getCollection, getMongoClient } from '@/lib/mongo'
import { buildSeedData } from '@/lib/seed-data'
import type { CategoryInput, ProductInput, StockInput, SupplierInput } from './schemas'

const COLLECTIONS = {
  categories: 'Category',
  suppliers: 'Supplier',
  products: 'Product',
  movements: 'StockMovement',
  auditLogs: 'AuditLog',
} as const

type CategoryDoc = {
  _id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
}

type SupplierDoc = {
  _id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  createdAt: Date
  updatedAt: Date
}

type ProductDoc = {
  _id: string
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
}

type MovementDoc = {
  _id: string
  productId: string | null
  productName: string
  type: string
  quantity: number
  resultQuantity: number
  note: string
  date: Date
}

type AuditDoc = {
  _id: string
  occurredAt: Date
  actorType: string
  action: string
  subjectType: string
  subjectId: string
  changes?: string
  requestId?: string
}

type Row<T extends { _id: string }> = Omit<T, '_id'> & { id: string }

function row<T extends { _id: string }>(doc: T): Row<T> {
  const { _id, ...rest } = doc
  return { ...rest, id: _id }
}

const toCents = (value: number): number => Math.round(value * 100)
const auditId = (): string => `audit-${crypto.randomUUID()}`
const movementId = (): string => `mov-${crypto.randomUUID()}`
const productId = (): string => `prd-${crypto.randomUUID()}`
const categoryId = (): string => `cat-${crypto.randomUUID()}`
const supplierId = (): string => `sup-${crypto.randomUUID()}`

function auditDoc(action: string, subjectType: string, subjectId: string): AuditDoc {
  return {
    _id: auditId(),
    occurredAt: new Date(),
    actorType: 'system',
    action,
    subjectType,
    subjectId,
  }
}

async function withTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const client = await getMongoClient()
  const session = client.startSession()
  try {
    session.startTransaction()
    const result = await work(session)
    await session.commitTransaction()
    return result
  } catch (error) {
    await session.abortTransaction().catch(() => undefined)
    throw error
  } finally {
    await session.endSession()
  }
}

function seedDocuments() {
  const seed = buildSeedData()
  return {
    categories: seed.categories.map((category): CategoryDoc => ({
      _id: category.id,
      name: category.name,
      description: category.description,
      createdAt: new Date(category.createdAt),
      updatedAt: new Date(category.createdAt),
    })),
    suppliers: seed.suppliers.map((supplier): SupplierDoc => ({
      _id: supplier.id,
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      createdAt: new Date(supplier.createdAt),
      updatedAt: new Date(supplier.createdAt),
    })),
    products: seed.products.map((product): ProductDoc => ({
      _id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      supplierId: product.supplierId,
      unit: product.unit,
      costPriceCents: toCents(product.costPrice),
      sellingPriceCents: toCents(product.sellingPrice),
      quantity: product.quantity,
      reorderPoint: product.reorderPoint,
      location: product.location,
      createdAt: new Date(product.createdAt),
      updatedAt: new Date(product.updatedAt),
    })),
    movements: seed.movements.map((movement): MovementDoc => ({
      _id: movement.id,
      productId: movement.productId,
      productName: movement.productName,
      type: movement.type,
      quantity: movement.quantity,
      resultQuantity: movement.resultQuantity,
      note: movement.note,
      date: new Date(movement.date),
    })),
  }
}

async function insertSeed(session?: ClientSession): Promise<void> {
  const seed = seedDocuments()
  const [categories, suppliers, products, movements] = await Promise.all([
    getCollection<CategoryDoc>(COLLECTIONS.categories),
    getCollection<SupplierDoc>(COLLECTIONS.suppliers),
    getCollection<ProductDoc>(COLLECTIONS.products),
    getCollection<MovementDoc>(COLLECTIONS.movements),
  ])

  if (seed.categories.length) await categories.insertMany(seed.categories, { session })
  if (seed.suppliers.length) await suppliers.insertMany(seed.suppliers, { session })
  if (seed.products.length) await products.insertMany(seed.products, { session })
  if (seed.movements.length) await movements.insertMany(seed.movements, { session })
}

export async function ensureSeeded(): Promise<void> {
  await ensureIndexes()
  const categories = await getCollection<CategoryDoc>(COLLECTIONS.categories)
  if (await categories.countDocuments({}) > 0) return

  await withTransaction(async (session) => {
    if (await categories.countDocuments({}, { session }) > 0) return
    await insertSeed(session)
  })
}

export async function resetInventory(): Promise<void> {
  const [categories, suppliers, products, movements, auditLogs] = await Promise.all([
    getCollection<CategoryDoc>(COLLECTIONS.categories),
    getCollection<SupplierDoc>(COLLECTIONS.suppliers),
    getCollection<ProductDoc>(COLLECTIONS.products),
    getCollection<MovementDoc>(COLLECTIONS.movements),
    getCollection<AuditDoc>(COLLECTIONS.auditLogs),
  ])

  await withTransaction(async (session) => {
    await movements.deleteMany({}, { session })
    await products.deleteMany({}, { session })
    await categories.deleteMany({}, { session })
    await suppliers.deleteMany({}, { session })
    await auditLogs.deleteMany({}, { session })
    await insertSeed(session)
  })
}

export async function listInventory() {
  const [categories, suppliers, products, movements] = await Promise.all([
    getCollection<CategoryDoc>(COLLECTIONS.categories).then((c) => c.find({}).sort({ name: 1 }).toArray()),
    getCollection<SupplierDoc>(COLLECTIONS.suppliers).then((c) => c.find({}).sort({ name: 1 }).toArray()),
    getCollection<ProductDoc>(COLLECTIONS.products).then((c) => c.find({}).sort({ name: 1 }).toArray()),
    getCollection<MovementDoc>(COLLECTIONS.movements).then((c) => c.find({}).sort({ date: -1, _id: -1 }).limit(500).toArray()),
  ])

  return {
    categories: categories.map(row),
    suppliers: suppliers.map(row),
    products: products.map(row),
    movements: movements.map(row),
  }
}

export async function createProduct(input: ProductInput) {
  const id = input.id ?? productId()
  const now = new Date()
  const product: ProductDoc = {
    _id: id,
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
    createdAt: now,
    updatedAt: now,
  }

  const [products, movements, auditLogs] = await Promise.all([
    getCollection<ProductDoc>(COLLECTIONS.products),
    getCollection<MovementDoc>(COLLECTIONS.movements),
    getCollection<AuditDoc>(COLLECTIONS.auditLogs),
  ])

  await withTransaction(async (session) => {
    await products.insertOne(product, { session })
    if (input.quantity > 0) {
      await movements.insertOne({
        _id: movementId(),
        productId: id,
        productName: product.name,
        type: 'IN',
        quantity: input.quantity,
        resultQuantity: input.quantity,
        note: 'Initial stock recorded on product creation',
        date: new Date(),
      }, { session })
    }
    await auditLogs.insertOne(auditDoc('product.created', 'product', id), { session })
  })

  return row(product)
}

export async function updateProduct(id: string, input: ProductInput) {
  const [products, movements, auditLogs] = await Promise.all([
    getCollection<ProductDoc>(COLLECTIONS.products),
    getCollection<MovementDoc>(COLLECTIONS.movements),
    getCollection<AuditDoc>(COLLECTIONS.auditLogs),
  ])

  return withTransaction(async (session) => {
    const current = await products.findOne({ _id: id }, { session })
    if (!current) return null

    const updated = await products.findOneAndUpdate(
      { _id: id },
      { $set: {
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
        updatedAt: new Date(),
      } },
      { returnDocument: ReturnDocument.AFTER, session },
    )
    if (!updated) return null

    if (input.quantity !== current.quantity) {
      await movements.insertOne({
        _id: movementId(),
        productId: id,
        productName: updated.name,
        type: 'ADJUST',
        quantity: input.quantity - current.quantity,
        resultQuantity: input.quantity,
        note: 'Stock level corrected via product edit',
        date: new Date(),
      }, { session })
    }
    await auditLogs.insertOne(auditDoc('product.updated', 'product', id), { session })
    return row(updated)
  })
}

export async function deleteProduct(id: string) {
  const [products, auditLogs] = await Promise.all([
    getCollection<ProductDoc>(COLLECTIONS.products),
    getCollection<AuditDoc>(COLLECTIONS.auditLogs),
  ])

  return withTransaction(async (session) => {
    const product = await products.findOne({ _id: id }, { session })
    if (!product) return null
    await products.deleteOne({ _id: id }, { session })
    await auditLogs.insertOne(auditDoc('product.deleted', 'product', id), { session })
    return row(product)
  })
}

export async function createCategory(input: CategoryInput) {
  const now = new Date()
  const category: CategoryDoc = {
    _id: input.id ?? categoryId(),
    name: input.name,
    description: input.description,
    createdAt: now,
    updatedAt: now,
  }
  const [categories, auditLogs] = await Promise.all([
    getCollection<CategoryDoc>(COLLECTIONS.categories),
    getCollection<AuditDoc>(COLLECTIONS.auditLogs),
  ])
  await categories.insertOne(category)
  await auditLogs.insertOne(auditDoc('category.created', 'category', category._id))
  return row(category)
}

export async function updateCategory(id: string, input: CategoryInput) {
  const [categories, auditLogs] = await Promise.all([
    getCollection<CategoryDoc>(COLLECTIONS.categories),
    getCollection<AuditDoc>(COLLECTIONS.auditLogs),
  ])
  const existing = await categories.findOne({ _id: id })
  if (!existing) return null

  const updated = await categories.findOneAndUpdate(
    { _id: id },
    { $set: { name: input.name, description: input.description, updatedAt: new Date() } },
    { returnDocument: ReturnDocument.AFTER },
  )
  if (!updated) return null
  await auditLogs.insertOne(auditDoc('category.updated', 'category', id))
  return row(updated)
}

export async function deleteCategory(id: string) {
  const [categories, products, auditLogs] = await Promise.all([
    getCollection<CategoryDoc>(COLLECTIONS.categories),
    getCollection<ProductDoc>(COLLECTIONS.products),
    getCollection<AuditDoc>(COLLECTIONS.auditLogs),
  ])
  const category = await categories.findOne({ _id: id })
  if (!category) return null

  const count = await products.countDocuments({ categoryId: id })
  if (count > 0) return { conflict: true, count, category: row(category) }

  await categories.deleteOne({ _id: id })
  await auditLogs.insertOne(auditDoc('category.deleted', 'category', id))
  return { conflict: false, category: row(category) }
}

export async function createSupplier(input: SupplierInput) {
  const now = new Date()
  const supplier: SupplierDoc = {
    _id: input.id ?? supplierId(),
    name: input.name,
    contactPerson: input.contactPerson,
    email: input.email,
    phone: input.phone,
    address: input.address,
    createdAt: now,
    updatedAt: now,
  }
  const [suppliers, auditLogs] = await Promise.all([
    getCollection<SupplierDoc>(COLLECTIONS.suppliers),
    getCollection<AuditDoc>(COLLECTIONS.auditLogs),
  ])
  await suppliers.insertOne(supplier)
  await auditLogs.insertOne(auditDoc('supplier.created', 'supplier', supplier._id))
  return row(supplier)
}

export async function updateSupplier(id: string, input: SupplierInput) {
  const [suppliers, auditLogs] = await Promise.all([
    getCollection<SupplierDoc>(COLLECTIONS.suppliers),
    getCollection<AuditDoc>(COLLECTIONS.auditLogs),
  ])
  const existing = await suppliers.findOne({ _id: id })
  if (!existing) return null

  const updated = await suppliers.findOneAndUpdate(
    { _id: id },
    { $set: {
      name: input.name,
      contactPerson: input.contactPerson,
      email: input.email,
      phone: input.phone,
      address: input.address,
      updatedAt: new Date(),
    } },
    { returnDocument: ReturnDocument.AFTER },
  )
  if (!updated) return null
  await auditLogs.insertOne(auditDoc('supplier.updated', 'supplier', id))
  return row(updated)
}

export async function deleteSupplier(id: string) {
  const [suppliers, products, auditLogs] = await Promise.all([
    getCollection<SupplierDoc>(COLLECTIONS.suppliers),
    getCollection<ProductDoc>(COLLECTIONS.products),
    getCollection<AuditDoc>(COLLECTIONS.auditLogs),
  ])
  const supplier = await suppliers.findOne({ _id: id })
  if (!supplier) return null

  const count = await products.countDocuments({ supplierId: id })
  if (count > 0) return { conflict: true, count, supplier: row(supplier) }

  await suppliers.deleteOne({ _id: id })
  await auditLogs.insertOne(auditDoc('supplier.deleted', 'supplier', id))
  return { conflict: false, supplier: row(supplier) }
}

export async function applyStock(id: string, input: StockInput) {
  const [products, movements, auditLogs] = await Promise.all([
    getCollection<ProductDoc>(COLLECTIONS.products),
    getCollection<MovementDoc>(COLLECTIONS.movements),
    getCollection<AuditDoc>(COLLECTIONS.auditLogs),
  ])

  return withTransaction(async (session) => {
    const product = await products.findOne({ _id: id }, { session })
    if (!product) return null

    const nextQuantity = input.mode === 'IN'
      ? product.quantity + input.quantity
      : input.mode === 'OUT'
        ? product.quantity - input.quantity
        : input.quantity
    if (nextQuantity < 0) return { insufficient: true, available: product.quantity }

    const updated = await products.findOneAndUpdate(
      { _id: id },
      { $set: { quantity: nextQuantity, updatedAt: new Date() } },
      { returnDocument: ReturnDocument.AFTER, session },
    )
    if (!updated) return null

    const movement: MovementDoc = {
      _id: movementId(),
      productId: id,
      productName: product.name,
      type: input.mode,
      quantity: input.mode === 'OUT'
        ? -input.quantity
        : input.mode === 'ADJUST'
          ? input.quantity - product.quantity
          : input.quantity,
      resultQuantity: nextQuantity,
      note: input.note || 'Stock updated',
      date: new Date(),
    }
    await movements.insertOne(movement, { session })

    await auditLogs.insertOne(
      auditDoc(`stock.${input.mode.toLowerCase()}`, 'product', id),
      { session },
    )

    return {
      insufficient: false as const,
      product: row(updated),
      movement: row(movement),
    }
  })
}
