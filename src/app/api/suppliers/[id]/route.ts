import { mapSupplier } from '@/server/inventory/mapper'
import { InventoryError } from '@/server/inventory/errors'
import { json, readJson, withProblemHandling } from '@/server/inventory/http'
import { deleteSupplier, ensureSeeded, updateSupplier } from '@/server/inventory/repository'
import { supplierInputSchema } from '@/server/inventory/schemas'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, context: RouteContext) {
  return withProblemHandling(async () => {
    await ensureSeeded()
    const { id } = await context.params
    const supplier = await updateSupplier(id, supplierInputSchema.parse(await readJson(request)))
    if (!supplier) throw new InventoryError(404, 'not_found', 'Supplier not found.')
    return json({ data: mapSupplier(supplier) })
  }, request)
}

export async function DELETE(request: Request, context: RouteContext) {
  return withProblemHandling(async () => {
    await ensureSeeded()
    const { id } = await context.params
    const result = await deleteSupplier(id)
    if (!result) throw new InventoryError(404, 'not_found', 'Supplier not found.')
    if (result.conflict) throw new InventoryError(409, 'supplier_in_use', `Cannot delete “${result.supplier.name}” while products are linked to it.`)
    return new Response(null, { status: 204 })
  }, request)
}
