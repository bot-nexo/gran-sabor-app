import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import { formatCOP } from "../utils/price";
import "./admin.css";

const VACIO = { nombre: "", precio: "", orden: "", disponible: true };

/**
 * Modal reutilizable para crear/editar una Adición o una Salsa.
 * tipo = "addition" | "sauce"   (controla el label de la cabecera)
 * item = fila existente o null para crear.
 * onCreate / onUpdate = funciones async del dataSource ya importadas por el padre.
 */
const AdditionFormModal = ({ tipo = "addition", item, ordenSugerido = 1, onClose, onSaved, onCreate, onUpdate }) => {
  const esEdicion = !!item;
  const label = tipo === "sauce" ? "salsa" : "adición";
  const labelCap = tipo === "sauce" ? "Salsa" : "Adición";

  const [form, setForm] = useState(
    esEdicion
      ? {
          nombre: item.nombre || "",
          precio: item.precio ?? "",
          orden: item.orden ?? "",
          disponible: item.disponible !== false,
        }
      : { ...VACIO, orden: ordenSugerido }
  );
  const [cargando, setCargando] = useState(false);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      Swal.fire({ icon: "warning", text: "El nombre es obligatorio.", confirmButtonColor: "#3D2314" });
      return;
    }

    setCargando(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        precio: Number(form.precio) || 0,
        orden: form.orden ? Number(form.orden) : 0,
        disponible: form.disponible,
      };

      if (esEdicion) {
        await onUpdate(item.id, payload);
      } else {
        await onCreate(payload);
      }

      Swal.fire({
        icon: "success",
        title: esEdicion ? `${labelCap} actualizada` : `${labelCap} creada`,
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

  return (
    <div className="adm-modal__overlay" onClick={onClose}>
      <form className="adm-modal adm-modal--sm" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
        <header className="adm-modal__header">
          <h2>{esEdicion ? `Editar ${label}` : `Nueva ${label}`}</h2>
          <button type="button" className="adm-icono-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="adm-modal__cuerpo adm-modal__cuerpo--solo-campos">
          {/* Nombre */}
          <label className="admin-field">
            <span className="admin-field__label">Nombre *</span>
            <div className="admin-field__input">
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                placeholder={tipo === "sauce" ? "Ej: Fudge de chocolate" : "Ej: Franuí"}
                required
              />
            </div>
          </label>

          <div className="adm-modal__fila">
            {/* Precio */}
            <label className="admin-field">
              <span className="admin-field__label">Precio extra (COP)</span>
              <div className="admin-field__input">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={form.precio}
                  onChange={(e) => set("precio", e.target.value)}
                  placeholder="0"
                />
              </div>
              {Number(form.precio) > 0 && (
                <span className="adm-modal__precio-hint">+{formatCOP(Number(form.precio))}</span>
              )}
              {Number(form.precio) === 0 && (
                <span className="adm-modal__precio-hint">Incluido / sin costo extra</span>
              )}
            </label>

            {/* Orden */}
            <label className="admin-field">
              <span className="admin-field__label">Orden</span>
              <div className="admin-field__input">
                <input
                  type="number"
                  min="0"
                  value={form.orden}
                  onChange={(e) => set("orden", e.target.value)}
                  placeholder="0"
                />
              </div>
            </label>
          </div>

          {/* Disponible */}
          <div className="adm-modal__toggles">
            <label className="adm-toggle-fila">
              <input
                type="checkbox"
                checked={form.disponible}
                onChange={(e) => set("disponible", e.target.checked)}
              />
              <span>Disponible (visible en el catálogo)</span>
            </label>
          </div>
        </div>

        <footer className="adm-modal__pie">
          <button type="button" className="admin-btn-ghost" onClick={onClose} disabled={cargando}>
            Cancelar
          </button>
          <button type="submit" className="admin-btn-primary admin-btn-primary--compacto" disabled={cargando}>
            {cargando && <Loader2 size={15} className="adm-spin" />}
            {cargando ? "Guardando…" : esEdicion ? "Guardar cambios" : `Crear ${label}`}
          </button>
        </footer>
      </form>
    </div>
  );
};

export default AdditionFormModal;
