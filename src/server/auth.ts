import 'server-only'
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { MongoServerError } from 'mongodb'
import { getMongoClient } from '@/lib/mongo'
import { assignableAccountRoles, canManageAccount, canManageInventory, type AccountSummary } from '@/lib/auth-types'

type Account = Omit<AccountSummary, 'active'> & { active?: boolean; salt: string; hash: string; mustChangePassword?: boolean }
type Store = { accounts: Account[]; sessions: { digest: string; email: string; expires: number }[] }
const directory = path.join(process.cwd(), '.auth')
const file = path.join(directory, 'accounts.json')
const cookieName = 'inventory_session'
const lifetime = 8 * 60 * 60
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const testOwnerEmail = 'owner@example.com'
const testOwnerPassword = 'owner123'

type AtlasAccount = Account & { _id: string; version: string }
type AtlasSession = { _id: string; email: string; version: string; expiresAt: Date }
const version = () => randomBytes(16).toString('hex')
const atlasRecord = (user: Account): AtlasAccount => ({ ...user, _id: user.email, version: version() })
const duplicate = (error: unknown) => error instanceof MongoServerError && error.code === 11000
const atlasEnabled = () => Boolean(process.env.AUTH_DATABASE_NAME?.trim())
let atlasPromise: ReturnType<typeof initializeAtlas> | undefined

