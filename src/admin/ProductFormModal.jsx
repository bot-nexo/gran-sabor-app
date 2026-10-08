import { useState, useEffect } from "react";
import { X, ImagePlus, Loader2, Sparkles, Flame } from "lucide-react";
import Swal from "sweetalert2";
import { createProduct, updateProduct, getAdditions, getSauces, setProductAdditions, setProductSauces } from "../data/dataSource";
import { uploadProductImage } from "../services/storage";
import { formatCOP } from "../utils/price";
import "./admin.css";

const VACIO = {
  nombre: "",
  category_id: "",
  precio: "",
  descripcion: "",
  nota: "",
  destacado: false,
  disponible: true,
  orden: "",
};

/**
 * Modal para crear o editar un producto, con subida de imagen comprimida.
 * producto = fila normalizada (con imagen_url cruda) o null para crear.
 */
const ProductFormModal = ({
  producto,
  categorias,
  ordenSugerido,
  onClose,
  onSaved,
}) => {
  const esEdicion = !!producto;
  const [form, setForm] = useState(
    esEdicion
      ? {
        nombre: producto.nombre || "",
        category_id: producto.category_id || "",
        precio: producto.precio ?? "",
        descripcion: producto.descripcion || "",
        nota: producto.nota || "",
        destacado: !!producto.destacado,
        disponible: producto.disponible !== false,
        orden: producto.orden ?? "",
        tiempo_preparacion_horas: producto.tiempo_preparacion_horas ?? "",
      }
      : { ...VACIO, orden: ordenSugerido, tiempo_preparacion_horas: "" },
  );
  const [imagenUrlPrevio, setImagenUrlPrevio] = useState(producto?.imagen_url || "");
  const [vistaPrevia, setVistaPrevia] = useState(producto?.imagen || "");
  const [nuevaImagen, setNuevaImagen] = useState(null);
  const [cargando, setCargando] = useState(false);

  // ── Catálogos de adiciones y salsas ──────────────────────────────────────
  const [catAdiciones, setCatAdiciones] = useState([]);  // todos los ítems disponibles
  const [catSalsas, setCatSalsas] = useState([]);
  // Selección actual: { [id]: { seleccionado: bool, requerido: bool } }
  const [selAdiciones, setSelAdiciones] = useState({});
  const [selSalsas, setSelSalsas] = useState({});

  // Carga los catálogos y las asociaciones actuales del producto
  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      try {
        const [adds, sauces] = await Promise.all([getAdditions(), getSauces()]);
        if (cancelled) return;
        setCatAdiciones(adds.filter((a) => a.disponible));
        setCatSalsas(sauces.filter((s) => s.disponible));

        // Pre-marcar las que ya están asociadas (edición)
        if (esEdicion && producto) {
          const initAdds = {};
          (producto.adiciones || []).forEach((a) => {
            initAdds[a.id] = { seleccionado: true, requerido: !!a.requerido };
          });
          setSelAdiciones(initAdds);

          const initSauces = {};
          (producto.salsas || []).forEach((s) => {
            initSauces[s.id] = { seleccionado: true, requerido: !!s.requerido };
          });
          setSelSalsas(initSauces);
        }
      } catch (err) {
        console.warn("[ProductFormModal] no se pudo cargar catálogo extras:", err.message);
      }
    };
    cargar();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const elegirImagen = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      Swal.fire({ icon: "warning", text: "Selecciona un archivo de imagen.", confirmButtonColor: "#3D2314" });
      return;
    }
    setNuevaImagen(file);
    setVistaPrevia(URL.createObjectURL(file));
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !(Number(form.precio) > 0)) {
      Swal.fire({
        icon: "warning",
        title: "Datos incompletos",
        text: "El nombre y un precio mayor a 0 son obligatorios.",
        confirmButtonColor: "#3D2314",
      });
      return;
    }

    setCargando(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        category_id: form.category_id || null,
        descripcion: form.descripcion.trim(),
        precio: Number(form.precio),
        nota: form.nota.trim(),
        destacado: form.destacado,
        disponible: form.disponible,
        orden: form.orden ? Number(form.orden) : producto?.orden ?? ordenSugerido,
        tiempo_preparacion_horas: form.tiempo_preparacion_horas ? Number(form.tiempo_preparacion_horas) : null,
      };

      if (nuevaImagen) {
        // Comprime y sube al bucket; borra la foto anterior (capa gratuita)
        payload.imagen_url = await uploadProductImage(
          payload.nombre,
          nuevaImagen,
          imagenUrlPrevio,
        );
      }

      if (esEdicion) {
        await updateProduct(producto.id, payload);
        // Sincronizar adiciones y salsas del producto existente
        await setProductAdditions(
          producto.id,
          Object.entries(selAdiciones)
            .filter(([, v]) => v.seleccionado)
            .map(([id, v]) => ({ id, requerido: v.requerido }))
        );
        await setProductSauces(
          producto.id,
          Object.entries(selSalsas)
            .filter(([, v]) => v.seleccionado)
            .map(([id, v]) => ({ id, requerido: v.requerido }))
        );
      } else {
        const nuevoProducto = await createProduct(payload);
        // Sincronizar adiciones y salsas del producto recién creado
        if (nuevoProducto?.id) {
          await setProductAdditions(
            nuevoProducto.id,
            Object.entries(selAdiciones)
              .filter(([, v]) => v.seleccionado)
              .map(([id, v]) => ({ id, requerido: v.requerido }))
          );
          await setProductSauces(
            nuevoProducto.id,
            Object.entries(selSalsas)
              .filter(([, v]) => v.seleccionado)
              .map(([id, v]) => ({ id, requerido: v.requerido }))
          );
        }
      }

      Swal.fire({
        icon: "success",
        title: esEdicion ? "Producto actualizado" : "Producto creado",
        text: "La tienda se actualiza sola en segundos.",
        toast: true,
        position: "top-end",
        timer: 2400,
        showConfirmButton: false,
      });
      onSaved();
    } catch (err) {
      Swal.fire({
        title: "No se pudo guardar",
        text: err.message,
        icon: "error",
        confirmButtonColor: "#3D2314",
      });
    }
    setCargando(false);
  };

  //******************************** */
  return (
    <div className="adm-modal__overlay" onClick={onClose}>
      <form className="adm-modal" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <header className="adm-modal__header">
          <h2>{esEdicion ? "Editar producto" : "Nuevo producto"}</h2>
          <button type="button" className="adm-icono-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="adm-modal__cuerpo">
          {/* Imagen */}
          <div className="adm-modal__imagen">
            <img src={vistaPrevia} alt="Vista previa" className="adm-modal__preview" />
            <label className="admin-btn-ghost adm-modal__subir">
              <ImagePlus size={15} />
              {nuevaImagen ? "Cambiar foto" : imagenUrlPrevio ? "Reemplazar foto" : "Subir foto"}
              <input type="file" accept="image/*" hidden onChange={elegirImagen} />
            </label>
            <p className="adm-modal__nota-imagen">
              Se comprime automáticamente (máx 1000px).
            </p>
          </div>

          {/* Campos */}
          <div className="adm-modal__campos">
            <label className="admin-field">
              <span className="admin-field__label">Nombre *</span>
              <div className="admin-field__input">
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  placeholder="Ej: Pavé de Leche Klim y Oreo"
                  required
                />
              </div>
            </label>

            <div className="adm-modal__fila">
              <label className="admin-field">
                <span className="admin-field__label">Categoría</span>
                <select
                  className="adm-prod__select"
                  value={form.category_id || ""}
                  onChange={(e) => set("category_id", e.target.value)}
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span className="admin-field__label">Precio (COP) *</span>
                <div className="admin-field__input">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={form.precio}
                    onChange={(e) => set("precio", e.target.value)}
                    placeholder="12000"
                    required
                  />
                </div>
                {Number(form.precio) > 0 && (
                  <span className="adm-modal__precio-hint">{formatCOP(Number(form.precio))}</span>
                )}
              </label>
            </div>

            <label className="admin-field">
              <span className="admin-field__label">Descripción</span>
              <div className="admin-field__input-area">
                <textarea
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => set("descripcion", e.target.value)}
                  placeholder="Describe el postre…"
                />
              </div>
            </label>

            <div className="adm-modal__fila">
              <label className="admin-field">
                <span className="admin-field__label">Nota (anticipación, etc.)</span>
                <div className="admin-field__input">
                  <input
                    type="text"
                    value={form.nota}
                    onChange={(e) => set("nota", e.target.value)}
                    placeholder="Ej: PEDIR CON 4 HORAS DE ANTICIPACIÓN"
                  />
                </div>
              </label>

              <label className="admin-field">
                <span className="admin-field__label">Tiempo Prep. (Horas)</span>
                <div className="admin-field__input">
                  <input
                    type="number"
                    min="0"
                    value={form.tiempo_preparacion_horas}
                    onChange={(e) => set("tiempo_preparacion_horas", e.target.value)}
                    placeholder="Ej: 24"
                  />
                </div>
              </label>
            </div>

            <div className="adm-modal__fila">

              <label className="admin-field">
                <span className="admin-field__label">Orden en el menú</span>
                <div className="admin-field__input">
                  <input
                    type="number"
                    min="1"
                    value={form.orden}
                    onChange={(e) => set("orden", e.target.value)}
                  />
                </div>
              </label>
            </div>

            <div className="adm-modal__toggles">
              <label className="adm-toggle-fila">
                <input
                  type="checkbox"
                  checked={form.disponible}
                  onChange={(e) => set("disponible", e.target.checked)}
                />
                <span>Disponible en la tienda</span>
              </label>
              <label className="adm-toggle-fila">
                <input
                  type="checkbox"
                  checked={form.destacado}
                  onChange={(e) => set("destacado", e.target.checked)}
                />
                <span>Producto destacado ⭐</span>
              </label>
            </div>

            {/* ── Adiciones & Salsas ────────────────────────────────── */}
            <div className="adm-assoc">
              {/* Adiciones */}
              <div className="adm-assoc__grupo">
                <span className="adm-assoc__titulo"><Sparkles size={14} /> Adiciones</span>
                {catAdiciones.length === 0 ? (
                  <p className="adm-assoc__vacio">
                    No hay adiciones en el catálogo.{" "}
                    <em>Créalas en la sección Adiciones &amp; Salsas.</em>
                  </p>
                ) : (
                  <div className="adm-assoc__lista">
                    {catAdiciones.map((a) => {
                      const sel = selAdiciones[a.id] || { seleccionado: false, requerido: false };
                      return (
                        <div key={a.id} className="adm-assoc__item">
                          <input
                            type="checkbox"
                            id={`add-${a.id}`}
                            checked={sel.seleccionado}
                            onChange={(e) =>
                              setSelAdiciones((prev) => ({
                                ...prev,
                                [a.id]: { ...sel, seleccionado: e.target.checked },
                              }))
                            }
                          />
                          <label htmlFor={`add-${a.id}`} className="adm-assoc__nombre">
                            {a.nombre}
                          </label>
                          {a.precio > 0
                            ? <span className="adm-assoc__precio">+{formatCOP(a.precio)}</span>
                            : <span className="adm-assoc__gratis">Gratis</span>}
                          {sel.seleccionado && (
                            <label className="adm-assoc__req">
                              <input
                                type="checkbox"
                                checked={sel.requerido}
                                onChange={(e) =>
                                  setSelAdiciones((prev) => ({
                                    ...prev,
                                    [a.id]: { ...sel, requerido: e.target.checked },
                                  }))
                                }
                              />
                              Obligatorio
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Salsas */}
              <div className="adm-assoc__grupo">
                <span className="adm-assoc__titulo"><Flame size={14} /> Salsas</span>
                {catSalsas.length === 0 ? (
                  <p className="adm-assoc__vacio">
                    No hay salsas en el catálogo.{" "}
                    <em>Créalas en la sección Adiciones &amp; Salsas.</em>
                  </p>
                ) : (
                  <div className="adm-assoc__lista">
                    {catSalsas.map((s) => {
                      const sel = selSalsas[s.id] || { seleccionado: false, requerido: false };
                      return (
                        <div key={s.id} className="adm-assoc__item">
                          <input
                            type="checkbox"
                            id={`sauce-${s.id}`}
                            checked={sel.seleccionado}
                            onChange={(e) =>
                              setSelSalsas((prev) => ({
                                ...prev,
                                [s.id]: { ...sel, seleccionado: e.target.checked },
                              }))
                            }
                          />
                          <label htmlFor={`sauce-${s.id}`} className="adm-assoc__nombre">
                            {s.nombre}
                          </label>
                          {s.precio > 0
                            ? <span className="adm-assoc__precio">+{formatCOP(s.precio)}</span>
                            : <span className="adm-assoc__gratis">Gratis</span>}
                          {sel.seleccionado && (
                            <label className="adm-assoc__req">
                              <input
                                type="checkbox"
                                checked={sel.requerido}
                                onChange={(e) =>
                                  setSelSalsas((prev) => ({
                                    ...prev,
                                    [s.id]: { ...sel, requerido: e.target.checked },
                                  }))
                                }
                              />
                              Obligatorio
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="adm-modal__pie">
          <button type="button" className="admin-btn-ghost" onClick={onClose} disabled={cargando}>
            Cancelar
          </button>
          <button type="submit" className="admin-btn-primary admin-btn-primary--compacto" disabled={cargando}>
            {cargando && <Loader2 size={15} className="adm-spin" />}
            {cargando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear producto"}
          </button>
        </footer>
      </form>
    </div>
  );
};

export default ProductFormModal;
