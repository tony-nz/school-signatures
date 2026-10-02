// Applies db/schema.sql to the database in DATABASE_URL.
// Usage: npm run db:migrate   (reads .env)
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env (see .env.example).')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')

// The HTTP driver runs one statement per query
const statements = schema
  .replace(/--.*$/gm, '')
  .split(/;\s*(?:\n|$)/)
  .map((s) => s.trim())
  .filter(Boolean)

for (const statement of statements) {
  await sql.query(statement)
}
console.log(`Applied ${statements.length} statements.`)
