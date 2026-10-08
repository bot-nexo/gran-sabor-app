-- ============================================================================
-- Pavés Medellín — Colaboradores (punto de venta) y Mesas con QR
-- Ejecutar en Supabase → SQL Editor. Idempotente.
-- ============================================================================

-- 1. Permisos del superadmin (apagados por defecto: son módulos opcionales) --
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS plan_colaboradores boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_mesas boolean NOT NULL DEFAULT false;

-- 2. Nuevo rol "colaborador" ---------------------------------------------------
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check CHECK (role IN ('superadmin', 'admin', 'colaborador'));

-- user_roles: lectura abierta (la app necesita conocer el rol) pero SIN escritura
-- desde el cliente. Antes cualquier sesión podía cambiarse el rol a "admin".
-- Las altas/cambios se hacen solo con service_role (Edge Function) o SQL Editor.
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_roles_read_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_superadmin_all" ON public.user_roles;
CREATE POLICY "user_roles_read_all" ON public.user_roles FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_roles FROM anon, authenticated;

-- 3. Helper: ¿la sesión actual es un colaborador? -------------------------------
CREATE OR REPLACE FUNCTION public.es_colaborador()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'colaborador'
  );
$$;
GRANT EXECUTE ON FUNCTION public.es_colaborador() TO anon, authenticated;

-- 4. Colaboradores -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  usuario text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  solicitud_password_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS colaboradores_usuario_key ON public.colaboradores (lower(usuario));

ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "colaboradores_select" ON public.colaboradores;
-- El admin ve a todos; cada colaborador solo su propia fila. Escrituras: solo
-- la Edge Function "manage-collaborators" (service_role) y las RPC de abajo.
CREATE POLICY "colaboradores_select" ON public.colaboradores
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR NOT public.es_colaborador());
REVOKE INSERT, UPDATE, DELETE ON TABLE public.colaboradores FROM anon, authenticated;
GRANT SELECT ON TABLE public.colaboradores TO authenticated;

-- 5. Mesas ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer NOT NULL CHECK (numero > 0 AND numero < 10000),
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mesas_numero_key UNIQUE (numero)
);

GRANT SELECT ON TABLE public.mesas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mesas TO authenticated;

ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mesas_lectura_publica" ON public.mesas;
DROP POLICY IF EXISTS "mesas_admin_todo" ON public.mesas;
CREATE POLICY "mesas_lectura_publica" ON public.mesas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "mesas_admin_todo" ON public.mesas
  FOR ALL TO authenticated
  USING (NOT public.es_colaborador())
  WITH CHECK (NOT public.es_colaborador());

-- 6. Pedidos: origen, mesa y colaborador ---------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS mesa integer,
  ADD COLUMN IF NOT EXISTS colaborador_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS colaborador_nombre text NOT NULL DEFAULT '';

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_origen_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_origen_check CHECK (origen IN ('web', 'colaborador', 'mesa'));

