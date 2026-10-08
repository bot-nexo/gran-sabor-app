import { ChevronDown, ChevronUp, Gift, ImageIcon, Plus, Rocket, Save, Tag, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import {
  DEFAULT_CATALOG_DESIGN,
  getCatalogDesign,
  subscribeToCatalog,
  updateCatalogDesign,
} from "../../data/dataSource";
import { deleteProductImage, uploadProductImage } from "../../services/storage";
import "../admin.css";

// ── Factories ───────────────────────────────────────────────────────────────
const newPromo = () => ({
  id: `promo-${Date.now()}`,
  titulo: "Nueva Promoción",
  tag: "Oferta Especial",
  descripcion: "Descripción de la oferta o beneficio para el cliente.",
  descuento: "20% OFF",
  imagen: "",
});

const newCombo = () => ({
  id: `combo-${Date.now()}`,
  nombre: "Nuevo Combo Dulce",
  precio: 35000,
  precioOriginal: 42000,
  badge: "Ahorra $7.000",
  descripcion: "Combinación de postres para compartir.",
  incluye: ["1x Postre 8oz", "1x Bebida o Torta"],
  imagen: "",
});

// ── Image Uploader Component ──────────────────────────────────────────────────
const ImageUploader = ({ label, url, onUpload, defaultName }) => {
  const [uploading, setUploading] = useState(false);
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const newUrl = await uploadProductImage(defaultName, file, url);
      onUpload(newUrl);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error al subir", text: err.message, toast: true, position: "top-end" });
    } finally {
      setUploading(false);
    }
  };
  return (
    <label className="admin-field" style={{ marginBottom: 0 }}>
      <span className="admin-field__label" style={{ fontSize: ".72rem", display: "flex", justifyContent: "space-between" }}>
        {label} {uploading && <span style={{ color: "#ffcc00" }}>Subiendo...</span>}
      </span>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="admin-field__input"
          style={{ padding: "0.3rem", fontSize: ".75rem" }}
        />
        {url && (
          <img src={url} alt="Preview" style={{ width: "34px", height: "34px", borderRadius: "6px", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255,255,255,0.2)" }} />
        )}
      </div>
    </label>
  );
};

// ── PromoCard ────────────────────────────────────────────────────────────────
const PromoCard = ({ promo, idx, onChange, onRemove }) => {
  const [expanded, setExpanded] = useState(true);
  return (
    <div style={{ background: "rgba(255,204,0,0.03)", border: "1px solid rgba(255,204,0,0.18)", borderRadius: 14, overflow: "hidden" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".7rem 1rem", background: "rgba(255,204,0,0.06)", cursor: "pointer", userSelect: "none" }}
        onClick={() => setExpanded((e) => !e)}
      >
        <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.05)", flexShrink: 0, border: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {promo.imagen ? <img src={promo.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={18} color="#6b5a4e" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: ".88rem", color: "var(--crema)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{promo.titulo || `Promo ${idx + 1}`}</p>
          <p style={{ margin: 0, fontSize: ".72rem", color: "var(--texto-dim)" }}>{promo.tag} · {promo.descuento}</p>
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(idx); }} style={{ background: "none", border: "none", color: "#e11d48", cursor: "pointer", padding: "4px" }} title="Eliminar"><Trash2 size={15} /></button>
        {expanded ? <ChevronUp size={16} color="#6b5a4e" /> : <ChevronDown size={16} color="#6b5a4e" />}
      </div>
      {expanded && (
        <div style={{ padding: ".85rem 1rem", display: "flex", flexDirection: "column", gap: ".6rem" }}>
          <div className="promo-card__title-fields">
            <label className="admin-field" style={{ marginBottom: 0 }}>
              <span className="admin-field__label" style={{ fontSize: ".72rem" }}>Título</span>
              <input type="text" value={promo.titulo || ""} onChange={(e) => onChange(idx, "titulo", e.target.value)} className="admin-field__input" placeholder="Título atractivo" style={{ fontWeight: 700 }} />
            </label>
            <label className="admin-field" style={{ marginBottom: 0 }}>
              <span className="admin-field__label" style={{ fontSize: ".72rem" }}>Descuento</span>
              <input type="text" value={promo.descuento || ""} onChange={(e) => onChange(idx, "descuento", e.target.value)} className="admin-field__input" placeholder="2x1" />
            </label>
          </div>
          <label className="admin-field" style={{ marginBottom: 0 }}>
            <span className="admin-field__label" style={{ fontSize: ".72rem" }}>Tag / Etiqueta (ej: Viernes &amp; Sábados)</span>
            <input type="text" value={promo.tag || ""} onChange={(e) => onChange(idx, "tag", e.target.value)} className="admin-field__input" placeholder="Toda la semana" />
          </label>
          <label className="admin-field" style={{ marginBottom: 0 }}>
            <span className="admin-field__label" style={{ fontSize: ".72rem" }}>Descripción para el cliente</span>
            <input type="text" value={promo.descripcion || ""} onChange={(e) => onChange(idx, "descripcion", e.target.value)} className="admin-field__input" placeholder="Descripción breve de la oferta" />
          </label>
          <ImageUploader
            label="Imagen Promocional"
            url={promo.imagen}
            defaultName={promo.titulo || `promo-${idx}`}
            onUpload={(url) => onChange(idx, "imagen", url)}
          />
        </div>
      )}
    </div>
  );
};

