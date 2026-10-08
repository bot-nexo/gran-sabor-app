// ── Servicio de imágenes (Supabase Storage — capa gratuita) ────────────────
// Estrategia para la capa gratuita (1 GB de almacenamiento):
//   1. Cada imagen se COMPRIME en el navegador antes de subir (máx 1000px,
//      JPEG q≈0.8) → típicamente 60-150 KB por imagen vs 200-500 KB original.
//   2. Al reemplazar la foto de un producto, la anterior SE ELIMINA del
//      bucket → el bucket nunca crece innecesariamente.
//   3. Nombres con timestamp + cache-control de 1 año → el navegador cachea
//      agresivamente y nunca hay imágenes obsoletas.
import { supabase, isSupabaseConfigured } from "./supabaseClient";

const BUCKET = "product-images";
const MAX_DIM = 1000; // px del lado mayor
const QUALITY = 0.8;  // calidad JPEG

/** Convierte el nombre del producto en un slug seguro para archivos. */
const slugify = (texto) =>
  (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/**
 * Comprime una imagen en el navegador con Canvas API (sin dependencias).
 * @returns {Promise<Blob>} JPEG comprimido listo para subir
 */
export async function compressImage(file, maxDim = MAX_DIM, quality = QUALITY) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir la imagen"))),
      "image/jpeg",
      quality,
    ),
  );
}

/** Extrae la ruta del objeto ("productos/x.jpg") de una URL pública del bucket. */
export const extractStoragePath = (url) => {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
};

/** Elimina una imagen del bucket (silencioso: nunca bloquea el flujo). */
export async function deleteProductImage(url) {
  const path = extractStoragePath(url);
  if (!path || !isSupabaseConfigured) return;
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    /* no bloquea: el espacio huérfano se puede limpiar luego desde Supabase */
  }
}

/**
 * Sube la imagen de un producto (comprimida) y devuelve su URL pública.
 * Si el producto ya tenía imagen en el bucket, la anterior se borra.
 *
 * @param {string} nombreProducto - para generar el nombre de archivo
 * @param {File} file - archivo seleccionado por el admin
 * @param {string} [previousUrl] - imagen actual del producto (se elimina)
 * @returns {Promise<string>} URL pública de la nueva imagen
 */
export async function uploadProductImage(nombreProducto, file, previousUrl = "") {
  if (!isSupabaseConfigured) throw new Error("Supabase no está configurado");

  const blob = await compressImage(file);
  const path = `productos/${slugify(nombreProducto) || "producto"}-${Date.now()}.jpg`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000", // 1 año: el nombre lleva timestamp → sin caché obsoleta
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // Limpieza: la imagen anterior fuera del bucket (ahorro en capa gratuita)
  if (previousUrl && previousUrl !== data.publicUrl) {
    deleteProductImage(previousUrl);
  }

  return data.publicUrl;
}

/**
 * Sube el logo del negocio (comprimido) y devuelve su URL pública.
 * Si ya había un logo anterior en el bucket, se elimina (igual que productos).
 */
export async function uploadLogoImage(file, previousUrl = "") {
  if (!isSupabaseConfigured) throw new Error("Supabase no está configurado");

  const blob = await compressImage(file, 400, 0.85); // logo más pequeño → 400px max
  const path = `logos/logo-negocio-${Date.now()}.jpg`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // Eliminar logo anterior si existía
  if (previousUrl && previousUrl !== data.publicUrl) {
    deleteProductImage(previousUrl); // reutilizamos la misma función (mismo bucket)
  }

  return data.publicUrl;
}
