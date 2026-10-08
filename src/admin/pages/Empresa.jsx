import { useEffect, useRef, useState } from "react";
import { Loader2, Save, Upload, X, Clock } from "lucide-react";
import Swal from "sweetalert2";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { getSettings, updateSettings } from "../../data/dataSource";
import { uploadLogoImage, deleteProductImage } from "../../services/storage";
import "../admin.css";

// ── Campos de texto simples (sin lógica especial) ───────────────────────────
const CAMPOS_TEXTO = [
  { clave: "phone",      label: "WhatsApp de pedidos",   placeholder: "573157978326", pista: "Con indicativo de país, sin espacios ni '+' (ej: 573157978326). Aquí llegan los pedidos." },
  { clave: "address",    label: "Dirección del negocio",  placeholder: "Cl. 101c #74-40, Pedregal, Medellín" },
  { clave: "mapsGoogle", label: "Enlace de Google Maps",  placeholder: "https://maps.app.goo.gl/…" },
  { clave: "instagram",  label: "Instagram (URL)",         placeholder: "https://www.instagram.com/…" },
  { clave: "facebook",   label: "Facebook (URL)",          placeholder: "https://www.facebook.com/…" },
  { clave: "tiktok",     label: "TikTok (URL)",            placeholder: "https://www.tiktok.com/@…" },
  { clave: "slogan",     label: "Eslogan",                 placeholder: "El verdadero sabor del pavé" },
  { clave: "razonSocial",label: "Razón Social",              placeholder: "El Nombre legal o comercial" },
];

// ── Helpers de hora ──────────────────────────────────────────────────────────

/** Genera las 48 opciones de media hora (00:00, 00:30 ... 23:30) en formato 12h */
const OPCIONES_HORA = (() => {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const periodo = h < 12 ? "AM" : "PM";
      const h12 = h % 12 || 12;
      const label = `${h12}:${m === 0 ? "00" : "30"} ${periodo}`;
      // value = el string parcial que irá en el campo "HH:MM AM/PM"
      opts.push({ value: label, label });
    }
  }
  return opts;
})();

/**
 * Parsea un string tipo "12:00 M - 08:00 PM" o "10:00 AM - 09:30 PM"
 * y devuelve { apertura, cierre } como strings del selector, o vacíos.
 */
const parsearHorarioASelectores = (hours1 = "") => {
  const partes = (hours1 || "").split(/\s*[-–]\s*/);
  if (partes.length !== 2) return { apertura: "", cierre: "" };

  const normalizar = (txt) => {
    // "12:00 M" → "12:00 PM",  "8:00 PM" → "8:00 PM"
    const m = txt.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|M)$/i);
    if (!m) return "";
    let h = parseInt(m[1], 10);
    const min = m[2];
    const suf = m[3].toUpperCase();
    const periodo = suf === "M" ? "PM" : suf; // M = mediodía = PM
    const h12 = h % 12 || 12;
    // Buscar la opción más cercana disponible
    const candidato = `${h12}:${min} ${periodo}`;
    return OPCIONES_HORA.some((o) => o.value === candidato) ? candidato : "";
  };

  return {
    apertura: normalizar(partes[0]),
    cierre:   normalizar(partes[1]),
  };
};

/** Construye el string hours1 desde los dos selectores. */
const buildHours1 = (apertura, cierre) => {
  if (!apertura || !cierre) return "";
  return `${apertura} - ${cierre}`;
};