async function initializeAtlas() {
  const name = process.env.AUTH_DATABASE_NAME?.trim()
  if (!name) throw new Error('AUTH_DATABASE_NAME is required.')
  const client = await getMongoClient()
  if (name === (client.options.dbName || 'inventory')) throw new Error('Accounts require a separate database.')
  const db = client.db(name)
  const accounts = db.collection<AtlasAccount>('Account')
  const sessions = db.collection<AtlasSession>('Session')
  await Promise.all([
    accounts.createIndex({ role: 1 }, { unique: true, partialFilterExpression: { role: 'OWNER' } }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    sessions.createIndex({ email: 1 }),
  ])
  return { accounts, sessions, client }
}

function atlas() {
  return atlasPromise ??= initializeAtlas().catch((error: unknown) => {
    atlasPromise = undefined
    throw error
  })
}

async function provisionAtlasOwner() {
  const { accounts } = await atlas()
  if (await accounts.findOne({ role: 'OWNER' }, { projection: { _id: 1 } })) return
  const email = process.env.AUTH_OWNER_EMAIL?.trim().toLowerCase() ?? ''
  const password = process.env.AUTH_OWNER_PASSWORD
  if (!password && !email) return
  if (!emailPattern.test(email) || email.length > 254 || !password || password.length < 12 || password.length > 256) {
    throw new Error('Set a valid AUTH_OWNER_EMAIL and an AUTH_OWNER_PASSWORD of 12–256 characters.')
  }
  try {
    await accounts.insertOne(atlasRecord(account(email, password, 'Workspace Owner', 'OWNER')))
  } catch (error) {
    if (!duplicate(error) || !(await accounts.findOne({ role: 'OWNER' }))) throw error
  }
}

function account(email: string, password: string, fullName: string, role: Account['role']): Account {
  const salt = randomBytes(16).toString('hex')
  return { email, fullName, role, active: true, salt, hash: scryptSync(password, salt, 64).toString('hex') }
}
function save(store: Store) {
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  writeFileSync(file + '.tmp', JSON.stringify(store), { mode: 0o600 })
  renameSync(file + '.tmp', file)
}
function load(): Store {
  const existing = existsSync(file)
  const production = process.env.NODE_ENV === 'production'
  const store: Store = existing ? JSON.parse(readFileSync(file, 'utf8')) as Store : {
    // TEST ACCOUNTS: never seed known credentials in production.
    accounts: production ? [] : [
      account('admin@example.com', 'admin123', 'Test Administrator', 'ADMIN'),
      account('staff@example.com', 'staff123', 'Test Staff', 'STAFF'),
    ],
    sessions: [],
  }

  // Bootstrap an owner without replacing or promoting any existing account.
  if (!store.accounts.some(a => a.role === 'OWNER')) {
    const configuredEmail = process.env.AUTH_OWNER_EMAIL
    const configuredPassword = process.env.AUTH_OWNER_PASSWORD
    if (configuredEmail !== undefined || configuredPassword !== undefined) {
      const email = configuredEmail?.trim().toLowerCase() ?? ''
      if (!emailPattern.test(email) || email.length > 254 || !configuredPassword || configuredPassword.length < 12 || configuredPassword.length > 256 || configuredPassword === testOwnerPassword) {
        throw new Error('Set a valid AUTH_OWNER_EMAIL and a unique AUTH_OWNER_PASSWORD of 12–256 characters to provision the owner.')
      }
      if (store.accounts.some(a => a.email === email)) {
        throw new Error('AUTH_OWNER_EMAIL is already in use. Choose an unused email to provision the owner.')
      }
      store.accounts.push(account(email, configuredPassword, 'Workspace Owner', 'OWNER'))
      save(store)
      return store
    }

    if (!production && !store.accounts.some(a => a.email === testOwnerEmail)) {
      store.accounts.push(account(testOwnerEmail, testOwnerPassword, 'Test Owner', 'OWNER'))
      save(store)
      return store
    }
  }
  if (!existing) save(store)
  return store
}
const digest = (token: string) => createHash('sha256').update(token).digest('hex')
const publicAccount = ({ email, fullName, role, active = true }: Account): AccountSummary => ({ email, fullName, role, active })
const sessionToken = async () => (await cookies()).get(cookieName)?.value

function accountForSession(store: Store, token: string) {
  const tokenDigest = digest(token)
  const session = store.sessions.find(s => s.digest === tokenDigest && s.expires > Date.now())
  return session && store.accounts.find(a => a.email === session.email && a.active !== false)
}

export async function currentAccount() {
  const user = await signedInAccount()
  return user && !user.mustChangePassword ? publicAccount(user) : null
}

async function signedInAccount() {
  const token = await sessionToken()
  if (!token) return null
  if (atlasEnabled()) {
    const { accounts, sessions } = await atlas()
    const session = await sessions.findOne({ _id: digest(token), expiresAt: { $gt: new Date() } })
    const user = session && await accounts.findOne({ _id: session.email, version: session.version, active: { $ne: false } })
    return user || null
  }
  const user = accountForSession(load(), token)
  return user || null
}

export async function requiresPasswordChange() {
  return (await signedInAccount())?.mustChangePassword === true
}
export async function requireAccount(managerOnly = false) {
  const user = await currentAccount()
  if (!user) redirect(await requiresPasswordChange() ? '/change-password' : '/')
  if (managerOnly && !canManageInventory(user.role)) redirect('/inventory')
  return user
}
export async function login(email: string, password: string) {
  if (!password || password.length > 256 || email.length > 254) return false
  const jar = await cookies()
  const normalizedEmail = email.trim().toLowerCase()
  const token = randomBytes(32).toString('hex')
  const previous = digest(jar.get(cookieName)?.value ?? '')
  if (atlasEnabled()) {
    await provisionAtlasOwner()
    const { accounts, sessions } = await atlas()
    const user = await accounts.findOne({ _id: normalizedEmail })
    if (!validPassword(user, password)) return false
    await sessions.insertOne({ _id: digest(token), email: user._id, version: user.version, expiresAt: new Date(Date.now() + lifetime * 1000) })
    await sessions.deleteOne({ _id: previous })
  } else {
    const store = load()
    const user = store.accounts.find(a => a.email === normalizedEmail)
    if (!validPassword(user, password)) return false
    store.sessions = store.sessions.filter(s => s.expires > Date.now() && s.digest !== previous)
    store.sessions.push({ digest: digest(token), email: user.email, expires: Date.now() + lifetime * 1000 })
    save(store)
  }
  jar.set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: lifetime })
  return true
}
function validPassword<T extends Account>(user: T | null | undefined, password: string): user is T {
  const candidate = scryptSync(password, user?.salt ?? 'invalid-user', 64)
  return !!user && timingSafeEqual(candidate, Buffer.from(user.hash, 'hex')) && user.active !== false
}
export async function logout() {
  const jar = await cookies()
  const token = jar.get(cookieName)?.value
  if (token && atlasEnabled()) {
    const { sessions } = await atlas()
    await sessions.deleteOne({ _id: digest(token) })
  } else if (token) {
    const store = load()
    store.sessions = store.sessions.filter(s => s.digest !== digest(token) && s.expires > Date.now())
    save(store)
  }
  jar.delete(cookieName)
}
export async function listAccounts() {
  await requireAccount(true)
  if (atlasEnabled()) return (await (await atlas()).accounts.find().toArray()).map(publicAccount)
  return load().accounts.map(publicAccount)
}
export async function createAccount({ email, password, fullName, role }: { email: string; password: string; fullName: string; role: string }) {
  email = email.trim().toLowerCase()
  fullName = fullName.trim()
  if (atlasEnabled()) {
    const actor = await currentAccount()
    const assignedRole = actor && assignableAccountRoles[actor.role]?.find(r => r === role)
    if (!assignedRole) return 'forbidden'
    if (!emailPattern.test(email) || email.length > 254 || !fullName || fullName.length > 100 || password.length < 8 || password.length > 256) return 'invalid'
    try {
      await (await atlas()).accounts.insertOne(atlasRecord(account(email, password, fullName, assignedRole)))
      return 'created'
    } catch (error) {
      if (duplicate(error)) return 'duplicate'
      throw error
    }
  }
  const token = await sessionToken()
  if (!token) return 'forbidden'
  const store = load()
  const user = accountForSession(store, token)
  const assignedRole = user && assignableAccountRoles[user.role]?.find(allowedRole => allowedRole === role)
  if (!assignedRole || user?.mustChangePassword) return 'forbidden'

  if (!emailPattern.test(email) || email.length > 254 || !fullName || fullName.length > 100 || password.length < 8 || password.length > 256) return 'invalid'
  if (store.accounts.some(a => a.email === email)) return 'duplicate'
  store.accounts.push(account(email, password, fullName, assignedRole))
  save(store)
  return 'created'
}

