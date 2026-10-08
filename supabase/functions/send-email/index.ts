import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

Deno.serve(async (req) => {
  // Manejo de la petición preflight (CORS) que hace el navegador
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. Solo usuarios del panel con sesión válida y rol registrado
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "No autorizado" }, 401);

    const { data: rol } = await admin
      .from("user_roles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!rol || !["admin", "superadmin"].includes(rol.role)) {
      return json({ error: "Sin permisos" }, 403);
    }

    // 2. Respetar el interruptor de superadmin
    const { data: settings } = await admin
      .from("settings")
      .select("plan_emails")
      .eq("id", 1)
      .maybeSingle();
    if (settings?.plan_emails === false) {
      return json({ skipped: true, reason: "emails-desactivados" }, 200);
    }

    const { to, subject, html, fromName } = await req.json();

    // 3. Un único destinatario y que sea un cliente registrado (evita usarla como relay de spam)
    const destinatario = String(Array.isArray(to) ? to[0] : to || "").trim();
    if (!EMAIL_RE.test(destinatario) || (Array.isArray(to) && to.length > 1)) {
      return json({ error: "Destinatario inválido" }, 400);
    }
    const { data: cliente } = await admin
      .from("clientes")
      .select("id")
      .ilike("email", destinatario.replace(/[\\%_]/g, "\\$&"))
      .limit(1)
      .maybeSingle();
    if (!cliente) return json({ error: "El destinatario no es un cliente registrado" }, 403);

    // Solo texto simple: evita inyectar cabeceras o direcciones en el campo "from"
    const remitente = String(fromName || "Pedidos").replace(/[<>"\r\n]/g, "").trim().slice(0, 60) || "Pedidos";
    const asunto = String(subject || "").replace(/[\r\n]/g, " ").slice(0, 200);

    // La llave secreta se leerá desde las variables de entorno de Supabase
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is missing");
    }

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL")?.trim();
    if (!fromEmail || !EMAIL_RE.test(fromEmail)) {
      throw new Error("RESEND_FROM_EMAIL must be a valid address from your verified domain");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${remitente} <${fromEmail}>`,
        to: [destinatario],
        subject: asunto,
        html: String(html || ""),
      }),
    });

    const responseBody = await res.text();
    let data: unknown;
    try {
      data = responseBody ? JSON.parse(responseBody) : {};
    } catch {
      data = { message: responseBody || "Resend returned an empty response" };
    }

    if (!res.ok) return json({ error: data }, 502);
    return json(data, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado enviando el correo";
    return json({ error: message }, 500);
  }
});