// ── Componente principal ─────────────────────────────────────────────────────
const Empresa = () => {
  const [form, setForm] = useState(null);
  // Selectores de hora (estado separado para no mezclar con los campos de texto)
  const [horaApertura, setHoraApertura] = useState("");
  const [horaCierre,   setHoraCierre]   = useState("");
  // Días de atención
  const [diasAtencion, setDiasAtencion] = useState([]);
  
  // Logo
  const [nuevoLogo,   setNuevoLogo]   = useState(null);   // File
  const [vistaPrevia, setVistaPrevia] = useState(null);   // blob URL
  const [logoUrlPrevio, setLogoUrlPrevio] = useState(""); // URL actual en BD
  const inputLogoRef = useRef(null);

  const [cargando,  setCargando]  = useState(true);
  const [guardando, setGuardando] = useState(false);
  const timeOut = 1500;
  const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    const cargarEmpresa = async () => {
      setCargando(true);
      try {
        const [s] = await Promise.all([getSettings(), esperar(timeOut)]);
        setForm(
          Object.fromEntries(CAMPOS_TEXTO.map(({ clave }) => [clave, s[clave] || ""]))
        );
        // Separar el campo hours1 en los dos selectores
        const { apertura, cierre } = parsearHorarioASelectores(s.hours1);
        setHoraApertura(apertura);
        setHoraCierre(cierre);
        
        // Parsear días de atención (si es un array JSON)
        try {
          if (Array.isArray(s.day1)) {
            setDiasAtencion(s.day1);
          } else if (typeof s.day1 === "string" && s.day1.trim().startsWith("[")) {
            setDiasAtencion(JSON.parse(s.day1));
          } else {
            setDiasAtencion([1,2,3,4,5,6]); // Default Lunes a Sábado si es un texto legacy
          }
        } catch(e) {
          setDiasAtencion([1,2,3,4,5,6]);
        }

        // Logo actual
        setLogoUrlPrevio(s.logo_url || "");
        setVistaPrevia(s.logo_url || null);
      } catch (e) {
        Swal.fire({ title: "Error al cargar", text: e.message, icon: "error", confirmButtonColor: "#3D2314" });
      } finally {
        setCargando(false);
      }
    };
    cargarEmpresa();
  }, []);

  const set = (clave, valor) => setForm((f) => ({ ...f, [clave]: valor }));

  // ── Selección de logo ──────────────────────────────────────────────────────
  const avisoDemoImagen = (e) => {
    if (e) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
      if (e.target && e.target.value) e.target.value = "";
    }
    Swal.fire({
      icon: "info",
      title: "Modo Demostración",
      text: "En esta versión demo no está permitida la carga o modificación de imágenes.",
      confirmButtonColor: "#3D2314",
    });
  };

  const elegirLogo = (e) => {
    avisoDemoImagen(e);
  };

  const quitarLogo = (e) => {
    avisoDemoImagen(e);
  };

  // ── Guardar ────────────────────────────────────────────────────────────────
  const guardar = async (e) => {
    e.preventDefault();
    if (!form.phone.trim()) {
      Swal.fire({
        icon: "warning",
        text: "El WhatsApp de pedidos es obligatorio (sin él la tienda no puede enviar pedidos).",
        confirmButtonColor: "#3D2314",
      });
      return;
    }

    setGuardando(true);
    try {
      // Construir el string hours1 desde los selectores
      const hours1 = buildHours1(horaApertura, horaCierre);
      const day1 = JSON.stringify(diasAtencion);

      const payload = { ...form, hours1, day1 };

      // Subir logo si hay uno nuevo seleccionado
      if (nuevoLogo) {
        payload.logo_url = await uploadLogoImage(nuevoLogo, logoUrlPrevio);
        setLogoUrlPrevio(payload.logo_url);
        setNuevoLogo(null);
      } else if (!vistaPrevia && logoUrlPrevio) {
        // El admin quitó el logo → borrar del bucket y limpiar en BD
        deleteProductImage(logoUrlPrevio);
        payload.logo_url = "";
        setLogoUrlPrevio("");
      }

      await Promise.all([updateSettings(payload), esperar(timeOut)]);

      Swal.fire({
        icon: "success",
        title: "Información actualizada",
        text: "La tienda refleja los cambios en segundos.",
        toast: true,
        position: "top-end",
        timer: 2400,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({ title: "No se pudo guardar", text: err.message, icon: "error", confirmButtonColor: "#3D2314" });
    } finally {
      setGuardando(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (cargando || !form) {
    return (
      <div className="adm-page" style={{ minHeight: "80vh", position: "relative" }}>
        <LoadingOverlay fullScreen text="Cargando empresa" minTime={timeOut} />
      </div>
    );
  }

  //*********************************** */
  return (
    <div className="admin-page" style={{ position: "relative" }}>
      {guardando && <LoadingOverlay text="Sincronizando empresa" minTime={timeOut} />}

      <header className="admin-page__header admin-page__header--row">
        <div>
          <h1 className="admin-page__titulo">Empresa</h1>
          <p className="admin-page__sub">Información y apariencia.</p>
        </div>
      </header>

      <div className="admin-main-content">
        <form className="admin-card adm-cfg" onSubmit={guardar}>
          <div className="admin-field-contenedor">

            {/* ── Logo del negocio ─────────────────────────────────────── */}
            <label className="admin-field">
              <span className="admin-field__label">Logo del negocio</span>
              <div className="adm-logo-uploader">
                {vistaPrevia ? (
                  <div className="adm-logo-preview">
                    <img src={vistaPrevia} alt="Logo actual" className="adm-logo-preview__img" />
                    <div className="adm-logo-preview__acciones">
                      <button
                        type="button"
                        className="admin-btn-ghost adm-logo-preview__cambiar"
                        onClick={avisoDemoImagen}
                      >
                        <Upload size={14} /> Cambiar logo
                      </button>
                      <button
                        type="button"
                        className="adm-icono-btn adm-icono-btn--peligro"
                        title="Quitar logo"
                        onClick={avisoDemoImagen}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="adm-logo-drop"
                    onClick={avisoDemoImagen}
                  >
                    <Upload size={22} className="adm-logo-drop__icon" />
                    <span>Subir logo</span>
                    <small>PNG, JPG, WEBP (Demo)</small>
                  </button>
                )}
              </div>
            </label>

            {/* ── Campos de texto simples ───────────────────────────────── */}
            {CAMPOS_TEXTO.map(({ clave, label, placeholder, pista }) => (
              <label key={clave} className="admin-field">
                <span className="admin-field__label">{label}</span>
                <div className="admin-field__input">
                  <input
                    type="text"
                    value={form[clave]}
                    onChange={(e) => set(clave, e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
                {pista && <span className="adm-modal__precio-hint">{pista}</span>}
              </label>
            ))}

            {/* ── Días de atención (Pills) ────────────────────────────── */}
            <label className="admin-field">
              <span className="admin-field__label">Días de atención</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "5px" }}>
                {[
                  { id: 1, label: "Lun" },
                  { id: 2, label: "Mar" },
                  { id: 3, label: "Mié" },
                  { id: 4, label: "Jue" },
                  { id: 5, label: "Vie" },
                  { id: 6, label: "Sáb" },
                  { id: 0, label: "Dom" },
                ].map((dia) => {
                  const isSelected = diasAtencion.includes(dia.id);
                  return (
                    <button
                      key={dia.id}
                      type="button"
                      onClick={() => {
                        if (!isSelected) {
                          setDiasAtencion((prev) => [...prev, dia.id]);
                        } else {
                          setDiasAtencion((prev) => prev.filter((d) => d !== dia.id));
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "20px",
                        border: isSelected ? "1px solid #ffcc00" : "1px solid rgba(255,255,255,0.1)",
                        backgroundColor: isSelected ? "rgba(255,204,0,0.1)" : "rgba(255,255,255,0.02)",
                        color: isSelected ? "#ffcc00" : "#a3a3a3",
                        fontWeight: isSelected ? "bold" : "normal",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        fontSize: "0.85rem",
                      }}
                    >
                      {dia.label}
                    </button>
                  );
                })}
              </div>
              <span className="adm-modal__precio-hint" style={{ marginTop: "8px", display: "block" }}>
                Selecciona los días en los que tu negocio presta servicio.
              </span>
            </label>

            {/* ── Horario: selectores de apertura y cierre ─────────────── */}
            <label className="admin-field">
              <span className="admin-field__label">
                <Clock size={14} style={{ verticalAlign: "middle", marginRight: 5 }} />
                Horario de atención
              </span>
              <div className="adm-horario-selectores">
                <div className="adm-horario-selectores__grupo">
                  <span className="adm-horario-selectores__etiq">Apertura</span>
                  <select
                    className="adm-prod__select"
                    value={horaApertura}
                    onChange={(e) => setHoraApertura(e.target.value)}
                  >
                    <option value="">— selecciona —</option>
                    {OPCIONES_HORA.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <span className="adm-horario-selectores__sep">–</span>
                <div className="adm-horario-selectores__grupo">
                  <span className="adm-horario-selectores__etiq">Cierre</span>
                  <select
                    className="adm-prod__select"
                    value={horaCierre}
                    onChange={(e) => setHoraCierre(e.target.value)}
                  >
                    <option value="">— selecciona —</option>
                    {OPCIONES_HORA.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {horaApertura && horaCierre && (
                <span className="adm-modal__precio-hint">
                  Se guardará como: <strong>{buildHours1(horaApertura, horaCierre)}</strong> · el badge del catálogo lo leerá automáticamente.
                </span>
              )}
              {(!horaApertura || !horaCierre) && (
                <span className="adm-modal__precio-hint">
                  Selecciona ambas horas para que el badge de abierto/cerrado funcione correctamente.
                </span>
              )}
            </label>

          </div>

          <div className="adm-cfg__pie">
            <button
              type="submit"
              className="admin-btn-primary admin-btn-primary--compacto"
              disabled={guardando}
            >
              {guardando ? <Loader2 size={15} className="adm-spin" /> : <Save size={15} />}
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Empresa;