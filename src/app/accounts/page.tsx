import { AppShell } from '@/components/inventory/app-shell'
import { listAccounts, requireAccount } from '@/server/auth'

export default async function AccountsPage() {
  const user = await requireAccount(true)
  const accounts = await listAccounts()
  return <AppShell user={user} initialView="accounts" accounts={accounts} />
}
