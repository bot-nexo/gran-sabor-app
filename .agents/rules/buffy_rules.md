# 📋 Reglas del Proyecto (Catálogo Pavés Medellín) — LEER SIEMPRE

> **Archivo de reglas permanentes.** Este archivo centraliza las directrices del proyecto y la comunicación. El agente Antigravity lo lee automáticamente.

---

## 1. Idioma de comunicación

- **SIEMPRE responder en español**, sin importar el idioma del mensaje del usuario.
- Código, nombres de variables y commits: en inglés (estándar de la industria).
- Comentarios de código y textos de UI (botones, labels, mensajes): **en español**.

## 2. Formato de preguntas

- **TODA pregunta al usuario debe tener selector de respuestas** (opciones múltiples / de selección única). Nunca hacer preguntas abiertas que esperen texto libre.
- Cada opción debe incluir una breve descripción de sus implicaciones para que el usuario decida con información.
- Máximo 4 preguntas por bloque para no saturar.

## 3. Reglas del proyecto y Base de Datos (Supabase)

- **LA BASE DE DATOS ES LA ÚNICA FUENTE DE LA VERDAD.** Está ESTRICTAMENTE PROHIBIDO dejar datos quemados, hardcodeados, o hacer fallbacks a variables locales si la tabla existe en BD. Todo lo que sea local debe omitirse o borrarse; nunca permitir que la app lea info local como si fuera verdadera si debe venir de Supabase.
- Todo desarrollo nuevo o actualización DEBE funcionar en tiempo real con Supabase (`productos`, `categorias`, `promociones`, `clientes`, `orders`, `payment_methods`, etc). Cero uso de datos ficticios o mocks.
- **NO romper la funcionalidad existente** del catálogo público (carrito, WhatsApp, personalizaciones, checkout). Toda prueba de regresión es obligatoria al terminar.
- Usar el stack existente: React 18 + Vite, sin agregar dependencias pesadas sin justificarlas primero con el usuario.
- **Sincronización de clientes y compras:** La tabla `clientes` debe mantener sincronizado el número de WhatsApp (único), `nombre`, `pedidos_count` (incrementado automáticamente con cada pedido concretado) y `fecha_cumple` (opcional).
- Estilo visual del panel admin: profesional y limpio, pero coherente con la identidad del catálogo (tonos café/crema, `#3D2314` como color primario).
- Commits y mensajes en español, descriptivos.

## 4. Flujo de trabajo

- **Definir antes de programar:** para módulos nuevos, primero acordar el alcance y la arquitectura con el usuario (con opciones a elegir), y recién entonces codificar.
- Verificar con `npm run build` / typecheck antes de dar un cambio por terminado, preguntándome si lo ejecuto o no.
- Debes validar que lo que se hizo funciona y no rompe nada más antes de darlo por terminado. 
- Con esas preguntas de confirmación, debes ser muy crítico, y validar si el cambio es tan crítico que puede dañar la app me preguntas, de lo contrario puedes ejecutar lo que necesites sin estar preguntando.
