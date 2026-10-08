// ── Edge Function: send-push ────────────────────────────────────────────────
// Recibe el teléfono del cliente y el mensaje, busca sus suscripciones push
// en la BD y les envía la notificación usando el protocolo Web Push (VAPID).

import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { telefono, title, body, url } = await req.json();

    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY"); // Anon key siempre disponible

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("Faltan las llaves VAPID en los secrets.");
    }

    webpush.setVapidDetails(
      "mailto:admin@pavesmedellin.com",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    // Conectar a Supabase con anon key (tiene permiso de lectura en push_subscriptions)
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Obtener todas las suscripciones del cliente por teléfono
    const cleanPhone = String(telefono).replace(/\D/g, "");
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("telefono", cleanPhone);

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No hay suscripciones para este cliente." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({ title, body, url: url || "/" });

    // Enviar la notificación a todas las suscripciones del cliente
    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
