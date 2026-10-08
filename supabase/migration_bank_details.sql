-- Migración para añadir los campos bancarios a la tabla settings
-- Puedes copiar y pegar esto en el SQL Editor de tu panel de Supabase y darle a "Run"

ALTER TABLE public.settings DROP COLUMN IF EXISTS bank_name;
ALTER TABLE public.settings DROP COLUMN IF EXISTS account_number;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS bank_accounts jsonb NOT NULL DEFAULT '[]'::jsonb;
