-- 1. Dar permisos explícitos a los roles de Supabase (anon y authenticated)
GRANT ALL ON TABLE public.user_roles TO anon, authenticated, service_role;

-- 2. Asegurar que RLS esté desactivado o no bloquee las consultas de roles
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 3. Confirmar que las columnas de control existan en settings
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_change_password boolean NOT NULL DEFAULT true;

-- 4. Confirmar tu rol de superadmin
INSERT INTO public.user_roles (id, email, role)
VALUES ('5a71cb95-f9ba-489e-9cfb-6e36b903d3b4', 'limpio.clean.match.app@gmail.com', 'superadmin')
ON CONFLICT (id) DO UPDATE SET role = 'superadmin';
