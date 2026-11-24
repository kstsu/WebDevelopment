import { MongoClient, type Collection, type Db, type Document } from 'mongodb'

const DATABASE_NAME_FALLBACK = 'inventory'

const globalForMongo = globalThis as unknown as {
  mongoClientPromise?: Promise<MongoClient>
  mongoIndexesPromise?: Promise<void>
}

export function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.DATABASE_URL
  if (!uri) throw new Error('DATABASE_URL is not set')

  if (!globalForMongo.mongoClientPromise) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 15_000,
      maxPoolSize: 10,
    })
    globalForMongo.mongoClientPromise = client.connect().catch((error: unknown) => {
      globalForMongo.mongoClientPromise = undefined
      throw error
    })
  }

  return globalForMongo.mongoClientPromise
}

export async function getDatabase(): Promise<Db> {
  const client = await getMongoClient()
  return client.db(client.options.dbName || DATABASE_NAME_FALLBACK)
}

export async function getCollection<TSchema extends Document>(name: string): Promise<Collection<TSchema>> {
  const database = await getDatabase()
  return database.collection<TSchema>(name)
}

export function ensureIndexes(): Promise<void> {
  if (!globalForMongo.mongoIndexesPromise) {
    globalForMongo.mongoIndexesPromise = createIndexes().catch((error: unknown) => {
      globalForMongo.mongoIndexesPromise = undefined
      throw error
    })
  }
  return globalForMongo.mongoIndexesPromise
}

async function createIndexes(): Promise<void> {
  const [categories, suppliers, products, movements, auditLogs] = await Promise.all([
    getCollection('Category'),
    getCollection('Supplier'),
    getCollection('Product'),
    getCollection('StockMovement'),
    getCollection('AuditLog'),
  ])

  await Promise.all([
    categories.createIndex({ name: 1 }, { unique: true }),
    suppliers.createIndex({ name: 1 }),
    products.createIndex({ sku: 1 }, { unique: true }),
    products.createIndex({ categoryId: 1 }),
    products.createIndex({ supplierId: 1 }),
    products.createIndex({ updatedAt: 1 }),
    movements.createIndex({ productId: 1 }),
    movements.createIndex({ date: 1 }),
    auditLogs.createIndex({ subjectType: 1, subjectId: 1, occurredAt: 1 }),
    auditLogs.createIndex({ occurredAt: 1 }),
  ])
}
