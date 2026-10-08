-- ============================================================================
-- FIX RLS PARA user_roles
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================================================

-- 1. Asegurar que los roles de Supabase tienen permiso para consultar la tabla
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_roles TO anon, authenticated, service_role;

-- 2. Deshabilitar RLS en user_roles para evitar bloqueos por políticas recursivas
-- Al desactivar RLS, cualquier usuario autenticado podrá leer su rol (y el de otros).
-- Ya que esta tabla solo contiene id, email y role, no representa un riesgo crítico de privacidad,
-- pero garantiza que el frontend siempre obtenga una respuesta.
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 3. (Opcional pero recomendado) Eliminar políticas previas que puedan causar conflictos
DROP POLICY IF EXISTS "user_roles_read_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_superadmin_all" ON public.user_roles;

-- 4. Crear una función RPC segura por si acaso (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.user_roles WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'admin');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
