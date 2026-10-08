-- ============================================================================
-- Pavés Medellín — PASO 1 para PRODUCCIÓN (paves-med)
-- Pone producción al nivel de desarrollo sin borrar datos. Idempotente.
-- Ejecutar en SQL Editor ANTES de supabase/migration_colaboradores_mesas.sql.
-- ============================================================================

-- 0. Seguro anti-bloqueo: las políticas nuevas exigen una fila en user_roles ---
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'superadmin')
     OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'Falta un superadmin o un admin en user_roles. Abortado para no bloquear el panel.';
  END IF;
END $$;

-- 1. Columnas de settings (módulos del superadmin) ------------------------------
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS plan_fidelizacion boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan_configuracion boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan_domicilio_dinamico boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan_emails boolean NOT NULL DEFAULT true;

-- 2. Funciones de rol -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_business_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.user_roles WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'admin');
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_business_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- 3. Solo el superadmin cambia is_active y can_change_password -------------------
CREATE OR REPLACE FUNCTION public.protect_superadmin_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_superadmin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Un upsert dispara BEFORE INSERT aunque la fila ya exista (acaba en UPDATE,
    -- que se valida abajo). Solo se bloquea la creación real de la fila.
    IF NOT EXISTS (SELECT 1 FROM public.settings WHERE id = NEW.id) THEN
      RAISE EXCEPTION 'Solo el superadministrador puede cambiar controles globales';
    END IF;
  ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.can_change_password IS DISTINCT FROM OLD.can_change_password THEN
    RAISE EXCEPTION 'Solo el superadministrador puede cambiar controles globales';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS settings_superadmin_guard ON public.settings;
CREATE TRIGGER settings_superadmin_guard
  BEFORE INSERT OR UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.protect_superadmin_settings();

-- 4. Insignias (fidelización) ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  beneficio text,
  required_orders integer NOT NULL DEFAULT 0,
  color text DEFAULT '#ffcc00',
  glow text DEFAULT 'rgba(255, 204, 0, 0.5)',
  image text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  has_2x1 boolean DEFAULT false,
  apply_days jsonb DEFAULT '[]'::jsonb,
  discount_percentage integer DEFAULT 0,
  free_delivery boolean DEFAULT false,
  is_active boolean DEFAULT true
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badges_all" ON public.badges;
DROP POLICY IF EXISTS "badges_all_admin" ON public.badges;
DROP POLICY IF EXISTS "badges_read_all" ON public.badges;
DROP POLICY IF EXISTS "badges_admin_todo" ON public.badges;
CREATE POLICY "badges_read_all" ON public.badges FOR SELECT USING (true);
CREATE POLICY "badges_admin_todo" ON public.badges
  FOR ALL TO authenticated
  USING (public.is_business_admin()) WITH CHECK (public.is_business_admin());
GRANT SELECT ON TABLE public.badges TO anon;
GRANT ALL ON TABLE public.badges TO authenticated;
GRANT ALL ON TABLE public.badges TO service_role;

-- 5. Políticas del panel: de "cualquier sesión" a "solo admin/superadmin" ----------
ALTER POLICY "additions_admin_todo" ON public.additions
  USING (public.is_business_admin()) WITH CHECK (public.is_business_admin());
ALTER POLICY "categorias_admin_todo" ON public.categories
  USING (public.is_business_admin()) WITH CHECK (public.is_business_admin());
ALTER POLICY "product_additions_admin_todo" ON public.product_additions
  USING (public.is_business_admin()) WITH CHECK (public.is_business_admin());
ALTER POLICY "product_sauces_admin_todo" ON public.product_sauces
  USING (public.is_business_admin()) WITH CHECK (public.is_business_admin());
ALTER POLICY "productos_admin_todo" ON public.products
  USING (public.is_business_admin()) WITH CHECK (public.is_business_admin());
ALTER POLICY "sauces_admin_todo" ON public.sauces
  USING (public.is_business_admin()) WITH CHECK (public.is_business_admin());
ALTER POLICY "settings_admin_todo" ON public.settings
  USING (public.is_business_admin()) WITH CHECK (public.is_business_admin());
ALTER POLICY "pedidos_select_admin" ON public.orders
  USING (public.is_business_admin());
ALTER POLICY "pedidos_update_admin" ON public.orders
  USING (public.is_business_admin()) WITH CHECK (public.is_business_admin());
-- catalog_design y user_roles los trata migration_colaboradores_mesas.sql.

NOTIFY pgrst, 'reload schema';
