-- ============================================================
-- PORTAL DO CLIENTE — Etapa 3
-- Cole tudo isso no SQL Editor do Supabase e execute.
-- ============================================================

-- ── 1. portal_activity_log ───────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_activity_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  entity      text        NOT NULL,
  entity_id   uuid,
  action      text        NOT NULL,
  field       text,
  old_value   text,
  new_value   text,
  actor       text        DEFAULT 'agency',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_log_client  ON portal_activity_log(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_log_entity  ON portal_activity_log(client_id, entity, entity_id);

ALTER TABLE portal_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON portal_activity_log;
CREATE POLICY "Allow all access" ON portal_activity_log FOR ALL USING (true) WITH CHECK (true);

-- ── 2. portal_optimizations ──────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_optimizations (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid    NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date              date    NOT NULL,
  type              text,
  campaign          text,
  what_done         text    NOT NULL,
  why               text,
  result            text,
  visible_to_client boolean DEFAULT true,
  sort_order        integer DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_optim_client ON portal_optimizations(client_id, date DESC);

ALTER TABLE portal_optimizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON portal_optimizations;
CREATE POLICY "Allow all access" ON portal_optimizations FOR ALL USING (true) WITH CHECK (true);

-- ── 3. portal_content ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_content (
  id                uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid  NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name              text  NOT NULL,
  format            text,
  send_date         date,
  status            text  DEFAULT 'pendente'
                          CHECK (status IN ('pendente', 'enviado', 'aprovado', 'publicado', 'cancelado')),
  metrics           jsonb DEFAULT '{}'::jsonb,
  notes             text,
  visible_to_client boolean DEFAULT true,
  sort_order        integer DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_content_client ON portal_content(client_id, send_date DESC);

ALTER TABLE portal_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON portal_content;
CREATE POLICY "Allow all access" ON portal_content FOR ALL USING (true) WITH CHECK (true);

-- ── 4. portal_weekly_reports ─────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_weekly_reports (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid  NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  week_start  date  NOT NULL,
  week_end    date,
  metrics     jsonb DEFAULT '{}'::jsonb,
  highlights  text,
  note        text,
  published   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (client_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_portal_weekly_client ON portal_weekly_reports(client_id, week_start DESC);

ALTER TABLE portal_weekly_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON portal_weekly_reports;
CREATE POLICY "Allow all access" ON portal_weekly_reports FOR ALL USING (true) WITH CHECK (true);

-- ── 5. portal_monthly_reports ────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_monthly_reports (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid  NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month_key   text  NOT NULL,
  metrics     jsonb DEFAULT '{}'::jsonb,
  highlights  text,
  note        text,
  published   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (client_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_portal_monthly_client ON portal_monthly_reports(client_id, month_key DESC);

ALTER TABLE portal_monthly_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON portal_monthly_reports;
CREATE POLICY "Allow all access" ON portal_monthly_reports FOR ALL USING (true) WITH CHECK (true);

-- ── 6. ideas em portal_launches ──────────────────────────────

ALTER TABLE portal_launches ADD COLUMN IF NOT EXISTS ideas text;

-- ── Verificação ──────────────────────────────────────────────

SELECT 'Portal Etapa 3 criado com sucesso!' AS status;
