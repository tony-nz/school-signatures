import type { BulkRow } from '../types'

const BULK_FIELDS = ['name', 'title', 'email', 'phone', 'mobile', 'website', 'address', 'tagline', 'avatar'] as const

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current.trim())
  return fields
}

let idCounter = 0

function createEmptyRow(): BulkRow {
  return {
    id: `row-${Date.now()}-${idCounter++}`,
    name: '', title: '', email: '', phone: '', mobile: '',
    website: '', address: '', tagline: '', avatar: '',
  }
}

function mapHeaders(headers: string[]): (keyof BulkRow | null)[] {
  return headers.map((h) => {
    const normalized = h.toLowerCase().replace(/[^a-z]/g, '')
    for (const field of BULK_FIELDS) {
      if (normalized === field) return field
    }
    // Common aliases
    if (normalized === 'fullname' || normalized === 'firstname' || normalized === 'staffname') return 'name'
    if (normalized === 'jobtitle' || normalized === 'position' || normalized === 'role') return 'title'
    if (normalized === 'emailaddress' || normalized === 'mail') return 'email'
    if (normalized === 'phonenumber' || normalized === 'telephone' || normalized === 'tel') return 'phone'
    if (normalized === 'mobilenumber' || normalized === 'cell' || normalized === 'cellphone') return 'mobile'
    if (normalized === 'url' || normalized === 'web' || normalized === 'site') return 'website'
    if (normalized === 'photo' || normalized === 'image' || normalized === 'avatarurl' || normalized === 'photourl') return 'avatar'
    return null
  })
}

export function parseCSV(text: string): BulkRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const mapping = mapHeaders(headers)

  const rows: BulkRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row = createEmptyRow()
    for (let j = 0; j < mapping.length; j++) {
      const field = mapping[j]
      if (field && field !== 'id' && j < values.length) {
        ;(row as unknown as Record<string, string>)[field] = values[j]
      }
    }
    // Skip completely empty rows
    if (BULK_FIELDS.some((f) => row[f].length > 0)) {
      rows.push(row)
    }
  }
  return rows
}

export function rowsToCSV(rows: BulkRow[]): string {
  const header = BULK_FIELDS.join(',')
  const lines = rows.map((row) =>
    BULK_FIELDS.map((f) => {
      const val = row[f]
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"`
        : val
    }).join(',')
  )
  return [header, ...lines].join('\n')
}

export { createEmptyRow, BULK_FIELDS }