// ── ComboCard ────────────────────────────────────────────────────────────────
const ComboCard = ({ combo, idx, onChange, onRemove }) => {
  const [expanded, setExpanded] = useState(true);
  return (
    <div style={{ background: "rgba(217,43,56,0.03)", border: "1px solid rgba(217,43,56,0.18)", borderRadius: 14, overflow: "hidden" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".7rem 1rem", background: "rgba(217,43,56,0.06)", cursor: "pointer", userSelect: "none" }}
        onClick={() => setExpanded((e) => !e)}
      >
        <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.05)", flexShrink: 0, border: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {combo.imagen ? <img src={combo.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Gift size={18} color="#6b5a4e" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: ".88rem", color: "var(--crema)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{combo.nombre || `Combo ${idx + 1}`}</p>
          <p style={{ margin: 0, fontSize: ".72rem", color: "var(--texto-dim)" }}>{combo.badge} · {combo.precio ? `$${Number(combo.precio).toLocaleString("es-CO")}` : ""}</p>
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(idx); }} style={{ background: "none", border: "none", color: "#e11d48", cursor: "pointer", padding: "4px" }} title="Eliminar"><Trash2 size={15} /></button>
        {expanded ? <ChevronUp size={16} color="#6b5a4e" /> : <ChevronDown size={16} color="#6b5a4e" />}
      </div>
      {expanded && (
        <div style={{ padding: ".85rem 1rem", display: "flex", flexDirection: "column", gap: ".6rem" }}>
          <label className="admin-field" style={{ marginBottom: 0 }}>
            <span className="admin-field__label" style={{ fontSize: ".72rem" }}>Nombre del Combo</span>
            <input type="text" value={combo.nombre || ""} onChange={(e) => onChange(idx, "nombre", e.target.value)} className="admin-field__input" placeholder="Combo Dúo Postre + Torta" style={{ fontWeight: 700 }} />
          </label>
          <div className="combo-editor__prices">
            <label className="admin-field" style={{ marginBottom: 0 }}>
              <span className="admin-field__label" style={{ fontSize: ".72rem" }}>Precio COP</span>
              <input type="number" value={combo.precio || ""} onChange={(e) => onChange(idx, "precio", Number(e.target.value))} className="admin-field__input" placeholder="32000" />
            </label>
            <label className="admin-field" style={{ marginBottom: 0 }}>
              <span className="admin-field__label" style={{ fontSize: ".72rem" }}>Precio Original (tachado)</span>
              <input type="number" value={combo.precioOriginal || ""} onChange={(e) => onChange(idx, "precioOriginal", Number(e.target.value))} className="admin-field__input" placeholder="42000" />
            </label>
          </div>
          <label className="admin-field" style={{ marginBottom: 0 }}>
            <span className="admin-field__label" style={{ fontSize: ".72rem" }}>Badge (ej: "Ahorra $7.000" o "Más Popular 🔥")</span>
            <input type="text" value={combo.badge || ""} onChange={(e) => onChange(idx, "badge", e.target.value)} className="admin-field__input" placeholder="Ahorra $7.000" />
          </label>
          <label className="admin-field" style={{ marginBottom: 0 }}>
            <span className="admin-field__label" style={{ fontSize: ".72rem" }}>Descripción</span>
            <input type="text" value={combo.descripcion || ""} onChange={(e) => onChange(idx, "descripcion", e.target.value)} className="admin-field__input" placeholder="Descripción del combo" />
          </label>
          <label className="admin-field" style={{ marginBottom: 0 }}>
            <span className="admin-field__label" style={{ fontSize: ".72rem" }}>Incluye (separado por coma)</span>
            <input
              type="text"
              value={Array.isArray(combo.incluye) ? combo.incluye.join(", ") : (combo.incluye || "")}
              onChange={(e) => onChange(idx, "incluye", e.target.value)}
              className="admin-field__input"
              placeholder="1x Postre 8oz, 1x Torta de chocolate"
              style={{ fontSize: ".8rem" }}
            />
          </label>
          <ImageUploader
            label="Imagen del Combo"
            url={combo.imagen}
            defaultName={combo.nombre || `combo-${idx}`}
            onUpload={(url) => onChange(idx, "imagen", url)}
          />
        </div>
      )}
    </div>
  );
};

