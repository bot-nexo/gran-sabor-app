// ── usePushNotifications Hook ───────────────────────────────────────────────
// Registra el Service Worker, pide permiso al usuario y guarda la suscripción
// en Supabase para que el backend pueda enviar notificaciones push.

import { useEffect, useRef } from "react";
import { supabase } from "../services/supabaseClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/** Convierte la clave VAPID (Base64 URL) al formato que espera el navegador */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Hook que activa las Web Push Notifications en la tienda.
 * - Al cargar: registra el SW y pide permiso (sin teléfono).
 * - Cuando el cliente se identifica: actualiza el registro con su teléfono.
 * @param {string|null} telefono - Teléfono del cliente.
 */
export function usePushNotifications(telefono = null) {
  const endpointRef = useRef(null); // Guarda el endpoint de la suscripción activa

  // ── PASO 1: Registrar SW y suscribir (una sola vez, sin teléfono) ─────────
  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const registerAndSubscribe = async () => {
      try {
        console.log("[PushNotif] Registrando Service Worker...");
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("[PushNotif] SW registrado:", registration.scope);

        const permission = await Notification.requestPermission();
        console.log("[PushNotif] Permiso:", permission);
        if (permission !== "granted") return;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        const subJson = subscription.toJSON();
        endpointRef.current = subJson.endpoint;
        console.log("[PushNotif] Suscripción activa:", subJson.endpoint);

        // Guardar sin teléfono por ahora (se actualizará cuando el cliente se identifique)
        await supabase.from("push_subscriptions").upsert(
          { endpoint: subJson.endpoint, p256dh: subJson.keys.p256dh, auth: subJson.keys.auth, telefono: null },
          { onConflict: "endpoint" }
        );
      } catch (err) {
        console.warn("[PushNotif] Error al suscribir:", err.message);
      }
    };

    registerAndSubscribe();
  }, []); // Solo una vez al montar

  // ── PASO 2: Cuando el cliente se identifica, asociar su teléfono ──────────
  useEffect(() => {
    if (!telefono || !endpointRef.current) return;

    const cleanPhone = String(telefono).replace(/\D/g, "");
    console.log("[PushNotif] Asociando teléfono a suscripción:", cleanPhone);

    supabase
      .from("push_subscriptions")
      .update({ telefono: cleanPhone })
      .eq("endpoint", endpointRef.current)
      .then(({ error }) => {
        if (error) console.warn("[PushNotif] No se pudo asociar teléfono:", error.message);
        else console.log("[PushNotif] ✅ Teléfono asociado:", cleanPhone);
      });
  }, [telefono]); // Se re-ejecuta cuando el teléfono cambia de null a un valor
}
