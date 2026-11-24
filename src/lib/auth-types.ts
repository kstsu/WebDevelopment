export type AccountRole = 'OWNER' | 'ADMIN' | 'STAFF'
type AssignableAccountRole = Exclude<AccountRole, 'OWNER'>

export const accountRoleLabels: Record<AccountRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  STAFF: 'Staff',
}

export const assignableAccountRoles: Record<AccountRole, readonly AssignableAccountRole[]> = {
  OWNER: ['STAFF', 'ADMIN'],
  ADMIN: ['STAFF'],
  STAFF: [],
}

export function canManageInventory(role: AccountRole) {
  return role === 'OWNER' || role === 'ADMIN'
}

export interface AccountSummary {
  email: string
  fullName: string
  role: AccountRole
  active: boolean
}

export type AccountIdentity = Pick<AccountSummary, 'email' | 'role'>
export type AccountAccessAction = 'deactivate' | 'reactivate' | 'delete'

export function canManageAccount(actor: AccountIdentity, target: AccountIdentity) {
  return actor.email !== target.email && assignableAccountRoles[actor.role].some(role => role === target.role)
}
