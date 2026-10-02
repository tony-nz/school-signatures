import type { Config } from '@netlify/functions'
import { db, publicUser, type UserRow } from '../lib/db'
import {
  hashPassword, verifyPassword, createSession, deleteSession, currentUser,
  sessionCookie, clearedSessionCookie, isBootstrapAdmin,
} from '../lib/auth'

export const config: Config = { path: '/api/*' }

// ─── Helpers ─────────────────────────────────────────────────────────────────

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_LOGO_CHARS = 1_000_000        // ~750 KB image as a data URL
const MAX_SIGNATURE_CHARS = 4_000_000   // signature JSON incl. embedded images
const MAX_REQUEST_CHARS = 5_500_000     // Netlify caps function request bodies at 6 MB

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text()
  if (text.length > MAX_REQUEST_CHARS) throw new HttpError(413, 'Request is too large — try smaller images')
  try {
    const body = JSON.parse(text)
    if (body && typeof body === 'object') return body as Record<string, unknown>
  } catch { /* fall through */ }
  throw new HttpError(400, 'Invalid JSON body')
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

async function requireUser(req: Request): Promise<UserRow> {
  const user = await currentUser(req)
  if (!user) throw new HttpError(401, 'Please log in')
  if (user.status !== 'approved') throw new HttpError(403, 'Your account is not approved')
  return user
}

async function requireAdmin(req: Request): Promise<UserRow> {
  const user = await requireUser(req)
  if (user.role !== 'admin') throw new HttpError(403, 'Admins only')
  return user
}

