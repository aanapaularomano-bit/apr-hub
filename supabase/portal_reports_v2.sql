-- Novas colunas para Relatório mensal rico (protótipo completo)
ALTER TABLE portal_reports ADD COLUMN IF NOT EXISTS headline text;
ALTER TABLE portal_reports ADD COLUMN IF NOT EXISTS period_label text;
ALTER TABLE portal_reports ADD COLUMN IF NOT EXISTS author text;
ALTER TABLE portal_reports ADD COLUMN IF NOT EXISTS services jsonb;
ALTER TABLE portal_reports ADD COLUMN IF NOT EXISTS comparison jsonb;
ALTER TABLE portal_reports ADD COLUMN IF NOT EXISTS verdict jsonb;
ALTER TABLE portal_reports ADD COLUMN IF NOT EXISTS suggestions jsonb;
ALTER TABLE portal_reports ADD COLUMN IF NOT EXISTS next_plan jsonb;
ALTER TABLE portal_reports ADD COLUMN IF NOT EXISTS sheet_url text;
