# Guía de salida a producción y migración a la cuenta de la clienta

Documento para ejecutar paso a paso en la madrugada. Léelo completo **antes** de empezar.

## Resumen del plan

| Parte | Qué se hace | Riesgo |
|-------|-------------|--------|
| A | Preparación y respaldos (días antes o al inicio) | Ninguno |
| B | Poner la base de producción actual al día con desarrollo | Bajo (scripts que solo agregan) |
| C | Mover todo al proyecto nuevo en la cuenta de la clienta | Medio-alto |
| D | Mapbox, correos y notificaciones de la clienta | Bajo |
| E | Verificación final y plan de vuelta atrás | — |

**Regla de oro:** el proyecto actual de producción **no se borra ni se modifica** durante la parte C. Si algo sale mal, se vuelve a apuntar el frontend al proyecto viejo y el negocio sigue funcionando.

**Qué datos se migran:** los de **producción** (clientes, pedidos, productos reales). Los datos de desarrollo son de prueba y **no** se migran; de desarrollo solo se toma la **estructura** (tablas, funciones, permisos).

**Decisión inicial** (marca una):
- [ ] **Solo Parte B**: la clienta se queda en el proyecto actual (el que está a tu nombre) y solo se actualiza.
- [ ] **Partes B + C**: se mueve a un proyecto nuevo en la cuenta de la clienta.

Recomendado si vas a mover a la clienta: haz primero B (deja producción actual al día) y luego C. Así lo que se copia ya tiene todo.

---

## Parte A. Preparación

### A1. Qué necesitas tener a la mano
- Acceso al panel de Supabase de **producción actual**, de **desarrollo** y del **proyecto nuevo** (cuenta de la clienta).
- Node y pnpm instalados (ya los tienes).
- La CLI de Supabase (se usa con `pnpm dlx supabase ...`, no hay que instalarla).
- **Docker Desktop** abierto, solo si usas `supabase db dump` (es lo que usa por dentro). Alternativa sin Docker: `pg_dump` directo (ver C2).
- Los datos de conexión de cada proyecto (Project Settings → Database → Connection string, modo **Session pooler** o **Direct**).
- Las llaves de cada proyecto (Project Settings → API): `URL`, `anon key` y `service_role key`.

**Importante:** la `service_role key` da acceso total. No la pegues en el código ni la subas a git. Solo en variables temporales de tu terminal.

