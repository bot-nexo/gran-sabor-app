import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Debe coincidir con COLAB_EMAIL_DOMAIN de src/data/dataSource.js
const EMAIL_DOMAIN = "colaboradores.paves.app";
const USUARIO_RE = /^[a-z0-9._-]{3,30}$/;
const MIN_PASSWORD = 8;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. Solo administradores con sesión válida (un colaborador no puede gestionar colaboradores)
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "No autorizado" }, 401);

    const { data: rol } = await admin
      .from("user_roles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();
    const role = rol?.role || "admin";
    if (!["admin", "superadmin"].includes(role)) return json({ error: "Sin permisos" }, 403);

    // 2. Respetar el interruptor de superadmin
    const { data: settings, error: settingsError } = await admin
      .from("settings")
      .select("plan_colaboradores")
      .eq("id", 1)
      .maybeSingle();
    if (settingsError) return json({ error: `No se pudo leer la configuración: ${settingsError.message}` }, 500);
    if (settings?.plan_colaboradores !== true) {
      return json({ error: "El módulo de colaboradores no está habilitado" }, 403);
    }

    const body = await req.json();
    const action = String(body?.action || "");
    const id = String(body?.id || "");
    if (action !== "create" && !UUID_RE.test(id)) return json({ error: "Colaborador inválido" }, 400);

    // Solo se opera sobre usuarios que realmente son colaboradores
    const assertColaborador = async () => {
      const { data } = await admin.from("colaboradores").select("id").eq("id", id).maybeSingle();
      return Boolean(data);
    };

    if (action === "create") {
      const nombre = String(body.nombre || "").trim().slice(0, 80);
      const usuario = String(body.usuario || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!nombre) return json({ error: "El nombre es obligatorio" }, 400);
      if (!USUARIO_RE.test(usuario)) {
        return json({ error: "Usuario inválido: usa 3 a 30 letras minúsculas, números, punto, guion o guion bajo" }, 400);
      }
      if (password.length < MIN_PASSWORD) {
        return json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` }, 400);
      }

      const { data: existe } = await admin
        .from("colaboradores")
        .select("id")
        .ilike("usuario", usuario)
        .maybeSingle();
      if (existe) return json({ error: "Ya existe un colaborador con ese usuario" }, 409);

      const email = `${usuario}@${EMAIL_DOMAIN}`;
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre },
      });
      if (createError || !created?.user) {
        return json({ error: createError?.message || "No se pudo crear el usuario" }, 400);
      }

      const newId = created.user.id;
      const { error: roleError } = await admin
        .from("user_roles")
        .insert({ id: newId, email, role: "colaborador" });
      const { error: colabError } = roleError
        ? { error: roleError }
        : await admin.from("colaboradores").insert({ id: newId, nombre, usuario });
      if (roleError || colabError) {
        await admin.auth.admin.deleteUser(newId); // rollback: cascade limpia las filas
        return json({ error: (roleError || colabError)!.message }, 500);
      }
      return json({ ok: true, id: newId });
    }

    if (!(await assertColaborador())) return json({ error: "Colaborador no encontrado" }, 404);

    if (action === "update") {
      const cambios: Record<string, unknown> = {};
      if (typeof body.nombre === "string") {
        const nombre = body.nombre.trim().slice(0, 80);
        if (!nombre) return json({ error: "El nombre es obligatorio" }, 400);
        cambios.nombre = nombre;
      }
      if (typeof body.activo === "boolean") cambios.activo = body.activo;
      if (!Object.keys(cambios).length) return json({ error: "Nada que actualizar" }, 400);

      if ("activo" in cambios) {
        // Bloquea (o desbloquea) el inicio de sesión y la renovación del token
        const { error } = await admin.auth.admin.updateUserById(id, {
          ban_duration: cambios.activo ? "none" : "876000h",
        });
        if (error) return json({ error: error.message }, 400);
      }
      const { error } = await admin.from("colaboradores").update(cambios).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "set_password") {
      const password = String(body.password || "");
      if (password.length < MIN_PASSWORD) {
        return json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` }, 400);
      }
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) return json({ error: error.message }, 400);
      await admin.from("colaboradores").update({ solicitud_password_at: null }).eq("id", id);
      return json({ ok: true });
    }

    if (action === "delete") {
      const { error } = await admin.auth.admin.deleteUser(id); // cascade: user_roles y colaboradores
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Acción no soportada" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error inesperado" }, 500);
  }
});
