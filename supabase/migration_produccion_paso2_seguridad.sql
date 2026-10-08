-- Paso 2 (producción): corrige avisos de seguridad del Advisor de Supabase.
-- Idempotente. Ejecutar en SQL Editor de paves-med.

begin;

-- 1. bases / sizes: solo administradores pueden escribir (antes cualquiera).
drop policy if exists "Bases public insert" on public.bases;
drop policy if exists "Bases public update" on public.bases;
drop policy if exists "Bases public delete" on public.bases;
drop policy if exists bases_admin_insert on public.bases;
drop policy if exists bases_admin_update on public.bases;
drop policy if exists bases_admin_delete on public.bases;
create policy bases_admin_insert on public.bases for insert to authenticated with check ((select public.is_business_admin()));
create policy bases_admin_update on public.bases for update to authenticated using ((select public.is_business_admin())) with check ((select public.is_business_admin()));
create policy bases_admin_delete on public.bases for delete to authenticated using ((select public.is_business_admin()));

drop policy if exists "Sizes public insert" on public.sizes;
drop policy if exists "Sizes public update" on public.sizes;
drop policy if exists "Sizes public delete" on public.sizes;
drop policy if exists sizes_admin_insert on public.sizes;
drop policy if exists sizes_admin_update on public.sizes;
drop policy if exists sizes_admin_delete on public.sizes;
create policy sizes_admin_insert on public.sizes for insert to authenticated with check ((select public.is_business_admin()));
create policy sizes_admin_update on public.sizes for update to authenticated using ((select public.is_business_admin())) with check ((select public.is_business_admin()));
create policy sizes_admin_delete on public.sizes for delete to authenticated using ((select public.is_business_admin()));

-- 2. Funciones sin search_path fijo.
alter function public.set_updated_at() set search_path = public;
alter function public.check_single_superadmin() set search_path = public;
alter function public.registrar_cliente_si_no_existe(text, text, date) set search_path = public;

-- 3. Funciones internas que no deben llamarse desde la web pública.
revoke execute on function public.protect_superadmin_settings() from public, anon, authenticated;
revoke execute on function public.crear_pedido_local(text, integer, text, text, text, integer, integer, jsonb) from public, anon;
grant execute on function public.crear_pedido_local(text, integer, text, text, text, integer, integer, jsonb) to authenticated;

commit;

notify pgrst, 'reload schema';
