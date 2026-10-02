import type { SignatureData } from '../types'

// Thin wrapper over fetch for the /api Netlify function. Throws ApiError on non-2xx.

export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers: options.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: 'same-origin',
  })
  const payload = await res.json().catch(() => ({}))
  if (res.status >= 500) throw new ApiError(res.status, "We couldn't reach the server. Try again in a minute.")
  if (!res.ok) throw new ApiError(res.status, payload.error ?? `Request failed (${res.status})`, payload.code)
  return payload as T
}

export interface User {
  id: string
  email: string
  businessName: string
  contactName: string
  logo: string
  showBusinessName: boolean
  tagline: string
  role: 'retailer' | 'admin'
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  companyId: string
  companyRole: 'owner' | 'member'
}

export interface Customer {
  id: string
  name: string
  createdAt: string
}

export interface SavedSignatureSummary {
  id: string
  name: string
  templateId: string
  customerId: string | null
  createdAt: string
  updatedAt: string
}

export interface SavedSignature extends SavedSignatureSummary {
  data: SignatureData
}
