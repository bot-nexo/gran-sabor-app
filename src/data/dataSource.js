// ── Fuente de datos Demo SQLite ────────────────────────────────────────────
// Conectado directamente a los endpoints locales /api/... de SQLite.
// Compatible 100% con los componentes existentes del menú, carrito y panel admin.

import { calculateItemUnitPrice } from "../utils/price";
import {
  categories as localCategories,
  localImagesByNombre,
  localVideosByNombre,
  localTagsByNombre,
  info as localInfo,
  products as localProducts,
  MINIMO_ENVIO_GRATIS_DEFAULT,
  VALOR_DOMICILIO_DEFAULT,
} from "./menu";

// ── Cache en memoria + suscripción a cambios ─────────────────────────────────
const cache = { categories: null, products: null, settings: null, design: null, badges: null };
const listeners = new Set();
const orderListeners = new Set();

const notify = () => listeners.forEach((fn) => { try { fn(); } catch { /* noop */ } });
const notifyOrders = (event, order) => orderListeners.forEach((fn) => { try { fn(event, order); } catch { /* noop */ } });

/** Suscribe un callback a los cambios del catálogo. Devuelve unsubscribe. */
export const subscribeToCatalog = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Suscribe un callback a pedidos nuevos o actualizaciones. Devuelve unsubscribe. */
export function subscribeToOrders(fn) {
  orderListeners.add(fn);
  return () => orderListeners.delete(fn);
}

/** Indica que la app está en modo demo con backend activo */
export const isUsingSupabase = () => true;

// Placeholder SVG para productos sin foto
const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23241a15'/%3E%3Ctext x='50%25' y='50%25' font-size='120' text-anchor='middle' dominant-baseline='central'%3E%F0%9F%8D%A8%3C/text%3E%3C/svg%3E";

const resolveImage = (row) =>
  (row.imagen || row.imagen_url || "").trim() || localImagesByNombre[row.nombre] || PLACEHOLDER_IMG;

const resolveVideo = (row) =>
  (row.video || row.video_url || row.videoUrl || row.capa_video_url || "").trim() ||
  localVideosByNombre[row.nombre] ||
  "";

