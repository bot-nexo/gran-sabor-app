// ── Cliente Supabase (singleton) ───────────────────────────────────────────
// Lee las credenciales de las variables de entorno VITE_*. Si no están
// configuradas, la app sigue funcionando con la fuente de datos local.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Limpiar sesiones previas que hayan quedado en localStorage
if (typeof window !== "undefined" && window.localStorage) {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Ignorar si el almacenamiento local está restringido
  }
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no configuradas — " +
      "la app usará la fuente de datos local.",
  );
}
