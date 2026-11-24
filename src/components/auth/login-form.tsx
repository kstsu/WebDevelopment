import { loginAction } from '@/app/auth-actions'
import { Brand } from '@/components/inventory/brand'
import { ThemeToggle } from '@/components/inventory/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm({ failed, passwordChanged }: { failed: boolean; passwordChanged?: boolean }) {
  return (
    <Card className="w-full max-w-md gap-0 overflow-hidden py-0">
      <CardHeader className="relative border-b border-sidebar-border bg-sidebar py-5 [.border-b]:pb-5">
        <Brand />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <ThemeToggle />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        {passwordChanged && <p role="status" className="text-sm text-muted-foreground">Password changed. Sign in with your new password.</p>}
        <form action={loginAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" maxLength={256} required />
          </div>
          {failed && <p role="alert" className="text-sm font-medium text-destructive">Incorrect email or password.</p>}
          <Button type="submit" className="w-full">Sign in</Button>
        </form>
        {process.env.NODE_ENV !== 'production' && !process.env.AUTH_DATABASE_NAME?.trim() && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Development test credentials</p>
            <p className="mt-1">Owner: owner@example.com / owner123</p>
            <p>Admin: admin@example.com / admin123</p>
            <p>Staff: staff@example.com / staff123</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
