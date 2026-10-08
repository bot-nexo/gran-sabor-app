import { getSettings, findCustomerByPhone } from "../data/dataSource";
import { supabase } from "../services/supabaseClient";
import { formatCOP } from "./price";

const NOMBRE_POR_DEFECTO = "nuestra tienda";

// getSettings() mantiene este valor actualizado cada vez que se lee o edita la configuración
const nombreNegocioSync = () => localStorage.getItem("store_razon_social") || NOMBRE_POR_DEFECTO;

const obtenerNegocio = async () => {
  try {
    const s = await getSettings();
    return {
      nombre: s?.razonSocial || s?.name || nombreNegocioSync(),
      slogan: s?.slogan || "",
      telefono: s?.phone || "",
      direccion: s?.address || "",
    };
  } catch {
    return { nombre: nombreNegocioSync(), slogan: "", telefono: "", direccion: "" };
  }
};

const escapeHtml = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const esRecogida = (pedido) => pedido.tipo_entrega === "recogida" || pedido.tipo_entrega === "local";

const primerNombre = (pedido) => (pedido.nombre || "").trim().split(/\s+/)[0] || "";

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "";
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "";

export const sendEmailResend = async (to, subject, html, fromName) => {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: { to, subject, html, fromName },
  });

  if (error) {
    let detail = "";
    if (error.context instanceof Response) {
      try {
        const responseData = await error.context.clone().json();
        const responseError = responseData?.error;
        detail = typeof responseError === "string" ? responseError : responseError?.message || "";
      } catch {
        detail = "";
      }
    }
    throw new Error(detail || `No se pudo enviar el correo: ${error.message}`);
  }
  if (data?.error) {
    const detail = typeof data.error === "string" ? data.error : data.error.message;
    throw new Error(detail || "Resend rechazó el envío del correo");
  }
  if (data?.skipped) {
    return { sent: false, reason: data.reason || "envio-omitido" };
  }

  return { sent: true };
};

export const sendEmail = async (to, subject, html, fromName) => {
  // 1. Si EmailJS está configurado (método gratuito sin dominio), enviar via EmailJS
  if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
    try {
      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            to_email: to,
            to_name: to,
            subject: subject,
            html_content: html,
            message: html,
            from_name: fromName,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.warn("[EmailJS] Error:", res.status, err);
        throw new Error(`EmailJS error: ${err}`);
      }
      return { sent: true };
    } catch (err) {
      console.error("[EmailJS] Falló envío:", err);
      // Fallback a Supabase/Resend si está disponible
      return sendEmailResend(to, subject, html, fromName).catch(() => ({ sent: false, reason: "emailjs-fallo" }));
    }
  }

  // 2. Fallback a Resend via Supabase Edge Function
  return sendEmailResend(to, subject, html, fromName).catch(() => ({ sent: false, reason: "sin-servicio-email" }));
};

export const notificarCambioEstado = async (pedido, nuevoEstado) => {
  console.log("🔍 Intentando notificar cambio de estado para pedido:", pedido.numero, "a estado:", nuevoEstado);

  const settings = await getSettings().catch(() => null);
  if (settings?.plan_emails === false) {
    return { sent: false, reason: "emails-desactivados" };
  }

  let emailParaEnviar = pedido.email;

  // Si el pedido no trae el email, lo buscamos en la tabla clientes de SQLite usando el teléfono
  if (!emailParaEnviar && pedido.telefono) {
    const cleanPhone = String(pedido.telefono).replace(/\D/g, "");
    try {
      const clienteData = await findCustomerByPhone(cleanPhone).catch(() => null);
      if (clienteData && clienteData.email) {
        emailParaEnviar = clienteData.email;
      }
    } catch (err) {
      console.warn("No se pudo consultar el correo del cliente desde SQLite:", err.message);
    }
  }

  if (!emailParaEnviar) {
    return { sent: false, reason: "cliente-sin-email" };
  }

  const negocio = await obtenerNegocio();
  const plantilla = PLANTILLAS_EMAIL[nuevoEstado];
  if (!plantilla) return { sent: false, reason: "estado-sin-plantilla" };

  const contenido = plantilla(pedido, negocio);
  const html = construirEmail({ ...contenido, pedido, negocio });
  const subject = `${contenido.asunto} · ${negocio.nombre}`;

  return sendEmail(emailParaEnviar, subject, html, negocio.nombre);
};