// Blocks cross-site requests that try to ride on the session cookie
function checkOrigin(req: Request) {
  if (req.method === 'GET') return
  const origin = req.headers.get('origin')
  if (origin && new URL(origin).host !== new URL(req.url).host) {
    throw new HttpError(403, 'Cross-origin request blocked')
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

async function signup(req: Request) {
  const body = await readBody(req)
  const email = str(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  const businessName = str(body.businessName)
  const contactName = str(body.contactName)

  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address')
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters')
  if (!businessName) throw new HttpError(400, 'Business name is required')

  const admin = isBootstrapAdmin(email)
  const rows = await db()`
    INSERT INTO users (email, password_hash, business_name, contact_name, role, status)
    VALUES (${email}, ${await hashPassword(password)}, ${businessName}, ${contactName},
            ${admin ? 'admin' : 'retailer'}, ${admin ? 'approved' : 'pending'})
    ON CONFLICT (email) DO NOTHING
    RETURNING *
  ` as UserRow[]
  if (!rows[0]) throw new HttpError(409, 'An account with that email already exists')

  const user = rows[0]
  if (user.status !== 'approved') return json({ user: null, status: user.status }, 201)

  const session = await createSession(user.id)
  return json({ user: publicUser(user) }, 201, { 'set-cookie': sessionCookie(req, session.token, session.expires) })
}

async function login(req: Request) {
  const body = await readBody(req)
  const email = str(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''

  const rows = await db()`SELECT * FROM users WHERE email = ${email}` as UserRow[]
  const user = rows[0]
  // Always run a hash so response time doesn't reveal whether the email exists
  const ok = user
    ? await verifyPassword(password, user.password_hash)
    : (await hashPassword(password), false)
  if (!user || !ok) throw new HttpError(401, 'Incorrect email or password')

  if (user.status === 'pending') throw new HttpError(403, 'Your account is awaiting admin approval')
  if (user.status === 'rejected') throw new HttpError(403, 'Your account request was not approved')

  const session = await createSession(user.id)
  return json({ user: publicUser(user) }, 200, { 'set-cookie': sessionCookie(req, session.token, session.expires) })
}

async function logout(req: Request) {
  await deleteSession(req)
  return json({ ok: true }, 200, { 'set-cookie': clearedSessionCookie() })
}

async function me(req: Request) {
  const user = await currentUser(req)
  return json({ user: user && user.status === 'approved' ? publicUser(user) : null })
}

// ─── Account branding ────────────────────────────────────────────────────────

async function updateAccount(req: Request) {
  const user = await requireUser(req)
  const body = await readBody(req)
  const businessName = body.businessName === undefined ? user.business_name : str(body.businessName)
  const contactName = body.contactName === undefined ? user.contact_name : str(body.contactName)
  const logo = body.logo === undefined ? user.logo : str(body.logo)

  if (!businessName) throw new HttpError(400, 'Business name is required')
  if (logo.length > MAX_LOGO_CHARS) throw new HttpError(413, 'Logo is too large (max ~750 KB)')
  if (logo && !/^(data:image\/|https:\/\/)/.test(logo)) throw new HttpError(400, 'Logo must be an image upload or https URL')

  const rows = await db()`
    UPDATE users SET business_name = ${businessName}, contact_name = ${contactName}, logo = ${logo}, updated_at = now()
    WHERE id = ${user.id} RETURNING *
  ` as UserRow[]
  return json({ user: publicUser(rows[0]) })
}

// ─── Customers ───────────────────────────────────────────────────────────────

const customerRow = (r: Record<string, unknown>) => ({ id: r.id, name: r.name, createdAt: r.created_at })

// Resolves an optional customerId from a request body: null for none, or an id this user owns
async function ownedCustomerId(user: UserRow, value: unknown): Promise<string | null> {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/.test(value)) throw new HttpError(400, 'Invalid customerId')
  const rows = await db()`SELECT id FROM customers WHERE id = ${value} AND user_id = ${user.id}`
  if (!rows[0]) throw new HttpError(400, 'Customer not found')
  return value
}

function customerName(body: Record<string, unknown>) {
  const name = str(body.name)
  if (!name) throw new HttpError(400, 'Customer name is required')
  if (name.length > 120) throw new HttpError(400, 'Customer name is too long')
  return name
}

const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === '23505'

async function createCustomer(req: Request) {
  const user = await requireUser(req)
  const name = customerName(await readBody(req))
  try {
    const rows = await db()`INSERT INTO customers (user_id, name) VALUES (${user.id}, ${name}) RETURNING *`
    return json({ customer: customerRow(rows[0]) }, 201)
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, `You already have a customer called "${name}"`)
    throw err
  }
}

async function renameCustomer(req: Request, id: string) {
  const user = await requireUser(req)
  const name = customerName(await readBody(req))
  try {
    const rows = await db()`
      UPDATE customers SET name = ${name}, updated_at = now()
      WHERE id = ${id} AND user_id = ${user.id} RETURNING *
    `
    if (!rows[0]) throw new HttpError(404, 'Customer not found')
    return json({ customer: customerRow(rows[0]) })
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, `You already have a customer called "${name}"`)
    throw err
  }
}

// The customer's signatures are kept and become uncategorised (ON DELETE SET NULL)
async function deleteCustomer(req: Request, id: string) {
  const user = await requireUser(req)
  const rows = await db()`DELETE FROM customers WHERE id = ${id} AND user_id = ${user.id} RETURNING id`
  if (!rows[0]) throw new HttpError(404, 'Customer not found')
  return json({ ok: true })
}

// ─── Signatures ──────────────────────────────────────────────────────────────

function signatureInput(body: Record<string, unknown>) {
  const name = str(body.name)
  const templateId = str(body.templateId)
  if (!name) throw new HttpError(400, 'Signature name is required')
  if (!templateId) throw new HttpError(400, 'templateId is required')
  if (!body.data || typeof body.data !== 'object') throw new HttpError(400, 'data is required')
  const data = JSON.stringify(body.data)
  if (data.length > MAX_SIGNATURE_CHARS) throw new HttpError(413, 'Signature is too large — try smaller images')
  return { name, templateId, data }
}

const signatureRow = (r: Record<string, unknown>) => ({
  id: r.id, name: r.name, templateId: r.template_id, customerId: r.customer_id ?? null,
  data: r.data, createdAt: r.created_at, updatedAt: r.updated_at,
})

// Returns full signature data plus customers, so the client can cache everything and switch instantly
async function listSignatures(req: Request) {
  const user = await requireUser(req)
  const [signatures, customers] = await Promise.all([
    db()`SELECT * FROM signatures WHERE user_id = ${user.id} ORDER BY updated_at DESC`,
    db()`SELECT * FROM customers WHERE user_id = ${user.id} ORDER BY lower(name)`,
  ])
  return json({ signatures: signatures.map(signatureRow), customers: customers.map(customerRow) })
}

async function getSignature(req: Request, id: string) {
  const user = await requireUser(req)
  const rows = await db()`SELECT * FROM signatures WHERE id = ${id} AND user_id = ${user.id}`
  if (!rows[0]) throw new HttpError(404, 'Signature not found')
  return json({ signature: signatureRow(rows[0]) })
}

async function createSignature(req: Request) {
  const user = await requireUser(req)
  const body = await readBody(req)
  const { name, templateId, data } = signatureInput(body)
  const customerId = await ownedCustomerId(user, body.customerId)
  const rows = await db()`
    INSERT INTO signatures (user_id, customer_id, name, template_id, data)
    VALUES (${user.id}, ${customerId}, ${name}, ${templateId}, ${data}::jsonb) RETURNING *
  `
  return json({ signature: signatureRow(rows[0]) }, 201)
}

async function updateSignature(req: Request, id: string) {
  const user = await requireUser(req)
  const body = await readBody(req)

  // Details-only update (rename and/or move to another customer) — leaves the design untouched
  if (body.data === undefined) {
    const existing = await db()`SELECT * FROM signatures WHERE id = ${id} AND user_id = ${user.id}`
    if (!existing[0]) throw new HttpError(404, 'Signature not found')
    const name = body.name === undefined ? String(existing[0].name) : str(body.name)
    if (!name) throw new HttpError(400, 'Signature name is required')
    const customerId = body.customerId === undefined
      ? (existing[0].customer_id as string | null)
      : await ownedCustomerId(user, body.customerId)
    const rows = await db()`
      UPDATE signatures SET name = ${name}, customer_id = ${customerId}, updated_at = now()
      WHERE id = ${id} AND user_id = ${user.id} RETURNING *
    `
    return json({ signature: signatureRow(rows[0]) })
  }

  const { name, templateId, data } = signatureInput(body)
  const rows = body.customerId === undefined
    ? await db()`
        UPDATE signatures SET name = ${name}, template_id = ${templateId}, data = ${data}::jsonb, updated_at = now()
        WHERE id = ${id} AND user_id = ${user.id} RETURNING *
      `
    : await db()`
        UPDATE signatures SET name = ${name}, template_id = ${templateId}, data = ${data}::jsonb,
          customer_id = ${await ownedCustomerId(user, body.customerId)}, updated_at = now()
        WHERE id = ${id} AND user_id = ${user.id} RETURNING *
      `
  if (!rows[0]) throw new HttpError(404, 'Signature not found')
  return json({ signature: signatureRow(rows[0]) })
}

// Saves many signatures at once (bulk mode) into one customer. A signature whose email matches
// one already saved under that same customer is updated in place, so re-importing doesn't duplicate.
const MAX_BULK = 200

async function bulkSaveSignatures(req: Request) {
  const user = await requireUser(req)
  const body = await readBody(req)
  if (!Array.isArray(body.signatures) || !body.signatures.length) throw new HttpError(400, 'signatures must be a non-empty array')
  if (body.signatures.length > MAX_BULK) throw new HttpError(400, `Save at most ${MAX_BULK} signatures at a time`)
  const customerId = await ownedCustomerId(user, body.customerId)
  const items = body.signatures.map((s) => {
    const input = signatureInput((s ?? {}) as Record<string, unknown>)
    const email = str((s as { data?: { email?: unknown } }).data?.email).toLowerCase()
    return { ...input, email }
  })

  const existing = await db()`
    SELECT id, lower(data->>'email') AS email FROM signatures
    WHERE user_id = ${user.id} AND customer_id IS NOT DISTINCT FROM ${customerId}
      AND coalesce(data->>'email', '') <> ''
    ORDER BY updated_at DESC
  ` as { id: string; email: string }[]
  const idByEmail = new Map<string, string>()
  for (const row of existing) if (!idByEmail.has(row.email)) idByEmail.set(row.email, row.id)

  let created = 0
  let updated = 0
  const sql = db()
  const queries = items.map((item) => {
    const id = item.email ? idByEmail.get(item.email) : undefined
    if (id) {
      updated++
      return sql`
        UPDATE signatures SET name = ${item.name}, template_id = ${item.templateId}, data = ${item.data}::jsonb, updated_at = now()
        WHERE id = ${id} AND user_id = ${user.id} RETURNING *
      `
    }
    created++
    return sql`
      INSERT INTO signatures (user_id, customer_id, name, template_id, data)
      VALUES (${user.id}, ${customerId}, ${item.name}, ${item.templateId}, ${item.data}::jsonb) RETURNING *
    `
  })
  const results = await sql.transaction(queries) as Record<string, unknown>[][]
  return json({ signatures: results.map((rows) => signatureRow(rows[0])), created, updated })
}

async function deleteSignature(req: Request, id: string) {
  const user = await requireUser(req)
  const rows = await db()`DELETE FROM signatures WHERE id = ${id} AND user_id = ${user.id} RETURNING id`
  if (!rows[0]) throw new HttpError(404, 'Signature not found')
  return json({ ok: true })
}

// ─── Admin ───────────────────────────────────────────────────────────────────

async function listUsers(req: Request) {
  await requireAdmin(req)
  const params = new URL(req.url).searchParams
  const status = params.get('status')
  const role = params.get('role')
  const rows = (status
    ? await db()`SELECT * FROM users WHERE status = ${status} ORDER BY created_at DESC`
    : role
      ? await db()`SELECT * FROM users WHERE role = ${role} ORDER BY created_at DESC`
      : await db()`SELECT * FROM users ORDER BY created_at DESC`) as UserRow[]
  return json({ users: rows.map(publicUser) })
}

async function setUserStatus(req: Request, id: string) {
  const admin = await requireAdmin(req)
  const status = str((await readBody(req)).status)
  if (!['pending', 'approved', 'rejected'].includes(status)) throw new HttpError(400, 'Invalid status')
  if (id === admin.id) throw new HttpError(400, "You can't change your own status")

  const rows = await db()`UPDATE users SET status = ${status}, updated_at = now() WHERE id = ${id} RETURNING *` as UserRow[]
  if (!rows[0]) throw new HttpError(404, 'User not found')
  // Un-approving someone signs them out everywhere
  if (status !== 'approved') await db()`DELETE FROM sessions WHERE user_id = ${id}`
  return json({ user: publicUser(rows[0]) })
}

async function setUserRole(req: Request, id: string) {
  const admin = await requireAdmin(req)
  const role = str((await readBody(req)).role)
  if (role !== 'admin' && role !== 'retailer') throw new HttpError(400, 'Invalid role')
  // Keeps at least one admin: nobody can demote themselves
  if (id === admin.id) throw new HttpError(400, "You can't change your own role")

  const rows = await db()`SELECT * FROM users WHERE id = ${id}` as UserRow[]
  if (!rows[0]) throw new HttpError(404, 'User not found')
  if (role === 'admin' && rows[0].status !== 'approved') throw new HttpError(400, 'Approve the account before making it an admin')

  const updated = await db()`UPDATE users SET role = ${role}, updated_at = now() WHERE id = ${id} RETURNING *` as UserRow[]
  return json({ user: publicUser(updated[0]) })
}

// ─── Router ──────────────────────────────────────────────────────────────────

const UUID = '([0-9a-f-]{36})'
type Handler = (req: Request, ...params: string[]) => Promise<Response>
const routes: [string, RegExp, Handler][] = [
  ['POST', /^\/api\/auth\/signup$/, signup],
  ['POST', /^\/api\/auth\/login$/, login],
  ['POST', /^\/api\/auth\/logout$/, logout],
  ['GET', /^\/api\/auth\/me$/, me],
  ['PUT', /^\/api\/account$/, updateAccount],
  ['GET', /^\/api\/signatures$/, listSignatures],
  ['POST', /^\/api\/signatures$/, createSignature],
  ['POST', /^\/api\/signatures\/bulk$/, bulkSaveSignatures],
  ['GET', new RegExp(`^/api/signatures/${UUID}$`), getSignature],
  ['PUT', new RegExp(`^/api/signatures/${UUID}$`), updateSignature],
  ['DELETE', new RegExp(`^/api/signatures/${UUID}$`), deleteSignature],
  ['POST', /^\/api\/customers$/, createCustomer],
  ['PUT', new RegExp(`^/api/customers/${UUID}$`), renameCustomer],
  ['DELETE', new RegExp(`^/api/customers/${UUID}$`), deleteCustomer],
  ['GET', /^\/api\/admin\/users$/, listUsers],
  ['POST', new RegExp(`^/api/admin/users/${UUID}/status$`), setUserStatus],
  ['POST', new RegExp(`^/api/admin/users/${UUID}/role$`), setUserRole],
]

export default async (req: Request): Promise<Response> => {
  const { pathname } = new URL(req.url)
  try {
    checkOrigin(req)
    for (const [method, pattern, handler] of routes) {
      const match = pathname.match(pattern)
      if (match && req.method === method) return await handler(req, ...match.slice(1))
    }
    return json({ error: 'Not found' }, 404)
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status)
    console.error(err)
    return json({ error: 'Something went wrong' }, 500)
  }
}
