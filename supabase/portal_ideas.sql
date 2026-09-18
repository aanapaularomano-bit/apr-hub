-- Tabela para ideias do portal do cliente
CREATE TABLE IF NOT EXISTS portal_ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_ideas_client ON portal_ideas(client_id);

-- RLS
ALTER TABLE portal_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on portal_ideas"
  ON portal_ideas FOR ALL
  USING (true)
  WITH CHECK (true);
