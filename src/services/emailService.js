// ── Servicio de Notificación por Correo (EmailJS) ───────────────────────────
// Permite enviar confirmaciones de compra directamente al correo del cliente
// usando el servicio gratuito de EmailJS sin necesidad de dominio propio.

import { formatCOP } from "../utils/price";

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "";
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "";

export const isEmailConfigured = Boolean(
  EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY
);

/**
 * Envía el comprobante/confirmación de pedido al correo del cliente.
 * 
 * @param {Object} params
 * @param {Object} params.orderData - Datos del pedido (nombre, email, telefono, direccion, tipoEntrega, observaciones)
 * @param {Array} params.cart - Lista de items en el carrito
 * @param {Object} params.summary - Totales del pedido (subtotal, deliveryFee, totalNeto)
 * @param {Object} params.savedOrder - Pedido guardado (id, numero)
 * @param {Object} params.settings - Configuración del negocio (razonSocial, telefonoWhatsapp)
 */
export async function sendOrderConfirmationEmail({
  orderData,
  cart = [],
  summary = {},
  savedOrder = {},
  settings = {},
}) {
  const toEmail = orderData?.email?.trim();

  // Si no hay correo o no está configurado EmailJS, salimos limpiamente
  if (!toEmail) {
    return { success: false, reason: "no_email" };
  }

  if (!isEmailConfigured) {
    console.info(
      "[emailService] EmailJS aún no está configurado en las variables de entorno (.env). El correo no fue enviado."
    );
    return { success: false, reason: "not_configured" };
  }

  try {
    // Construir resumen legible de los productos
    const productosTexto = cart
      .map((item) => {
        const cant = item.quantity || item.cantidad || 1;
        const nombre = item.name || item.nombre || "Producto";
        const precio = formatCOP((item.price || item.precio || 0) * cant);
        const detalle = item.observaciones ? ` (${item.observaciones})` : "";
        return `• ${cant}x ${nombre}${detalle} - ${precio}`;
      })
      .join("\n");

    const htmlBody = `
      <div style="background:#f4f1ec;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d8;">
          <div style="background:#1a1410;padding:18px 24px;text-align:center;">
            <span style="color:#f5efe6;font-size:18px;font-weight:700;">${settings.razonSocial || "Nexo Menú"}</span>
          </div>
          <div style="height:4px;background:#ffcc00;"></div>
          <div style="padding:28px 28px 8px;color:#2b2622;">
            <h2 style="margin:0 0 16px;font-size:21px;color:#1a1410;">¡Hemos recibido tu pedido! 🎉</h2>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hola <strong>${orderData.nombre || "Cliente"}</strong>,</p>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Tu orden ha sido registrada exitosamente y en breve iniciaremos su preparación.</p>
          </div>
          <div style="margin:8px 28px 24px;padding:14px 16px;background:#faf7f2;border:1px solid #eee6da;border-radius:10px;font-size:14px;color:#4a433c;">
            <table role="presentation" width="100%" style="border-collapse:collapse;">
              <tr><td><strong>Pedido:</strong></td><td align="right">#${savedOrder.numero || savedOrder.id || "N/A"}</td></tr>
              <tr><td><strong>Entrega:</strong></td><td align="right">${orderData.tipoEntrega === "recogida" ? "Recoger en tienda" : orderData.tipoEntrega === "local" ? "Comer en local" : "Domicilio"}</td></tr>
              <tr><td><strong>Total:</strong></td><td align="right"><strong>${formatCOP(summary.totalNeto || summary.total || 0)}</strong></td></tr>
            </table>
          </div>
          <div style="padding:16px 24px;border-top:1px solid #eee6da;text-align:center;font-size:12px;color:#8a8178;">
            ${settings.telefonoWhatsapp ? `WhatsApp de contacto: ${settings.telefonoWhatsapp}` : ""}
          </div>
        </div>
      </div>
    `;

    const templateParams = {
      to_email: toEmail,
      to_name: orderData.nombre || "Cliente",
      cliente_nombre: orderData.nombre || "Cliente",
      cliente_telefono: orderData.telefono || "N/A",
      cliente_correo: toEmail,
      pedido_id: savedOrder.numero ? `PED-${savedOrder.numero}` : savedOrder.id || "N/A",
      fecha_pedido: new Date().toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }),
      tipo_entrega: orderData.tipoEntrega === "recogida" ? "Recoger en tienda" : orderData.tipoEntrega === "local" ? "Comer en local" : "Domicilio",
      direccion_entrega: orderData.direccion ? `${orderData.direccion}${orderData.apto ? `, ${orderData.apto}` : ""}` : "Entrega en tienda",
      observaciones: orderData.observaciones || "Ninguna",
      subtotal: formatCOP(summary.subtotal || 0),
      costo_envio: summary.deliveryFee > 0 ? formatCOP(summary.deliveryFee) : "Gratis",
      total: formatCOP(summary.totalNeto || summary.total || 0),
      resumen_productos: productosTexto,
      nombre_negocio: settings.razonSocial || "Nexo Menú",
      whatsapp_negocio: settings.telefonoWhatsapp || "",
      html_content: htmlBody,
      message: htmlBody,
    };

    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: templateParams,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.warn("[emailService] Error al enviar email via EmailJS:", res.status, errorText);
      return { success: false, error: errorText };
    }

    console.log("[emailService] Correo de confirmación enviado exitosamente a:", toEmail);
    return { success: true };
  } catch (err) {
    console.error("[emailService] Error de red enviando email:", err);
    return { success: false, error: err.message };
  }
}