const resolveTags = (row) => {
  if (Array.isArray(row.tags) && row.tags.length > 0) return row.tags;
  if (typeof row.tags === "string" && row.tags.startsWith("[")) {
    try {
      const parsed = JSON.parse(row.tags);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  if (row.tags && typeof row.tags === "string") {
    const split = row.tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (split.length > 0) return split;
  }
  if (Array.isArray(row.etiquetas) && row.etiquetas.length > 0) return row.etiquetas;
  return localTagsByNombre[row.nombre] || [];
};

// ── Normalizadores ────────────────────────────────────────────────────────────
const normalizeCategory = (row) => ({
  id: row.nombre || String(row.id),
  nombre: row.nombre,
  emoji: row.emoji || "",
  label: row.label || `${row.emoji || ""} ${row.nombre}`.trim(),
  orden: row.orden ?? 0,
  visible: row.visible !== false && row.visible !== 0,
});

const normalizeProduct = (row) => ({
  ...row,
  category: row.category || "",
  imagen: resolveImage(row),
  video: resolveVideo(row),
  tags: resolveTags(row),
  destacado: Boolean(row.destacado),
  disponible: row.disponible !== false && row.disponible !== 0,
  adiciones: Array.isArray(row.adiciones) ? row.adiciones : [],
  salsas: Array.isArray(row.salsas) ? row.salsas : [],
});

const normalizeSettings = (row) => {
  return {
    name: row.razon_social || "Gran Sabor Bistro & Café",
    razonSocial: row.razon_social || "Gran Sabor Bistro & Café",
    slogan: row.slogan || "Experiencia gastronómica artesanal, repostería y café de especialidad",
    phone: row.phone || "3001234567",
    address: row.address || "Av. Principal # 45 - 80, Zona Gourmet",
    mapsGoogle: row.maps_url || "https://maps.google.com",
    instagram: row.instagram || "@gransabor_demo",
    facebook: row.facebook || "@gransabor_demo",
    tiktok: row.tiktok || "@gransabor_demo",
    closed: "",
    day1: (() => { try { return typeof row.day1 === 'string' ? JSON.parse(row.day1) : (row.day1 || ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"]); } catch { return ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"]; } })(),
    hours1: row.hours1 || "12:00 PM - 10:00 PM",
    logo_url: row.logo_url || "",
    deliveryFee: row.delivery_fee ?? 4000,
    freeDeliveryThreshold: row.free_delivery_threshold ?? 45000,
    offersDelivery: row.offers_delivery !== false && row.offers_delivery !== 0,
    offersPickup: row.offers_pickup !== false && row.offers_pickup !== 0,
    offersLocal: row.offers_local !== false && row.offers_local !== 0,
    forceClosed: Boolean(row.force_closed),
    bankAccounts: [],
    isActive: true,
    canChangePassword: true,
    plan_adiciones: true,
    plan_promociones: true,
    plan_reportes: true,
    plan_diseno: true,
    plan_fidelizacion: true,
    plan_configuracion: true,
    plan_domicilio_dinamico: true,
    plan_emails: false,
    plan_colaboradores: true,
    plan_mesas: true,
    storeLat: row.store_lat ?? null,
    storeLng: row.store_lng ?? null,
    baseDeliveryFee: row.base_delivery_fee ?? 3000,
    pricePerKm: row.price_per_km ?? 1500,
    maxDeliveryRadiusKm: row.max_delivery_radius_km ?? 15,
    dynamicDeliveryEnabled: Boolean(row.dynamic_delivery_enabled),
    useCustomerBadges: true,
  };
};

export const DEFAULT_PROMOTIONS_ITEMS = [
  {
    id: "promo-1",
    titulo: "2x1 en Postre Seleccionados",
    tag: "Viernes & Sábados",
    descripcion: "Lleva dos deliciosos Postre de 8oz al precio de uno en sabores tradicionales.",
    descuento: "2x1",
    imagen: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "promo-2",
    titulo: "Envío Gratis en Compras > $45.000",
    tag: "Toda la semana",
    descripcion: "Disfruta de tus postres favoritos en casa sin costo adicional de domicilio.",
    descuento: "ENVÍO GRATIS",
    imagen: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500&auto=format&fit=crop&q=80",
  },
];

export const DEFAULT_COMBOS_ITEMS = [
  {
    id: "combo-1",
    nombre: "Combo Dúo Postre + Torta",
    precio: 32000,
    precioOriginal: 38000,
    badge: "Ahorra $6.000",
    descripcion: "1 Postre 8oz tradicional de Leche Klim + 1 Porción de Torta húmeda de chocolate con toppings.",
    incluye: ["1x Postre 8oz (Leche Klim)", "1x Torta húmeda de chocolate"],
    imagen: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "combo-2",
    nombre: "Pack Familiar 4 Postre",
    precio: 62000,
    precioOriginal: 72000,
    badge: "Más Popular 🔥",
    descripcion: "4 Postre de 8oz a elección, perfecto para compartir en familia o con amigos.",
    incluye: ["4x Postre 8oz a elección", "Cucharas y servilletas"],
    imagen: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&auto=format&fit=crop&q=80",
  },
];

export const DEFAULT_CATALOG_DESIGN = {
  appBg: "#0d0805",
  fontFamily: "Montserrat",
  heroBg: "linear-gradient(180deg, #0d0805 0%, #140c08 100%)",
  heroHeaderBg: "rgba(13, 8, 5, 0.85)",
  heroCtaBg: "#ffcc00",
  heroCtaText: "#120a06",
  heroBadgeBg: "rgba(255, 204, 0, 0.15)",
  heroBadgeText: "#ffcc00",
  heroFloatCartBg: "#ffcc00",
  heroFloatCartText: "#120a06",
  showPromotions: true,
  promotionsTitle: "Promociones & Especiales",
  promotionsSubtitle: "Aprovecha nuestras ofertas por tiempo limitado en tus postres favoritos",
  promotionsBg: "#120a06",
  promotionsCardBg: "#180e09",
  promotionsAccent: "#ffcc00",
  promotionsItems: DEFAULT_PROMOTIONS_ITEMS,
  showCombos: true,
  combosTitle: "Combos & Packs para Compartir",
  combosSubtitle: "Las combinaciones perfectas al mejor precio para tus momentos dulces",
  combosBg: "#0f0906",
  combosCardBg: "#180e09",
  combosAccent: "#d92b38",
  combosItems: DEFAULT_COMBOS_ITEMS,
  bgColor: "#0d0805",
  cardBg: "#160e0a",
  headerBadgeBg: "rgba(255, 204, 0, 0.12)",
  headerBadgeText: "#ffcc00",
  textPrimary: "#fdfbf7",
  textMuted: "#bda899",
  borderColor: "rgba(255, 255, 255, 0.08)",
  cardRadius: "22px",
  cardShadow: "md",
  btnPrimaryBg: "#ffcc00",
  btnPrimaryText: "#120a06",
  btnDetailsBg: "rgba(255, 255, 255, 0.05)",
  btnDetailsText: "#e2d5cc",
  btnDetailsBorder: "rgba(255, 255, 255, 0.12)",
  priceTagBg: "#ffcc00",
  priceTagText: "#120a06",
  priceTagRadius: "12px",
  badgeNuevoBg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  badgeNuevoText: "#ffffff",
  badgeDestacadoBg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  badgeDestacadoText: "#ffffff",
  badge2x1Bg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  badge2x1Text: "#ffffff",
  badgePopularBg: "#ffcc00",
  badgePopularText: "#120a06",
  categoryBarBg: "#120a06",
  categoryActiveBg: "#ffcc00",
  categoryActiveText: "#120a06",
  categoryInactiveBg: "#1a100a",
  categoryInactiveText: "#bda899",
  columnsDesktop: 3,
  columnsMobile: 1,
  cardLayout: "grid",
  imageAspectRatio: "square",
  footerBg: "#080402",
  footerText: "#bda899",
  footerAccent: "#ffcc00",
};

/** Invalida cache y notifica a los suscriptores */
export const invalidateCatalog = () => {
  cache.categories = null;
  cache.products = null;
  cache.settings = null;
  cache.design = null;
  cache.badges = null;
  notify();
};

// ── GETTERS DE CATÁLOGO ───────────────────────────────────────────────────────

export async function getCategories() {
  if (cache.categories) return cache.categories;
  try {
    const res = await fetch("/api/categories");
    if (!res.ok) throw new Error("Error fetching categories");
    const data = await res.json();
    cache.categories = data.filter(c => c.visible !== 0 && c.visible !== false).map(normalizeCategory);
  } catch (e) {
    console.warn("[dataSource] Usando fallback local para categorías:", e.message);
    cache.categories = localCategories.map(c => ({ id: c.id, nombre: c.id, emoji: "", label: c.label, orden: 0, visible: true }));
  }
  return cache.categories;
}

export async function getCategoriesRaw() {
  try {
    const res = await fetch("/api/categories");
    return await res.json();
  } catch {
    return [];
  }
}

export async function getProducts() {
  if (cache.products) return cache.products;
  try {
    const res = await fetch("/api/products");
    if (!res.ok) throw new Error("Error fetching products");
    const data = await res.json();
    cache.products = data.map(normalizeProduct);
  } catch (e) {
    console.warn("[dataSource] Usando fallback local para productos:", e.message);
    cache.products = localProducts.map(p => ({ ...p, adiciones: [], salsas: [] }));
  }
  return cache.products;
}

export async function getSettings() {
  if (cache.settings) return cache.settings;
  try {
    const res = await fetch("/api/settings");
    if (!res.ok) throw new Error("Error fetching settings");
    const data = await res.json();
    cache.settings = normalizeSettings(data || {});
  } catch (e) {
    cache.settings = normalizeSettings({});
  }
  return cache.settings;
}

export async function getCatalogDesign() {
  if (cache.design) return cache.design;
  try {
    const res = await fetch("/api/design");
    if (res.ok) {
      const data = await res.json();
      if (data && Object.keys(data).length > 0) {
        cache.design = { ...DEFAULT_CATALOG_DESIGN, ...data };
        return cache.design;
      }
    }
  } catch {}
  cache.design = { ...DEFAULT_CATALOG_DESIGN };
  return cache.design;
}

export async function getBadges() {
  try {
    const res = await fetch("/api/badges");
    if (!res.ok) throw new Error("Error fetching badges");
    return await res.json();
  } catch {
    return [];
  }
}

export async function getPaymentMethods() {
  try {
    const res = await fetch("/api/payment-methods");
    if (!res.ok) throw new Error("Error fetching payment methods");
    return await res.json();
  } catch {
    return [
      { codigo: "efectivo", nombre: "Efectivo", descripcion: "Pago contra entrega", activo: 1 },
      { codigo: "nequi", nombre: "Nequi", descripcion: "Transferencia directa", activo: 1 }
    ];
  }
}

export async function getUserRole() {
  return "admin";
}

// ── CRUD PRODUCTOS ─────────────────────────────────────────────────────────────

export async function createProduct(prod) {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prod)
  });
  const data = await res.json();
  invalidateCatalog();
  return data;
}

