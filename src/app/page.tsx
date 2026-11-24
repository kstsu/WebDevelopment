import { redirect } from 'next/navigation'
import { currentAccount, requiresPasswordChange } from '@/server/auth'
import { LoginForm } from '@/components/auth/login-form'

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string; passwordChanged?: string }> }) {
  if (await currentAccount()) redirect('/inventory')
  if (await requiresPasswordChange()) redirect('/change-password')
  const params = await searchParams
  return <main className="grid min-h-svh place-items-center p-4"><LoginForm failed={params.error === 'credentials'} passwordChanged={params.passwordChanged === '1'} /></main>
}
