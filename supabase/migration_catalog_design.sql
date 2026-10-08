-- ============================================================================
-- Pavés Medellín — Migración Completa: Módulo de Diseño del Catálogo
-- (Hero, Promociones, Menú, Combos, Footer, Tipografía y Paletas)
-- Ejecutar en Supabase → SQL Editor (es idempotente, se puede re-ejecutar).
-- ============================================================================

create table if not exists public.catalog_design (
  id                    int primary key default 1 check (id = 1),
  
  -- Estilos Globales & Body
  app_bg                text not null default '#fdfbf7',
  font_family           text not null default 'Montserrat',
  
  -- Hero / Encabezado Principal
  hero_bg               text not null default 'linear-gradient(180deg, #fdf1f1 0%, #fecdcd 100%)',
  hero_header_bg        text not null default 'rgba(255, 255, 255, 0.72)',
  hero_cta_bg           text not null default '#d92b38',
  hero_cta_text         text not null default '#ffffff',
  hero_badge_bg         text not null default 'rgba(255, 255, 255, 0.92)',
  hero_badge_text       text not null default '#d92b38',
  hero_float_cart_bg    text not null default '#3d2314',
  hero_float_cart_text  text not null default '#ffffff',
  
  -- Sección Promociones (Banners / Descuentos)
  show_promotions       boolean not null default true,
  promotions_title      text not null default 'Promociones & Especiales',
  promotions_subtitle   text not null default 'Aprovecha nuestras ofertas por tiempo limitado en tus postres favoritos',
  promotions_bg         text not null default '#fff5f5',
  promotions_card_bg    text not null default '#ffffff',
  promotions_accent     text not null default '#d92b38',
  promotions_items      jsonb not null default '[
    {
      "id": "promo-1",
      "titulo": "2x1 en Pavés Seleccionados",
      "tag": "Viernes & Sábados",
      "descripcion": "Lleva dos deliciosos Pavés de 8oz al precio de uno en sabores tradicionales.",
      "descuento": "2x1",
      "imagen": "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&auto=format&fit=crop&q=80"
    },
    {
      "id": "promo-2",
      "titulo": "Envío Gratis en Compras > $45.000",
      "tag": "Toda la semana",
      "descripcion": "Disfruta de tus postres favoritos en casa sin costo adicional de domicilio.",
      "descuento": "ENVÍO GRATIS",
      "imagen": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500&auto=format&fit=crop&q=80"
    }
  ]'::jsonb,
  
  -- Sección Combos Especiales
  show_combos           boolean not null default true,
  combos_title          text not null default 'Combos & Packs para Compartir',
  combos_subtitle       text not null default 'Las combinaciones perfectas al mejor precio para tus momentos dulces',
  combos_bg             text not null default '#fbf8f3',
  combos_card_bg        text not null default '#ffffff',
  combos_accent         text not null default '#d92b38',
  combos_items          jsonb not null default '[
    {
      "id": "combo-1",
      "nombre": "Combo Dúo Pavé + Torta",
      "precio": 32000,
      "precioOriginal": 38000,
      "badge": "Ahorra $6.000",
      "descripcion": "1 Pavé 8oz tradicional de Leche Klim + 1 Porción de Torta húmeda de chocolate con toppings.",
      "incluye": ["1x Pavé 8oz (Leche Klim)", "1x Torta húmeda de chocolate"],
      "imagen": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80"
    },
    {
      "id": "combo-2",
      "nombre": "Pack Familiar 4 Pavés",
      "precio": 62000,
      "precioOriginal": 72000,
      "badge": "Más Popular 🔥",
      "descripcion": "4 Pavés de 8oz a elección, perfecto para compartir en familia o con amigos.",
      "incluye": ["4x Pavés 8oz a elección", "Cucharas y servilletas"],
      "imagen": "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&auto=format&fit=crop&q=80"
    }
  ]'::jsonb,
  
  -- Menú & Catálogo
  bg_color              text not null default '#fecdcd',
  card_bg               text not null default '#fdfbf7',
  header_badge_bg       text not null default 'rgba(255, 255, 255, 0.75)',
  header_badge_text     text not null default '#b4232e',
  text_primary          text not null default '#3d2314',
  text_muted            text not null default '#7a6353',
  border_color          text not null default 'rgba(61, 35, 20, 0.08)',
  card_radius           text not null default '20px',
  card_shadow           text not null default 'md',
  btn_primary_bg        text not null default '#d92b38',
  btn_primary_text      text not null default '#ffffff',
  btn_details_bg        text not null default 'transparent',
  btn_details_text      text not null default '#3d2314',
  btn_details_border    text not null default 'rgba(61, 35, 20, 0.12)',
  price_tag_bg          text not null default '#3d2314',
  price_tag_text        text not null default '#ffffff',
  badge_popular_bg      text not null default '#d92b38',
  badge_popular_text    text not null default '#ffffff',
  category_bar_bg       text not null default 'rgba(255, 255, 255, 0.7)',
  category_active_bg    text not null default '#d92b38',
  category_active_text  text not null default '#ffffff',
  category_inactive_bg  text not null default 'transparent',
  category_inactive_text text not null default '#7a6353',
  columns_desktop       text not null default 'auto',
  columns_mobile        text not null default '1',
  card_layout           text not null default 'vertical',
  image_aspect_ratio    text not null default '4/3',
  
  -- Footer
  footer_bg             text not null default 'linear-gradient(180deg, #1a0f08 0%, #0d0705 100%)',
  footer_text           text not null default 'rgba(255, 255, 255, 0.7)',
  footer_accent         text not null default '#d92b38',
  
  updated_at            timestamptz not null default now()
);

