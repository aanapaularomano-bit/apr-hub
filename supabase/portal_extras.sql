-- portal_extras.sql — tabelas para Diário de otimizações, Solicitações e Conteúdo
-- Rodar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS portal_optimizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date       date NOT NULL,
  type       text NOT NULL,
  campaign   text,
  action     text NOT NULL,
  reason     text,
  result     text NOT NULL DEFAULT 'obs' CHECK (result IN ('ok','bad','obs')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_requests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  from_who   text NOT NULL DEFAULT 'cliente' CHECK (from_who IN ('agencia','cliente')),
  title      text NOT NULL,
  status     text NOT NULL DEFAULT 'em_andamento'
             CHECK (status IN ('em_andamento','aguardando_voce','concluido','recebido')),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_content (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title      text NOT NULL,
  format     text,
  sent_date  date,
  status     text NOT NULL DEFAULT 'aguardando_envio'
             CHECK (status IN ('no_ar','pausado','recebido','aguardando_envio')),
  hook_rate  text,
  ctr        text,
  cpl        text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS desabilitado — acesso via service_role_key nas APIs
ALTER TABLE portal_optimizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE portal_requests      DISABLE ROW LEVEL SECURITY;
ALTER TABLE portal_content       DISABLE ROW LEVEL SECURITY;
