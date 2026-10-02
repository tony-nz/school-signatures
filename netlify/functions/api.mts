import type { Config } from '@netlify/functions'
import { randomBytes, randomUUID } from 'node:crypto'
import { db, publicUser, type UserRow } from '../lib/db'
import {
  hashPassword, verifyPassword, createSession, deleteSession, currentUser,
  sessionCookie, clearedSessionCookie, isBootstrapAdmin,
  deleteOtherSessions, createPasswordReset, passwordResetUser,
} from '../lib/auth'

export const config: Config = { path: '/api/*' }

// ─── Helpers ─────────────────────────────────────────────────────────────────

// `code` lets the client react to a specific error (e.g. offering to continue anyway)
class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message) }
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_LOGO_CHARS = 1_000_000        // ~750 KB image as a data URL
const MAX_TAGLINE_CHARS = 60
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

// ─── Accounts & companies ────────────────────────────────────────────────────

async function account(id: string): Promise<UserRow | null> {
  const rows = await db()`SELECT * FROM accounts WHERE id = ${id}` as UserRow[]
  return rows[0] ?? null
}

interface NewAccount {
  email: string
  passwordHash: string
  contactName: string
  role: 'retailer' | 'admin'
  status: UserRow['status']
  companyRole: UserRow['company_role']
  companyId?: string    // join this company…
  companyName?: string  // …or create a new one with this name
}

// Inserts the user (and their new company) in one transaction, so a taken email leaves nothing behind
async function createAccount(input: NewAccount): Promise<UserRow> {
  const id = randomUUID()
  const companyId = input.companyId ?? randomUUID()
  const sql = db()
  const queries = []
  if (!input.companyId) queries.push(sql`INSERT INTO companies (id, name) VALUES (${companyId}, ${input.companyName ?? ''})`)
  queries.push(sql`
    INSERT INTO users (id, email, password_hash, contact_name, role, status, company_id, company_role)
    VALUES (${id}, ${input.email}, ${input.passwordHash}, ${input.contactName}, ${input.role}, ${input.status},
            ${companyId}, ${input.companyRole})
  `)
  try {
    await sql.transaction(queries)
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'An account with that email already exists')
    throw err
  }
  return (await account(id))!
}

// Hash of a random password nobody knows — used for invited users until they open their setup link
const unusablePasswordHash = () => hashPassword(randomBytes(32).toString('hex'))

const resetUrl = (req: Request, token: string) => new URL(`/reset-password?token=${token}`, req.url).toString()

function validEmail(value: unknown): string {
  const email = str(value).toLowerCase()
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address')
  return email
}

// Company names compare ignoring case and extra whitespace, so " momac " matches "MoMac"
const normalizedName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()

// An established company (one with an approved member) whose name matches, other than excludeId
async function matchingCompany(name: string, excludeId: string | null = null): Promise<{ id: string; name: string } | null> {
  const rows = await db()`
    SELECT c.id, c.name FROM companies c
    WHERE lower(regexp_replace(trim(c.name), '\\s+', ' ', 'g')) = ${normalizedName(name)}
      AND c.id IS DISTINCT FROM ${excludeId}
      AND EXISTS (SELECT 1 FROM users u WHERE u.company_id = c.id AND u.status = 'approved')
    ORDER BY c.created_at LIMIT 1
  ` as { id: string; name: string }[]
  return rows[0] ?? null
}

// Deletes a company left with no members and no saved data (e.g. after its only user was moved elsewhere)
async function deleteIfEmpty(companyId: string) {
  await db()`
    DELETE FROM companies c WHERE c.id = ${companyId}
      AND NOT EXISTS (SELECT 1 FROM users WHERE company_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM signatures WHERE company_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM customers WHERE company_id = c.id)
  `
}

// ─── Auth ────────────────────────────────────────────────────────────────────

async function signup(req: Request) {
  const body = await readBody(req)
  const email = validEmail(body.email)
  const password = newPassword(body.password)
  const businessName = str(body.businessName)
  if (!businessName) throw new HttpError(400, 'Business name is required')

  // Nudges people to ask their company's owner instead of creating a duplicate; they can still continue
  if (body.confirmNewCompany !== true) {
    const match = await matchingCompany(businessName)
    if (match) {
      throw new HttpError(409, `${match.name} already has an account here. Ask its owner to add you to their team, or continue and an admin will sort it out.`, 'company_exists')
    }
  }

  const admin = isBootstrapAdmin(email)
  const user = await createAccount({
    email, passwordHash: await hashPassword(password), contactName: str(body.contactName),
    role: admin ? 'admin' : 'retailer', status: admin ? 'approved' : 'pending',
    companyRole: 'owner', companyName: businessName,
  })
  if (user.status !== 'approved') return json({ user: null, status: user.status }, 201)

  const session = await createSession(user.id)
  return json({ user: publicUser(user) }, 201, { 'set-cookie': sessionCookie(req, session.token, session.expires) })
}

