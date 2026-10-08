-- ============================================================================
-- Pavés Medellín — Seed inicial (datos actuales del catálogo, menú v1)
-- Ejecutar DESPUÉS de schema.sql.
--
-- Nota: imagen_url se deja vacía; el dataSource resuelve la imagen local
-- (asset empaquetado) por nombre de producto. Cuando el admin suba fotos
-- desde el panel, imagen_url tomará la URL de Storage y prevalecerá.
-- ============================================================================

-- ── Categorías (orden tal como aparecen en el catálogo) ─────────────────────
insert into public.categories (nombre, emoji, label, orden) values
  ('Pavés 8oz',    '🍨', '🍨 Pavés Pqñ. 8oz', 1),
  ('Con Queso',    '🧀', '🧀 Con Queso',      2),
  ('Tendencia',    '🔥', '🔥 Tendencia',      3),
  ('Cuchareables', '🍫', '🍫 Cuchareables',   4),
  ('Quesillos',    '🍮', '🍮 Quesillos',      5),
  ('Cumpleaños',   '🎂', '🎂 Cumpleaños',     6)
on conflict (nombre) do nothing;

-- ── Productos (los 17 actuales, en orden del menú) ──────────────────────────
insert into public.products (nombre, category_id, descripcion, precio, destacado, nota, orden) values
  ('Pavé de Klim con Frutos Rojos y Queso',
   (select id from public.categories where nombre = 'Con Queso'),
   'Es el pave de leche klim con topping de mermelada de frutos rojos y queso.',
   12000, true, '', 1),
  ('Pavé de Klim con Queso',
   (select id from public.categories where nombre = 'Con Queso'),
   'Pavé de leche Klim de 8 Oz. Topping de leche Klim, queso y Lecherita.',
   12000, false, '', 2),
  ('Pavé de Klim Guayaba y Queso',
   (select id from public.categories where nombre = 'Con Queso'),
   'Crema base de leche Klim con topping de bocadillo de guayaba y queso.',
   12000, false, '', 3),
  ('Pavé de Klim y Uvas Verdes con Tajín',
   (select id from public.categories where nombre = 'Pavés 8oz'),
   'Crema base de leche Klim, uvas verdes sin semilla y un toque de Tajín. Una propuesta bastante exótica recomendada para los amantes del Tajín.',
   12000, true, '', 4),
  ('Pavé de Leche Klim y Franuí',
   (select id from public.categories where nombre = 'Tendencia'),
   'Es el clásico Pavé de leche Klim con adición de chocolates Franuí.',
   17000, true, '', 5),
  ('Pavé de Leche Klim Clásico',
   (select id from public.categories where nombre = 'Pavés 8oz'),
   'Postre de origen brasileño, frio y cremoso. Elaborado con una crema con sabor a leche klim, acompañado de galleta salada, lo que aporta un equilibrio en su sabor. Topping Leche klim.',
   10000, false, '', 6),
  ('Pavé de Leche Klim y Quipitos',
   (select id from public.categories where nombre = 'Pavés 8oz'),
   'Postre de origen brasileño, frio y cremoso. Elaborado con una crema con sabor a leche klim, acompañado de galleta salada, lo que aporta un equilibrio en su sabor. Topping Leche klim y quipitos.',
   11000, false, '', 7),
  ('Pavé de Leche Klim y Fresas',
   (select id from public.categories where nombre = 'Pavés 8oz'),
   'Postre de origen brasileño, frio y cremoso. Elaborado con una crema con sabor a leche klim, acompañado de galleta salada, lo que aporta un equilibrio en su sabor. Topping Fresas naturales y leche condensada.',
   10000, false, '', 8),
  ('Torta Húmeda de Chocolate',
   (select id from public.categories where nombre = 'Cuchareables'),
   'Torta húmeda de chocolate, bañado en almíbar de cacao con capas de fudge de chocolate.',
   10000, false, '', 9),
  ('Torta de Chocolate y Fudge de Nucita',
   (select id from public.categories where nombre = 'Cuchareables'),
   'Torta húmeda de chocolate, bañado en almíbar de cacao con capas de fudge sabor a nucita.',
   10000, false, '', 10),
  ('Torta de Chocolate y Fudge de Milo',
   (select id from public.categories where nombre = 'Cuchareables'),
   'Torta húmeda de chocolate, bañado en almíbar de cacao con capas de fudge sabor a milo.',
   10000, false, '', 11),
  ('Quesillo Venezolano (Porción)',
   (select id from public.categories where nombre = 'Quesillos'),
   'Porción individual de flan/quesillo tradicional bien cremoso.',
   10000, false, '', 12),
  ('Quesillo Entero (8 Porciones)',
   (select id from public.categories where nombre = 'Quesillos'),
   'Quesillo familiar rinde 8 porciones.',
   70000, false, 'LA PUEDES PEDIR CON 24 HORAS DE ANTICIPACIÓN.', 13),
  ('Torta Húmeda de Chocolate Grande con Fresas',
   (select id from public.categories where nombre = 'Cumpleaños'),
   'Capas de Torta humeda de chocolate con fudge de chocolate, topping: fresas naturales y oreo. LA PUEDES PEDIR CON CUATRO HORAS DE ANTICIPACIÓN.',
   65000, false, 'LA PUEDES PEDIR CON 4 HORAS DE ANTICIPACIÓN.', 14),
  ('Torta Húmeda de Chocolate Grande',
   (select id from public.categories where nombre = 'Cumpleaños'),
   'Capas de tortas húmedas de chocolate y fudge de chocolate. Topping: Galletas oreo troceadas.',
   65000, false, 'LA PUEDES PEDIR CON 4 HORAS DE ANTICIPACIÓN.', 15),
  ('Torta Tres Leches y Franuí',
   (select id from public.categories where nombre = 'Cumpleaños'),
   'Bizcocho bañado en 4 leches, relleno de fresas naturales. Cubierta de chocolate semi amargo y topping de Franui.',
   90000, false, 'LA PUEDES PEDIR CON 24 HORAS DE ANTICIPACIÓN.', 16),
  ('Pavé de Chocolate y Pirulín',
   (select id from public.categories where nombre = 'Tendencia'),
   'Crema de chocolate Topping: Fudge de chocolate y Pirulin Troceado.',
   15000, false, '', 17)
on conflict (nombre) do nothing;

-- ── Configuración del negocio (info actual del footer) ──────────────────────
insert into public.settings
  (id, phone, address, maps_url, instagram, facebook, tiktok, day1, hours1, delivery_fee, free_delivery_threshold)
values
  (1,
   '573157978326',
   'Cl. 101c #74-40, Pedregal, Medellín, Antioquia',
   'https://maps.app.goo.gl/jKWVmMneA4KPTjgo6',
   'https://www.instagram.com/pavemedellin_roselbiscolina?igsi=MXU3MGl0NnV1azJ5Yw==',
   'https://www.facebook.com/pavesmedellin/',
   'https://www.tiktok.com/@pavesmedellin',
   'Todos los días',
   '12:00 M - 08:00 PM',
   3500,
   45000)
on conflict (id) do nothing;
