-- ============================================================
-- PORTAL DO CLIENTE — Etapa 2
-- Cole tudo isso no SQL Editor do Supabase e execute.
-- ============================================================

-- ── 1. portal_daily_reports ─────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_daily_reports (
  id          uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid   NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date        date   NOT NULL,
  metrics     jsonb  DEFAULT '{}'::jsonb,
  note        text,
  published   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (client_id, date)
);

CREATE INDEX IF NOT EXISTS idx_portal_daily_client ON portal_daily_reports(client_id, date DESC);

ALTER TABLE portal_daily_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON portal_daily_reports;
CREATE POLICY "Allow all access" ON portal_daily_reports FOR ALL USING (true) WITH CHECK (true);

-- ── 2. portal_activities ────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_activities (
  id                uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid  NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date              date  NOT NULL,
  title             text  NOT NULL,
  responsible       text  NOT NULL DEFAULT 'agency'
                          CHECK (responsible IN ('agency', 'client')),
  status            text  NOT NULL DEFAULT 'todo'
                          CHECK (status IN ('todo', 'doing', 'done', 'not_done')),
  justification     text,
  sort_order        integer DEFAULT 0,
  visible_to_client boolean DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_activities_client ON portal_activities(client_id, date DESC);

ALTER TABLE portal_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON portal_activities;
CREATE POLICY "Allow all access" ON portal_activities FOR ALL USING (true) WITH CHECK (true);

-- ── 3. Novos campos em portal_links ─────────────────────────

ALTER TABLE portal_links ADD COLUMN IF NOT EXISTS description      text;
ALTER TABLE portal_links ADD COLUMN IF NOT EXISTS tag              text;
ALTER TABLE portal_links ADD COLUMN IF NOT EXISTS visible_to_client boolean DEFAULT true;

-- ── 4. portal_launches ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_launches (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid  NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        text  NOT NULL,
  start_date  date,
  end_date    date,
  status      text  DEFAULT 'planejamento'
                    CHECK (status IN ('planejamento', 'em_andamento', 'concluido', 'pausado')),
  goals       jsonb DEFAULT '{}'::jsonb,
  results     jsonb DEFAULT '{}'::jsonb,
  debrief     jsonb DEFAULT '{}'::jsonb,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_launches_client ON portal_launches(client_id, sort_order);

ALTER TABLE portal_launches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON portal_launches;
CREATE POLICY "Allow all access" ON portal_launches FOR ALL USING (true) WITH CHECK (true);

-- ── 5. portal_launch_phases ─────────────────────────────────

CREATE TABLE IF NOT EXISTS portal_launch_phases (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id   uuid  NOT NULL REFERENCES portal_launches(id) ON DELETE CASCADE,
  name        text  NOT NULL,
  start_date  date,
  end_date    date,
  order_num   integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_phases_launch ON portal_launch_phases(launch_id, order_num);

ALTER TABLE portal_launch_phases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON portal_launch_phases;
CREATE POLICY "Allow all access" ON portal_launch_phases FOR ALL USING (true) WITH CHECK (true);

-- ── 6. launch_id em portal_links (após portal_launches) ─────

ALTER TABLE portal_links
  ADD COLUMN IF NOT EXISTS launch_id uuid REFERENCES portal_launches(id) ON DELETE SET NULL;

-- ── Verificação ──────────────────────────────────────────────

SELECT 'Portal Etapa 2 criado com sucesso!' AS status;