export async function changeAccountAccess(email: string, action: string) {
  if (atlasEnabled()) {
    const actor = await currentAccount()
    if (!actor || !canManageInventory(actor.role)) return 'forbidden'
    if (action !== 'deactivate' && action !== 'reactivate' && action !== 'delete') return 'invalid'
    const { accounts, sessions, client } = await atlas()
    const _id = email.trim().toLowerCase()
    return client.withSession(session => session.withTransaction(async () => {
      const target = await accounts.findOne({ _id }, { session })
      if (!target) return 'not-found' as const
      if (!canManageAccount(actor, target)) return 'forbidden' as const
      if (action === 'reactivate' && target.active !== false) return 'updated' as const
      if (action === 'delete') await accounts.deleteOne({ _id }, { session })
      else await accounts.updateOne({ _id }, { $set: { active: action === 'reactivate', version: version() } }, { session })
      await sessions.deleteMany({ email: _id }, { session })
      return 'updated' as const
    }))
  }
  const token = await sessionToken()
  if (!token) return 'forbidden'
  const store = load()
  const actor = accountForSession(store, token)
  if (!actor || actor.mustChangePassword || !canManageInventory(actor.role)) return 'forbidden'
  if (action !== 'deactivate' && action !== 'reactivate' && action !== 'delete') return 'invalid'

  const target = store.accounts.find(a => a.email === email.trim().toLowerCase())
  if (!target) return 'not-found'
  if (!canManageAccount(actor, target)) return 'forbidden'

  if (action === 'reactivate') {
    if (target.active !== false) return 'updated'
    target.active = true
  } else if (action === 'deactivate') {
    target.active = false
  } else {
    store.accounts = store.accounts.filter(a => a !== target)
  }
  store.sessions = store.sessions.filter(s => s.email !== target.email)
  save(store)
  return 'updated'
}

export async function resetAccountPassword(email: string) {
  const actor = await currentAccount()
  if (!actor || !canManageInventory(actor.role)) return { status: 'forbidden' as const }
  const normalized = email.trim().toLowerCase()
  const temporaryPassword = randomBytes(18).toString('base64url')
  const salt = randomBytes(16).toString('hex')
  const update = { salt, hash: scryptSync(temporaryPassword, salt, 64).toString('hex'), mustChangePassword: true }
  if (atlasEnabled()) {
    const { accounts, sessions, client } = await atlas()
    return client.withSession(session => session.withTransaction(async () => {
      const target = await accounts.findOne({ _id: normalized }, { session })
      if (!target || target.active === false || !canManageAccount(actor, target)) return { status: 'forbidden' as const }
      await accounts.updateOne({ _id: normalized }, { $set: { ...update, version: version() } }, { session })
      await sessions.deleteMany({ email: normalized }, { session })
      return { status: 'updated' as const, temporaryPassword }
    }))
  }
  const token = await sessionToken()
  const store = load()
  const manager = token && accountForSession(store, token)
  const target = store.accounts.find(a => a.email === normalized)
  if (!manager || manager.mustChangePassword || !target || target.active === false || !canManageAccount(manager, target)) return { status: 'forbidden' as const }
  Object.assign(target, update)
  store.sessions = store.sessions.filter(s => s.email !== normalized)
  save(store)
  return { status: 'updated' as const, temporaryPassword }
}

export async function replaceTemporaryPassword(password: string) {
  if (password.length < 12 || password.length > 256) return false
  const user = await signedInAccount()
  if (!user?.mustChangePassword) return false
  const samePassword: boolean = validPassword(user, password)
  if (samePassword) return false
  const salt = randomBytes(16).toString('hex')
  const update = { salt, hash: scryptSync(password, salt, 64).toString('hex'), mustChangePassword: false }
  if (atlasEnabled()) {
    const { accounts, sessions, client } = await atlas()
    const updated = await client.withSession(session => session.withTransaction(async () => {
      const result = await accounts.updateOne({ _id: user.email, hash: user.hash, active: { $ne: false }, mustChangePassword: true }, { $set: { ...update, version: version() } }, { session })
      if (!result.modifiedCount) return false
      await sessions.deleteMany({ email: user.email }, { session })
      return true
    }))
    if (!updated) return false
  } else {
    const store = load()
    const target = store.accounts.find(a => a.email === user.email && a.hash === user.hash && a.mustChangePassword && a.active !== false)
    if (!target) return false
    Object.assign(target, update)
    store.sessions = store.sessions.filter(s => s.email !== user.email)
    save(store)
  }
  const jar = await cookies()
  jar.delete(cookieName)
  return true
}