async function login(req: Request) {
  const body = await readBody(req)
  const email = str(body.email).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''

  const rows = await db()`SELECT * FROM accounts WHERE email = ${email}` as UserRow[]
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

// ─── Passwords ───────────────────────────────────────────────────────────────

function newPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 8) throw new HttpError(400, 'Password must be at least 8 characters')
  return value
}

// Stores a new password, invalidates any reset links and signs the user out of other sessions
async function storePassword(req: Request, userId: string, password: string) {
  await db()`UPDATE users SET password_hash = ${await hashPassword(password)}, updated_at = now() WHERE id = ${userId}`
  await db()`DELETE FROM password_resets WHERE user_id = ${userId}`
  await deleteOtherSessions(req, userId)
}

async function changeOwnPassword(req: Request) {
  const user = await requireUser(req)
  const body = await readBody(req)
  const current = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const password = newPassword(body.newPassword)
  if (!(await verifyPassword(current, user.password_hash))) throw new HttpError(400, 'Your current password is incorrect')
  await storePassword(req, user.id, password)
  return json({ ok: true })
}

// Lets the reset page show who the link is for before they choose a password
async function checkResetLink(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  const user = token ? await passwordResetUser(token) : null
  if (!user) throw new HttpError(400, 'This reset link is invalid or has expired')
  return json({ email: user.email })
}

async function resetPassword(req: Request) {
  const body = await readBody(req)
  const token = str(body.token)
  const password = newPassword(body.password)
  const user = token ? await passwordResetUser(token) : null
  if (!user) throw new HttpError(400, 'This reset link is invalid or has expired')
  await storePassword(req, user.id, password)
  return json({ ok: true, email: user.email })
}

// ─── Account & company branding ──────────────────────────────────────────────

// Anyone can change their own name; only the company owner (or a site admin) can change the branding
async function updateAccount(req: Request) {
  const user = await requireUser(req)
  const body = await readBody(req)
  const contactName = body.contactName === undefined ? user.contact_name : str(body.contactName)
  const businessName = body.businessName === undefined ? user.business_name : str(body.businessName)
  const logo = body.logo === undefined ? user.logo : str(body.logo)
  const showBusinessName = typeof body.showBusinessName === 'boolean' ? body.showBusinessName : user.show_business_name
  const tagline = body.tagline === undefined ? user.tagline : str(body.tagline)

  const brandingChanged = businessName !== user.business_name || logo !== user.logo
    || showBusinessName !== user.show_business_name || tagline !== user.tagline
  if (brandingChanged && !canManageCompany(user)) throw new HttpError(403, "Only your company's owner can change its branding")
  if (!businessName) throw new HttpError(400, 'Business name is required')
  if (logo.length > MAX_LOGO_CHARS) throw new HttpError(413, 'Logo is too large (max ~750 KB)')
  if (logo && !/^(data:image\/|https:\/\/)/.test(logo)) throw new HttpError(400, 'Logo must be an image upload or https URL')
  if (tagline.length > MAX_TAGLINE_CHARS) throw new HttpError(400, `Tagline must be ${MAX_TAGLINE_CHARS} characters or fewer`)

  await db()`UPDATE users SET contact_name = ${contactName}, updated_at = now() WHERE id = ${user.id}`
  if (brandingChanged) {
    await db()`
      UPDATE companies SET name = ${businessName}, logo = ${logo}, show_business_name = ${showBusinessName},
        tagline = ${tagline}, updated_at = now()
      WHERE id = ${user.company_id}
    `
  }
  return json({ user: publicUser((await account(user.id))!) })
}

// ─── Team (company owners manage their own users) ──────────────────────────

const canManageCompany = (user: UserRow) => user.company_role === 'owner' || user.role === 'admin'

async function requireCompanyManager(req: Request): Promise<UserRow> {
  const user = await requireUser(req)
  if (!canManageCompany(user)) throw new HttpError(403, "Only your company's owner can manage its team")
  return user
}

