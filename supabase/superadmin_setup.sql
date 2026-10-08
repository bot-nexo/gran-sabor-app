-- 1. Crear tabla de roles de usuario
CREATE TABLE public.user_roles (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'admin'::text CHECK (role IN ('superadmin', 'admin')),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_roles_pkey PRIMARY KEY (id)
);

-- Asegurar que la tabla sea segura y que cualquiera pueda leer (para que la app sepa su rol)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_read_all" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "user_roles_superadmin_all" ON public.user_roles FOR ALL USING (
    (SELECT role FROM public.user_roles WHERE id = auth.uid()) = 'superadmin'
);

-- Restricción a nivel de BD: Solo puede existir 1 superadmin en toda la tabla
CREATE UNIQUE INDEX IF NOT EXISTS only_one_superadmin_idx 
ON public.user_roles (role) 
WHERE role = 'superadmin';

-- 2. Añadir nuevas columnas a la tabla de settings
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_change_password boolean NOT NULL DEFAULT true;

-- NOTA PARA EL SUPERADMIN:
-- Después de ejecutar este script, crea un usuario en el panel "Authentication" de Supabase (Supabase Studio).
-- Luego, busca su UUID en la tabla auth.users y ejecuta este comando para asignarte a ti mismo como superadmin:
-- 
-- INSERT INTO public.user_roles (id, email, role) 
-- VALUES ('TU-UUID-AQUI', 'tu-correo@ejemplo.com', 'superadmin');