export async function updateProduct(id, cambios) {
  const res = await fetch(`/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cambios)
  });
  const data = await res.json();
  invalidateCatalog();
  return data;
}

export async function deleteProduct(id) {
  await fetch(`/api/products/${id}`, { method: "DELETE" });
  invalidateCatalog();
}

// ── CRUD CATEGORÍAS ───────────────────────────────────────────────────────────

export async function createCategory(cat) {
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cat)
  });
  const data = await res.json();
  invalidateCatalog();
  return data;
}

export async function updateCategory(id, cambios) {
  const res = await fetch(`/api/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cambios)
  });
  const data = await res.json();
  invalidateCatalog();
  return data;
}

export async function deleteCategory(id) {
  await fetch(`/api/categories/${id}`, { method: "DELETE" });
  invalidateCatalog();
}

// ── ADICIONES Y SALSAS ─────────────────────────────────────────────────────────

export async function getAdditions() {
  try {
    const res = await fetch("/api/additions");
    if (!res.ok) throw new Error("Error fetching additions");
    return await res.json();
  } catch {
    return [];
  }
}

export async function createAddition(add) {
  const res = await fetch("/api/additions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(add)
  });
  const data = await res.json();
  invalidateCatalog();
  return data;
}

export async function updateAddition(id, cambios) {
  const res = await fetch(`/api/additions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cambios)
  });
  const data = await res.json();
  invalidateCatalog();
  return data;
}

export async function deleteAddition(id) {
  await fetch(`/api/additions/${id}`, { method: "DELETE" });
  invalidateCatalog();
}

export async function getSauces() {
  try {
    const res = await fetch("/api/sauces");
    if (!res.ok) throw new Error("Error fetching sauces");
    return await res.json();
  } catch {
    return [];
  }
}

export async function createSauce(sauce) {
  const res = await fetch("/api/sauces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sauce)
  });
  const data = await res.json();
  invalidateCatalog();
  return data;
}

export async function updateSauce(id, cambios) {
  const res = await fetch(`/api/sauces/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cambios)
  });
  const data = await res.json();
  invalidateCatalog();
  return data;
}

