import { mapSupplier } from '@/server/inventory/mapper'
import { json, readJson, withProblemHandling } from '@/server/inventory/http'
import { createSupplier, ensureSeeded, listInventory } from '@/server/inventory/repository'
import { supplierInputSchema } from '@/server/inventory/schemas'

export async function GET(request: Request) {
  return withProblemHandling(async () => {
    await ensureSeeded()
    const inventory = await listInventory()
    return json({ data: inventory.suppliers.map(mapSupplier) })
  }, request)
}

export async function POST(request: Request) {
  return withProblemHandling(async () => {
    await ensureSeeded()
    const input = supplierInputSchema.parse(await readJson(request))
    return json({ data: mapSupplier(await createSupplier(input)) }, 201)
  }, request)
}