// A member of the manager's own company, other than the manager themselves
async function teamMember(manager: UserRow, id: string): Promise<UserRow> {
  if (id === manager.id) throw new HttpError(400, "You can't change your own team access")
  const rows = await db()`SELECT * FROM accounts WHERE id = ${id} AND company_id = ${manager.company_id}` as UserRow[]
  if (!rows[0]) throw new HttpError(404, 'Team member not found')
  return rows[0]
}

const teamRow = (u: UserRow) => ({
  id: u.id, email: u.email, contactName: u.contact_name, companyRole: u.company_role, status: u.status, createdAt: u.created_at,
})

async function listTeam(req: Request) {
  const user = await requireUser(req)
  const rows = await db()`SELECT * FROM accounts WHERE company_id = ${user.company_id} ORDER BY created_at` as UserRow[]
  return json({ members: rows.map(teamRow), canManage: canManageCompany(user) })
}

// Adds a user to the company and returns a one-time link for them to choose their password
async function addTeamMember(req: Request) {
  const manager = await requireCompanyManager(req)
  const body = await readBody(req)
  const user = await createAccount({
    email: validEmail(body.email), passwordHash: await unusablePasswordHash(), contactName: str(body.contactName),
    role: 'retailer', status: 'approved', companyRole: body.companyRole === 'owner' ? 'owner' : 'member',
    companyId: manager.company_id,
  })
  const { token, expires } = await createPasswordReset(user.id)
  return json({ member: teamRow(user), setupUrl: resetUrl(req, token), expiresAt: expires.toISOString() }, 201)
}

async function setTeamRole(req: Request, id: string) {
  const manager = await requireCompanyManager(req)
  const member = await teamMember(manager, id)
  const companyRole = str((await readBody(req)).companyRole)
  if (companyRole !== 'owner' && companyRole !== 'member') throw new HttpError(400, 'Invalid company role')
  await db()`UPDATE users SET company_role = ${companyRole}, updated_at = now() WHERE id = ${member.id}`
  return json({ member: teamRow((await account(member.id))!) })
}

async function teamResetLink(req: Request, id: string) {
  const manager = await requireCompanyManager(req)
  const member = await teamMember(manager, id)
  const { token, expires } = await createPasswordReset(member.id)
  return json({ url: resetUrl(req, token), expiresAt: expires.toISOString() })
}

// The company keeps everything the member created
async function removeTeamMember(req: Request, id: string) {
  const manager = await requireCompanyManager(req)
  const member = await teamMember(manager, id)
  await db()`DELETE FROM users WHERE id = ${member.id}`
  return json({ ok: true })
}

// ─── Customers ───────────────────────────────────────────────────────────────

const customerRow = (r: Record<string, unknown>) => ({ id: r.id, name: r.name, createdAt: r.created_at })

// Resolves an optional customerId from a request body: null for none, or an id this user owns
async function ownedCustomerId(user: UserRow, value: unknown): Promise<string | null> {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/.test(value)) throw new HttpError(400, 'Invalid customerId')
  const rows = await db()`SELECT id FROM customers WHERE id = ${value} AND company_id = ${user.company_id}`
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
    const rows = await db()`INSERT INTO customers (company_id, user_id, name) VALUES (${user.company_id}, ${user.id}, ${name}) RETURNING *`
    return json({ customer: customerRow(rows[0]) }, 201)
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, `Your company already has a customer called "${name}"`)
    throw err
  }
}

async function renameCustomer(req: Request, id: string) {
  const user = await requireUser(req)
  const name = customerName(await readBody(req))
  try {
    const rows = await db()`
      UPDATE customers SET name = ${name}, updated_at = now()
      WHERE id = ${id} AND company_id = ${user.company_id} RETURNING *
    `
    if (!rows[0]) throw new HttpError(404, 'Customer not found')
    return json({ customer: customerRow(rows[0]) })
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, `Your company already has a customer called "${name}"`)
    throw err
  }
}

// The customer's signatures are kept and become uncategorised (ON DELETE SET NULL)
async function deleteCustomer(req: Request, id: string) {
  const user = await requireUser(req)
  const rows = await db()`DELETE FROM customers WHERE id = ${id} AND company_id = ${user.company_id} RETURNING id`
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
    db()`SELECT * FROM signatures WHERE company_id = ${user.company_id} ORDER BY updated_at DESC`,
    db()`SELECT * FROM customers WHERE company_id = ${user.company_id} ORDER BY lower(name)`,
  ])
  return json({ signatures: signatures.map(signatureRow), customers: customers.map(customerRow) })
}

