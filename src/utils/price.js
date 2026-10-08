// ── Currency formatter (COP) ──────────────────────────────────────────────
export const formatCOP = (val) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val);

// ── Price parser – handles number, "$15.000", "15000", "$19 K", etc. ──────
export const parsePrice = (priceVal) => {
  if (!priceVal) return 0;
  if (typeof priceVal === "number") return priceVal;

  const cleanNumber = priceVal.toString().replace(/[^\d.]/g, "");
  const number = parseFloat(cleanNumber);
  return isNaN(number) ? 0 : number;
};

// ── Unit price of a single cart item (base + options + toppings + adiciones + salsas) ──
export const calculateItemUnitPrice = (item) => {
  let basePrice = parsePrice(item.precio || item.price);

  if (item.customizations) {
    // Radio options (e.g. size, cheese type)
    Object.values(item.customizations.options || {}).forEach((opt) => {
      if (opt) basePrice += parsePrice(opt.precio || opt.price);
    });

    // Toppings legacy
    (item.customizations.toppings || []).forEach((top) => {
      if (typeof top === "object") {
        basePrice += parsePrice(top.precio || top.price);
      }
    });

    // Adiciones (object map: { [id]: { nombre, precio, ... } })
    Object.values(item.customizations.adiciones || {}).forEach((a) => {
      basePrice += parsePrice(a.precio);
    });

    // Salsas (object map: { [id]: { nombre, precio, ... } })
    Object.values(item.customizations.salsas || {}).forEach((s) => {
      basePrice += parsePrice(s.precio);
    });
  }

  return basePrice;
};

// ── Helpers de días ───────────────────────────────────────────────────────
const DIA_NUM_A_NOMBRE = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];

const normalizarDia = (d) => {
  const s = String(d ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return /^[0-6]$/.test(s) ? DIA_NUM_A_NOMBRE[Number(s)] : s;
};

const DIAS_ABREV = [
  ["lunes", "Lun"], ["martes", "Mar"], ["miercoles", "Mié"], ["jueves", "Jue"],
  ["viernes", "Vie"], ["sabado", "Sáb"], ["domingo", "Dom"],
];

/** Abreviaturas ordenadas de lunes a domingo, ej. "Lun-Mar-Vie". */
export const formatApplyDays = (days) => {
  const set = new Set((Array.isArray(days) ? days : []).map(normalizarDia));
  return DIAS_ABREV.filter(([n]) => set.has(n)).map(([, a]) => a).join("-");
};

/** ¿La insignia otorga al menos un beneficio (2x1, descuento o envío gratis)? */
export const badgeHasBenefits = (badge) =>
  Boolean(badge) &&
  (Boolean(badge.has_2x1) || Boolean(badge.free_delivery) || Number(badge.discount_percentage) > 0);

/** Devuelve true si los beneficios del badge aplican hoy. Sin días seleccionados no aplican. */
export const badgeBenefitsApplyToday = (badge, fecha = new Date()) => {
  if (!badge) return false;
  const days = badge.apply_days;
  if (!Array.isArray(days) || days.length === 0) return false;
  const hoy = DIA_NUM_A_NOMBRE[fecha.getDay()];
  return days.some((d) => normalizarDia(d) === hoy);
};

// ── Full order summary from a cart array ──────────────────────────────────
// freeThreshold permite inyectar el umbral configurado en el panel admin
// (settings.freeDeliveryThreshold). Por defecto usa la constante local.
// dynamicFee: si se pasa, usa este valor en vez de valDelivery (domicilio dinámico)
// badge: insignia del cliente que puede otorgar descuento_percentage o free_delivery
export const calculateOrderSummary = (cart, valDelivery, freeThreshold, esDomi, dynamicFee = null, badge = null) => {
  const tieneBeneficios = badgeHasBenefits(badge);
  const beneficiosAplican = tieneBeneficios && badgeBenefitsApplyToday(badge);
  const activeBadge = beneficiosAplican ? badge : null;

  // 2x1: con 2 o más unidades en el pedido se descuenta una sola unidad (la más barata)
  const subtotalSin2x1 = cart.reduce((t, i) => t + calculateItemUnitPrice(i) * i.quantity, 0);
  const totalUnidades = cart.reduce((t, i) => t + i.quantity, 0);
  const unidadMasBarata = cart.length
    ? Math.min(...cart.map((i) => calculateItemUnitPrice(i)))
    : 0;
  const descuento2x1 = activeBadge?.has_2x1 && totalUnidades >= 2 ? Math.round(unidadMasBarata) : 0;
  const subtotal = subtotalSin2x1 - descuento2x1;

  // Si hay un fee dinámico (Mapbox) se usa ese; si no, el fijo del admin
  const feeOriginal = Number(dynamicFee != null ? dynamicFee : valDelivery) || 0;
  const esGratis = Boolean(activeBadge?.free_delivery);
  const effectiveFee = esGratis ? 0 : feeOriginal;

  // El % se calcula sobre el subtotal ya con 2x1, de modo que los beneficios se acumulan
  const porcentaje = Math.min(100, Math.max(0, Number(activeBadge?.discount_percentage) || 0));
  const descuentoBadge = Math.round(subtotal * (porcentaje / 100));

  const deliveryFee = esDomi ? effectiveFee : 0;
  const totalNeto = subtotal - descuentoBadge + deliveryFee;
  const faltanteGratis = 0;

  return {
    subtotal: subtotalSin2x1,      // subtotal real sin beneficios (para mostrar)
    subtotalConBeneficios: subtotal, // subtotal después del 2x1
    esGratis,
    totalNeto,
    faltanteGratis,
    effectiveFee,
    feeOriginal,
    deliveryFee,
    descuentoBadge,
    descuento2x1,
    porcentaje,
    tieneBeneficios,
    beneficiosAplican,
  };
};