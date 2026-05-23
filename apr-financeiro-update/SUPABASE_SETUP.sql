-- ========================================
-- APR FINANCEIRO — Setup do Supabase
-- Rode este SQL inteiro no SQL Editor do Supabase
-- ========================================

-- Cria a tabela principal
CREATE TABLE IF NOT EXISTS apr_financeiro (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key   text        UNIQUE NOT NULL,
  data        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Index pra busca rápida por mês
CREATE INDEX IF NOT EXISTS idx_apr_financeiro_month ON apr_financeiro (month_key);

-- Habilita Row Level Security
ALTER TABLE apr_financeiro ENABLE ROW LEVEL SECURITY;

-- Política: permite acesso público de leitura e escrita
-- (como o APR Hub já é privado pelo Vercel, ok pra começar)
DROP POLICY IF EXISTS "Allow all access" ON apr_financeiro;
CREATE POLICY "Allow all access" ON apr_financeiro
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verifica se tudo foi criado:
SELECT 'Tabela apr_financeiro criada com sucesso!' as status;
