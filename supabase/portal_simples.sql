-- Portal Simples — tabelas limpas
-- Execute no Supabase SQL Editor

-- Remove tabelas antigas do portal (caso existam)
DROP TABLE IF EXISTS portal_requests CASCADE;
DROP TABLE IF EXISTS portal_activities CASCADE;
DROP TABLE IF EXISTS portal_content CASCADE;
DROP TABLE IF EXISTS portal_history CASCADE;
DROP TABLE IF EXISTS portal_optimizations CASCADE;

-- Remove e recria portal_links (schema novo)
DROP TABLE IF EXISTS portal_links CASCADE;
DROP TABLE IF EXISTS portal_tasks CASCADE;
DROP TABLE IF EXISTS portal_launches CASCADE;
DROP TABLE IF EXISTS portal_reports CASCADE;

-- Relatórios
CREATE TABLE portal_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('diario', 'semanal', 'mensal')),
  ref_date    date NOT NULL,
  title       text NOT NULL,
  content     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON portal_reports (client_id, ref_date DESC);

-- Tarefas
CREATE TABLE portal_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title       text NOT NULL,
  owner       text NOT NULL DEFAULT 'agencia' CHECK (owner IN ('agencia', 'cliente')),
  status      text NOT NULL DEFAULT 'a_fazer' CHECK (status IN ('a_fazer', 'fazendo', 'feito', 'nao_feito')),
  note        text,
  due_date    date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON portal_tasks (client_id, created_at DESC);

-- Links
CREATE TABLE portal_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  group_name  text NOT NULL,
  label       text NOT NULL,
  url         text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON portal_links (client_id, group_name);

-- Lançamentos
CREATE TABLE portal_launches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        text NOT NULL,
  period      text,
  status      text NOT NULL DEFAULT 'planejamento' CHECK (status IN ('planejamento', 'em_andamento', 'concluido', 'pausado')),
  metrics     text,
  content     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON portal_launches (client_id, created_at DESC);

-- Coluna admin_password_hash em client_portals (caso não exista)
ALTER TABLE client_portals ADD COLUMN IF NOT EXISTS admin_password_hash text;