// ── Plantillas de email por estado ────────────────────────────────────────────────────────

const PLANTILLAS_EMAIL = {
  nuevo: (p) => ({
    asunto: `🎉 Pedido #${p.numero} recibido con éxito`,
    color: "#ffcc00",
    titulo: "¡Hemos recibido tu pedido!",
    parrafos: [
      `Confirmamos que recibimos tu pedido <strong>#${p.numero}</strong> correctamente.`,
      "En breve iniciaremos su preparación. Te mantendremos informado sobre el estado de tu orden.",
    ],
  }),
  preparacion: (p) => ({
    asunto: `👨‍🍳 Estamos preparando tu pedido #${p.numero}`,
    color: "#d69e4a",
    titulo: "¡Tu pedido está en preparación!",
    parrafos: [
      `Confirmamos tu pedido <strong>#${p.numero}</strong> y ya estamos preparándolo con todo el cuidado que merece.`,
      esRecogida(p)
        ? "Te avisaremos en cuanto esté listo para que pases a recogerlo."
        : "Te avisaremos en cuanto salga hacia tu dirección.",
    ],
  }),
  camino: (p) =>
    esRecogida(p)
      ? {
          asunto: `🛍️ Tu pedido #${p.numero} está listo para recoger`,
          color: "#3b82f6",
          titulo: "¡Tu pedido está listo!",
          parrafos: [
            `Tu pedido <strong>#${p.numero}</strong> ya está listo y te espera en nuestro punto de venta.`,
            "Al llegar, menciona tu número de pedido para entregarlo más rápido.",
          ],
        }
      : {
          asunto: `🛵 Tu pedido #${p.numero} va en camino`,
          color: "#3b82f6",
          titulo: "¡Tu pedido va en camino!",
          parrafos: [
            `Tu pedido <strong>#${p.numero}</strong> ya salió y va rumbo a tu dirección.`,
            "Por favor mantente atento al teléfono para recibirlo sin contratiempos.",
          ],
        },
  entregado: (p) => ({
    asunto: `✅ Pedido #${p.numero} entregado`,
    color: "#16a34a",
    titulo: "¡Pedido entregado!",
    parrafos: [
      `Tu pedido <strong>#${p.numero}</strong> fue entregado con éxito.`,
      "Esperamos que lo disfrutes muchísimo. Gracias por elegirnos; si te gustó, ¡nos encantaría que nos recomendaras!",
    ],
  }),
  cancelado: (p) => ({
    asunto: `Tu pedido #${p.numero} fue cancelado`,
    color: "#dc2626",
    titulo: "Pedido cancelado",
    parrafos: [
      `Te informamos que tu pedido <strong>#${p.numero}</strong> fue cancelado.`,
      "Si tienes alguna duda o crees que se trata de un error, contáctanos y con gusto te ayudamos.",
    ],
  }),
};

