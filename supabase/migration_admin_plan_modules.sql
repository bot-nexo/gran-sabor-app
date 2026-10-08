-- ============================================================================
-- Pavés Medellín — Migración: permisos de módulos del plan administrativo
-- Ejecutar en Supabase → SQL Editor. Idempotente.
-- ============================================================================

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS plan_adiciones boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan_promociones boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan_reportes boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan_diseno boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan_fidelizacion boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan_configuracion boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan_domicilio_dinamico boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan_emails boolean NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';
