## -------
$nombre = "pave-produccion-3"

pnpm run build
if ($?) {
  Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
  New-Item -ItemType Directory -Force C:\respaldos | Out-Null
  $zip  = "C:\respaldos\$nombre.zip"
  $root = (Resolve-Path dist).Path
  Remove-Item $zip -ErrorAction SilentlyContinue
  $fs = [IO.File]::Open($zip, 'Create')
  $a  = New-Object IO.Compression.ZipArchive($fs, 'Create')
  Get-ChildItem dist -Recurse -File -Force | ForEach-Object {
    [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($a, $_.FullName, $_.FullName.Substring($root.Length + 1).Replace('\','/'), 'Optimal')
  }
  $a.Dispose(); $fs.Dispose()
  Get-Item $zip | Select-Object Name, Length
}
## -------

# 🛠️ DEV.md — Registro Técnico y Hoja de Ruta de Desarrollo
## Proyecto: Catálogo Digital y Panel Administrativo — Pavés Medellín
> **Rama activa:** `paves`
> **Última inspección quirúrgica:** 21 de Septiembre, 2026
> **Estado general:** 🟢 Fase de Producción / Pulido Avanzado (90% completado)

---

## 📑 Tabla de Contenidos
1. [Resumen Ejecutivo del Estado Actual](#1-resumen-ejecutivo-del-estado-actual)
2. [Stack Tecnológico y Arquitectura](#2-stack-tecnológico-y-arquitectura)
3. [Inspección Quirúrgica de Módulos (Qué está hecho)](#3-inspección-quirúrgica-de-módulos-qué-está-hecho)
   - 3.1 [Catálogo Público (Frontend Cliente)](#31-catálogo-público-frontend-cliente)
   - 3.2 [Panel de Administración (`/admin`)](#32-panel-de-administración-admin)
   - 3.3 [Capa de Datos y Persistencia (Supabase & Dual-Mode)](#33-capa-de-datos-y-persistencia-supabase--dual-mode)
4. [Hallazgos Quirúrgicos, Bugs y Deuda Técnica](#4-hallazgos-quirúrgicos-bugs-y-deuda-técnica)
5. [Matriz de Control: Hecho vs. Pendiente](#5-matriz-de-control-hecho-vs-pendiente)
6. [Estructura del Proyecto y Archivos Clave](#6-estructura-del-proyecto-y-archivos-clave)
7. [Guía Rápida para Desarrolladores](#7-guía-rápida-para-desarrolladores)
8. [Roadmap Priorizado de Próximos Pasos](#8-roadmap-priorizado-de-próximos-pasos)

---

## 1. Resumen Ejecutivo del Estado Actual

La aplicación en la rama **`paves`** se encuentra en una etapa muy madura de desarrollo. Cuenta con un catálogo digital completo, visualmente enriquecido con personalizaciones dinámicas en tiempo real, un sistema de pedidos con despacho estructurado hacia WhatsApp y registro paralelo en base de datos, y un panel administrativo con 9 módulos operativos, control de acceso basado en roles (Admin y Superadmin) y sincronización Realtime con Supabase.

### 🌟 Hitos Recientes Completados (Commit History):
- `cc1bef3`: Módulo de diseño front dinámico implementado (paletas 1-clic, tipografías, personalización de banners, promociones y combos desde el panel).
- `e027fd4`: Manual de usuario y guía operativa completa redactada (`MANUAL_DE_USUARIO.md`).
- `3742aa2`: Módulo de productos, adiciones y salsas validado para producción.
- `994e952`: Panel admin con suite de pruebas y sincronización en tiempo real.

---

## 2. Stack Tecnológico y Arquitectura

| Capa | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Core Frontend** | React + Vite | React 18.3.1, Vite 8.3.0 |
| **Enrutamiento** | React Router DOM | v7.18.3 (Lazy loading para módulos del panel) |
| **Estilos & UI** | Vanilla CSS + Tailwind v4 | `@tailwindcss/vite` 4.3.3 + CSS modular por componente |
| **Animaciones** | Framer Motion + AOS | `framer-motion` 13.3.0, `aos` 2.3.4 |
| **Iconografía** | Lucide React + React Icons | `lucide-react` 1.46.0, `react-icons` 5.7.0 |
| **Alertas & Feedback** | SweetAlert2 | `sweetalert2` 11.26.25 (toasts, modales de confirmación) |
| **Backend as a Service**| Supabase | `@supabase/supabase-js` 2.116.0 (Auth, Postgres, Realtime, Storage) |
| **Almacenamiento** | Supabase Storage | Bucket `product-images` con compresión Canvas en el cliente |

### Patrón de Arquitectura Híbrida (Dual-Mode / Resiliente):
El sistema implementa un adaptador inteligente (`src/data/dataSource.js`):
1. **Modo Supabase (Producción):** Si las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` están presentes, la tienda y el panel leen y escriben en PostgreSQL con sincronización Realtime (WebSockets).
2. **Modo Local Fallback (Tolerancia a fallos):** Si Supabase no está configurado, la red falla o la base de datos se vacía accidentalmente, el catálogo recurre a `src/data/menu.js`. **La tienda de cara al cliente nunca se rompe**.

---

## 3. Inspección Quirúrgica de Módulos (Qué está hecho)

### 3.1 Catálogo Público (Frontend Cliente)
- [x] **Hero Section (`Hero.jsx`):**
  - Carrusel automático de productos destacados con barra de progreso interactiva (7s).
  - Badge dinámico de horario comercial (calculado al vuelo: Abierto / Cerrado / Cierre de emergencia).
  - Botón flotante de carrito de compras con contador reactivo.
  - Soporte de estilos dinámicos (gradientes, badges, tipografía inyectada).
- [x] **Sección de Promociones (`Promociones.jsx`):**
  - Banners de promociones dinámicas leídas de `catalog_design` (descuentos, 2x1, etiquetas temporales).
  - Interruptor de visibilidad global desde el panel administrativo.
- [x] **Sección de Combos y Packs (`Combos.jsx`):**
  - Paquetes especiales para compartir con desglose de ítems incluidos.
  - Botón de agregar combo directamente al carrito con nota automática de contenido.
- [x] **Menú & Filtros (`Menu.jsx`, `MenuCard.jsx`):**
  - Barra de categorías dinámicas ordenadas y filtradas por visibilidad.
  - Tarjetas de producto interactivas con efecto de expansión/detalle (descripción, precio COP, badge "Popular").
  - Ocultamiento automático de productos con `disponible = false` (stock agotado).
- [x] **Modal de Personalización (`CustomizationModal.jsx`):**
  - Selección de adiciones y salsas asociadas al producto.
  - Marcado de requisitos obligatorios / opcionales.
  - Campo de texto libre para observaciones ("sin lechera", "bien frío", etc.).
  - Cálculo de precio unitario en tiempo real según adiciones seleccionadas.
- [x] **Carrito de Compras (`CartModal.jsx`):**
  - Agrupación por clave única de personalización (no mezcla productos con diferentes adiciones).
  - Edición de productos existentes, incremento/decremento unitario y borrado.
  - Botón "Pedir otro igual" (`onAddOneMore`).
  - Barra de progreso interactiva hacia el umbral de domicilio gratis.
- [x] **Checkout & WhatsApp (`CheckoutModal.jsx` & `App.jsx`):**
  - Modalidades de entrega: **Domicilio** (🛵), **Recoger en tienda** (🏪), **Comer en el local** (🍽️).
  - Formulario de cliente: Nombre, teléfono, dirección, unidad, apartamento, medio de pago.
  - Generación de mensaje estructurado para WhatsApp (`wa.me`) con desglose detallado de platos, adiciones y subtotales.
  - **Aviso de pedido agendado** si el cliente pide fuera del horario de atención.
  - Persistencia silenciosa en Supabase (`orders` table) con número de pedido secuencial (`#numero`).

---

### 3.2 Panel de Administración (`/admin`)
- [x] **Autenticación & Seguridad (`AdminLogin.jsx`, `sessionStore.js`, `useAdminSession.js`):**
  - Login con correo y contraseña contra Supabase Auth.
  - Almacenamiento en `sessionStorage` para evitar sesiones colgadas en navegadores compartidos.
  - Enrutamiento protegido por Guard (`RequiereSesion`).
  - Detección de roles (`admin` vs `superadmin`) mediante la tabla `user_roles`.
  - Modal de cambio de contraseña (`PasswordModal.jsx`) con opción de recuperación vía correo electrónico.
- [x] **Dashboard (`Dashboard.jsx`):**
  - Métricas del día: Total ventas ($ COP), número de pedidos, pedidos activos, ticket promedio.
  - Productos más pedidos en tiempo real.
  - Estado del negocio en vivo (indicador abierto/cerrado con botón de refresco).
  - Recepción de pedidos en tiempo real con alertas sonoras / Toast flotantes (`SweetAlert2`).
- [x] **Gestión de Productos (`Productos.jsx`, `ProductFormModal.jsx`):**
  - Tabla paginada con buscador en vivo y filtros por categoría y estado (disponibles/agotados).
  - Toggles rápidos inline para cambiar disponibilidad (`disponible`) y destacado (`destacado`).
  - Creación y edición con modal: nombre, categoría, precio, descripción, nota especial, orden.
  - Vinculación múltiple de adiciones y salsas permitidas con selector de obligatoriedad (`requerido`).
  - Subida de imágenes a Supabase Storage con compresión automática en cliente y eliminación de imágenes huérfanas.
- [x] **Gestión de Categorías (`Categorias.jsx`, `CategoryFormModal.jsx`):**
  - CRUD de categorías con nombre, emoji, etiqueta visible y orden numérico.
  - Toggle de visibilidad pública sin borrar la categoría.
- [x] **Gestión de Adiciones y Salsas (`Adiciones.jsx`, `AdditionFormModal.jsx`):**
  - Interfaz por pestañas: Adiciones y Salsas.
  - CRUD con nombre, precio adicional en COP, orden y toggle de disponibilidad.
- [x] **Control de Pedidos (`Pedidos.jsx`, `PedidoDetalleModal.jsx`):**
  - Listado de pedidos sincronizado por WebSocket en tiempo real.
  - Filtros por estado: *Nuevos, En preparación, En camino, Entregados, Cancelados* y filtro por mes (`YYYY-MM`).
  - Botón de transición rápida de estado (Aceptar ➔ Despachar ➔ Entregar).
  - Modal de detalle con resumen de cliente, dirección, desglose de ítems y botón directo a WhatsApp del cliente.
- [x] **Datos de la Empresa (`Empresa.jsx`):**
  - Configuración de teléfono de WhatsApp (donde caen los pedidos), dirección física, enlace a Google Maps.
  - Redes sociales: Instagram, Facebook, TikTok.
  - Selector de horarios de atención en intervalos de 30 minutos (12h AM/PM) con constructor de texto.
  - Subida y reemplazo de logo del negocio con compresión optimizada (400px máx).
- [x] **Configuración Operativa (`Configuracion.jsx`):**
  - Costo de domicilio base ($ COP).
  - Umbral de pedido mínimo para envío gratis ($ COP).
  - Toggles de modalidades de entrega activas (Domicilio, Recoger, Local).
  - Interruptor maestro de **Cierre de Emergencia** (`forceClosed`).
- [x] **Diseño Menú (`Diseno.jsx`):**
  - **100% Conectado a Base de Datos en Tiempo Real:** Carga productos, categorías, configuración de empresa y diseño desde Supabase con suscripción activa Realtime. Cero datos o imágenes simuladas locales.
  - **Simulador Real Dinámico (Por Secciones o Catálogo Completo):**
    - *Modo Sección Activa:* Enfoca de forma aislada e inmediata el componente que se está modificando (Hero, Promociones, Combos, Menú o Footer). Al seleccionar la pestaña **Footer**, se previsualiza directamente el pie de página real con sus colores, links y logo sin scrolls innecesarios.
    - *Modo Catálogo Completo:* Muestra el flujo completo de la tienda (`Hero ➔ Promociones ➔ Menú ➔ Combos ➔ Footer`) con **desplazamiento suave automático (auto-scroll)** sincronizado al cambiar de pestaña en el formulario de la izquierda.
  - Personalizador visual con 4 paletas predefinidas (Pavés Clásico, Dark Chic, Dulce Pastel, Chocolate Intenso).
  - Selector de fuentes tipográficas (Montserrat, Poppins, Inter, Playfair Display, etc.).
  - Selectores de color y gradientes para fondo de app, hero, tarjetas, botones, badges y barra de categorías.
  - Configurador de columnas (Escritorio: auto/2/3/4; Móvil: 1/2) y orientación de tarjeta (vertical/horizontal).
  - Previsualizador en vivo con marcos intercambiables (Móvil vs Escritorio).
- [x] **Módulo Superadmin (`Superadmin.jsx`):**
  - Control de inquilino (Tenant): interruptor de suspensión de servicio por falta de pago (`isActive`).
  - Bloqueo de cambio de contraseña (`canChangePassword`).

---

### 3.3 Capa de Datos y Persistencia (Supabase & Dual-Mode)
- [x] **Scripts SQL en `/supabase`:**
  - `schema.sql`: Definición DDL de tablas `categories`, `products`, `settings`, `orders`. Políticas RLS y triggers de `updated_at`.
  - `seed.sql`: Semilla inicial de datos idéntica al catálogo físico tradicional.
  - `superadmin_setup.sql`: Creación de la tabla `user_roles`, asignación de superadmin y políticas de lectura.
  - `migration_additions_sauces.sql`: Tablas `additions`, `sauces`, `product_additions`, `product_sauces`.
  - `migration_catalog_design.sql`: Tabla `catalog_design` con todas las variables CSS y colecciones JSON de promociones y combos.
  - `limit_single_superadmin.sql`: Restricción de unicidad para el rol de superadministrador.
  - `fix_rls.sql`: Corrección de permisos y asignaciones RLS para consultas anónimas y autenticadas.
  - `enable_realtime_pivot.sql`: Habilitación de réplica completa para publicaciones en tiempo real.

---

## 4. Hallazgos Quirúrgicos, Bugs y Deuda Técnica

Durante la inspección de código estática y dinámica se identificaron los siguientes puntos que requieren atención:

### 🔴 1. Bug Potencial en Producción: Variables No Declaradas (`VALOR_DOMICILIO`, `MINIMO_ENVIO_GRATIS`)
* **Ubicación:**
  - `src/App.jsx` (líneas 77 y 80)
  - `src/components/CheckoutModal.jsx` (línea 296)
  - `src/data/dataSource.js` (líneas 93, 94, 313, 314)
* **Causa:** En varios puntos se utiliza la expresión `settings.deliveryFee ?? VALOR_DOMICILIO` y `settings.freeDeliveryThreshold ?? MINIMO_ENVIO_GRATIS`. Sin embargo, `VALOR_DOMICILIO` y `MINIMO_ENVIO_GRATIS` no están definidas ni importadas como constantes en esos archivos.
* **Impacto:** Si por alguna razón la respuesta de `settings` viene sin `deliveryFee` o se ejecuta `buildLocalSettings()` en modo fallback, JavaScript lanzará un error de ejecución `ReferenceError: VALOR_DOMICILIO is not defined`, interrumpiendo el checkout.
* **Solución requerida:** Centralizar estas constantes en `src/data/menu.js` (ej: `VALOR_DOMICILIO_DEFAULT = 5000`, `MINIMO_ENVIO_GRATIS_DEFAULT = 45000`) y exportarlas o definirlas formalmente.

---

### ✅ 1. Resuelto: Variables No Declaradas (`VALOR_DOMICILIO`, `MINIMO_ENVIO_GRATIS`)
* **Ubicación:** `src/data/menu.js`, `src/data/dataSource.js`, `src/App.jsx`, `src/components/CheckoutModal.jsx`
* **Solución aplicada:** Se declararon y exportaron formalmente `VALOR_DOMICILIO_DEFAULT = 5000` y `MINIMO_ENVIO_GRATIS_DEFAULT = 45000` en `src/data/menu.js` e importaron en todos los consumidores. Quedó eliminado el riesgo de `ReferenceError`.

---

### ✅ 2. Resuelto: Eliminación Universal de Box-Shadows Rojos Quemados
* **Ubicación:** `MenuCard.css`, `Hero.css`, `Promociones.css`, `Combos.css`, `Navbar.css`, `CartModal.css`, `CheckoutModal.css`, `CustomizationModal.css`, `estadoNegocio.css`.
* **Causa:** Múltiples reglas CSS tenían valores quemados de `box-shadow: ... rgba(217, 43, 56, ...)` que producían halos rojos antiestéticos al aplicar temas oscuros (Choco Noir), verdes (Menta) o dorados.
* **Solución aplicada:** Se reemplazaron todas las sombras rojas por sombras oscuras translúcidas neutras (`rgba(0, 0, 0, 0.08 - 0.18)`), garantizando coherencia estética en cualquier paleta.

---

### ✅ 3. Resuelto: Módulo de Diseño 100% Funcional para Producción
* **Ubicación:** `src/admin/components/GradientPickerField.jsx`, `src/admin/pages/Diseno.jsx`.
* **Solución aplicada:** Se redujo la complejidad eliminando la galería redundante y el modo manual css que desincronizaba la muestra. Se dejaron exactamente **dos modos directos, intuitivos y 100% estables**:
  1. **Creador 2 Colores:** Selector de color inicial, color final, ángulo/dirección del gradiente y visor en vivo.
  2. **Color Sólido:** Selector de color plano sin degradado.
  Sincronizado en tiempo real con Supabase y previsualizador en vivo del catálogo.

---

### ✅ 2. Resuelto: Advertencia en Build por Asset `fondo.webp`
* **Ubicación:** `src/css/Hero.css` (línea 33)
* **Solución aplicada:** Se normalizó a `background-image: url("/fondo.webp");`. Compilación de Vite limpia en 4.6s sin advertencias de resolución.

---

### 🟡 3. Redundancia de Hook en Componente `Hero.jsx`
* **Ubicación:** `src/components/Hero.jsx` (línea 17)
* **Causa:** `Hero.jsx` invoca internamente `const { products = [], settings } = useCatalog();` a pesar de que el componente padre (`App.jsx`) ya invoca `useCatalog()` y pasa props a los hijos.
* **Impacto:** Provoca suscripciones duplicadas al catálogo y renders redundantes.
* **Solución requerida:** Pasar `products` como prop desde `App.jsx` directamente a `Hero.jsx`.

---

### 🟢 4. Metadatos SEO y OpenGraph Genéricos
* **Ubicación:** `index.html`
* **Causa:** El título es `Paves Medellin | Menú` y la meta descripción es un texto genérico de plantilla ("Las mejores comidas con sabor de hogar..."). Faltan etiquetas OpenGraph (`og:image`, `og:title`, `og:description`) para que cuando el enlace se comparta por WhatsApp o redes sociales, aparezca la tarjeta con la foto del producto y el logo del negocio.

---

### 🟢 5. Ausencia de Pruebas Automatizadas
* **Causa:** El repositorio no cuenta actualmente con un harness de testing (Vitest / Playwright).
* **Solución recomendada:** Agregar pruebas unitarias para los motores críticos de cálculo (`src/utils/price.js` y `src/utils/horario.js`), asegurando que cambios futuros en descuentos o domingos/festivos no alteren el cálculo monetario del checkout.

---

## 5. Matriz de Control: Hecho vs. Pendiente

| Módulo / Funcionalidad | Estado | Prioridad | Observaciones |
| :--- | :---: | :---: | :--- |
| **Catálogo Público** | | | |
| Visualización de productos y categorías | ✅ Hecho | Alta | Dinámico vía Supabase / fallback local |
| Personalización (Adiciones, Salsas, Notas) | ✅ Hecho | Alta | Modal completo y cálculo de precio |
| Carrito de compras y edición de ítems | ✅ Hecho | Alta | Agrupación por clave única de personalización |
| Modos de entrega (Domicilio / Recogida / Local)| ✅ Hecho | Alta | Configurable desde el panel |
| Despacho a WhatsApp formateado | ✅ Hecho | Alta | Mensaje estructurado con número de orden |
| Alerta fuera de horario / Pedido agendado | ✅ Hecho | Alta | Informa al cliente que el negocio está cerrado |
| Banner de promociones dinámico | ✅ Hecho | Media | Administrable desde el panel |
| Sección de combos & packs | ✅ Hecho | Media | Administrable desde el panel |
| Metadatos SEO & OpenGraph WhatsApp | 🟡 Pendiente | Media | Mejorar index.html para compartir enlace |
| **Panel de Administración** | | | |
| Autenticación con Supabase Auth | ✅ Hecho | Alta | Sesión segura con persistencia |
| Control de roles (Admin / Superadmin) | ✅ Hecho | Alta | Mediante tabla `user_roles` |
| Cambio de contraseña y recuperación | ✅ Hecho | Alta | Modal con reautenticación y correo |
| Dashboard con métricas de ventas | ✅ Hecho | Alta | Gráficas y cálculo en tiempo real |
| Alertas Realtime de nuevos pedidos | ✅ Hecho | Alta | Sonido / Toast visual en WebSocket |
| CRUD Productos + Imágenes Storage | ✅ Hecho | Alta | Compresión en navegador antes de subir |
| CRUD Categorías (orden y emojis) | ✅ Hecho | Alta | Orden drag/input numérico y visibilidad |
| CRUD Adiciones y Salsas | ✅ Hecho | Alta | Tabs independientes y disponibilidad |
| Control de Pedidos y estados | ✅ Hecho | Alta | Filtros por estado y mes |
| Configuración de Empresa y Horarios | ✅ Hecho | Alta | Selector 12h y datos de contacto |
| Ajustes operativos (Tarifas y Umbrales) | ✅ Hecho | Alta | Costos de envío y cierre de emergencia |
| Módulo de Personalización Visual (Diseño) | ✅ Hecho | Alta | Paletas, fuentes, columnas y preview |
| Interruptor de suspensión (Superadmin) | ✅ Hecho | Alta | Bloqueo por falta de pago |
| Exportación de reportes a Excel / PDF | ⏳ Pendiente | Baja | Deseable para contabilidad mensual |
| Impresión directa de comanda (Ticketera) | ⏳ Pendiente | Baja | Formato 58mm/80mm para cocina |
| **Código & Calidad** | | | |
| Build exitoso (`npm run build`) | ✅ Hecho | Alta | 100% libre de advertencias y errores (4.6s) |
| Corrección de variables no definidas | ✅ Resuelto | Inmediata | Constantes declaradas y exportadas en `menu.js` |
| Ajuste de ruta de fondo en CSS | ✅ Resuelto | Inmediata | Normalizado a `/fondo.webp` |
| Pruebas unitarias de utilidades | ⏳ Pendiente | Media | Configurar Vitest para precios y horarios |

---

## 6. Estructura del Proyecto y Archivos Clave

```
paves-medellin/
├── public/                       # Assets estáticos servidos directamente
│   ├── favicon.ico
│   └── fondo.webp                # Fondo texturizado artesanal
├── src/
│   ├── admin/                    # Panel administrativo (Lazy loaded)
│   │   ├── components/           # ColorPickerField, GradientPickerField
│   │   ├── pages/                # Dashboard, Productos, Categorías, Adiciones,
│   │   │                         # Pedidos, Empresa, Configuración, Diseño, Superadmin
│   │   ├── AdminLayout.jsx       # Sidebar y contenedor maestro
│   │   ├── AdminLogin.jsx        # Pantalla de inicio de sesión
│   │   ├── AppRoutes.jsx         # Enrutador privado del panel
│   │   ├── ProductFormModal.jsx  # Formulario avanzado de productos
│   │   ├── sessionStore.js       # Store de sesión con useSyncExternalStore
│   │   └── admin.css             # Tema oscuro profesional del panel
│   ├── assets/                   # Imágenes locales y logos empaquetados
│   ├── components/               # Componentes del catálogo público
│   │   ├── Hero.jsx              # Encabezado principal, carrusel y badge
│   │   ├── Promociones.jsx       # Banners de ofertas especiales
│   │   ├── Menu.jsx              # Grilla y categorías
│   │   ├── MenuCard.jsx          # Tarjeta individual interactiva
│   │   ├── Combos.jsx            # Packs y combos
│   │   ├── CustomizationModal.jsx# Adiciones y salsas
│   │   ├── CartModal.jsx         # Carrito flotante
│   │   ├── CheckoutModal.jsx     # Datos del cliente y entrega
│   │   └── Footer.jsx            # Pie de página y redes
│   ├── css/                      # Hojas de estilo Vanilla CSS por componente
│   ├── data/
│   │   ├── dataSource.js         # ADAPTADOR CENTRAL (Supabase ↔ Local)
│   │   └── menu.js               # Catálogo base y fuente de verdad local
│   ├── hooks/
│   │   ├── useCart.js            # Lógica y estado del carrito
│   │   └── useCatalog.js         # Hook de suscripción en tiempo real al catálogo
│   ├── services/
│   │   ├── storage.js            # Compresión de imágenes y Supabase Storage
│   │   └── supabaseClient.js     # Cliente singleton de Supabase
│   ├── utils/
│   │   ├── horario.js            # Motor de cálculo de horas y apertura
│   │   └── price.js              # Formateo COP y cálculo de totales
│   ├── App.jsx                   # Componente raíz y orquestador de WhatsApp
│   └── main.jsx                  # Entrada principal
├── supabase/                     # Scripts SQL de migraciones y esquema
│   ├── schema.sql                # Esquema base DDL
│   ├── seed.sql                  # Datos iniciales
│   ├── migration_catalog_design.sql
│   ├── migration_additions_sauces.sql
│   └── superadmin_setup.sql
├── BUFFY_RULES.md                # Reglas permanentes del agente
├── MANUAL_DE_USUARIO.md          # Manual para el cliente y administrador
└── DEV.md                        # Este documento (Control de desarrollo)
```

---

## 7. Guía Rápida para Desarrolladores

### Iniciar el entorno local:
```powershell
# Instalar dependencias
pnpm install  # o npm install

# Ejecutar servidor de desarrollo
pnpm dev -- --host
```

### Probar compilación para producción:
```powershell
pnpm run build
```

### Variables de Entorno Requeridas (`.env`):
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### Correos de cambio de estado
Los correos se envían desde la Edge Function `send-email` con Resend. Configura
la dirección remitente en un dominio verificado de Resend y guarda las variables
solo como secretos de Supabase (nunca con prefijo `VITE_`). En el Dashboard de
Supabase, agrega `RESEND_API_KEY` y `RESEND_FROM_EMAIL` en los secretos de Edge
Functions; luego despliega la función:

```powershell
supabase functions deploy send-email
```

La dirección de `RESEND_FROM_EMAIL` debe pertenecer al dominio verificado. El
checkout guarda el correo indicado por el cliente en su ficha; el panel informa
si el envío se completó o si Resend rechazó el correo. En Supabase, verifica
también que `plan_emails` esté habilitado para la tienda.

### Asignar un Superadministrador:
1. En Supabase Auth, registrar el usuario administrador.
2. Copiar su `User UID`.
3. En el SQL Editor de Supabase, ejecutar:
```sql
insert into public.user_roles (id, role)
values ('TU-USER-UUID', 'superadmin')
on conflict (id) do update set role = 'superadmin';
```

---

## 8. Roadmap Priorizado de Próximos Pasos

### Fase 1: Correcciones Inmediatas (P0 — Estabilidad y Cero Fallos)
1. **Definir y exportar las constantes por defecto:** Corregir `VALOR_DOMICILIO` y `MINIMO_ENVIO_GRATIS` para evitar cualquier `ReferenceError` cuando la base de datos entregue valores nulos o esté desconectada.
2. **Normalizar la ruta de `fondo.webp` en `src/css/Hero.css`:** Eliminar la advertencia de build usando `/fondo.webp`.
3. **Limpiar invocación duplicada de `useCatalog` en `Hero.jsx`:** Pasar los productos ya calculados desde `App.jsx`.

### Fase 2: Optimización para Despliegue (P1 — Presentación)
1. **Completar SEO & OpenGraph en `index.html`:** Configurar títulos, descripción apetitosa de postres y tarjeta para que al compartir por WhatsApp se vea la imagen de marca.
2. **Validación de Checkout en dispositivos móviles físicos:** Probar el redireccionamiento a la app nativa de WhatsApp en iOS (Safari) y Android (Chrome).

### Fase 3: Mejoras Futuras (P2 — Opcionales según necesidad del negocio)
1. **Módulo de Comandas / Impresión térmica:** Generación de ticket para impresoras POS Bluetooth o USB (58mm/80mm).
2. **Exportación de reportes de ventas:** Botón en el Dashboard para descargar pedidos en formato Excel/CSV por rango de fechas.
3. **Pasarela de pago en línea (opcional):** Botón Wompi o Mercado Pago para clientes que prefieran pagar en línea antes del despacho.


## Colaboradores (punto de venta) y mesas con QR

1. Ejecuta `supabase/migration_colaboradores_mesas.sql` en el SQL Editor de Supabase.
   - Endurece RLS: `user_roles` queda de solo lectura desde el cliente y las políticas `authenticated` excluyen a los colaboradores.
2. Despliega la función: `supabase functions deploy manage-collaborators --no-verify-jwt`.
3. En Superadmin activa **Colaboradores** y/o **Mesas con QR** para el negocio.
4. El admin crea colaboradores en `/admin/colaboradores` (entran por `/admin/login` con su usuario; el sistema los lleva a `/pos`) y mesas en `/admin/mesas` (QR a `/?mesa=N`).
5. Los pedidos quedan con `tipo_entrega = 'local'` y `origen` = `colaborador` o `mesa`. Los de mesa no se envían por WhatsApp: se despachan desde Pedidos.
6. Los colaboradores piden cambio de contraseña desde el login o el POS; el admin lo ve en Colaboradores y la cambia ahí.