async function getSignature(req: Request, id: string) {
  const user = await requireUser(req)
  const rows = await db()`SELECT * FROM signatures WHERE id = ${id} AND company_id = ${user.company_id}`
  if (!rows[0]) throw new HttpError(404, 'Signature not found')
  return json({ signature: signatureRow(rows[0]) })
}

async function createSignature(req: Request) {
  const user = await requireUser(req)
  const body = await readBody(req)
  const { name, templateId, data } = signatureInput(body)
  const customerId = await ownedCustomerId(user, body.customerId)
  const rows = await db()`
    INSERT INTO signatures (company_id, user_id, customer_id, name, template_id, data)
    VALUES (${user.company_id}, ${user.id}, ${customerId}, ${name}, ${templateId}, ${data}::jsonb) RETURNING *
  `
  return json({ signature: signatureRow(rows[0]) }, 201)
}

async function updateSignature(req: Request, id: string) {
  const user = await requireUser(req)
  const body = await readBody(req)

  // Details-only update (rename and/or move to another customer) — leaves the design untouched
  if (body.data === undefined) {
    const existing = await db()`SELECT * FROM signatures WHERE id = ${id} AND company_id = ${user.company_id}`
    if (!existing[0]) throw new HttpError(404, 'Signature not found')
    const name = body.name === undefined ? String(existing[0].name) : str(body.name)
    if (!name) throw new HttpError(400, 'Signature name is required')
    const customerId = body.customerId === undefined
      ? (existing[0].customer_id as string | null)
      : await ownedCustomerId(user, body.customerId)
    const rows = await db()`
      UPDATE signatures SET name = ${name}, customer_id = ${customerId}, updated_at = now()
      WHERE id = ${id} AND company_id = ${user.company_id} RETURNING *
    `
    return json({ signature: signatureRow(rows[0]) })
  }

  const { name, templateId, data } = signatureInput(body)
  const rows = body.customerId === undefined
    ? await db()`
        UPDATE signatures SET name = ${name}, template_id = ${templateId}, data = ${data}::jsonb, updated_at = now()
        WHERE id = ${id} AND company_id = ${user.company_id} RETURNING *
      `
    : await db()`
        UPDATE signatures SET name = ${name}, template_id = ${templateId}, data = ${data}::jsonb,
          customer_id = ${await ownedCustomerId(user, body.customerId)}, updated_at = now()
        WHERE id = ${id} AND company_id = ${user.company_id} RETURNING *
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
    WHERE company_id = ${user.company_id} AND customer_id IS NOT DISTINCT FROM ${customerId}
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
        WHERE id = ${id} AND company_id = ${user.company_id} RETURNING *
      `
    }
    created++
    return sql`
      INSERT INTO signatures (company_id, user_id, customer_id, name, template_id, data)
      VALUES (${user.company_id}, ${user.id}, ${customerId}, ${item.name}, ${item.templateId}, ${item.data}::jsonb) RETURNING *
    `
  })
  const results = await sql.transaction(queries) as Record<string, unknown>[][]
  return json({ signatures: results.map((rows) => signatureRow(rows[0])), created, updated })
}

async function deleteSignature(req: Request, id: string) {
  const user = await requireUser(req)
  const rows = await db()`DELETE FROM signatures WHERE id = ${id} AND company_id = ${user.company_id} RETURNING id`
  if (!rows[0]) throw new HttpError(404, 'Signature not found')
  return json({ ok: true })
}

// ─── Admin ───────────────────────────────────────────────────────────────────

