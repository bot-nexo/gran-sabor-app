// ── Mapbox Service ──────────────────────────────────────────────────────────
// Integración con Mapbox Search Box API (autocompletar direcciones) y
// Matrix API (distancia real por carretera). Lee el token de VITE_MAPBOX_TOKEN.
//
// Documentación:
//   - Search Box: https://docs.mapbox.com/api/search/search-box/
//   - Matrix:     https://docs.mapbox.com/api/navigation/matrix/

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

export const isMapboxConfigured = Boolean(MAPBOX_TOKEN);

// ── Session token (optimiza costos de Search Box API) ───────────────────────
const generateUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para entornos http:// (red local)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

let _sessionToken = generateUUID();

/** Renueva el session token (llamar tras seleccionar una sugerencia). */
export const renewSession = () => {
  _sessionToken = generateUUID();
};

// ── 1. Autocompletar dirección (Search Box API — suggest) ───────────────────
/**
 * Busca sugerencias de dirección a partir de un texto parcial.
 * @param {string} query - Texto del usuario (ej: "Carrera 50 # 49")
 * @param {object} opts
 * @param {string} opts.country - Código ISO 3166-1 alpha-2 (default "co")
 * @param {number} opts.proximityLat - Lat de proximidad (sesgo geográfico)
 * @param {number} opts.proximityLng - Lng de proximidad
 * @param {number} opts.limit - Máximo de sugerencias (1-10, default 5)
 * @returns {Promise<Array<{id: string, name: string, fullAddress: string, lat: number, lng: number}>>}
 */
export async function searchAddress(query, opts = {}) {
  if (!isMapboxConfigured || !query || query.trim().length < 3) return [];

  const {
    country = "co",
    proximityLat,
    proximityLng,
    limit = 5,
  } = opts;

  const params = new URLSearchParams({
    q: query.trim(),
    access_token: MAPBOX_TOKEN,
    session_token: _sessionToken,
    language: "es",
    country,
    limit: String(limit),
    types: "address,place,poi,street",
  });

  // Sesgo hacia la zona del local (mejora relevancia)
  if (proximityLat && proximityLng) {
    params.set("proximity", `${proximityLng},${proximityLat}`);
  }

  try {
    const res = await fetch(
      `https://api.mapbox.com/search/searchbox/v1/suggest?${params}`
    );
    if (!res.ok) {
      console.error("[mapbox] suggest error:", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    const suggestions = (data.suggestions || []).map((s) => ({
      mapbox_id: s.mapbox_id,
      name: s.name || "",
      fullAddress: s.full_address || s.place_formatted || s.name || "",
      // Las coordenadas vienen en el retrieve, no en suggest
      lat: null,
      lng: null,
    }));
    return suggestions;
  } catch (err) {
    console.error("[mapbox] searchAddress fetch error:", err);
    return [];
  }
}

// ── 2. Obtener coordenadas de una sugerencia (Search Box — retrieve) ────────
/**
 * Recupera los detalles completos (incluidas coordenadas) de una sugerencia.
 * @param {string} mapboxId - ID de la sugerencia (mapbox_id del suggest)
 * @returns {Promise<{name: string, fullAddress: string, lat: number, lng: number} | null>}
 */
export async function retrieveAddress(mapboxId) {
  if (!isMapboxConfigured || !mapboxId) return null;

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    session_token: _sessionToken,
  });

  try {
    const res = await fetch(
      `https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}?${params}`
    );
    if (!res.ok) {
      console.error("[mapbox] retrieve error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const feat = data.features?.[0];
    if (!feat) return null;

    const [lng, lat] = feat.geometry?.coordinates || [null, null];

    // Renovar session token tras un retrieve exitoso (buenas prácticas Mapbox)
    renewSession();

    return {
      name: feat.properties?.name || "",
      fullAddress:
        feat.properties?.full_address ||
        feat.properties?.place_formatted ||
        feat.properties?.name ||
        "",
      lat,
      lng,
    };
  } catch (err) {
    console.error("[mapbox] retrieveAddress fetch error:", err);
    return null;
  }
}

// ── 3. Calcular distancia real por carretera (Matrix API) ───────────────────
/**
 * Calcula la distancia en km entre el local y la dirección del cliente
 * usando la Mapbox Matrix API (driving, distancia real por ruta).
 *
 * @param {number} storeLat
 * @param {number} storeLng
 * @param {number} destLat
 * @param {number} destLng
 * @returns {Promise<{distanceKm: number, durationMin: number} | null>}
 */
export async function calculateDistance(storeLat, storeLng, destLat, destLng) {
  if (!isMapboxConfigured) return null;
  if (!storeLat || !storeLng || !destLat || !destLng) return null;

  // Matrix API: coordinates formato "lng,lat;lng,lat"
  const coordinates = `${storeLng},${storeLat};${destLng},${destLat}`;

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    annotations: "distance,duration",
  });

  try {
    const res = await fetch(
      `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordinates}?${params}`
    );
    if (!res.ok) {
      console.error("[mapbox] matrix error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();

    if (data.code !== "Ok") {
      console.error("[mapbox] matrix code:", data.code, data.message);
      return null;
    }

    // Al no especificar sources/destinations, Mapbox devuelve una matriz 2x2 (A->A, A->B, B->A, B->B)
    // Queremos la distancia del origen (0) al destino (1)
    const distanceMeters = data.distances?.[0]?.[1]; // en metros
    const durationSeconds = data.durations?.[0]?.[1]; // en segundos

    if (distanceMeters == null) return null;

    return {
      distanceKm: Math.round((distanceMeters / 1000) * 100) / 100, // 2 decimales
      durationMin: Math.round((durationSeconds || 0) / 60),
    };
  } catch (err) {
    console.error("[mapbox] calculateDistance fetch error:", err);
    return null;
  }
}

// ── 4. Calcular tarifa de domicilio ─────────────────────────────────────────
/**
 * Fórmula pura: costo_domicilio = base_delivery_fee + (distance_km × price_per_km)
 * Redondea al múltiplo de 100 COP más cercano.
 *
 * @param {number} distanceKm - Distancia en km
 * @param {number} baseFee - Tarifa base fija (COP)
 * @param {number} pricePerKm - Valor por km (COP)
 * @returns {number} Costo del domicilio en COP
 */
export function calculateDeliveryFee(distanceKm, baseFee, pricePerKm) {
  const raw = baseFee + distanceKm * pricePerKm;
  // Redondear al múltiplo de 100 más cercano (más limpio para el cliente)
  return Math.round(raw / 100) * 100;
}

// ── 5. Validar si está dentro del radio de cobertura ────────────────────────
/**
 * @param {number} distanceKm
 * @param {number} maxRadiusKm
 * @returns {boolean}
 */
export function isWithinCoverage(distanceKm, maxRadiusKm) {
  return distanceKm <= maxRadiusKm;
}