### A2. Respaldo de producción (obligatorio)
1. Panel de producción → **Database → Backups**. Si hay respaldo reciente, descárgalo. Si el plan no lo permite, haz el paso 2.
2. Respaldo manual desde tu PC (guarda los archivos **fuera** del proyecto, por ejemplo `C:\respaldos\paves\`):

```powershell
mkdir C:\respaldos\paves
cd C:\JDV\01_Development\FrontEnd\paves-medellin
pnpm dlx supabase login
pnpm dlx supabase link --project-ref REF_PRODUCCION_ACTUAL
pnpm dlx supabase db dump --linked -f C:\respaldos\paves\prod_esquema.sql
pnpm dlx supabase db dump --linked --data-only -f C:\respaldos\paves\prod_datos.sql
```

3. Respaldo de seguridad adicional (sirve para comprobar después), ejecuta en el **SQL Editor de producción** y guarda el resultado:

```sql
select 'orders' t, count(*) from public.orders
union all select 'clientes', count(*) from public.clientes
union all select 'products', count(*) from public.products
union all select 'categories', count(*) from public.categories
union all select 'additions', count(*) from public.additions
union all select 'sauces', count(*) from public.sauces
union all select 'payment_methods', count(*) from public.payment_methods
union all select 'store_ratings', count(*) from public.store_ratings
union all select 'user_roles', count(*) from public.user_roles;
```

Anota esos números. Después de cada parte los vuelves a comparar.

> `REF_PRODUCCION_ACTUAL` es el código en la URL del panel: `supabase.com/dashboard/project/<REF>`.

### A3. Avisar y fijar la ventana
- Avisa a la clienta la ventana de trabajo. Durante la parte C no deben entrar pedidos nuevos.
- Para frenar pedidos: en el SQL Editor de **producción actual**:

```sql
update public.settings set is_active = false where id = 1;
```
(La tienda muestra el aviso de mantenimiento y no recibe pedidos). Al final se vuelve a poner en `true`.

---

## Parte B. Actualizar la base de producción actual

> Todo esto va en el **SQL Editor de producción**. Ejecuta **un archivo a la vez**, lee el resultado y no sigas si hay un error rojo.

### B1. Revisar qué falta (no modifica nada)
Ejecuta en **desarrollo** y en **producción**, y compara los resultados:

```sql
-- Tablas
select table_name from information_schema.tables
where table_schema = 'public' order by 1;

-- Columnas de settings
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'settings' order by 1;

-- Columnas de orders
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'orders' order by 1;

-- Funciones
select routine_name from information_schema.routines
where routine_schema = 'public' order by 1;
```

Lo que aparezca en desarrollo y no en producción es lo que hay que crear. Debería ser, entre otras cosas: tabla `badges`, columnas de fidelización en `settings` y `clientes`, tablas `colaboradores` y `mesas`, columnas `origen`, `mesa`, `colaborador_id`, `colaborador_nombre` en `orders`, y las funciones `crear_pedido_local`, `solicitar_cambio_password` y `es_colaborador`.

### B2. Leer los scripts antes de correrlos
Abre cada archivo y confirma que **no contiene** `DROP TABLE`, `TRUNCATE` ni `DELETE` sin `WHERE`. Los scripts de este proyecto con `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS` y `DROP POLICY IF EXISTS` son seguros de repetir.

**NO correr en producción:** `supabase/schema.sql`, `BD/estructura.sql`, `BD/datos.sql`, `supabase/seed.sql`. Son para crear una base desde cero o traen datos de ejemplo.

### B3. Orden de ejecución
Corre solo los que correspondan según B1 (si una tabla o columna ya existe, el script no hace daño, pero igual revísalo):

1. `BD/02_fidelizacion.sql` (insignias; inserta Bronce/Plata/Oro solo si no existen)
2. `BD/03_planes.sql`
3. `BD/04_badge_rules.sql`
4. `BD/05_badge_active.sql`
5. `BD/06_badge_2x1_days.sql`
6. `BD/BADGES_MIGRACION_COMPLETA.sql` (repite lo anterior de forma segura)
7. `BD/BADGES_PERMISOS.sql`
8. `supabase/migration_admin_plan_modules.sql`
9. `supabase/migration_delivery_dynamic.sql`
10. Columna de fidelización del admin (el nombre real es camelCase con comillas):

```sql
alter table public.settings add column if not exists "useCustomerBadges" boolean not null default true;
```

11. `supabase/migration_colaboradores_mesas.sql` (**Ver advertencia abajo**)

Revisa también `supabase/migration_catalog_design.sql` y `supabase/migration_additions_sauces.sql` solo si en B1 ves que faltan tablas de diseño o de adiciones/salsas en producción. Si ya existen y tienen datos, **no los corras**.

### B4. Advertencia sobre `migration_colaboradores_mesas.sql`
Este script **cambia permisos**:
- Deja `user_roles` de solo lectura desde el navegador.
- Reemplaza las políticas "cualquier usuario autenticado puede todo" por "cualquiera que no sea colaborador".

Antes de correrlo, en producción verifica que tu usuario admin está en `user_roles`:

```sql
select id, email, role from public.user_roles;
```

Si tu admin o superadmin no aparecen, **agrégalos** antes (si no, el sistema los trata como admin por defecto, pero conviene que existan filas):

```sql
-- Reemplaza el correo por el real. Solo si no existen filas
insert into public.user_roles (id, email, role)
select id, email, 'admin' from auth.users where email = 'correo_del_admin@ejemplo.com'
on conflict (id) do nothing;
```

### B5. Seguridad: desactiva el registro público (muy importante)
Como las políticas permiten todo a "cualquier usuario autenticado que no sea colaborador", si el registro público de Supabase está activo, **cualquiera podría crear una cuenta y editar la tienda**.

Panel de producción → **Authentication → Sign In / Providers → Email** → desactiva **"Allow new users to sign up"** → Save.

Los colaboradores no se ven afectados: se crean desde la función con la llave de servicio.

### B6. Funciones y secretos en producción
1. **Edge Functions → Deploy a new function → Via Editor**, pega y despliega `manage-collaborators` (archivo `supabase/functions/manage-collaborators/index.ts`). Desactiva **Verify JWT**.
2. Confirma que `send-email` y `send-push` existen y están desplegadas (si no, despliégalas igual desde sus carpetas).
3. **Edge Functions → Secrets**, confirma que existen:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`

   (`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las pone Supabase sola.)

### B7. Verificación de la parte B
1. Vuelve a ejecutar la consulta de conteos de A2: los números deben ser **iguales** (o mayores si entró algún pedido).
2. Repite B1 y comprueba que producción ya tiene todo lo de desarrollo.
3. Despliega el frontend nuevo **después** de terminar B (nunca antes).
4. Entra al panel como admin: Dashboard, Pedidos y Productos deben cargar normales.
5. Entra a Superadmin, activa **Colaboradores** y **Mesas** si la clienta los quiere, y guarda.

Si todo está bien y la clienta se queda en este proyecto, **terminaste**. Salta a la Parte D y E. Si vas a mover a su cuenta, sigue con la C.

---

## Parte C. Mover todo al proyecto nuevo (cuenta de la clienta)

> No empieces la C si B no terminó bien. Esta parte copia lo que ya quedó al día.

### C1. Crear el proyecto nuevo
1. Ingresa a supabase.com con el correo de la clienta → **New project**.
2. Elige la **misma región** que el proyecto actual (así no cambia la velocidad).
3. Guarda la **contraseña de la base de datos** en un lugar seguro.
4. Cuando termine, anota: `REF_NUEVO`, la URL (`https://REF_NUEVO.supabase.co`), la `anon key` y la `service_role key`.

### C2. Copiar estructura y datos de producción al proyecto nuevo
Con producción en mantenimiento (A3 hecho). Hay dos caminos; usa el que te funcione.

**Camino 1: con la CLI (necesita Docker abierto)**

```powershell
cd C:\JDV\01_Development\FrontEnd\paves-medellin
pnpm dlx supabase link --project-ref REF_PRODUCCION_ACTUAL
pnpm dlx supabase db dump --linked -f C:\respaldos\paves\final_esquema.sql
pnpm dlx supabase db dump --linked --data-only --use-copy -f C:\respaldos\paves\final_datos.sql
```

**Camino 2: con `pg_dump` y `psql`** (si los tienes instalados; usa las cadenas de conexión de cada proyecto):

```powershell
pg_dump "CADENA_PROD" --schema=public --schema-only --no-owner --no-privileges -f C:\respaldos\paves\final_esquema.sql
pg_dump "CADENA_PROD" --schema=public --data-only --no-owner --no-privileges -f C:\respaldos\paves\final_datos.sql
```

Luego restaurar en el proyecto **nuevo**:

```powershell
psql "CADENA_NUEVO" -f C:\respaldos\paves\final_esquema.sql
```

Si ves errores del tipo "ya existe" para objetos propios de Supabase (`auth`, `storage`, `extensions`), son esperables. Si ves errores sobre tablas de `public` o funciones, **detente y revisa**.

**Antes de cargar los datos**, hay una dependencia: `user_roles` y `colaboradores` apuntan a usuarios de autenticación (`auth.users`) que aún no existen en el proyecto nuevo. Por eso se hace en este orden:

1. Primero crea los usuarios (C3).
2. Luego carga los datos **excepto** `user_roles` y `colaboradores`.

Para cargar datos sin esas dos tablas con `pg_dump`, usa `--exclude-table=public.user_roles --exclude-table=public.colaboradores` en el comando de datos. Si usas el archivo `final_datos.sql` ya generado, abre el archivo y elimina los bloques `COPY public.user_roles ...` y `COPY public.colaboradores ...` (cada bloque termina en `\.`).

```powershell
psql "CADENA_NUEVO" -f C:\respaldos\paves\final_datos.sql
```

### C3. Usuarios de autenticación (admin y superadmin)
Los usuarios no viajan con la copia de `public`. Como son pocos (admin y superadmin), lo más seguro es **recrearlos**:

1. Panel del proyecto nuevo → **Authentication → Users → Add user → Create new user**, con el mismo correo del admin, una contraseña nueva y **Auto Confirm User** marcado. Repite para el superadmin.
2. Cargar los roles con los **nuevos** ID (reemplaza los correos):

```sql
insert into public.user_roles (id, email, role)
select id, email, 'superadmin' from auth.users where email = 'correo_superadmin@ejemplo.com'
on conflict (id) do update set role = excluded.role;

insert into public.user_roles (id, email, role)
select id, email, 'admin' from auth.users where email = 'correo_admin@ejemplo.com'
on conflict (id) do update set role = excluded.role;
```

3. Los colaboradores no existen aún en producción (es un módulo nuevo), así que no hay que migrarlos. Si ya hay, hay que volver a crearlos desde el panel.

### C4. Permisos, políticas y funciones extra
El `pg_dump` con `--no-privileges` omite los GRANT. Para no depender de eso, vuelve a ejecutar en el proyecto **nuevo**, en este orden:

1. `BD/BADGES_PERMISOS.sql`
2. `supabase/migration_colaboradores_mesas.sql` (idempotente: reafirma permisos y políticas de todo el sistema)
3. `supabase/enable_realtime_pivot.sql` (para las notificaciones en tiempo real de pedidos)
4. Si el panel no puede escribir en alguna tabla, el error será `permission denied for table X`. Se arregla con:

```sql
grant select on public.X to anon;
grant select, insert, update, delete on public.X to authenticated;
```

### C5. Seguridad del proyecto nuevo
**Authentication → Sign In / Providers → Email**: desactiva **"Allow new users to sign up"** (ver B5, es obligatorio).

**Authentication → URL Configuration**: pon como **Site URL** el dominio final de la tienda, y agrégalo a Redirect URLs.

### C6. Imágenes (Storage)
Las imágenes están en el bucket público `product-images`. Hay que copiarlas y corregir las URLs.

1. En el proyecto nuevo: **Storage → New bucket** → nombre `product-images` → marca **Public bucket**.
2. Las políticas de storage ya salen en `supabase/schema.sql` (líneas con `storage.objects`). Corre en el **SQL Editor del proyecto nuevo** solo esas 4 políticas (`imagenes_lectura_publica`, `imagenes_admin_insert`, `imagenes_admin_update`, `imagenes_admin_delete`).
3. Copiar los archivos. Crea una carpeta temporal **fuera del repo**, por ejemplo `C:\temp\migrar`, y guarda este script como `copiar-storage.mjs`:

```js
import { createClient } from "@supabase/supabase-js";

const origen = createClient(process.env.OLD_URL, process.env.OLD_KEY);
const destino = createClient(process.env.NEW_URL, process.env.NEW_KEY);
const BUCKET = "product-images";

async function listar(prefijo = "") {
  const archivos = [];
  const { data, error } = await origen.storage.from(BUCKET).list(prefijo, { limit: 1000 });
  if (error) throw error;
  for (const item of data) {
    const ruta = prefijo ? `${prefijo}/${item.name}` : item.name;
    if (item.id === null) archivos.push(...(await listar(ruta)));
    else archivos.push(ruta);
  }
  return archivos;
}

const rutas = await listar();
console.log(`${rutas.length} archivos`);
let fallos = 0;
for (const ruta of rutas) {
  const { data: blob, error: e1 } = await origen.storage.from(BUCKET).download(ruta);
  if (e1) { console.error("descarga", ruta, e1.message); fallos++; continue; }
  const { error: e2 } = await destino.storage.from(BUCKET).upload(ruta, blob, {
    upsert: true,
    contentType: blob.type,
  });
  if (e2) { console.error("subida", ruta, e2.message); fallos++; }
}
console.log(fallos ? `Terminó con ${fallos} fallos` : "Todo copiado");
```

Ejecuta:

```powershell
cd C:\temp\migrar
pnpm init
pnpm add @supabase/supabase-js
$env:OLD_URL="https://REF_PRODUCCION_ACTUAL.supabase.co"
$env:OLD_KEY="SERVICE_ROLE_PRODUCCION"
$env:NEW_URL="https://REF_NUEVO.supabase.co"
$env:NEW_KEY="SERVICE_ROLE_NUEVO"
node copiar-storage.mjs
```
Debe terminar con "Todo copiado". Si hay fallos, vuelve a correrlo (es seguro repetirlo).
Después **cierra la terminal** para que las llaves no queden guardadas.

4. Corregir las URLs de imágenes guardadas en la base (apuntaban al proyecto viejo). Ejecuta en el **proyecto nuevo**, cambiando las dos constantes:

```sql
do $$
declare
  viejo text := 'REF_PRODUCCION_ACTUAL.supabase.co';
  nuevo text := 'REF_NUEVO.supabase.co';
  r record;
begin
  for r in
    select table_name, column_name, data_type
    from information_schema.columns
    where table_schema = 'public'
      and data_type in ('text', 'character varying', 'jsonb')
      and table_name in (select table_name from information_schema.tables
                         where table_schema = 'public' and table_type = 'BASE TABLE')
  loop
    if r.data_type = 'jsonb' then
      execute format(
        'update public.%I set %I = replace(%I::text, %L, %L)::jsonb where %I::text like %L',
        r.table_name, r.column_name, r.column_name, viejo, nuevo, r.column_name, '%' || viejo || '%');
    else
      execute format(
        'update public.%I set %I = replace(%I, %L, %L) where %I like %L',
        r.table_name, r.column_name, r.column_name, viejo, nuevo, r.column_name, '%' || viejo || '%');
    end if;
  end loop;
end $$;
```

Comprobar que no quedó ninguna referencia al proyecto viejo (debe devolver 0 filas en cada tabla; prueba al menos estas):

```sql
select count(*) from public.products where image::text like '%REF_PRODUCCION_ACTUAL%';
select count(*) from public.catalog_design where design::text like '%REF_PRODUCCION_ACTUAL%';
select count(*) from public.settings where logo_url like '%REF_PRODUCCION_ACTUAL%';
```
(Si una consulta da error por nombre de columna, ajusta al nombre real; el objetivo es confirmar que no queda el REF viejo.)

### C7. Edge Functions y secretos en el proyecto nuevo
1. Despliega las tres funciones (`send-email`, `send-push`, `manage-collaborators`) con el editor del panel o con la CLI:

```powershell
pnpm dlx supabase link --project-ref REF_NUEVO
pnpm dlx supabase functions deploy manage-collaborators --no-verify-jwt
pnpm dlx supabase functions deploy send-email
pnpm dlx supabase functions deploy send-push
```

   (`send-email` y `send-push` verifican el JWT; revisa en `supabase/config.toml` qué valor tiene cada una y respétalo.)

2. **Edge Functions → Secrets** en el proyecto nuevo, crea:
   - `RESEND_API_KEY` y `RESEND_FROM_EMAIL` (los de la clienta, ver Parte D).
   - `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`: usa **las mismas** que tenías. Así las suscripciones a notificaciones que ya existen en `push_subscriptions` siguen funcionando.

### C8. Frontend
En el lugar donde esté alojada la tienda (Vercel, Netlify u otro), cambia las variables de entorno:

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | URL del proyecto **nuevo** |
| `VITE_SUPABASE_ANON_KEY` | anon key del proyecto **nuevo** |
| `VITE_MAPBOX_TOKEN` | token de la clienta (Parte D) |
| `VITE_VAPID_PUBLIC_KEY` | la misma de siempre |

Después **redespliega** (son variables de compilación; cambiarlas sin redesplegar no hace nada). En tu PC, el archivo `.env` es el de producción y `.env.development` el de desarrollo; **no los subas al repositorio**.

### C9. Pruebas antes de abrir al público (con `is_active` aún en `false` en el proyecto nuevo si lo copiaste así)
1. Entra a `/admin/login` con el admin: carga el panel y ves los pedidos históricos.
2. Los productos se ven con imagen en la tienda.
3. Superadmin: activa `plan_colaboradores` y `plan_mesas` si aplica. Guarda.
4. Crea un colaborador de prueba y entra a `/pos`. Haz un pedido de prueba y verifica que aparece en Pedidos como "En local".
5. Crea una mesa, abre `/?mesa=1` en el celular y haz un pedido de prueba.
6. Cambia un pedido a "En camino" y verifica que llega el correo (Parte D).
7. Borra los pedidos y colaboradores de prueba.
8. Pon `is_active = true` en `settings` del proyecto nuevo:

```sql
update public.settings set is_active = true where id = 1;
```

9. Compara conteos con los de A2 (ejecuta la misma consulta en el proyecto nuevo).

---

## Parte D. Servicios de la clienta

### D1. Mapbox (domicilio dinámico)
1. La clienta crea cuenta en mapbox.com con su correo.
2. **Tokens → Create a token**: tipo **público** (`pk.`), con los alcances por defecto.
3. En **URL restrictions** agrega el dominio de la tienda (por ejemplo `https://midominio.com`), para que nadie más use el token.
4. Pega el token en `VITE_MAPBOX_TOKEN` del hosting y redespliega.
5. En el panel admin → **Domicilios**, revisa la ubicación de la tienda y los valores de cálculo (tarifa base, precio por km, radio máximo).
6. Prueba: en la tienda, escoge domicilio, escribe una dirección, y verifica que sugiere direcciones y calcula el valor.
7. Cuando funcione, **revoca tu token** personal en tu cuenta de Mapbox.

### D2. Correos (Resend)
1. La clienta crea cuenta en resend.com con su correo y agrega su **dominio**; copia los registros DNS que le pide (SPF/DKIM) en el proveedor del dominio y espera a que diga **Verified**.
2. **API Keys → Create API Key** con permiso de envío.
3. En Supabase (**Edge Functions → Secrets**): `RESEND_API_KEY` = la llave nueva; `RESEND_FROM_EMAIL` = el remitente del dominio, por ejemplo `pedidos@midominio.com`.
4. Prueba cambiando el estado de un pedido de prueba que tenga un correo real.

### D3. Notificaciones push
Si se mantienen las llaves VAPID, nada cambia. Si se generan nuevas, hay que actualizar `VAPID_*` en los secretos y `VITE_VAPID_PUBLIC_KEY` en el frontend, y todos los navegadores tendrán que volver a aceptar las notificaciones.

---

## Parte E. Verificación final y vuelta atrás

### E1. Lista de comprobación final
- [ ] Conteos del proyecto nuevo = conteos de A2.
- [ ] Admin y superadmin entran al panel.
- [ ] La tienda carga con imágenes y diseño.
- [ ] Un pedido web de prueba llega a Pedidos.
- [ ] Cambio de estado de un pedido envía correo.
- [ ] Domicilio dinámico calcula con el token de la clienta.
- [ ] Colaborador y mesa funcionan (si se activaron).
- [ ] Registro público de usuarios **desactivado**.
- [ ] `.env` fuera del repositorio.
- [ ] Respaldos guardados en `C:\respaldos\paves\`.

### E2. Si algo sale mal (vuelta atrás)
1. En el hosting vuelve a poner `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del proyecto **viejo** y redespliega.
2. En el proyecto viejo: `update public.settings set is_active = true where id = 1;`
3. El negocio vuelve a funcionar tal como estaba. Los pedidos que hayan entrado al proyecto nuevo durante la prueba se pierden, por eso la ventana de mantenimiento.

### E3. Después de unos días
- Mantén el proyecto viejo **sin tocar** al menos una semana.
- Cuando todo esté estable, pausa el proyecto viejo (no lo borres de inmediato).
- Rota la `service_role key` y la contraseña de la base del proyecto viejo, ya que quedaron en tus comandos.

---

## Tiempos estimados (orientativos)

| Parte | Tiempo |
|-------|--------|
| A. Respaldos | 15-20 min |
| B. Actualizar producción actual | 30-45 min |
| C. Proyecto nuevo (copia, usuarios, imágenes, funciones) | 1.5-2.5 h |
| D. Mapbox y correos (DNS puede demorar) | 30 min + espera |
| E. Pruebas | 30 min |

**Recomendación:** haz primero un ensayo completo de la parte C con un proyecto de prueba vacío (gratis) en tu propia cuenta, antes de la noche real. Es la forma más segura de detectar problemas sin riesgo.
