-- Novas colunas para Lançamentos v2 (protótipo completo)
ALTER TABLE portal_launches ADD COLUMN IF NOT EXISTS phases jsonb DEFAULT '[]'::jsonb;
ALTER TABLE portal_launches ADD COLUMN IF NOT EXISTS goals jsonb DEFAULT '[]'::jsonb;
ALTER TABLE portal_launches ADD COLUMN IF NOT EXISTS launch_links jsonb DEFAULT '[]'::jsonb;
ALTER TABLE portal_launches ADD COLUMN IF NOT EXISTS ideas jsonb DEFAULT '[]'::jsonb;
ALTER TABLE portal_launches ADD COLUMN IF NOT EXISTS launch_optimizations jsonb DEFAULT '[]'::jsonb;
ALTER TABLE portal_launches ADD COLUMN IF NOT EXISTS learnings text;
ALTER TABLE portal_launches ADD COLUMN IF NOT EXISTS previous_data jsonb;
ALTER TABLE portal_launches ADD COLUMN IF NOT EXISTS sheet_url text;
ALTER TABLE portal_launches ADD COLUMN IF NOT EXISTS current_phase int DEFAULT 0;