const construirEmail = ({ color, titulo, parrafos, pedido, negocio }) => {
  const nombreCliente = escapeHtml(primerNombre(pedido));
  const nombreNegocio = escapeHtml(negocio.nombre);
  const contacto = [negocio.telefono && `📞 ${escapeHtml(negocio.telefono)}`, negocio.direccion && `📍 ${escapeHtml(negocio.direccion)}`]
    .filter(Boolean)
    .join(" &nbsp;·&nbsp; ");

  return `
  <div style="background:#f4f1ec;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d8;">
      <div style="background:#1a1410;padding:18px 24px;text-align:center;">
        <span style="color:#f5efe6;font-size:18px;font-weight:700;letter-spacing:.3px;">${nombreNegocio}</span>
      </div>
      <div style="height:4px;background:${color};"></div>
      <div style="padding:28px 28px 8px;color:#2b2622;">
        <h2 style="margin:0 0 16px;font-size:21px;color:#1a1410;">${titulo}</h2>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hola${nombreCliente ? ` <strong>${nombreCliente}</strong>` : ""},</p>
        ${parrafos.map((t) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${t}</p>`).join("")}
      </div>
      <div style="margin:8px 28px 24px;padding:14px 16px;background:#faf7f2;border:1px solid #eee6da;border-radius:10px;font-size:14px;color:#4a433c;">
        <table role="presentation" width="100%" style="border-collapse:collapse;">
          <tr><td>Pedido</td><td align="right"><strong>#${escapeHtml(pedido.numero)}</strong></td></tr>
          <tr><td>Entrega</td><td align="right">${esRecogida(pedido) ? "Recoger en tienda" : "Domicilio"}</td></tr>
          ${pedido.total ? `<tr><td>Total</td><td align="right"><strong>${formatCOP(pedido.total)}</strong></td></tr>` : ""}
        </table>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #eee6da;text-align:center;font-size:12px;color:#8a8178;line-height:1.6;">
        <strong style="color:#4a433c;">${nombreNegocio}</strong>${negocio.slogan ? ` — ${escapeHtml(negocio.slogan)}` : ""}<br/>
        ${contacto}
      </div>
    </div>
  </div>`;
};

// ── WhatsApp ───────────────────────────────────────────────────────────────────────────

export const generarMensajeWhatsApp = (pedido, estado) => {
  const nombre = primerNombre(pedido);
  const saludo = nombre ? `Hola ${nombre}` : "Hola";
  const negocio = nombreNegocioSync();
  const num = `#${pedido.numero}`;
  const total = pedido.total ? `\nTotal: *${formatCOP(pedido.total)}*` : "";
  let texto = "";

  if (estado === "nuevo") {
    texto = `${saludo} 👋, te saludamos de *${negocio}*.\n\nRecibimos tu pedido *${num}* y en breve lo confirmamos.${total}\n\n¡Gracias por tu compra!`;
  } else if (estado === "preparacion") {
    texto = `${saludo} 👨‍🍳, te saludamos de *${negocio}*.\n\nTu pedido *${num}* ya está en preparación. ${esRecogida(pedido) ? "Te avisaremos cuando esté listo para recoger." : "Te avisaremos cuando salga hacia tu dirección."}${total}`;
  } else if (estado === "camino") {
    texto = esRecogida(pedido)
      ? `${saludo} 🛍️, te saludamos de *${negocio}*.\n\nTu pedido *${num}* ya está listo para recoger. Al llegar, menciona tu número de pedido.${total}`
      : `${saludo} 🛵, te saludamos de *${negocio}*.\n\nTu pedido *${num}* ya va en camino. Por favor mantente atento al teléfono para recibirlo.${total}`;
  } else if (estado === "entregado") {
    texto = `${saludo} ✅, te saludamos de *${negocio}*.\n\nTu pedido *${num}* fue entregado. ¡Esperamos que lo disfrutes!\n\nGracias por elegirnos 💛`;
  } else if (estado === "cancelado") {
    texto = `${saludo}, te saludamos de *${negocio}*.\n\nTe informamos que tu pedido *${num}* fue cancelado. Si tienes alguna duda, responde este mensaje y con gusto te ayudamos.`;
  } else {
    texto = `${saludo}, te saludamos de *${negocio}* respecto a tu pedido *${num}*.`;
  }

  let phone = pedido.telefono || "";
  phone = phone.replace(/\D/g, "");
  if (phone && phone.length === 10 && phone.startsWith("3")) {
    phone = "57" + phone;
  }

  return {
    url: `https://wa.me/${phone}?text=${encodeURIComponent(texto)}`,
    hasPhone: phone.length >= 10
  };
};
