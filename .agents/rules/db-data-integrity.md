# Regla de Integridad de Datos en Base de Datos Real (Supabase)

1. **Uso Obligatorio de Data Real de BD**:
   - Todo componente o módulo nuevo que se implemente en el proyecto Pavés Medellín DEBE estar conectado e interactuar con la base de datos real en Supabase (`productos`, `categorias`, `promociones`, `clientes`, `orders`).
   - Se prohíbe terminantemente el uso de datos ficticios o mock data para nuevas funcionalidades o actualizaciones.

2. **Estructura y Gestión de Clientes (`clientes`)**:
   - El número de WhatsApp (`telefono`) es el identificador único de cada cliente.
   - La tabla `clientes` almacena y mantiene actualizados los campos:
     - `nombre` (Texto)
     - `telefono` (Texto, clave única)
     - `pedidos_count` / `cant_pedidos_concretados` (Entero: cantidad total de pedidos realizados por el cliente, incrementándose automáticamente con cada pedido)
     - `fecha_cumple` (Texto / Fecha: opcional)
     - `created_at` / `updated_at` (Timestamps)
