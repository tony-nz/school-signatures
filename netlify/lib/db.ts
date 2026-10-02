import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let client: NeonQueryFunction<false, false> | null = null

// Created lazily so a missing env var surfaces as a clear error on first use
export function db(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    client = neon(url)
  }
  return client
}

export interface UserRow {
  id: string
  email: string
  password_hash: string
  business_name: string
  contact_name: string
  logo: string
  role: 'retailer' | 'admin'
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

// The shape sent to the browser — never includes the password hash
export function publicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    businessName: u.business_name,
    contactName: u.contact_name,
    logo: u.logo,
    role: u.role,
    status: u.status,
    createdAt: u.created_at,
  }
}