// ── Página Principal ─────────────────────────────────────────────────────────
const PromocionesAdmin = () => {
  const [form, setForm] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [activeSection, setActiveSection] = useState("promos");

  const timeOut = 1200;
  const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [d] = await Promise.all([
        getCatalogDesign(),
        esperar(timeOut)
      ]);
      setForm(d || { ...DEFAULT_CATALOG_DESIGN });
    } catch (e) {
      Swal.fire({ title: "Error al cargar", text: e.message, icon: "error", confirmButtonColor: "#3D2314" });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
    const unsub = subscribeToCatalog(cargarDatos);
    return () => unsub();
  }, [cargarDatos]);

  const guardar = async () => {
    setGuardando(true);
    try {
      const sanitizedForm = {
        ...form,
        combosItems: form.combosItems?.map(combo => ({
          ...combo,
          incluye: typeof combo.incluye === "string"
            ? combo.incluye.split(",").map(s => s.trim()).filter(Boolean)
            : combo.incluye
        })) || []
      };

      await Promise.all([
        updateCatalogDesign(sanitizedForm),
        esperar(timeOut)
      ]);
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "¡Cambios guardados en tiempo real!", showConfirmButton: false, timer: 1800 });
    } catch (err) {
      Swal.fire({ title: "No se pudo guardar", text: err.message, icon: "error", confirmButtonColor: "#3D2314" });
    } finally {
      setGuardando(false);
    }
  };

  const updatePromo = (idx, field, val) => setForm((prev) => { const items = [...(prev.promotionsItems || [])]; items[idx] = { ...items[idx], [field]: val }; return { ...prev, promotionsItems: items }; });
  const addPromo = () => setForm((prev) => ({ ...prev, promotionsItems: [...(prev.promotionsItems || []), newPromo()] }));
  const removePromo = (idx) => {
    const item = form.promotionsItems?.[idx];
    if (item?.imagen) deleteProductImage(item.imagen);
    setForm((prev) => ({ ...prev, promotionsItems: (prev.promotionsItems || []).filter((_, i) => i !== idx) }));
  };

  const updateCombo = (idx, field, val) => setForm((prev) => { const items = [...(prev.combosItems || [])]; items[idx] = { ...items[idx], [field]: val }; return { ...prev, combosItems: items }; });
  const addCombo = () => setForm((prev) => ({ ...prev, combosItems: [...(prev.combosItems || []), newCombo()] }));
  const removeCombo = (idx) => {
    const item = form.combosItems?.[idx];
    if (item?.imagen) deleteProductImage(item.imagen);
    setForm((prev) => ({ ...prev, combosItems: (prev.combosItems || []).filter((_, i) => i !== idx) }));
  };

  if (cargando || !form) return <LoadingOverlay fullScreen text="Cargando módulo de Promociones…" minTime={timeOut} />;

  const TABS = [
    { id: "promos", label: "Promociones", mobileLabel: "Promos", icon: Tag, color: "#ffcc00" },
    { id: "event", label: "Banner Evento Especial", mobileLabel: "Evento", icon: Rocket, color: "#ff9800" },
    { id: "combos", label: "Combos & Packs", mobileLabel: "Combos", icon: Gift, color: "#d92b38" },
  ];

  return (
    <div className="admin-page admin-page--promociones">
      {guardando && <LoadingOverlay text="Guardando cambios…" minTime={timeOut} />}

      <header className="admin-page__header">
        <div className="admin-page__header-title-wrap">
          <h1 className="admin-page__titulo">Promociones & Combos</h1>
          <p className="admin-page__sub">Gestiona promociones, eventos y combos de tu catálogo.</p>
        </div>
        <div className="admin-page__header-actions">
          <button type="button" className="admin-btn-primary admin-btn-primary--compacto" onClick={guardar} disabled={guardando}>
            <Save size={15} /> Guardar Cambios
          </button>
        </div>
      </header>

      {/* Pestañas */}
      <div className="promociones-tabs" role="tablist" aria-label="Secciones de promociones">
        {TABS.map(({ id, label, mobileLabel, icon: Icon, color }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSection(id)}
            className={`promociones-tabs__item${activeSection === id ? " is-active" : ""}`}
            style={{ "--tab-accent": color }}
            role="tab"
            aria-selected={activeSection === id}
            aria-label={label}
            title={label}
          >
            <Icon size={15} aria-hidden="true" />
            <span className="promociones-tabs__label-full">{label}</span>
            <span className="promociones-tabs__label-mobile">{mobileLabel}</span>
          </button>
        ))}
      </div>

      {/* ── Promociones Normales ── */}
      {activeSection === "promos" && (
        <div className="admin-card promo-editor-card">
          <div className="promo-editor__section-head">
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--crema)", display: "flex", alignItems: "center", gap: ".45rem" }}><Tag size={16} color="#ffcc00" /> Promociones Especiales</h3>
              <p style={{ margin: ".2rem 0 0", fontSize: ".78rem", color: "var(--texto-dim)" }}>Aparecen en la sección Promociones y como banner en el Menú ("Pide, Disfruta, Repite").</p>
            </div>
            <label className="promo-editor__visibility">
              <input type="checkbox" checked={form.showPromotions !== false} onChange={(e) => setForm((prev) => ({ ...prev, showPromotions: e.target.checked }))} />
              <span>Visible en tienda</span>
            </label>
          </div>
          <div className="promo-editor__fields">
            <label className="admin-field" style={{ marginBottom: 0 }}><span className="admin-field__label">Título de la Sección</span><input type="text" value={form.promotionsTitle || ""} onChange={(e) => setForm((prev) => ({ ...prev, promotionsTitle: e.target.value }))} className="admin-field__input" /></label>
            <label className="admin-field" style={{ marginBottom: 0 }}><span className="admin-field__label">Subtítulo</span><input type="text" value={form.promotionsSubtitle || ""} onChange={(e) => setForm((prev) => ({ ...prev, promotionsSubtitle: e.target.value }))} className="admin-field__input" /></label>
          </div>
          <div className="promo-editor__list-head">
            <span style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--crema)" }}>Tarjetas activas: {form.promotionsItems?.length || 0}</span>
            <button type="button" className="admin-btn-ghost" onClick={addPromo} style={{ fontSize: ".78rem" }}><Plus size={14} /> Añadir Promo</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
            {(form.promotionsItems || []).map((promo, idx) => <PromoCard key={promo.id || idx} promo={promo} idx={idx} onChange={updatePromo} onRemove={removePromo} />)}
            {(!form.promotionsItems || form.promotionsItems.length === 0) && (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--texto-dim)", fontSize: ".82rem", border: "1px dashed var(--aborde)", borderRadius: 12 }}>🏷️ Sin promociones. Haz clic en "Añadir Promo" para crear la primera.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Banner Evento Especial ── */}
      {activeSection === "event" && (
        <div className="admin-card promo-editor-card">
          <div className="promo-editor__section-head">
            <div>
              <h3 style={{ margin: "0 0 .25rem", fontSize: "1rem", fontWeight: 700, color: "var(--crema)", display: "flex", alignItems: "center", gap: ".45rem" }}><Rocket size={16} color="#ff9800" /> Banner Evento Especial</h3>
              <p style={{ margin: 0, fontSize: ".78rem", color: "var(--texto-dim)" }}>
                Activa este banner personalizable en fechas especiales (Día de la Madre, Navidad, Aniversario, etc.) para que aparezca en la parte superior de tu menú.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: ".5rem", cursor: "pointer", fontSize: ".83rem", color: "var(--acento)", flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={form.specialEvent?.active || false}
                onChange={(e) => setForm((prev) => ({ ...prev, specialEvent: { ...(prev.specialEvent || {}), active: e.target.checked } }))}
              />
              <span>Banner Activado</span>
            </label>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "1.25rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label className="admin-field" style={{ marginBottom: 0 }}>
                <span className="admin-field__label">Mensaje del Evento</span>
                <input
                  type="text"
                  value={form.specialEvent?.texto || ""}
                  placeholder="Ej: 🎉 FELIZ DÍA DE LA MADRE - 20% OFF EN POSTRES"
                  onChange={(e) => setForm((prev) => ({ ...prev, specialEvent: { ...(prev.specialEvent || {}), texto: e.target.value } }))}
                  className="admin-field__input"
                />
              </label>

              <div className="promos-event__colors">
                <label className="admin-field" style={{ marginBottom: 0 }}>
                  <span className="admin-field__label">Color de Fondo</span>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                    <input
                      type="color"
                      value={form.specialEvent?.bgColor || "#d92b38"}
                      onChange={(e) => setForm((prev) => ({ ...prev, specialEvent: { ...(prev.specialEvent || {}), bgColor: e.target.value } }))}
                      style={{ width: 36, height: 36, padding: 0, border: "none", borderRadius: 8, cursor: "pointer" }}
                    />
                    <span style={{ fontSize: ".8rem", color: "var(--texto-dim)", fontFamily: "monospace" }}>{form.specialEvent?.bgColor || "#d92b38"}</span>
                  </div>
                </label>

                <label className="admin-field" style={{ marginBottom: 0 }}>
                  <span className="admin-field__label">Color del Texto</span>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                    <input
                      type="color"
                      value={form.specialEvent?.textColor || "#ffffff"}
                      onChange={(e) => setForm((prev) => ({ ...prev, specialEvent: { ...(prev.specialEvent || {}), textColor: e.target.value } }))}
                      style={{ width: 36, height: 36, padding: 0, border: "none", borderRadius: 8, cursor: "pointer" }}
                    />
                    <span style={{ fontSize: ".8rem", color: "var(--texto-dim)", fontFamily: "monospace" }}>{form.specialEvent?.textColor || "#ffffff"}</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginTop: "1.5rem" }}>
              <span className="admin-field__label" style={{ marginBottom: ".5rem" }}>Vista Previa en Tienda:</span>
              <div style={{
                background: form.specialEvent?.bgColor || "#d92b38",
                color: form.specialEvent?.textColor || "#ffffff",
                padding: "10px 16px",
                borderRadius: "12px",
                textAlign: "center",
                fontWeight: "900",
                fontSize: "0.9rem",
                boxShadow: `0 4px 15px ${(form.specialEvent?.bgColor || "#d92b38")}40`
              }}>
                {form.specialEvent?.texto || "🎉 FELIZ DÍA DE LA MADRE - 20% OFF EN POSTRES"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Combos ── */}
      {activeSection === "combos" && (
        <div className="admin-card promo-editor-card">
          <div className="promo-editor__section-head">
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--crema)", display: "flex", alignItems: "center", gap: ".45rem" }}><Gift size={16} color="#d92b38" /> Combos & Packs Especiales</h3>
              <p style={{ margin: ".2rem 0 0", fontSize: ".78rem", color: "var(--texto-dim)" }}>Aparecen en la sección Combos y en la categoría "Combos" del menú.</p>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: ".5rem", cursor: "pointer", fontSize: ".83rem", color: "var(--acento)", flexShrink: 0 }}>
              <input type="checkbox" checked={form.showCombos !== false} onChange={(e) => setForm((prev) => ({ ...prev, showCombos: e.target.checked }))} />
              <span>Visible en tienda</span>
            </label>
          </div>
          <div className="promo-editor__fields">
            <label className="admin-field" style={{ marginBottom: 0 }}><span className="admin-field__label">Título de la Sección</span><input type="text" value={form.combosTitle || ""} onChange={(e) => setForm((prev) => ({ ...prev, combosTitle: e.target.value }))} className="admin-field__input" /></label>
            <label className="admin-field" style={{ marginBottom: 0 }}><span className="admin-field__label">Subtítulo</span><input type="text" value={form.combosSubtitle || ""} onChange={(e) => setForm((prev) => ({ ...prev, combosSubtitle: e.target.value }))} className="admin-field__input" /></label>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".75rem" }}>
            <span style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--crema)" }}>Combos activos: {form.combosItems?.length || 0}</span>
            <button type="button" className="admin-btn-ghost" onClick={addCombo} style={{ fontSize: ".78rem" }}><Plus size={14} /> Añadir Combo</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
            {(form.combosItems || []).map((combo, idx) => <ComboCard key={combo.id || idx} combo={combo} idx={idx} onChange={updateCombo} onRemove={removeCombo} />)}
            {(!form.combosItems || form.combosItems.length === 0) && (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--texto-dim)", fontSize: ".82rem", border: "1px dashed var(--aborde)", borderRadius: 12 }}>🎁 Sin combos. Haz clic en "Añadir Combo" para crear el primero.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PromocionesAdmin;

