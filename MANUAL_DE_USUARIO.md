# 📖 Manual de Usuario y Guía Operativa
## Sistema de Menú Digital y Panel Administrativo — Pavés Medellín

---

## 📑 Tabla de Contenido
1. [Introducción y Objetivos](#1-introducción-y-objetivos)
2. [Ecosistema del Sistema](#2-ecosistema-del-sistema)
3. [Catálogo Público (Experiencia del Cliente)](#3-catálogo-público-experiencia-del-cliente)
   - 3.1 Navegación y Búsqueda
   - 3.2 Selección y Personalización de Productos
   - 3.3 Carrito y Checkout hacia WhatsApp
4. [Acceso al Panel Administrativo](#4-acceso-al-panel-administrativo)
   - 4.1 Inicio de Sesión y Seguridad
   - 4.2 Cierre de Sesión Automático y Manual
   - 4.3 Cambio de Contraseña
5. [Módulos del Panel Administrativo](#5-módulos-del-panel-administrativo)
   - 5.1 Dashboard (Métricas y Rendimiento)
   - 5.2 Gestión de Productos
   - 5.3 Gestión de Categorías
   - 5.4 Gestión de Adiciones y Salsas
   - 5.5 Gestión y Control de Pedidos
   - 5.6 Datos de la Empresa y Enlaces
   - 5.7 Configuración del Negocio
6. [Módulo Superadmin (Control Maestro)](#6-módulo-superadmin-control-maestro)
7. [Preguntas Frecuentes y Solución de Problemas](#7-preguntas-frecuentes-y-solución-de-problemas)
8. [Buenas Prácticas de Seguridad y Operación](#8-buenas-prácticas-de-seguridad-y-operación)

---

## 1. Introducción y Objetivos

Este manual tiene como objetivo documentar el funcionamiento completo de la plataforma **Pavés Medellín**, sirviendo como guía de referencia para el dueño del negocio, administradores y personal operativo.

La plataforma está diseñada para:
* Mostrar un catálogo digital visualmente atractivo, rápido y adaptado a dispositivos móviles.
* Permitir a los clientes armar y personalizar sus pedidos con cálculo automático de precios.
* Redirigir el pedido final directamente al WhatsApp del negocio con el desglose exacto.
* Proporcionar al administrador un panel integral para gestionar productos, pedidos en tiempo real, inventario de adiciones, datos del negocio y métricas de ventas.

---

## 2. Ecosistema del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENTE FINAL                         │
│   Catálogo Web ➔ Personalización ➔ Carrito ➔ WhatsApp      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Envío de Pedido / Supabase Realtime
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    PANEL ADMINISTRATIVO                     │
│  - Dashboard & Ventas        - Adiciones & Salsas           │
│  - Catálogo & Productos      - Control de Pedidos           │
│  - Categorías                - Configuración y Empresa      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Catálogo Público (Experiencia del Cliente)

El catálogo público es la cara visible para los clientes. No requiere registro ni contraseña por parte del usuario comprador.

### 3.1 Navegación y Búsqueda
* **Pestañas de Categorías:** Los clientes pueden desplazarse horizontalmente o hacer clic en cada categoría para filtrar al instante (*Pavés, Quesillos, Tortas, Bebidas*, etc.).
* **Buscador Dinámico:** Filtra en tiempo real por nombre del producto o ingredientes clave.
* **Destacados:** Los productos más vendidos o en promoción aparecen con etiquetas distintivas.

### 3.2 Selección y Personalización de Productos
1. El cliente hace clic en un producto para ver su detalle.
2. Si el producto es **Personalizable** (ej: Pavés con salsas o adiciones):
   - El sistema despliega un modal donde puede elegir la base, el tipo de salsa y las adiciones deseadas.
   - El precio total se actualiza en pantalla automáticamente a medida que selecciona o remueve opciones.
3. El cliente presiona **"Agregar al Carrito"**.

### 3.3 Carrito y Checkout hacia WhatsApp
1. Al hacer clic en el botón flotante del carrito, se abre el resumen de compra.
2. El cliente puede ajustar cantidades o eliminar productos.
3. Al presionar **"Finalizar Pedido"**, se solicita un formulario sencillo:
   - Nombre completo
   - Teléfono de contacto
   - Tipo de entrega (*Domicilio* o *Recoger en tienda*)
   - Dirección y Barrio (en caso de domicilio)
   - Método de pago preferido (*Transferencia Bancolombia, Nequi, Efectivo*, etc.)
   - Notas u observaciones especiales para la preparación
4. Al confirmar, el sistema:
   - Registra el pedido en la base de datos para el panel administrativo.
   - Abre la aplicación de **WhatsApp** con un mensaje preformateado y estructurado con todos los detalles para que el cliente solo deba presionar "Enviar".

---

## 4. Acceso al Panel Administrativo

### 4.1 Inicio de Sesión y Seguridad
* **Ruta de acceso:** `https://tudominio.com/admin/login` o `http://localhost:5173/admin/login`.
* **Credenciales:** Correo electrónico corporativo y contraseña autorizada.
* La autenticación está protegida con cifrado de tokens JWT mediante Supabase Auth.

### 4.2 Cierre de Sesión Automático y Manual
* **Cierre manual:** Desde el botón **"Cerrar sesión"** ubicado al final del menú lateral (sidebar).
* **Cierre automático por seguridad:** El sistema utiliza almacenamiento de sesión de pestaña (`sessionStorage`). Si el usuario **cierra la pestaña o el navegador**, la sesión expira inmediatamente. Para volver a ingresar, deberá escribir nuevamente sus credenciales.

### 4.3 Cambio de Contraseña
* En la esquina superior derecha del panel administrativo, haz clic sobre el badge con tu correo electrónico.
* Se abrirá el modal de cambio de contraseña donde deberás ingresar:
  1. Tu contraseña actual (por validación de seguridad).
  2. La nueva contraseña (mínimo 6 caracteres).
* Si olvidaste tu clave, el modal también dispone de la opción de **"Recuperar por correo electrónico"**.

---

## 5. Módulos del Panel Administrativo

### 5.1 Dashboard (Métricas y Rendimiento)
El centro de control presenta un resumen ejecutivo del estado del negocio:
* **Métricas clave:** Total de pedidos hoy, ingresos acumulados del día, ticket promedio y pedidos pendientes de atención.
* **Top Productos:** Lista visual de los postres y productos con mayor volumen de venta.
* **Distribución de Estados:** Gráfico interactivo que muestra los pedidos pendientes, en preparación y entregados.

### 5.2 Gestión de Productos (`/admin/productos`)
Permite administrar el menú de postres ofertados:
* **Crear Producto:** Botón *"Nuevo Producto"* para registrar nombre, descripción, precio, categoría, imagen y si permite adiciones.
* **Edición Rápida:** Cambiar precios, textos y categorías en cualquier momento.
* **Disponibilidad (Agotado / Disponible):** Interruptor rápido para ocultar temporalmente un producto cuando se acabe el inventario sin necesidad de borrarlo.
* **Destacado:** Permite marcar productos estrella para que aparezcan en los primeros lugares del menú.

### 5.3 Gestión de Categorías (`/admin/categorias`)
Organiza las secciones del menú:
* Crear, renombrar y ordenar categorías.
* Activar o desactivar categorías completas (por ejemplo: temporadas especiales como *Edición Navideña*).

### 5.4 Gestión de Adiciones y Salsas (`/admin/adiciones`)
Controla los ingredientes adicionales que los clientes pueden sumar a sus productos:
* **Tipos de adición:** Salsas, Toppings, Frutas, Galletas, Chocolates, etc.
* **Precio adicional:** Definir si tiene costo extra o si es de cortesía ($0).
* **Disponibilidad:** Marcar adiciones agotadas en tiempo real.

### 5.5 Gestión y Control de Pedidos (`/admin/pedidos`)
Módulo operativo para el personal de cocina y despachos:
* **Actualización en Tiempo Real:** Los nuevos pedidos aparecen al instante sin necesidad de recargar la página.
* **Detalle del Pedido:** Muestra productos exactos, adiciones seleccionadas por cada postre, dirección del cliente y total.
* **Flujo de Estados:**
  1. 🟡 **Pendiente:** Pedido recién recibido.
  2. 🔵 **En preparación:** El postre se está empacando o preparando.
  3. 🟣 **Enviado:** El domiciliario va en camino.
  4. 🟢 **Entregado:** Pedido finalizado con éxito.
  5. 🔴 **Cancelado:** Pedido anulado.

### 5.6 Datos de la Empresa y Enlaces (`/admin/empresa`)
Permite mantener actualizada la información pública:
* Nombre comercial y eslogan del negocio.
* Número de WhatsApp oficial donde se reciben los pedidos.
* Enlaces a redes sociales (Instagram, TikTok, Facebook).
* Dirección física del punto de venta o taller de repostería.

### 5.7 Configuración del Negocio (`/admin/configuracion`)
* Horarios de atención al público (días y rangos de horas).
* Costo estándar o base de domicilio.
* Valor de pedido mínimo para despachos.
* Mensaje personalizado para cuando el negocio esté cerrado temporalmente.

---

## 6. Módulo Superadmin (Control Maestro)

> ⚠️ **Exclusivo para el propietario de la plataforma / desarrollador principal.**

El sistema cuenta con un rol de **Superadmin único y protegido a nivel de base de datos**:
* **Negocio Activo (Control de Suspensión por Mensualidad):** Si el negocio entra en mora o mantenimiento, el Superadmin puede pausar el servicio con un solo clic. Esto bloquea el panel del cliente y muestra un aviso formal.
* **Control de Cambio de Contraseña:** Permite habilitar o deshabilitar que los administradores modifiquen sus claves.
* **Restricción de Seguridad:** La base de datos cuenta con una regla estricta que **impide la creación de más de un superadministrador**.

---

## 7. Preguntas Frecuentes y Solución de Problemas

### ¿Qué hago si un producto se acaba en el día?
Ve a **Productos**, busca el postre en la lista y apaga el interruptor de **"Disponible"**. El producto se mostrará inmediatamente con la etiqueta *Agotado* en el catálogo y los clientes no podrán agregarlo al carrito.

### ¿Por qué la sesión se cierra si cierro el navegador?
Por políticas de seguridad financiera y operativa del negocio, la sesión no se almacena de forma indefinida en la computadora para evitar que personas no autorizadas accedan al panel en equipos compartidos.

### ¿Qué pasa si el cliente no envía el WhatsApp después de llenar el formulario?
El pedido queda registrado en la base de datos en estado **Pendiente**. Si el cliente no escribe, el administrador puede ver el número de teléfono en el módulo de **Pedidos** y contactarlo proactivamente para confirmar la compra.

---

## 8. Buenas Prácticas de Seguridad y Operación

1. **Uso de contraseñas seguras:** Utiliza combinaciones de letras mayúsculas, minúsculas, números y signos.
2. **No compartir credenciales:** Cada administrador debe ingresar con su propia cuenta de acceso.
3. **Revisión de pedidos en tiempo real:** Mantén la pestaña de **Pedidos** abierta en el computador o tablet de la cocina para escuchar y visualizar los pedidos tan pronto ingresen.
4. **Respaldo:** Las imágenes y productos se encuentran respaldados en la nube mediante almacenamiento seguro en Supabase.

---

*Documento generado para Pavés Medellín. Versión 1.0 — 2026.*