async function listUsers(req: Request) {
  await requireAdmin(req)
  const rows = await db()`
    SELECT u.*,
      (SELECT count(*)::int FROM users m WHERE m.company_id = u.company_id) AS member_count,
      (SELECT count(*)::int FROM signatures s WHERE s.company_id = u.company_id) AS signature_count,
      (SELECT count(*)::int FROM customers c WHERE c.company_id = u.company_id) AS customer_count,
      m.id AS match_company_id, m.name AS match_company_name
    FROM accounts u
    -- An established company with the same name: a pending sign-up probably belongs there
    LEFT JOIN LATERAL (
      SELECT c.id, c.name FROM companies c
      WHERE c.id <> u.company_id
        AND lower(regexp_replace(trim(c.name), '\\s+', ' ', 'g')) = lower(regexp_replace(trim(u.business_name), '\\s+', ' ', 'g'))
        AND EXISTS (SELECT 1 FROM users a WHERE a.company_id = c.id AND a.status = 'approved')
      ORDER BY c.created_at LIMIT 1
    ) m ON true
    ORDER BY lower(u.business_name), u.company_role DESC, u.created_at
  ` as (UserRow & {
    member_count: number; signature_count: number; customer_count: number
    match_company_id: string | null; match_company_name: string | null
  })[]
  return json({
    users: rows.map((u) => ({
      ...publicUser(u), memberCount: u.member_count, signatureCount: u.signature_count, customerCount: u.customer_count,
      matchingCompany: u.match_company_id ? { id: u.match_company_id, name: u.match_company_name } : null,
    })),
  })
}

async function listCompanies(req: Request) {
  await requireAdmin(req)
  const rows = await db()`
    SELECT c.id, c.name, (SELECT count(*)::int FROM users u WHERE u.company_id = c.id) AS member_count
    FROM companies c ORDER BY lower(c.name)
  `
  return json({ companies: rows.map((c) => ({ id: c.id, name: c.name, memberCount: c.member_count })) })
}

async function adminCompanyId(value: unknown): Promise<string> {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/.test(value)) throw new HttpError(400, 'Invalid companyId')
  const rows = await db()`SELECT id FROM companies WHERE id = ${value}`
  if (!rows[0]) throw new HttpError(400, 'Company not found')
  return value
}

// Admin-created accounts skip the approval queue. They join an existing company (companyId) or start a new one (businessName).
async function createUser(req: Request) {
  await requireAdmin(req)
  const body = await readBody(req)
  const email = validEmail(body.email)
  const password = newPassword(body.password)
  const companyId = body.companyId ? await adminCompanyId(body.companyId) : undefined
  const companyName = str(body.businessName)
  if (!companyId && !companyName) throw new HttpError(400, 'Choose a company or enter a new business name')

  const user = await createAccount({
    email, passwordHash: await hashPassword(password), contactName: str(body.contactName),
    role: body.role === 'admin' ? 'admin' : 'retailer', status: 'approved',
    companyRole: !companyId || body.companyRole === 'owner' ? 'owner' : 'member',
    companyId, companyName,
  })
  return json({ user: publicUser(user) }, 201)
}

// Edits a user; businessName renames their whole company, companyId moves them to another company
async function updateUser(req: Request, id: string) {
  await requireAdmin(req)
  const body = await readBody(req)
  const user = await account(id)
  if (!user) throw new HttpError(404, 'User not found')

  const email = body.email === undefined ? user.email : validEmail(body.email)
  const contactName = body.contactName === undefined ? user.contact_name : str(body.contactName)
  const companyId = body.companyId === undefined ? user.company_id : await adminCompanyId(body.companyId)
  const companyRole = body.companyRole === 'owner' || body.companyRole === 'member' ? body.companyRole : user.company_role
  const businessName = body.businessName === undefined ? user.business_name : str(body.businessName)
  if (!businessName) throw new HttpError(400, 'Business name is required')

  try {
    await db()`
      UPDATE users SET email = ${email}, contact_name = ${contactName}, company_id = ${companyId},
        company_role = ${companyRole}, updated_at = now()
      WHERE id = ${id}
    `
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'Another account already uses that email')
    throw err
  }
  // Renaming applies to the company the user was in when the form was opened
  if (businessName !== user.business_name && companyId === user.company_id) {
    await db()`UPDATE companies SET name = ${businessName}, updated_at = now() WHERE id = ${companyId}`
  }
  if (companyId !== user.company_id) await deleteIfEmpty(user.company_id)
  return json({ user: publicUser((await account(id))!) })
}

// Moves a pending sign-up into an existing company as a member and approves them
async function approveInto(req: Request, id: string) {
  await requireAdmin(req)
  const companyId = await adminCompanyId((await readBody(req)).companyId)
  const user = await account(id)
  if (!user) throw new HttpError(404, 'User not found')
  await db()`
    UPDATE users SET company_id = ${companyId}, company_role = 'member', status = 'approved', updated_at = now()
    WHERE id = ${id}
  `
  if (companyId !== user.company_id) await deleteIfEmpty(user.company_id)
  return json({ user: publicUser((await account(id))!) })
}

