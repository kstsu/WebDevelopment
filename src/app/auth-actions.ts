'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { changeAccountAccess, createAccount, login, logout, replaceTemporaryPassword, requiresPasswordChange, resetAccountPassword } from '@/server/auth'

function field(data: FormData, key: string) {
  const value = data.get(key)
  return typeof value === 'string' ? value : ''
}
export async function loginAction(data: FormData) {
  const ok = await login(field(data, 'email'), field(data, 'password'))
  redirect(ok ? (await requiresPasswordChange() ? '/change-password' : '/inventory') : '/?error=credentials')
}

export async function resetAccountPasswordAction(email: string) {
  return resetAccountPassword(typeof email === 'string' ? email : '')
}

export async function replaceTemporaryPasswordAction(data: FormData) {
  const password = field(data, 'password')
  if (password !== field(data, 'confirmation') || !(await replaceTemporaryPassword(password))) redirect('/change-password?error=1')
  redirect('/?passwordChanged=1')
}
export async function logoutAction() {
  await logout()
  redirect('/')
}
export async function createAccountAction(data: FormData) {
  const result = await createAccount({
    email: field(data, 'email'),
    password: field(data, 'password'),
    fullName: field(data, 'fullName'),
    role: field(data, 'role'),
  })
  if (result === 'created') refresh()
  return result
}

export async function changeAccountAccessAction(data: FormData) {
  const result = await changeAccountAccess(field(data, 'email'), field(data, 'operation'))
  if (result === 'updated' || result === 'not-found') refresh()
  return result
}
