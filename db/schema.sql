-- Retailer accounts, sessions and saved signatures.
-- Safe to re-run: every statement is idempotent.

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,           -- always stored lowercased
  password_hash text NOT NULL,
  business_name text NOT NULL,
  contact_name  text NOT NULL DEFAULT '',
  logo          text NOT NULL DEFAULT '',       -- data URL or https URL, shown in the app header
  role          text NOT NULL DEFAULT 'retailer' CHECK (role IN ('retailer', 'admin')),
  status        text NOT NULL DEFAULT 'pending'  CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_status_idx ON users (status);

-- id is the SHA-256 of the session token; the raw token only lives in the user's cookie
CREATE TABLE IF NOT EXISTS sessions (
  id         text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS signatures (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        text NOT NULL,
  template_id text NOT NULL,
  data        jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signatures_user_id_idx ON signatures (user_id);

-- Customers group a retailer's signatures (e.g. one per client business)
CREATE TABLE IF NOT EXISTS customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Deleting a customer keeps its signatures, just uncategorised
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS signatures_customer_id_idx ON signatures (customer_id);

-- Header branding options: hide the business name text (e.g. when the logo already shows it) and an optional tagline
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_business_name boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tagline text NOT NULL DEFAULT '';

-- One-time password reset links created by admins; id is the SHA-256 of the token in the link
CREATE TABLE IF NOT EXISTS password_resets (
  id         text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_resets_user_id_idx ON password_resets (user_id);

-- ─── Companies ────────────────────────────────────────────────────────────────
-- A company owns the branding, customers and signatures; several users can belong to one.

CREATE TABLE IF NOT EXISTS companies (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  logo               text NOT NULL DEFAULT '',
  show_business_name boolean NOT NULL DEFAULT true,
  tagline            text NOT NULL DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies (id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_role text NOT NULL DEFAULT 'member' CHECK (company_role IN ('owner', 'member'));
CREATE INDEX IF NOT EXISTS users_company_id_idx ON users (company_id);

-- Branding now lives on the company; these user columns are kept only for the backfill below
ALTER TABLE users ALTER COLUMN business_name SET DEFAULT '';

-- Backfill: every account without a company becomes the owner of its own company (reusing its id)
INSERT INTO companies (id, name, logo, show_business_name, tagline, created_at)
  SELECT id, business_name, logo, show_business_name, tagline, created_at FROM users WHERE company_id IS NULL
  ON CONFLICT (id) DO NOTHING;
UPDATE users SET company_id = id, company_role = 'owner' WHERE company_id IS NULL;

-- Customers and signatures belong to the company; user_id records who created them
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies (id) ON DELETE CASCADE;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies (id) ON DELETE CASCADE;
UPDATE customers c SET company_id = u.company_id FROM users u WHERE c.user_id = u.id AND c.company_id IS NULL;
UPDATE signatures s SET company_id = u.company_id FROM users u WHERE s.user_id = u.id AND s.company_id IS NULL;
CREATE INDEX IF NOT EXISTS customers_company_id_idx ON customers (company_id);
CREATE INDEX IF NOT EXISTS signatures_company_id_idx ON signatures (company_id);

-- Removing a team member keeps the company's customers and signatures
ALTER TABLE customers ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE signatures ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_user_id_fkey;
ALTER TABLE customers ADD CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE signatures DROP CONSTRAINT IF EXISTS signatures_user_id_fkey;
ALTER TABLE signatures ADD CONSTRAINT signatures_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;

-- Customer names are unique per company rather than per user
DROP INDEX IF EXISTS customers_user_name_idx;
CREATE UNIQUE INDEX IF NOT EXISTS customers_company_name_idx ON customers (company_id, lower(name));

-- Users joined with their company's branding: read accounts through this, write to users/companies
CREATE OR REPLACE VIEW accounts AS
  SELECT u.id, u.email, u.password_hash, u.contact_name, u.role, u.status, u.created_at,
         u.company_id, u.company_role,
         c.name AS business_name, c.logo, c.show_business_name, c.tagline
  FROM users u JOIN companies c ON c.id = u.company_id;
