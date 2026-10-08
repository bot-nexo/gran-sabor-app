-- ============================================================================
-- Pavés Medellín — Migración: Adiciones & Salsas
-- Ejecutar en Supabase → SQL Editor (es idempotente, se puede re-ejecutar).
-- ============================================================================

-- ── Catálogo de Adiciones ────────────────────────────────────────────────────
create table if not exists public.additions (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  precio     int  not null default 0,
  disponible boolean not null default true,
  orden      int  not null default 0,
  created_at timestamptz not null default now()
);

-- ── Catálogo de Salsas ───────────────────────────────────────────────────────
create table if not exists public.sauces (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  precio     int  not null default 0,
  disponible boolean not null default true,
  orden      int  not null default 0,
  created_at timestamptz not null default now()
);

-- ── Relación N:M: Producto ↔ Adiciones ──────────────────────────────────────
create table if not exists public.product_additions (
  product_id  uuid not null references public.products(id)  on delete cascade,
  addition_id uuid not null references public.additions(id) on delete cascade,
  requerido   boolean not null default false,
  primary key (product_id, addition_id)
);

create index if not exists product_additions_product_idx on public.product_additions (product_id);

-- ── Relación N:M: Producto ↔ Salsas ─────────────────────────────────────────
create table if not exists public.product_sauces (
  product_id uuid not null references public.products(id) on delete cascade,
  sauce_id   uuid not null references public.sauces(id)   on delete cascade,
  requerido  boolean not null default false,
  primary key (product_id, sauce_id)
);

create index if not exists product_sauces_product_idx on public.product_sauces (product_id);

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.additions         enable row level security;
alter table public.sauces            enable row level security;
alter table public.product_additions enable row level security;
alter table public.product_sauces    enable row level security;

-- Lectura pública
drop policy if exists "additions_lectura_publica"         on public.additions;
create policy "additions_lectura_publica" on public.additions
  for select to anon, authenticated using (true);

drop policy if exists "sauces_lectura_publica"            on public.sauces;
create policy "sauces_lectura_publica" on public.sauces
  for select to anon, authenticated using (true);

drop policy if exists "product_additions_lectura_publica" on public.product_additions;
create policy "product_additions_lectura_publica" on public.product_additions
  for select to anon, authenticated using (true);

drop policy if exists "product_sauces_lectura_publica"    on public.product_sauces;
create policy "product_sauces_lectura_publica" on public.product_sauces
  for select to anon, authenticated using (true);

-- Escritura solo admin
drop policy if exists "additions_admin_todo"         on public.additions;
create policy "additions_admin_todo" on public.additions
  for all to authenticated using (true) with check (true);

drop policy if exists "sauces_admin_todo"            on public.sauces;
create policy "sauces_admin_todo" on public.sauces
  for all to authenticated using (true) with check (true);

drop policy if exists "product_additions_admin_todo" on public.product_additions;
create policy "product_additions_admin_todo" on public.product_additions
  for all to authenticated using (true) with check (true);

drop policy if exists "product_sauces_admin_todo"    on public.product_sauces;
create policy "product_sauces_admin_todo" on public.product_sauces
  for all to authenticated using (true) with check (true);

-- ── GRANTs ───────────────────────────────────────────────────────────────────
grant select on public.additions, public.sauces,
               public.product_additions, public.product_sauces
  to anon, authenticated;

grant all on public.additions, public.sauces,
            public.product_additions, public.product_sauces
  to authenticated;

-- ── Realtime ─────────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.additions;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.sauces;
exception when duplicate_object then null; end $$;
