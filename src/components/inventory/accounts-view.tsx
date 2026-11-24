'use client'

import { useState, type FormEvent } from 'react'
import { Mail, MoreHorizontal, Plus, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { changeAccountAccessAction, createAccountAction, resetAccountPasswordAction } from '@/app/auth-actions'
import { accountRoleLabels, assignableAccountRoles, canManageAccount, type AccountAccessAction, type AccountIdentity, type AccountSummary } from '@/lib/auth-types'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const accountActions = {
  deactivate: { label: 'Deactivate', description: 'This account will be signed out and blocked from signing in until you reactivate it.', success: 'Account deactivated' },
  reactivate: { label: 'Reactivate', description: 'This account will be able to sign in again with its existing password.', success: 'Account reactivated' },
  delete: { label: 'Delete', description: 'This permanently removes the account and signs it out. Inventory records are not affected. This cannot be undone.', success: 'Account deleted' },
} satisfies Record<AccountAccessAction, { label: string; description: string; success: string }>

export function AccountsView({ accounts, user }: { accounts: AccountSummary[]; user: AccountIdentity }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<{ account: AccountSummary; operation: AccountAccessAction } | null>(null)
  const [updating, setUpdating] = useState(false)
  const [accessError, setAccessError] = useState('')
  const [resetTarget, setResetTarget] = useState<AccountSummary | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetting, setResetting] = useState(false)

  async function resetPassword() {
    if (!resetTarget || resetting) return
    setResetting(true)
    setResetError('')
    try {
      const result = await resetAccountPasswordAction(resetTarget.email)
      if (result.status === 'updated') setTemporaryPassword(result.temporaryPassword)
      else setResetError('This account cannot be reset.')
    } catch {
      setResetError('Could not reset the password. Please try again.')
    } finally {
      setResetting(false)
    }
  }
  const roles = assignableAccountRoles[user.role]
  const canChooseRole = roles.length > 1
  const dialogTitle = canChooseRole ? 'Add Account' : 'Add Staff Account'
  const selectedAction = confirmation && accountActions[confirmation.operation]

  function confirm(account: AccountSummary, operation: AccountAccessAction) {
    setAccessError('')
    setConfirmation({ account, operation })
  }

  async function submitAccessChange() {
    if (!confirmation || !selectedAction || updating) return
    setUpdating(true)
    setAccessError('')
    try {
      const data = new FormData()
      data.set('email', confirmation.account.email)
      data.set('operation', confirmation.operation)
      const result = await changeAccountAccessAction(data)
      if (result === 'updated') {
        setConfirmation(null)
        toast.success(selectedAction.success)
      } else if (result === 'not-found') {
        setConfirmation(null)
        toast.error('This account no longer exists.')
      } else {
        setAccessError('You do not have permission to make this change.')
      }
    } catch {
      setAccessError('Could not update the account. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const result = await createAccountAction(new FormData(event.currentTarget))
      if (result === 'created') {
        setOpen(false)
        toast.success('Account created')
      } else if (result === 'forbidden') {
        setError('You do not have permission to assign that role.')
      } else {
        setError(result === 'duplicate' ? 'That email is already registered.' : 'Check the full name, email, and password and try again.')
      }
    } catch {
      setError('Could not create the account. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={next => { setError(''); setOpen(next) }}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{accounts.length} account{accounts.length === 1 ? '' : 's'}</p>
          <DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />{dialogTitle}</Button></DialogTrigger>
        </div>
        <DialogContent className="max-h-[92vh] overflow-y-auto custom-scrollbar sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {canChooseRole
                ? 'Staff can browse inventory. Admins can manage inventory and create staff accounts.'
                : 'Staff can browse inventory but cannot change it.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Full name</Label>
              <Input id="account-name" name="fullName" autoComplete="name" maxLength={100} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-email">Email</Label>
              <Input id="account-email" name="email" type="email" autoComplete="email" maxLength={254} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-password">Password (8+ characters)</Label>
              <Input id="account-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={256} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-role">Role</Label>
              {canChooseRole ? (
                <Select name="role" defaultValue="STAFF" required>
                  <SelectTrigger id="account-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => <SelectItem key={role} value={role}>{accountRoleLabels[role]}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <>
                  <Input id="account-role" value="Staff" readOnly />
                  <input type="hidden" name="role" value="STAFF" />
                </>
              )}
            </div>
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{canChooseRole ? 'Add account' : 'Add staff account'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {accounts.map(account => (
          <Card key={account.email} className="group">
            <CardContent className="flex h-full flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300"><UserRound className="h-5 w-5" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{account.fullName}</h3>
                    <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{account.email}</span>
                    </p>
                  </div>
                </div>
                {canManageAccount(user, account) && (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Actions for ${account.fullName} (${account.email})`}>
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {account.active ? (
                        <DropdownMenuItem onSelect={() => confirm(account, 'deactivate')}>Deactivate</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onSelect={() => confirm(account, 'reactivate')}>Reactivate</DropdownMenuItem>
                      )}
                      {account.active && <DropdownMenuItem onSelect={() => setResetTarget(account)}>Reset password</DropdownMenuItem>}
                      <DropdownMenuItem variant="destructive" onSelect={() => confirm(account, 'delete')}>Delete account</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{accountRoleLabels[account.role]}</Badge>
                <Badge variant="outline" className={account.active ? undefined : 'text-muted-foreground'}>
                  {account.active ? 'Active' : 'Deactivated'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <AlertDialog open={confirmation !== null} onOpenChange={next => { if (!next && !updating) setConfirmation(null) }}>
        {confirmation && selectedAction && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{selectedAction.label} account?</AlertDialogTitle>
              <AlertDialogDescription className="break-words">
                {confirmation.account.fullName} ({confirmation.account.email}). {selectedAction.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {accessError && <p role="alert" className="text-sm font-medium text-destructive">{accessError}</p>}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
              <Button type="button" variant={confirmation.operation === 'delete' ? 'destructive' : 'default'} onClick={submitAccessChange} disabled={updating}>
                {updating ? 'Updating…' : selectedAction.label}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
      <Dialog open={resetTarget !== null} onOpenChange={next => {
        if (!next && !resetting) {
          setResetTarget(null)
          setTemporaryPassword('')
          setResetError('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{temporaryPassword ? 'Temporary password' : 'Reset password?'}</DialogTitle>
            <DialogDescription>
              {temporaryPassword
                ? 'Share this privately with the user. It will not be shown again after you close this dialog.'
                : `Reset the password for ${resetTarget?.email}? This signs them out and requires a new password at their next sign-in.`}
            </DialogDescription>
          </DialogHeader>
          {temporaryPassword && <code className="select-all break-all rounded border p-3">{temporaryPassword}</code>}
          {resetError && <p role="alert" className="text-sm text-destructive">{resetError}</p>}
          {!temporaryPassword && <DialogFooter><Button type="button" onClick={resetPassword} disabled={resetting}>{resetting ? 'Resetting…' : 'Reset password'}</Button></DialogFooter>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
