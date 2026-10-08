import { Award, CheckCircle2, Settings2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import imgBronce from "../../assets/images/insig/InsBronce.jpeg";
import imgNuevo from "../../assets/images/insig/InsNuevo.png";
import imgOro from "../../assets/images/insig/InsOro.jpeg";
import imgPlata from "../../assets/images/insig/InsPlata.jpeg";
import imgPlatino from "../../assets/images/insig/InsPlatino.jpeg";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { getBadges, getSettings, updateSettings, upsertBadge } from "../../data/dataSource";
import "../admin.css";

const timeOut = 1200;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const FIXED_BADGES = [
  { key: "nuevo", label: "Nuevo", img: imgNuevo, color: "#8a9ba8", glow: "#8a9ba880" },
  { key: "bronce", label: "Bronce", img: imgBronce, color: "#cd7f32", glow: "#cd7f3280" },
  { key: "plata", label: "Plata", img: imgPlata, color: "#aaaaaa", glow: "#aaaaaa80" },
  { key: "oro", label: "Oro", img: imgOro, color: "#ffdf00", glow: "#ffdf0080" },
  { key: "platino", label: "Platino", img: imgPlatino, color: "#e5e4e2", glow: "#e5e4e280" },
];


const matchBadge = (dbBadges, key) =>
  dbBadges.find((b) => b.name?.toLowerCase().includes(key));

const TODOS_LOS_DIAS = ["Lunes","Martes","Miercoles","Jueves","Viernes","Sabado","Domingo"];

const BadgeRulesModal = ({ isOpen, onClose, onSave, fixed, dbBadge, diasLaborales = [] }) => {
  const [form, setForm] = useState({
    required_orders: 0,
    description: "",
    beneficio: "",
    discount_percentage: 0,
    free_delivery: false,
    has_2x1: false,
    apply_days: [],
    is_active: true,
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        required_orders: dbBadge?.required_orders ?? 0,
        description: dbBadge?.description ?? "",
        beneficio: dbBadge?.beneficio ?? "",
        discount_percentage: dbBadge?.discount_percentage ?? 0,
        free_delivery: dbBadge?.free_delivery ?? false,
        has_2x1: dbBadge?.has_2x1 ?? false,
        apply_days: Array.isArray(dbBadge?.apply_days) ? dbBadge.apply_days : [],
        is_active: dbBadge?.is_active !== false,
      });
    }
  }, [isOpen, dbBadge]);

  if (!isOpen || !fixed) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...dbBadge,
      name: fixed.label,
      color: fixed.color,
      glow: fixed.glow,
      ...form,
    });
  };

  //******************************** */
  return (
    <div className="adm-modal__overlay" onClick={onClose}>
      <form className="adm-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <header className="adm-modal__header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src={fixed.img} alt={fixed.label}
              style={{
                width: 44, height: 44, borderRadius: "50%", objectFit: "cover",
                border: `2px solid ${fixed.color}`, boxShadow: `0 0 12px ${fixed.glow}`
              }} />
            <h2>Configurar: <span style={{ color: fixed.color }}>{fixed.label}</span></h2>
          </div>
          <button type="button" className="adm-icono-btn" onClick={onClose} aria-label="Cerrar">&times;</button>
        </header>

        <div className="adm-modal__cuerpo adm-modal__cuerpo--solo-campos">
          <div className="adm-modal__toggles">
            <label className="adm-toggle-fila">
              <input type="checkbox" checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              <span>Insignia activa (visible para los clientes)</span>
            </label>
          </div>

          <label className="admin-field">
            <span className="admin-field__label">Pedidos necesarios para obtenerla</span>
            <div className="admin-field__input">
              <input type="number" min="0" value={form.required_orders}
                onChange={(e) => setForm({ ...form, required_orders: Number(e.target.value) })}
                required />
            </div>
          </label>

          <label className="admin-field">
            <span className="admin-field__label">Descripcion del nivel</span>
            <div className="admin-field__input">
              <input type="text" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ej. Cliente muy frecuente" />
            </div>
          </label>

          <label className="admin-field">
            <span className="admin-field__label">Beneficio (texto que ve el cliente)</span>
            <div className="admin-field__input">
              <input type="text" value={form.beneficio}
                onChange={(e) => setForm({ ...form, beneficio: e.target.value })}
                placeholder="Ej. 10% de descuento en todos tus pedidos" />
            </div>
          </label>

          <div style={{
            background: "rgba(255,204,0,0.05)", padding: "14px 12px",
            borderRadius: "10px", border: "1px dashed rgba(255,204,0,0.3)",
            display: "flex", flexDirection: "column", gap: "12px"
          }}>
            <span style={{
              fontSize: "0.8rem", fontWeight: 700, color: "#ffcc00",
              textTransform: "uppercase", letterSpacing: "0.5px"
            }}>
              Reglas automaticas (se aplican en el checkout)
            </span>
            <label className="admin-field">
              <span className="admin-field__label">Descuento aplicado al pedido (%)</span>
              <div className="admin-field__input">
                <input type="number" min="0" max="100" value={form.discount_percentage}
                  onChange={(e) => setForm({ ...form, discount_percentage: Number(e.target.value) })} />
              </div>
              <span className="adm-modal__precio-hint">0 = sin descuento automatico</span>
            </label>
            <label className="adm-toggle-fila" style={{ margin: 0 }}>
              <input type="checkbox" checked={form.free_delivery}
                onChange={(e) => setForm({ ...form, free_delivery: e.target.checked })} />
              <span>Envio 100% gratis para esta insignia</span>
            </label>

            {/* 2x1 */}
            <label className="adm-toggle-fila" style={{ margin: 0 }}>
              <input type="checkbox" checked={form.has_2x1}
                onChange={(e) => setForm({ ...form, has_2x1: e.target.checked })} />
              <span>2x1 — Por cada producto comprado, lleva uno gratis</span>
            </label>

            {/* Dias en que aplican los beneficios */}
            <div>
              <span className="admin-field__label" style={{ display: "block", marginBottom: "8px" }}>
                Dias en que aplican estos beneficios
              </span>
              <span className="adm-modal__precio-hint" style={{ marginBottom: "8px", display: "block" }}>
                Solo se muestran los dias laborales del negocio. Los beneficios aplican unicamente en los dias seleccionados; si no seleccionas ninguno, no se aplican.
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {(diasLaborales.length > 0 ? diasLaborales : TODOS_LOS_DIAS).map((dia) => {
                  const selected = form.apply_days.includes(dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => {
                        const next = selected
                          ? form.apply_days.filter((d) => d !== dia)
                          : [...form.apply_days, dia];
                        setForm({ ...form, apply_days: next });
                      }}
                      style={{
                        padding: "5px 12px", borderRadius: "20px", fontSize: "0.8rem",
                        border: `1.5px solid ${selected ? fixed.color : "#444"}`  ,
                        background: selected ? `${fixed.color}22` : "transparent",
                        color: selected ? fixed.color : "#888",
                        cursor: "pointer", transition: "all 0.15s", fontWeight: selected ? 700 : 400,
                      }}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <footer className="adm-modal__pie">
          <button type="button" className="adm-btn admin-btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="adm-btn admin-btn-primary">Guardar cambios</button>
        </footer>
      </form>
    </div>
  );
};

const Fidelizacion = () => {
  const [dbBadges, setDbBadges] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [modal, setModal]       = useState({ isOpen: false, fixed: null, db: null });
  const [useCustomerBadges, setUseCustomerBadges] = useState(true);
  const [diasLaborales, setDiasLaborales] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, s] = await Promise.all([getBadges(), getSettings(), esperar(timeOut)]);
      setDbBadges(res || []);
      if (s) {
        setUseCustomerBadges(s.useCustomerBadges !== false);
        // day1 viene como array de strings con los dias laborales del negocio
        if (Array.isArray(s.day1)) setDiasLaborales(s.day1);
      }
    } catch (e) {
      Swal.fire({ title: "Error", text: e.message, icon: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (data) => {
    setModal({ isOpen: false, fixed: null, db: null });
    setSaving(true);
    try {
      const toSave = { ...data };
      if (!toSave.id) delete toSave.id;
      await upsertBadge(toSave);
      await loadData();
      Swal.fire({ icon: "success", title: "Insignia guardada", toast: true, position: "top-end", timer: 2000, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ title: "Error al guardar", text: e.message, icon: "error" });
    } finally {
      setSaving(false);
    }
  };

  const toggleMaster = async () => {
    const newState = !useCustomerBadges;
    setSaving(true);
    try {
      await updateSettings({ useCustomerBadges: newState });
      setUseCustomerBadges(newState);
      Swal.fire({ icon: "success", title: "Configuracion actualizada", toast: true, position: "top-end", timer: 2000, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ title: "Error", text: e.message, icon: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingOverlay fullScreen text="Cargando sistema de fidelizacion" minTime={timeOut} />;

  return (
    <div className="admin-page" style={{ position: "relative" }}>
      {saving && <LoadingOverlay text="Guardando..." />}

      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__titulo" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Award size={28} color="#ffcc00" /> Fidelizacion y Experiencia
          </h1>
          <p className="admin-page__sub">Haz clic en una insignia para configurar sus reglas.</p>
        </div>
      </header>

      <div className="admin-main-content">
        <div className="admin-card adm-cfg" style={{ marginBottom: "2rem", width: "100%", maxWidth: "960px" }}>
          <div className="adm-cfg__checks">
            <label className="adm-toggle-fila">
              <input type="checkbox" checked={useCustomerBadges} onChange={toggleMaster} />
              <span>Activar modulo de Insignias y Fidelizacion para los clientes</span>
            </label>
          </div>
          <span className="adm-modal__precio-hint">
            Si se desactiva, los clientes no veran las insignias ni beneficios en la tienda.
          </span>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "1.25rem",
          width: "100%",
          maxWidth: "960px",
        }}>
          {FIXED_BADGES.map((fixed) => {
            const db = matchBadge(dbBadges, fixed.key);
            const isActive = db ? db.is_active !== false : false;
            const configured = !!db;

            return (
              <div
                key={fixed.key}
                onClick={() => setModal({ isOpen: true, fixed, db: db || null })}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `2px solid ${fixed.color}`,
                  borderRadius: "16px",
                  padding: "1.25rem 1rem",
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  boxShadow: `0 4px 18px ${fixed.glow}`,
                  textAlign: "center",
                  opacity: !configured || isActive ? 1 : 0.45,
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = `0 12px 32px ${fixed.glow}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = `0 4px 18px ${fixed.glow}`;
                }}
              >
                <div style={{ position: "absolute", top: 10, right: 10 }}>
                  {!configured ? (
                    <span style={{ fontSize: "0.7rem", color: "#888", background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: "6px" }}>Sin configurar</span>
                  ) : isActive ? (
                    <CheckCircle2 size={18} color="#22c55e" />
                  ) : (
                    <XCircle size={18} color="#ef4444" />
                  )}
                </div>

                <img
                  src={fixed.img}
                  alt={fixed.label}
                  style={{
                    width: 80, height: 80, borderRadius: "50%", objectFit: "cover",
                    border: `3px solid ${fixed.color}`,
                    boxShadow: `0 0 20px ${fixed.glow}`,
                    marginBottom: "0.75rem",
                  }}
                />

                <h3 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 800, color: fixed.color }}>
                  {fixed.label}
                </h3>

                {configured ? (
                  <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "#aaa" }}>
                    {db.required_orders} pedidos requeridos
                  </p>
                ) : (
                  <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "#666" }}>
                    No configurada
                  </p>
                )}

                {configured && (
                  <div style={{ fontSize: "0.78rem", color: "#ccc", lineHeight: 1.4 }}>
                    {db.beneficio && <div style={{ color: fixed.color, fontWeight: 600 }}>{db.beneficio}</div>}
                    {db.discount_percentage > 0 && <div>{db.discount_percentage}% descuento</div>}
                    {db.free_delivery && <div>Envio gratis</div>}
                  </div>
                )}

                <div style={{
                  marginTop: "1rem", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: "6px", fontSize: "0.8rem", color: "#888"
                }}>
                  <Settings2 size={14} />
                  <span>Clic para configurar</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BadgeRulesModal
        isOpen={modal.isOpen}
        fixed={modal.fixed}
        dbBadge={modal.db}
        diasLaborales={diasLaborales}
        onClose={() => setModal({ isOpen: false, fixed: null, db: null })}
        onSave={handleSave}
      />
    </div>
  );
};

export default Fidelizacion;
