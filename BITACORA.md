# 📋 Bitácora y Registro de Actividades - Menú Digital Demo SQLite

Este documento mantiene el registro cronológico de cambios, decisiones técnicas, tareas completadas y pendientes para garantizar la continuidad y control del proyecto.

---

## 🎯 Objetivo del Proyecto
Convertir la aplicación en un **Demo 100% Funcional y Autónomo** para clientes potenciales:
- **Base de Datos Local**: SQLite (`demo.db`) para productos, categorías, pedidos y configuraciones.
- **Sin Autenticación Bloqueante**: Acceso inmediato a roles de Administrador y Cliente.
- **Navegación Dual**: Switch rápido entre vista Tienda (Cliente) y Panel de Control (Admin).
- **Flujo Completo de Pedidos**: Creación de pedidos desde el catálogo y recepción/gestión en tiempo real en el panel administrativo.
- **Botón de Reinicio Rápido**: Capacidad de restaurar los datos de prueba a su estado original con un solo clic.

---

## 📌 Estado de Tareas

| ID | Tarea | Estado | Responsable |
|---|---|---|---|
| **T01** | Creación de Bitácora de seguimiento | ✅ Completado | Antigravity |
| **T02** | Instalación de dependencias (`express`, `cors`, `better-sqlite3`, `vite 6`, `node:sqlite`) | ✅ Completado | Antigravity |
| **T03** | Servidor Express + SQLite (`server.js`) con esquema y datos semilla (Seed) | ✅ Completado | Antigravity |
| **T04** | Configuración de Proxy en Vite (`vite.config.js`) y script `start-demo.js` | ✅ Completado | Antigravity |
| **T05** | Adaptación de la capa de datos (`src/data/dataSource.js`) hacia SQLite REST API | ✅ Completado | Antigravity |
| **T06** | Sesión Admin automática sin autenticación bloqueante en `sessionStore.js` | ✅ Completado | Antigravity |
| **T07** | Creación del componente `DemoToolbar` para alternar Cliente ↔ Admin y Reset Demo | ✅ Completado | Antigravity |
| **T08** | Pruebas end-to-end de flujo de catálogo, pedidos y persistencia en SQLite | ✅ Completado | Antigravity |

---

## 📝 Historial de Cambios

### [Fecha: 2026-10-08]
- **Fase de Transformación a Demo Autónoma con SQLite 100% Completada**:
  - Se implementó `server.js` con base de datos local SQLite (`demo.db`), tablas relacionales (`products`, `categories`, `orders`, `settings`, `payment_methods`, `additions`, `sauces`, `clientes`, `store_ratings`) y datos de prueba precargados.
  - Se configuró el proxy en `vite.config.js` (`/api` -> `http://localhost:3001`).
  - Se adaptó [dataSource.js](file:///c:/JDV/01_Development/FullStack/DEMOS-NEXO/demo-menu/gran-sabor-app/src/data/dataSource.js) para comunicarse de manera transparente y reactiva con la API SQLite local.
  - Se eliminó el bloqueo de login y se activó la sesión de administrador de demostración por defecto en [sessionStore.js](file:///c:/JDV/01_Development/FullStack/DEMOS-NEXO/demo-menu/gran-sabor-app/src/admin/sessionStore.js) y [AppRoutes.jsx](file:///c:/JDV/01_Development/FullStack/DEMOS-NEXO/demo-menu/gran-sabor-app/src/admin/AppRoutes.jsx).
  - Se diseñó e integró la barra flotante [DemoToolbar.jsx](file:///c:/JDV/01_Development/FullStack/DEMOS-NEXO/demo-menu/gran-sabor-app/src/components/DemoToolbar.jsx) para alternar entre la vista de **Cliente** (`/`), **Admin** (`/admin`) y botón de **Restaurar Demo** con un solo clic.
  - Se creó el script de arranque dual nativo [start-demo.js](file:///c:/JDV/01_Development/FullStack/DEMOS-NEXO/demo-menu/gran-sabor-app/start-demo.js) ejecutable con `npm run dev` o `pnpm run dev`.

- **Cambio de Identidad a Negocio Ficticio General ("Gran Sabor Bistro & Café")**:
  - Se desvinculó la identidad de Pavés Medellín reemplazándola por una marca gastronómica general de demostración: **Gran Sabor Bistro & Café**.
  - Se crearon productos apetitosos con fotografía gastronómica HD (Cheesecakes, Croissants franceses, Torta triple chocolate, Cappuccinos, Frappés, Sandwiches gourmet, Bowls de açaí, Tortas Red Velvet).
  - Se actualizaron las categorías (`Repostería & Postres`, `Café & Especialidades`, `Brunch & Salados`, `Bebidas Frías & Frappés`, `Tortas de Celebración`).
  - Se actualizaron `index.html`, `menu.js`, `Hero.jsx`, `Footer.jsx`, `CartModal.jsx`, `AdminLayout.jsx` y la base de datos `demo.db`.

- **Corrección de Congelamiento / Bucle Infinito al Guardar Datos**:
  - Se detectó y corrigió una recursión infinita en [useCatalog.js](file:///c:/JDV/01_Development/FullStack/DEMOS-NEXO/demo-menu/gran-sabor-app/src/hooks/useCatalog.js) donde el suscriptor de catálogo llamaba a `invalidateCatalog()` dentro de su propio listener de eventos, lo cual saturaba el hilo principal de JavaScript al 100% de CPU.
  - Se implementaron los endpoints `/api/design` en [server.js](file:///c:/JDV/01_Development/FullStack/DEMOS-NEXO/demo-menu/gran-sabor-app/server.js) para guardar personalizaciones de diseño y combos en SQLite de forma asíncrona e instantánea.
