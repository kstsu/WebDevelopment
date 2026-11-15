import { mapMovement, mapProduct } from '@/server/inventory/mapper'
import { InventoryError } from '@/server/inventory/errors'
import { json, readJson, withProblemHandling } from '@/server/inventory/http'
import { applyStock, ensureSeeded } from '@/server/inventory/repository'
import { stockInputSchema } from '@/server/inventory/schemas'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  return withProblemHandling(async () => {
    await ensureSeeded()
    const { id } = await context.params
    const input = stockInputSchema.parse(await readJson(request))
    const result = await applyStock(id, input)
    if (!result) throw new InventoryError(404, 'not_found', 'Product not found.')
    if (result.insufficient) throw new InventoryError(409, 'insufficient_stock', 'There is not enough stock for this operation.', [{ field: 'quantity', code: 'insufficient_stock', message: `Only ${result.available} units are available.` }])
    if (!result.product || !result.movement) throw new InventoryError(500, 'invalid_stock_result', 'The stock operation could not be completed.')
    return json({ data: { product: mapProduct(result.product), movement: mapMovement(result.movement) } })
  }, request)
}
