import { useState } from "react";
import { createCategory, updateCategory } from "../data/dataSource";
import Swal from "sweetalert2";
import { X, Loader2 } from "lucide-react";
import "./admin.css";

const CategoryFormModal = ({ categoria, ordenSugerido, onClose, onSaved }) => {
  const esEdicion = !!categoria;
  const [form, setForm] = useState({
    nombre: categoria?.nombre || "paves medellin",
    emoji: categoria?.emoji || "",
    label: categoria?.label || "",
    orden: categoria?.orden ?? ordenSugerido,
    visible: categoria?.visible !== false,
  });
  const [cargando, setCargando] = useState(false);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  //************************************** */
  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      Swal.fire({
        icon: "warning",
        text: "El nombre de la categoría es obligatorio.",
        confirmButtonColor: "#3D2314",
      });
      return;
    }

    setCargando(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        emoji: form.emoji.trim(),
        // La etiqueta la muestra la tienda; si está vacía se arma con emoji + nombre
        label: form.label.trim() || `${form.emoji.trim()} ${form.nombre.trim()}`.trim(),
        orden: form.orden ? Number(form.orden) : ordenSugerido,
        visible: form.visible,
      };

      if (esEdicion) {
        await updateCategory(categoria.id, payload);
      } else {
        await createCategory(payload);
      }

      Swal.fire({
        icon: "success",
        title: esEdicion ? "Categoría actualizada" : "Categoría creada",
        text: "La tienda se actualiza sola en segundos.",
        toast: true,
        position: "top-end",
        timer: 2200,
        showConfirmButton: false,
      });
      onSaved();
    } catch (err) {
      const duplicada = (err.code || "").includes("23505") || /duplicate|unique/i.test(err.message);
      Swal.fire({
        title: "No se pudo guardar",
        text: duplicada
          ? "Ya existe una categoría con ese nombre."
          : err.message,
        icon: "error",
        confirmButtonColor: "#3D2314",
      });
    }
    setCargando(false);
  };

  //************************************** */
  return (
    <div className="adm-modal__overlay" onClick={onClose}>
      <form
        className="adm-modal adm-modal--compacto"
        onClick={(e) => e.stopPropagation()}
        onSubmit={guardar}
      >
        <header className="adm-modal__header">
          <h2>{esEdicion ? "Editar categoría" : "Nueva categoría"}</h2>
          <button type="button" className="adm-icono-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="adm-modal__cuerpo adm-modal__cuerpo--columna">
          <div className="adm-modal__fila">
            <label className="admin-field">
              <span className="admin-field__label">Nombre *</span>
              <div className="admin-field__input">
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  placeholder="Ej: Malteadas"
                  required
                />
              </div>
            </label>

            <label className="admin-field">
              <span className="admin-field__label">Emoji</span>
              <div className="admin-field__input">
                <input
                  type="text"
                  value={form.emoji}
                  onChange={(e) => set("emoji", e.target.value)}
                  placeholder="🥤"
                  maxLength={4}
                />
              </div>
            </label>
          </div>

          <label className="admin-field">
            <span className="admin-field__label">Etiqueta para la tienda (opcional)</span>
            <div className="admin-field__input">
              <input
                type="text"
                value={form.label}
                onChange={(e) => set("label", e.target.value)}
                placeholder={form.emoji ? `${form.emoji} ${form.nombre || "…"}` : "Ej: 🥤 Malteadas"}
              />
            </div>
            <span className="adm-modal__precio-hint">
              Así se ve el botón de filtro en la tienda. Si la dejas vacía, se arma con el emoji + nombre.
            </span>
          </label>

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

            <div className="admin-field">
              <span className="admin-field__label">Visibilidad</span>
              <label className="adm-toggle-fila adm-toggle-fila--alta">
                <input
                  type="checkbox"
                  checked={form.visible}
                  onChange={(e) => set("visible", e.target.checked)}
                />
                <span>Visible en la tienda</span>
              </label>
            </div>
          </div>
        </div>

        <footer className="adm-modal__pie">
          <button type="button" className="admin-btn-ghost" onClick={onClose} disabled={cargando}>
            Cancelar
          </button>
          <button type="submit" className="admin-btn-primary admin-btn-primary--compacto" disabled={cargando}>
            {cargando && <Loader2 size={15} className="adm-spin" />}
            {cargando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear categoría"}
          </button>
        </footer>
      </form>
    </div>
  );
};

export default CategoryFormModal;
