-- ============================================================
-- PORTAL DO CLIENTE — Etapa 1
-- Cole tudo isso no SQL Editor do Supabase e execute.
-- ============================================================

-- ── 1. Colunas novas em tabelas existentes ──────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS visible_to_client boolean DEFAULT false;

ALTER TABLE client_notes
  ADD COLUMN IF NOT EXISTS visible_to_client boolean DEFAULT false;

-- ── 2. client_portals ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_portals (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  slug           text        UNIQUE NOT NULL,
  password_hash  text        NOT NULL DEFAULT 'pendente',
  enabled        boolean     DEFAULT true,
  sections       jsonb       DEFAULT '{"overview":true,"requests":true,"links":true}'::jsonb,
  last_visit_at  timestamptz,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_portals_slug      ON client_portals(slug);
CREATE INDEX IF NOT EXISTS idx_client_portals_client_id ON client_portals(client_id);

ALTER TABLE client_portals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON client_portals;
CREATE POLICY "Allow all access" ON client_portals
  FOR ALL USING (true) WITH CHECK (true);

-- ── 3. portal_requests ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  "from"      text        NOT NULL CHECK ("from" IN ('client', 'agency')),
  title       text        NOT NULL,
  details     text,
  due_date    date,
  status      text        DEFAULT 'pendente'
                          CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado')),
  note        text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_requests_client_id ON portal_requests(client_id);

ALTER TABLE portal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON portal_requests;
CREATE POLICY "Allow all access" ON portal_requests
  FOR ALL USING (true) WITH CHECK (true);

-- ── 4. portal_links ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_links (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  group_name  text        NOT NULL DEFAULT 'Referências',
  label       text        NOT NULL,
  url         text        NOT NULL,
  sort_order  integer     DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_links_client_id ON portal_links(client_id);

ALTER TABLE portal_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON portal_links;
CREATE POLICY "Allow all access" ON portal_links
  FOR ALL USING (true) WITH CHECK (true);

-- ── Verificação ──────────────────────────────────────────────

SELECT 'Portal Etapa 1 criado com sucesso!' AS status;
