-- ============================================================================
-- Pavés Medellín — Migración: Domicilio Dinámico por Distancia (Mapbox)
-- Ejecutar en Supabase → SQL Editor después de schema.sql + seed.sql
-- Idempotente (se puede re-ejecutar sin romper nada).
-- ============================================================================

-- ── 1. Nuevas columnas en settings (parámetros del domicilio dinámico) ──────

-- Coordenadas del local/pastelería
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS store_lat DOUBLE PRECISION DEFAULT NULL;

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS store_lng DOUBLE PRECISION DEFAULT NULL;

-- Tarifa base fija del domicilio (ej: $3.000)
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS base_delivery_fee INT NOT NULL DEFAULT 3000;

-- Valor por cada kilómetro recorrido (ej: $1.500/km)
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS price_per_km INT NOT NULL DEFAULT 1500;

-- Radio máximo permitido en km (ej: 15 km). Fuera = no se permite el pedido.
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS max_delivery_radius_km DOUBLE PRECISION NOT NULL DEFAULT 15;

-- Toggle: ¿Usar cálculo dinámico? Si false → se usa delivery_fee fija (actual)
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS dynamic_delivery_enabled BOOLEAN NOT NULL DEFAULT false;

-- ── 2. Nuevas columnas en orders (metadatos de distancia por pedido) ────────

-- Coordenadas de la dirección de entrega
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION DEFAULT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION DEFAULT NULL;

-- Distancia calculada en km (ruta real)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_distance_km DOUBLE PRECISION DEFAULT NULL;

-- Dirección completa como fue seleccionada del autocompletado
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_address_full TEXT NOT NULL DEFAULT '';

-- ── 3. Valores iniciales para Pavés Medellín ───────────────────────────────
-- Coordenadas aproximadas de Medellín centro. El admin las cambiará desde
-- el panel a las de su local real.
UPDATE public.settings
SET
  store_lat = COALESCE(store_lat, 6.2442),
  store_lng = COALESCE(store_lng, -75.5812),
  base_delivery_fee = COALESCE(base_delivery_fee, 3000),
  price_per_km = COALESCE(price_per_km, 1500),
  max_delivery_radius_km = COALESCE(max_delivery_radius_km, 15),
  dynamic_delivery_enabled = COALESCE(dynamic_delivery_enabled, false)
WHERE id = 1;