-- Insertar o actualizar columnas en tablas existentes
insert into public.catalog_design (id) values (1) on conflict (id) do nothing;

alter table public.catalog_design add column if not exists app_bg text not null default '#fdfbf7';
alter table public.catalog_design add column if not exists hero_bg text not null default 'linear-gradient(180deg, #fdf1f1 0%, #fecdcd 100%)';
alter table public.catalog_design add column if not exists hero_header_bg text not null default 'rgba(255, 255, 255, 0.72)';
alter table public.catalog_design add column if not exists hero_cta_bg text not null default '#d92b38';
alter table public.catalog_design add column if not exists hero_cta_text text not null default '#ffffff';
alter table public.catalog_design add column if not exists hero_badge_bg text not null default 'rgba(255, 255, 255, 0.92)';
alter table public.catalog_design add column if not exists hero_badge_text text not null default '#d92b38';
alter table public.catalog_design add column if not exists hero_float_cart_bg text not null default '#3d2314';
alter table public.catalog_design add column if not exists hero_float_cart_text text not null default '#ffffff';

alter table public.catalog_design add column if not exists show_promotions boolean not null default true;
alter table public.catalog_design add column if not exists promotions_title text not null default 'Promociones & Especiales';
alter table public.catalog_design add column if not exists promotions_subtitle text not null default 'Aprovecha nuestras ofertas por tiempo limitado en tus postres favoritos';
alter table public.catalog_design add column if not exists promotions_bg text not null default '#fff5f5';
alter table public.catalog_design add column if not exists promotions_card_bg text not null default '#ffffff';
alter table public.catalog_design add column if not exists promotions_accent text not null default '#d92b38';
alter table public.catalog_design add column if not exists promotions_items jsonb not null default '[]'::jsonb;

alter table public.catalog_design add column if not exists show_combos boolean not null default true;
alter table public.catalog_design add column if not exists combos_title text not null default 'Combos & Packs para Compartir';
alter table public.catalog_design add column if not exists combos_subtitle text not null default 'Las combinaciones perfectas al mejor precio para tus momentos dulces';
alter table public.catalog_design add column if not exists combos_bg text not null default '#fbf8f3';
alter table public.catalog_design add column if not exists combos_card_bg text not null default '#ffffff';
alter table public.catalog_design add column if not exists combos_accent text not null default '#d92b38';
alter table public.catalog_design add column if not exists combos_items jsonb not null default '[]'::jsonb;

alter table public.catalog_design add column if not exists footer_bg text not null default 'linear-gradient(180deg, #1a0f08 0%, #0d0705 100%)';
alter table public.catalog_design add column if not exists footer_text text not null default 'rgba(255, 255, 255, 0.7)';
alter table public.catalog_design add column if not exists footer_accent text not null default '#d92b38';

-- Trigger updated_at
drop trigger if exists catalog_design_updated_at on public.catalog_design;
create trigger catalog_design_updated_at before update on public.catalog_design
for each row execute function public.set_updated_at();

-- RLS
alter table public.catalog_design enable row level security;

drop policy if exists "catalog_design_lectura_publica" on public.catalog_design;
create policy "catalog_design_lectura_publica" on public.catalog_design
  for select to anon, authenticated using (true);

drop policy if exists "catalog_design_admin_todo" on public.catalog_design;
create policy "catalog_design_admin_todo" on public.catalog_design
  for all to authenticated using (true) with check (true);

-- GRANTs
grant select on public.catalog_design to anon, authenticated;
grant all on public.catalog_design to authenticated;

-- Realtime
do $$ begin
  alter publication supabase_realtime add table public.catalog_design;
exception when duplicate_object then null; end $$;