-- 7. Crear pedido en local (colaborador o mesa) ---------------------------------
CREATE OR REPLACE FUNCTION public.crear_pedido_local(
  p_origen text,
  p_mesa integer,
  p_nombre text,
  p_observaciones text,
  p_pago text,
  p_subtotal integer,
  p_total integer,
  p_items jsonb
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan_colab boolean;
  v_plan_mesas boolean;
  v_activo boolean;
  v_colab_nombre text := '';
  v_nombre text;
  v_numero int;
BEGIN
  IF p_origen NOT IN ('colaborador', 'mesa') THEN
    RAISE EXCEPTION 'Origen de pedido inválido';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'El pedido no tiene productos válidos';
  END IF;
  IF p_subtotal IS NULL OR p_total IS NULL OR p_subtotal < 0 OR p_total < 0 OR p_total > 100000000 THEN
    RAISE EXCEPTION 'Totales inválidos';
  END IF;

  SELECT plan_colaboradores, plan_mesas, is_active
    INTO v_plan_colab, v_plan_mesas, v_activo
    FROM public.settings WHERE id = 1;
  IF v_activo IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'El negocio no está recibiendo pedidos en este momento';
  END IF;

  IF p_origen = 'colaborador' THEN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'No autorizado';
    END IF;
    IF v_plan_colab IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'El módulo de colaboradores no está habilitado';
    END IF;
    IF public.es_colaborador() THEN
      SELECT nombre INTO v_colab_nombre FROM public.colaboradores WHERE id = v_uid AND activo;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Tu usuario está desactivado';
      END IF;
    ELSE
      v_colab_nombre := 'Administrador';
    END IF;
  ELSE
    IF v_plan_mesas IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'El módulo de mesas no está habilitado';
    END IF;
    IF p_mesa IS NULL OR NOT EXISTS (SELECT 1 FROM public.mesas WHERE numero = p_mesa AND activa) THEN
      RAISE EXCEPTION 'La mesa no existe o está desactivada';
    END IF;
  END IF;

  v_nombre := left(nullif(trim(coalesce(p_nombre, '')), ''), 80);
  IF v_nombre IS NULL THEN
    v_nombre := CASE WHEN p_origen = 'mesa' THEN 'Mesa ' || p_mesa ELSE 'Mostrador' END;
  END IF;

  INSERT INTO public.orders
    (nombre, telefono, direccion, unidad, apto, observaciones, pago, tipo_entrega,
     subtotal, delivery_fee, total, items, origen, mesa, colaborador_id, colaborador_nombre)
  VALUES
    (v_nombre, '', '', '', '', left(coalesce(p_observaciones, ''), 500), left(coalesce(p_pago, ''), 60), 'local',
     p_subtotal, 0, p_total, p_items, p_origen,
     CASE WHEN p_origen = 'mesa' THEN p_mesa ELSE NULL END,
     CASE WHEN p_origen = 'colaborador' THEN v_uid ELSE NULL END,
     v_colab_nombre)
  RETURNING numero INTO v_numero;

  RETURN v_numero;
END $$;
GRANT EXECUTE ON FUNCTION public.crear_pedido_local(text, integer, text, text, text, integer, integer, jsonb)
  TO anon, authenticated;

-- 8. Solicitud de cambio de contraseña (el colaborador no necesita estar logueado)
CREATE OR REPLACE FUNCTION public.solicitar_cambio_password(p_usuario text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.colaboradores
     SET solicitud_password_at = now()
   WHERE lower(usuario) = lower(trim(p_usuario)) AND activo;
$$;
GRANT EXECUTE ON FUNCTION public.solicitar_cambio_password(text) TO anon, authenticated;

-- 9. Un colaborador no debe tocar la configuración del negocio ------------------
-- Las políticas "authenticated ... USING (true)" de las tablas del panel dan acceso
-- total a cualquier sesión. Se reemplaza por "no es colaborador" (los admin sin
-- fila en user_roles siguen funcionando igual).
DO $$
DECLARE
  p record;
  v_cond text := 'NOT public.es_colaborador()';
BEGIN
  FOR p IN
    SELECT tablename, policyname, cmd
      FROM pg_policies
     WHERE schemaname = 'public'
       AND roles = '{authenticated}'::name[]
       AND tablename NOT IN ('colaboradores', 'mesas', 'user_roles')
       AND (qual = 'true' OR with_check = 'true')
  LOOP
    IF p.cmd = 'INSERT' THEN
      EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (%s)', p.policyname, p.tablename, v_cond);
    ELSIF p.cmd IN ('SELECT', 'DELETE') THEN
      EXECUTE format('ALTER POLICY %I ON public.%I USING (%s)', p.policyname, p.tablename, v_cond);
    ELSE
      EXECUTE format('ALTER POLICY %I ON public.%I USING (%s) WITH CHECK (%s)',
                     p.policyname, p.tablename, v_cond, v_cond);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
