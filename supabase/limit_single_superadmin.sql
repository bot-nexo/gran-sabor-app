-- ==============================================================================
-- RESTRICCIÓN: PERMITIR ÚNICAMENTE UN (1) SUPERADMIN EN TODA LA BASE DE DATOS
-- ==============================================================================

-- 1. Primero, convertir cualquier superadmin secundario a 'admin' normal
-- (Asegúrate de dejar únicamente tu correo oficial como superadmin)
UPDATE public.user_roles
SET role = 'admin'
WHERE role = 'superadmin'
  AND email <> 'limpio.clean.match.app@gmail.com';

-- 2. Crear índice único parcial a nivel de PostgreSQL
-- Esto hace que la base de datos RECHACE físicamente cualquier segundo registro con role = 'superadmin'
DROP INDEX IF EXISTS public.only_one_superadmin_idx;
CREATE UNIQUE INDEX only_one_superadmin_idx 
ON public.user_roles (role) 
WHERE role = 'superadmin';

-- 3. Crear función y Trigger para lanzar un mensaje de error claro si alguien intenta cambiar/insertar otro superadmin
CREATE OR REPLACE FUNCTION public.check_single_superadmin()
RETURNS trigger AS $$
BEGIN
  IF NEW.role = 'superadmin' THEN
    IF EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE role = 'superadmin' 
        AND id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'Operación denegada: Ya existe un Superadmin registrado. No está permitido tener más de un Superadmin en el sistema.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_single_superadmin ON public.user_roles;

CREATE TRIGGER trg_check_single_superadmin
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.check_single_superadmin();
