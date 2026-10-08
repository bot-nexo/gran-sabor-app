// ── Estado de sesión del admin (Modo Demo con SQLite) ─────────────────────────
// En modo Demo, la sesión de administrador está siempre activa y lista por defecto.

const DEMO_USER = {
  id: "demo-admin-id",
  email: "admin@demo.com",
  user_metadata: { name: "Administrador Demo" },
};

let session = { user: DEMO_USER };
let role = "admin";
let ready = true;
const listeners = new Set();

let snapshot = { session, role, ready };

const emit = () => {
  const next = { session, role, ready };
  if (next.session === snapshot.session && next.role === snapshot.role && next.ready === snapshot.ready) return;
  snapshot = next;
  listeners.forEach((fn) => fn());
};

export const setAdminSession = async (newSession) => {
  session = newSession || { user: DEMO_USER };
  role = session ? "admin" : null;
  ready = true;
  emit();
};

/** Suscripción para useSyncExternalStore. */
export const subscribeSession = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Estado actual: { session, role, ready } */
export const getSessionState = () => snapshot;

/** Inicia la escucha de sesión (Modo Demo: listo de inmediato). */
export async function initSessionListener() {
  await setAdminSession({ user: DEMO_USER });
}

/** Cierra sesión o reinicia a sesión demo. */
export async function logoutAdmin() {
  await setAdminSession(null);
}

