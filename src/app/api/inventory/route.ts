import { mapCategory, mapMovement, mapProduct, mapSupplier } from '@/server/inventory/mapper'
import { json, withProblemHandling } from '@/server/inventory/http'
import { ensureSeeded, listInventory } from '@/server/inventory/repository'

export async function GET(request: Request) {
  return withProblemHandling(async () => {
    await ensureSeeded()
    const inventory = await listInventory()
    return json({
      data: {
        categories: inventory.categories.map(mapCategory),
        suppliers: inventory.suppliers.map(mapSupplier),
        products: inventory.products.map(mapProduct),
        movements: inventory.movements.map(mapMovement),
      },
    })
  }, request)
}
