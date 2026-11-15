import { mapCategory } from '@/server/inventory/mapper'
import { json, readJson, withProblemHandling } from '@/server/inventory/http'
import { createCategory, ensureSeeded, listInventory } from '@/server/inventory/repository'
import { categoryInputSchema } from '@/server/inventory/schemas'

export async function GET(request: Request) {
  return withProblemHandling(async () => {
    await ensureSeeded()
    const inventory = await listInventory()
    return json({ data: inventory.categories.map(mapCategory) })
  }, request)
}

export async function POST(request: Request) {
  return withProblemHandling(async () => {
    await ensureSeeded()
    const input = categoryInputSchema.parse(await readJson(request))
    return json({ data: mapCategory(await createCategory(input)) }, 201)
  }, request)
}
