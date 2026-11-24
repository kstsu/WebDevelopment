import { AppShell } from '@/components/inventory/app-shell'
import { canManageInventory } from '@/lib/auth-types'
import { listAccounts, requireAccount } from '@/server/auth'

export default async function InventoryPage() {
  const user = await requireAccount()
  const accounts = canManageInventory(user.role) ? await listAccounts() : undefined
  return <AppShell user={user} accounts={accounts} />
}
