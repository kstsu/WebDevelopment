import { mapProduct } from '@/server/inventory/mapper'
import { InventoryError } from '@/server/inventory/errors'
import { json, readJson, withProblemHandling } from '@/server/inventory/http'
import { deleteProduct, ensureSeeded, updateProduct } from '@/server/inventory/repository'
import { productInputSchema } from '@/server/inventory/schemas'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, context: RouteContext) {
  return withProblemHandling(async () => {
    await ensureSeeded()
    const { id } = await context.params
    const input = productInputSchema.parse(await readJson(request))
    const product = await updateProduct(id, input)
    if (!product) throw new InventoryError(404, 'not_found', 'Product not found.')
    return json({ data: mapProduct(product) })
  }, request)
}

export async function DELETE(request: Request, context: RouteContext) {
  return withProblemHandling(async () => {
    await ensureSeeded()
    const { id } = await context.params
    const product = await deleteProduct(id)
    if (!product) throw new InventoryError(404, 'not_found', 'Product not found.')
    return new Response(null, { status: 204 })
  }, request)
}
