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

CREATE UNIQUE INDEX IF NOT EXISTS customers_user_name_idx ON customers (user_id, lower(name));

-- Deleting a customer keeps its signatures, just uncategorised
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS signatures_customer_id_idx ON signatures (customer_id);