export async function deleteSauce(id) {
  await fetch(`/api/sauces/${id}`, { method: "DELETE" });
  invalidateCatalog();
}

export async function getBases() { return []; }
export async function createBase(base) { return base; }
export async function updateBase(id, cambios) {}
export async function deleteBase(id) {}

export async function getSizes() { return []; }
export async function createSize(size) { return size; }
export async function updateSize(id, cambios) {}
export async function deleteSize(id) {}

export async function upsertBadge(badge) {
  const res = await fetch("/api/badges", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(badge)
  });
  invalidateCatalog();
  return await res.json();
}

export async function deleteBadge(id) {}

export async function getProductAdditions() { return []; }
export async function setProductAdditions() { invalidateCatalog(); }
export async function getProductSauces() { return []; }
export async function setProductSauces() { invalidateCatalog(); }

// ── PEDIDOS (ORDERS) ──────────────────────────────────────────────────────────

export const buildOrderItems = (cart) =>
  cart.map((item) => ({
    id: item.id,
    nombre: item.nombre,
    cantidad: item.quantity,
    precio: calculateItemUnitPrice(item),
    precio_unitario: calculateItemUnitPrice(item),
    subtotal: calculateItemUnitPrice(item) * item.quantity,
    observaciones: item.customizations?.observaciones || "",
    adiciones: Object.values(item.customizations?.adiciones || {}).map((a) => a.nombre || ""),
    salsas: Object.values(item.customizations?.salsas || {}).map((s) => s.nombre || ""),
  }));

export async function createOrder(deliveryData, cart, totals) {
  const items = buildOrderItems(cart);
  const payload = {
    nombre: deliveryData.nombre,
    telefono: deliveryData.telefono,
    direccion: deliveryData.direccion || "",
    unidad: deliveryData.unidad || "",
    apto: deliveryData.apto || "",
    observaciones: deliveryData.observaciones || "",
    pago: deliveryData.pago || "Efectivo",
    tipo_entrega: deliveryData.tipoEntrega || "delivery",
    subtotal: totals.subtotal,
    delivery_fee: totals.deliveryFee || 0,
    descuento: totals.descuento || 0,
    total: totals.total,
    items,
  };

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    notifyOrders("insert", { ...payload, id: data.id, numero: data.numero });
    return { ok: true, persisted: true, numero: data.numero };
  } catch (err) {
    console.error("[dataSource] Error al crear pedido en SQLite:", err);
    return { ok: true, persisted: false, numero: Math.floor(100 + Math.random() * 900) };
  }
}

export async function createLocalOrder({ origen, mesa = null, nombre = "", pago = "", observaciones = "" }, cart) {
  const items = buildOrderItems(cart);
  const total = cart.reduce((t, i) => t + calculateItemUnitPrice(i) * i.quantity, 0);

  const payload = {
    nombre: nombre || (mesa ? `Mesa ${mesa}` : "Cliente Local"),
    telefono: "",
    direccion: mesa ? `Mesa ${mesa}` : "Barra",
    observaciones,
    pago: pago || "Efectivo",
    tipo_entrega: "local",
    mesa,
    subtotal: total,
    delivery_fee: 0,
    total,
    items,
  };

  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  notifyOrders("insert", { ...payload, id: data.id, numero: data.numero });
  return data.numero;
}