// Admin sets a password directly; the user is signed out everywhere (except the admin's own session)
async function setUserPassword(req: Request, id: string) {
  await requireAdmin(req)
  const password = newPassword((await readBody(req)).password)
  const rows = await db()`SELECT id FROM users WHERE id = ${id}`
  if (!rows[0]) throw new HttpError(404, 'User not found')
  await storePassword(req, id, password)
  return json({ ok: true })
}

// Admin creates a one-time link the user opens to choose their own password
async function createResetLink(req: Request, id: string) {
  await requireAdmin(req)
  const rows = await db()`SELECT id FROM users WHERE id = ${id}`
  if (!rows[0]) throw new HttpError(404, 'User not found')
  const { token, expires } = await createPasswordReset(id)
  return json({ url: resetUrl(req, token), expiresAt: expires.toISOString() })
}

// Removes the user. If they were the company's last member, the company and all its data go too.
async function deleteUser(req: Request, id: string) {
  const admin = await requireAdmin(req)
  if (id === admin.id) throw new HttpError(400, "You can't delete your own account")
  const rows = await db()`DELETE FROM users WHERE id = ${id} RETURNING company_id`
  if (!rows[0]) throw new HttpError(404, 'User not found')
  await db()`
    DELETE FROM companies c WHERE c.id = ${rows[0].company_id}
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.company_id = c.id)
  `
  return json({ ok: true })
}

async function setUserStatus(req: Request, id: string) {
  const admin = await requireAdmin(req)
  const status = str((await readBody(req)).status)
  if (!['pending', 'approved', 'rejected'].includes(status)) throw new HttpError(400, 'Invalid status')
  if (id === admin.id) throw new HttpError(400, "You can't change your own status")

  const rows = await db()`UPDATE users SET status = ${status}, updated_at = now() WHERE id = ${id} RETURNING id`
  if (!rows[0]) throw new HttpError(404, 'User not found')
  // Un-approving someone signs them out everywhere
  if (status !== 'approved') await db()`DELETE FROM sessions WHERE user_id = ${id}`
  return json({ user: publicUser((await account(id))!) })
}

async function setUserRole(req: Request, id: string) {
  const admin = await requireAdmin(req)
  const role = str((await readBody(req)).role)
  if (role !== 'admin' && role !== 'retailer') throw new HttpError(400, 'Invalid role')
  // Keeps at least one admin: nobody can demote themselves
  if (id === admin.id) throw new HttpError(400, "You can't change your own role")

  const user = await account(id)
  if (!user) throw new HttpError(404, 'User not found')
  if (role === 'admin' && user.status !== 'approved') throw new HttpError(400, 'Approve the account before making it an admin')

  await db()`UPDATE users SET role = ${role}, updated_at = now() WHERE id = ${id}`
  return json({ user: publicUser((await account(id))!) })
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
  ['POST', /^\/api\/account\/password$/, changeOwnPassword],
  ['GET', /^\/api\/team$/, listTeam],
  ['POST', /^\/api\/team$/, addTeamMember],
  ['PUT', new RegExp(`^/api/team/${UUID}$`), setTeamRole],
  ['DELETE', new RegExp(`^/api/team/${UUID}$`), removeTeamMember],
  ['POST', new RegExp(`^/api/team/${UUID}/reset-link$`), teamResetLink],
  ['GET', /^\/api\/auth\/reset$/, checkResetLink],
  ['POST', /^\/api\/auth\/reset$/, resetPassword],
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
  ['GET', /^\/api\/admin\/companies$/, listCompanies],
  ['POST', new RegExp(`^/api/admin/users/${UUID}/approve-into$`), approveInto],
  ['POST', /^\/api\/admin\/users$/, createUser],
  ['PUT', new RegExp(`^/api/admin/users/${UUID}$`), updateUser],
  ['DELETE', new RegExp(`^/api/admin/users/${UUID}$`), deleteUser],
  ['POST', new RegExp(`^/api/admin/users/${UUID}/password$`), setUserPassword],
  ['POST', new RegExp(`^/api/admin/users/${UUID}/reset-link$`), createResetLink],
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
    if (err instanceof HttpError) return json({ error: err.message, ...(err.code ? { code: err.code } : {}) }, err.status)
    console.error(err)
    return json({ error: 'Something went wrong' }, 500)
  }
}
