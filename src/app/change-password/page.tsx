import { redirect } from 'next/navigation'
import { logoutAction, replaceTemporaryPasswordAction } from '@/app/auth-actions'
import { requiresPasswordChange } from '@/server/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await requiresPasswordChange())) redirect('/')
  const failed = (await searchParams).error === '1'
  return (
    <main className="grid min-h-svh place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4">
          <h1 className="text-2xl font-semibold">Choose a new password</h1>
          <p className="text-sm text-muted-foreground">Replace your temporary password before opening inventory.</p>
          <form action={replaceTemporaryPasswordAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password (12+ characters)</Label>
              <Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={256} required />
            </div>
            {failed && <p role="alert" className="text-sm text-destructive">Use matching passwords of at least 12 characters, different from the temporary password.</p>}
            <Button type="submit">Save password</Button>
          </form>
          <form action={logoutAction}><Button type="submit" variant="ghost">Sign out</Button></form>
        </CardContent>
      </Card>
    </main>
  )
}