export async function getOrders(limite = 200) {
  try {
    const res = await fetch("/api/orders");
    if (!res.ok) throw new Error("Error fetching orders");
    const data = await res.json();
    return data.slice(0, limite);
  } catch {
    return [];
  }
}

export async function getOrdersByRange(desde, hasta) {
  return await getOrders();
}

export async function updateOrderStatus(id, estado) {
  await fetch(`/api/orders/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado })
  });
  notifyOrders("update", { id, estado });
}

export async function updatePaymentStatus(id, estado_pago) {
  await fetch(`/api/orders/${id}/payment`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado_pago })
  });
  notifyOrders("update", { id, estado_pago });
}

// ── CONFIGURACIÓN Y NEGOCIO ────────────────────────────────────────────────────

export async function updateSettings(cambios) {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cambios)
  });
  const data = await res.json();
  invalidateCatalog();
  return data;
}

export async function updateCatalogDesign(cambios) {
  try {
    await fetch("/api/design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios)
    });
  } catch (e) {
    console.error("Error saving design:", e);
  }
  invalidateCatalog();
}

// ── CALIFICACIONES Y CLIENTES ──────────────────────────────────────────────────

export async function saveRating(telefono, rating, comment) {
  await fetch("/api/ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telefono, rating, comment })
  });
}

export async function submitStoreRating(telefono, rating, comment = "") {
  return await saveRating(telefono, rating, comment);
}

export async function getStoreRatingStats() {
  return { average: 4.9, total: 18 };
}

export async function getOrCreateCustomer(nombre, telefono) {
  if (!telefono) return { nombre: nombre || "Cliente", telefono: "", pedidos_count: 0 };
  try {
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono })
    });
    return await res.json();
  } catch {
    return { nombre: nombre || "Cliente", telefono, pedidos_count: 1 };
  }
}

export async function findCustomerByPhone(telefono) {
  if (!telefono) return null;
  try {
    const res = await fetch(`/api/customers/${telefono}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function incrementCustomerOrderCount(telefono, nombre = "") {
  return 1;
}

// ── MESAS Y COLABORADORES ──────────────────────────────────────────────────────

export async function getMesas() {
  try {
    const res = await fetch("/api/mesas");
    if (!res.ok) throw new Error("Error fetching mesas");
    return await res.json();
  } catch {
    return [];
  }
}

export async function getMesaActiva(numero) {
  const mesas = await getMesas();
  const found = mesas.find((m) => Number(m.numero) === Number(numero));
  return found || { numero, activa: true };
}

export async function createMesas(numeros) {
  if (Array.isArray(numeros)) {
    for (const num of numeros) {
      await fetch("/api/mesas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero: num })
      });
    }
  }
}

export async function updateMesa(id, cambios) {
  await fetch(`/api/mesas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cambios)
  });
}

export async function deleteMesa(id) {
  await fetch(`/api/mesas/${id}`, { method: "DELETE" });
}

export async function getColaboradores() {
  try {
    const res = await fetch("/api/colaboradores");
    if (!res.ok) throw new Error("Error fetching colaboradores");
    return await res.json();
  } catch {
    return [];
  }
}

export async function getMyColaborador() {
  return null;
}

export async function manageCollaborator(action, payload) {
  if (action === "create") {
    const res = await fetch("/api/colaboradores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: payload.nombre,
        email: payload.usuario || payload.email,
        password: payload.password,
        rol: payload.rol || "colaborador"
      })
    });
    return await res.json();
  }
  if (action === "update") {
    const res = await fetch(`/api/colaboradores/${payload.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  }
  if (action === "set_password") {
    const res = await fetch(`/api/colaboradores/${payload.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: payload.password })
    });
    return await res.json();
  }
  if (action === "delete") {
    await fetch(`/api/colaboradores/${payload.id}`, { method: "DELETE" });
    return { success: true };
  }
  return {};
}

export async function solicitarCambioPassword() { return true; }
export const loginEmailFromIdentifier = (v) => v;

// ── REINICIO DE DATOS DEMO ─────────────────────────────────────────────────────

export async function resetDemoData() {
  const res = await fetch("/api/reset-demo", { method: "POST" });
  const data = await res.json();
  invalidateCatalog();
  return data;
}
