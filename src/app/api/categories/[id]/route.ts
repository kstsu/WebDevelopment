import { mapCategory } from '@/server/inventory/mapper'
import { InventoryError } from '@/server/inventory/errors'
import { json, readJson, withProblemHandling } from '@/server/inventory/http'
import { deleteCategory, ensureSeeded, updateCategory } from '@/server/inventory/repository'
import { categoryInputSchema } from '@/server/inventory/schemas'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: Request, context: RouteContext) {
  return withProblemHandling(async () => {
    await ensureSeeded()
    const { id } = await context.params
    const category = await updateCategory(id, categoryInputSchema.parse(await readJson(request)))
    if (!category) throw new InventoryError(404, 'not_found', 'Category not found.')
    return json({ data: mapCategory(category) })
  }, request)
}

export async function DELETE(request: Request, context: RouteContext) {
  return withProblemHandling(async () => {
    await ensureSeeded()
    const { id } = await context.params
    const result = await deleteCategory(id)
    if (!result) throw new InventoryError(404, 'not_found', 'Category not found.')
    if (result.conflict) throw new InventoryError(409, 'category_in_use', `Cannot delete “${result.category.name}” while products are assigned to it.`)
    return new Response(null, { status: 204 })
  }, request)
}
