import { json, withProblemHandling } from '@/server/inventory/http'
import { ensureSeeded, resetInventory } from '@/server/inventory/repository'

export async function POST(request: Request) {
  return withProblemHandling(async () => {
    await ensureSeeded()
    await resetInventory()
    return json({ data: { reset: true } })
  }, request)
}
