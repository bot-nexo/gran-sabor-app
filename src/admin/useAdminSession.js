import { useSyncExternalStore } from "react";
import { subscribeSession, getSessionState } from "./sessionStore";

/**
 * Hook de sesión del admin. Fuente única de verdad compartida con el guard.
 * getSnapshot devuelve un objeto nuevo solo cuando cambia la sesión/ready
 * (el store emite únicamente en transiciones reales).
 */
export const useAdminSession = () =>
  useSyncExternalStore(subscribeSession, getSessionState, getSessionState);
