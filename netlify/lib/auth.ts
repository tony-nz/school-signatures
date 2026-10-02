import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { db, type UserRow } from './db'

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>

const COOKIE_NAME = 'sid'
const SESSION_DAYS = 30

// ─── Passwords ───────────────────────────────────────────────────────────────

// Stored as "scrypt$<salt hex>$<hash hex>"
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return timingSafeEqual(actual, expected)
}

// ─── Sessions ────────────────────────────────────────────────────────────────

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export async function createSession(userId: string): Promise<{ token: string; expires: Date }> {
  const token = randomBytes(32).toString('base64url')
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db()`INSERT INTO sessions (id, user_id, expires_at) VALUES (${sha256(token)}, ${userId}, ${expires.toISOString()})`
  return { token, expires }
}

export async function deleteSession(req: Request): Promise<void> {
  const token = readCookie(req, COOKIE_NAME)
  if (token) await db()`DELETE FROM sessions WHERE id = ${sha256(token)}`
}

// Returns the logged-in user, or null if there's no valid session
export async function currentUser(req: Request): Promise<UserRow | null> {
  const token = readCookie(req, COOKIE_NAME)
  if (!token) return null
  const rows = await db()`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ${sha256(token)} AND s.expires_at > now()
  ` as UserRow[]
  return rows[0] ?? null
}

// ─── Cookies ─────────────────────────────────────────────────────────────────

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

export function sessionCookie(req: Request, token: string, expires: Date): string {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Expires=${expires.toUTCString()}${secure}`
}

export function clearedSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
}

// ─── Admin bootstrap ─────────────────────────────────────────────────────────

// Emails in ADMIN_EMAILS (comma-separated) are approved as admins on signup
export function isBootstrapAdmin(email: string): boolean {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email)
}
