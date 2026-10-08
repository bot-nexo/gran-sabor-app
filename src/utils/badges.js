import imgNuevo from "../assets/images/insig/InsNuevo.png";
import imgBronce from "../assets/images/insig/InsBronce.jpeg";
import imgOro from "../assets/images/insig/InsOro.jpeg";
import imgPlata from "../assets/images/insig/InsPlata.jpeg";
import imgPlatino from "../assets/images/insig/InsPlatino.jpeg";
import { getBadges as getBadgesFromDB } from "../data/dataSource";

// Diccionario opcional de imágenes locales por si la BD no trae una URL en el campo 'image'
const LOCAL_IMAGES = {
  bronce: imgBronce,
  plata: imgPlata,
  oro: imgOro,
  platino: imgPlatino,
  nuevo: imgNuevo
};

const resolveImage = (name, dbImage) => {
  if (dbImage) return dbImage;
  const n = (name || "").toLowerCase();
  for (const key in LOCAL_IMAGES) {
    if (n.includes(key)) return LOCAL_IMAGES[key];
  }
  return null;
};

/**
 * Consulta la base de datos Supabase para obtener las insignias reales activas.
 */
export const fetchBadgesFromDB = async () => {
  try {
    const dbBadges = await getBadgesFromDB();
    return dbBadges || [];
  } catch (err) {
    console.warn("[badges] Error obteniendo insignias de la BD:", err);
    return [];
  }
};

/**
 * Retorna la insignia actual y la información de la siguiente insignia basándose en los pedidos reales y la BD.
 * Solo usa datos dinámicos, eliminando las insignias estáticas por defecto.
 */
export const getCustomerBadge = (pedidosCount, dynamicBadges = []) => {
  const count = Number(pedidosCount) || 0;

  // Procesamos exclusivamente las insignias que vienen de la BD
  const activeBadges = (dynamicBadges || [])
    .map(dbItem => ({
      ...dbItem,
      name: dbItem.name || "Insignia",
      required_orders: Number(dbItem.required_orders) || 0,
      discount_percentage: Number(dbItem.discount_percentage) || 0,
      free_delivery: Boolean(dbItem.free_delivery),
      description: dbItem.description || dbItem.beneficio || "",
      beneficio: dbItem.beneficio || "",
      color: dbItem.color || "#cccccc",
      glow: dbItem.glow || "rgba(200, 200, 200, 0.4)",
      icon: dbItem.icon || "Award",
      image: resolveImage(dbItem.name, dbItem.image),
      is_active: dbItem.is_active !== false
    }))
    .filter(b => b.is_active)
    .sort((a, b) => a.required_orders - b.required_orders);

  // LOGICA PARA CLIENTE NUEVO (0 pedidos o no alcanza el nivel mínimo)
  // Siempre inyectamos el nivel "Nuevo" si no ha alcanzado la primera insignia
  const firstBadge = activeBadges.length > 0 ? activeBadges[0] : null;

  if (count === 0 || (firstBadge && count < firstBadge.required_orders)) {
    return {
      name: "Nuevo",
      color: "#8a9ba8",
      icon: "Star",
      image: imgNuevo,
      gradient: "linear-gradient(135deg, #aebbc5, #8a9ba8)",
      glow: "rgba(138, 155, 168, 0.4)",
      description: "Cliente Nuevo - ¡Sigue comprando!",
      beneficio: "Realiza pedidos para alcanzar el primer nivel y ganar beneficios.",
      required_orders: 0,
      discount_percentage: 0,
      free_delivery: false,
      nextBadge: firstBadge ? {
        name: firstBadge.name,
        required_orders: firstBadge.required_orders,
        beneficio: firstBadge.beneficio || firstBadge.description,
        discount_percentage: firstBadge.discount_percentage,
        free_delivery: firstBadge.free_delivery
      } : null,
      ordersForNext: firstBadge ? firstBadge.required_orders - count : 0,
      progressPercentage: firstBadge && firstBadge.required_orders > 0
        ? Math.min(100, Math.max(0, Math.round((count / firstBadge.required_orders) * 100)))
        : 0
    };
  }

  // Si no hay insignias en la BD y tiene pedidos, estado base
  if (activeBadges.length === 0) {
    return {
      name: "Sin nivel",
      color: "#cccccc",
      description: "No hay niveles configurados en la BD.",
      required_orders: 0,
      discount_percentage: 0,
      free_delivery: false,
      nextBadge: null,
      ordersForNext: 0,
      progressPercentage: 100
    };
  }

  // Buscar cuál es la insignia actual y la siguiente según sus pedidos
  let currentBadge = activeBadges[0];
  let nextBadge = null;

  for (let i = 0; i < activeBadges.length; i++) {
    if (count >= activeBadges[i].required_orders) {
      currentBadge = activeBadges[i];
      nextBadge = activeBadges[i + 1] || null;
    }
  }

  // Calcular progreso al siguiente nivel
  const ordersForNext = nextBadge ? Math.max(0, nextBadge.required_orders - count) : 0;

  let progressPercentage = 100;
  if (nextBadge) {
    const range = nextBadge.required_orders - currentBadge.required_orders;
    if (range > 0) {
      const currentProgress = count - currentBadge.required_orders;
      progressPercentage = Math.min(100, Math.max(0, Math.round((currentProgress / range) * 100)));
    }
  }

  return {
    ...currentBadge,
    gradient: `linear-gradient(135deg, ${currentBadge.color || '#d97746'}, #000000)`,
    nextBadge: nextBadge ? {
      name: nextBadge.name,
      required_orders: nextBadge.required_orders,
      beneficio: nextBadge.beneficio || nextBadge.description,
      discount_percentage: nextBadge.discount_percentage,
      free_delivery: nextBadge.free_delivery
    } : null,
    ordersForNext,
    progressPercentage
  };
};

/** Fidelización activa: permiso del superadmin (plan_fidelizacion) y interruptor del admin (useCustomerBadges). */
export const isLoyaltyEnabled = (settings) =>
  settings?.plan_fidelizacion !== false && settings?.useCustomerBadges !== false;

/** Insignia vigente del cliente para aplicar beneficios, o null si el módulo está desactivado. */
export const resolveCustomerBadge = (settings, customer, badges) =>
  isLoyaltyEnabled(settings) && customer
    ? getCustomerBadge(customer.pedidos_count || 0, badges)
    : null;

export const getCustomerBadgeFromDB = async (pedidosCount) => {
  const dbBadges = await fetchBadgesFromDB();
  return getCustomerBadge(pedidosCount, dbBadges);
};
