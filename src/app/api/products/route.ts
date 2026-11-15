import { mapProduct } from '@/server/inventory/mapper'
import { json, problem, readJson, withProblemHandling } from '@/server/inventory/http'
import { createProduct, ensureSeeded, listInventory } from '@/server/inventory/repository'
import { productInputSchema } from '@/server/inventory/schemas'

export async function GET(request: Request) {
  return withProblemHandling(async () => {
    await ensureSeeded()
    const inventory = await listInventory()
    const url = new URL(request.url)
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 100), 1), 100)
    return json({ data: inventory.products.slice(0, limit).map(mapProduct), meta: { limit } })
  }, request)
}

export async function POST(request: Request) {
  return withProblemHandling(async () => {
    await ensureSeeded()
    const input = productInputSchema.parse(await readJson(request))
    return json({ data: mapProduct(await createProduct(input)) }, 201)
  }, request)
}
