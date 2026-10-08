import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Swal from "sweetalert2";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import {
  Palette, LayoutGrid, Type, Sparkles, Save, RotateCcw, Eye,
  Monitor, Smartphone, Check, Store, Compass, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle, Layers, Focus, Globe, Gift, Tag, Sliders,
} from "lucide-react";
import {
  getCatalogDesign, updateCatalogDesign, getProducts, getCategories,
  getSettings, subscribeToCatalog, DEFAULT_CATALOG_DESIGN,
} from "../../data/dataSource";
import { estaAbiertoSegunHorario } from "../../utils/horario";
import Hero from "../../components/Hero";
import Promociones from "../../components/Promociones";
import Menu from "../../components/Menu";
import Combos from "../../components/Combos";
import Footer from "../../components/Footer";
import ColorPickerField from "../components/ColorPickerField";
import GradientPickerField from "../components/GradientPickerField";
import "../admin.css";

// PRESETS
const PRESETS = [
  {
    name: "Paves Gourmet", emoji: "🍓", desc: "Oficial Paves: chocolate oscuro, crema y oro",
    accent: "#ffcc00", bg: "#0d0805",
    values: {
      appBg:"#0d0805", fontFamily:"Montserrat",
      heroBg:"linear-gradient(180deg, #0d0805 0%, #140c08 100%)",
      heroHeaderBg:"rgba(13, 8, 5, 0.85)", heroCtaBg:"#ffcc00", heroCtaText:"#120a06",
      heroBadgeBg:"rgba(255, 204, 0, 0.15)", heroBadgeText:"#ffcc00",
      heroFloatCartBg:"#ffcc00", heroFloatCartText:"#120a06",
      promotionsBg:"#120a06", promotionsCardBg:"#180e09", promotionsAccent:"#ffcc00",
      combosBg:"#0f0906", combosCardBg:"#180e09", combosAccent:"#d92b38",
      bgColor:"#0d0805", cardBg:"#160e0a",
      ignored2:"rgba(255, 204, 0, 0.12)", ignored1:"#ffcc00",
      textPrimary:"#fdfbf7", textMuted:"#bda899",
      borderColor:"rgba(255, 255, 255, 0.08)", cardRadius:"22px", cardShadow:"md",
      btnPrimaryBg:"#ffcc00", btnPrimaryText:"#120a06",
      btnDetailsBg:"rgba(255, 255, 255, 0.05)", btnDetailsText:"#e2d5cc",
      btnDetailsBorder:"rgba(255, 255, 255, 0.12)",
      priceTagBg:"#ffcc00", priceTagText:"#120a06",
      badgePopularBg:"#ffcc00", badgePopularText:"#120a06",
      categoryBarBg:"rgba(20, 12, 8, 0.9)", categoryActiveBg:"#ffcc00",
      categoryActiveText:"#120a06", categoryInactiveBg:"transparent", categoryInactiveText:"#bda899",
      columnsDesktop:"auto", columnsMobile:"1", cardLayout:"vertical", imageAspectRatio:"16/11",
      footerBg:"linear-gradient(180deg, #0d0805 0%, #060402 100%)",
      footerText:"rgba(253, 251, 247, 0.7)", footerAccent:"#ffcc00",
    },
  },
  {
    name: "Choco Noir & Gold", emoji: "🍫", desc: "Oscuro chocolate con acentos dorados gourmet",
    accent: "#d4af37", bg: "#140e0a",
    values: {
      appBg:"#140e0a", fontFamily:"Playfair Display",
      heroBg:"linear-gradient(180deg, #1c1410 0%, #2b1e17 100%)",
      heroHeaderBg:"rgba(43, 30, 23, 0.85)", heroCtaBg:"#d4af37", heroCtaText:"#1c1410",
      heroBadgeBg:"rgba(212, 175, 55, 0.2)", heroBadgeText:"#e5c058",
      heroFloatCartBg:"#d4af37", heroFloatCartText:"#1c1410",
      promotionsBg:"#1c1410", promotionsCardBg:"#2b1e17", promotionsAccent:"#d4af37",
      combosBg:"#18110d", combosCardBg:"#2b1e17", combosAccent:"#d4af37",
      bgColor:"#1c1410", cardBg:"#2b1e17",
      ignored2:"rgba(212, 175, 55, 0.15)", ignored1:"#e5c058",
      textPrimary:"#fdfbf7", textMuted:"#d4c5b9",
      borderColor:"rgba(212, 175, 55, 0.25)", cardRadius:"16px", cardShadow:"md",
      btnPrimaryBg:"#d4af37", btnPrimaryText:"#1c1410",
      btnDetailsBg:"transparent", btnDetailsText:"#e5c058",
      btnDetailsBorder:"rgba(212, 175, 55, 0.4)",
      priceTagBg:"#d4af37", priceTagText:"#1c1410",
      badgePopularBg:"#d4af37", badgePopularText:"#1c1410",
      categoryBarBg:"rgba(43, 30, 23, 0.8)", categoryActiveBg:"#d4af37",
      categoryActiveText:"#1c1410", categoryInactiveBg:"transparent", categoryInactiveText:"#d4c5b9",
      columnsDesktop:"auto", columnsMobile:"1", cardLayout:"vertical", imageAspectRatio:"4/3",
      footerBg:"#0f0a07", footerText:"rgba(245, 235, 225, 0.7)", footerAccent:"#d4af37",
    },
  },
  {
    name: "Pasteleria Rosa", emoji: "🌸", desc: "Tonos dulces, pasteles y blancos luminosos",
    accent: "#ff4d6d", bg: "#fff5f7",
    values: {
      appBg:"#fff5f7", fontFamily:"Poppins",
      heroBg:"linear-gradient(180deg, #fff0f3 0%, #ffccd5 100%)",
      heroHeaderBg:"rgba(255, 255, 255, 0.85)", heroCtaBg:"#ff4d6d", heroCtaText:"#ffffff",
      heroBadgeBg:"rgba(255, 77, 109, 0.15)", heroBadgeText:"#ff4d6d",
      heroFloatCartBg:"#590d22", heroFloatCartText:"#ffffff",
      promotionsBg:"#fff0f3", promotionsCardBg:"#ffffff", promotionsAccent:"#ff4d6d",
      combosBg:"#fff5f7", combosCardBg:"#ffffff", combosAccent:"#ff4d6d",
      bgColor:"#fff0f3", cardBg:"#ffffff",
      ignored2:"rgba(255, 77, 109, 0.12)", ignored1:"#ff4d6d",
      textPrimary:"#590d22", textMuted:"#a4133c",
      borderColor:"rgba(255, 77, 109, 0.15)", cardRadius:"24px", cardShadow:"lg",
      btnPrimaryBg:"#ff4d6d", btnPrimaryText:"#ffffff",
      btnDetailsBg:"transparent", btnDetailsText:"#590d22",
      btnDetailsBorder:"rgba(255, 77, 109, 0.25)",
      priceTagBg:"#800f2f", priceTagText:"#ffffff",
      badgePopularBg:"#ff4d6d", badgePopularText:"#ffffff",
      categoryBarBg:"rgba(255, 255, 255, 0.85)", categoryActiveBg:"#ff4d6d",
      categoryActiveText:"#ffffff", categoryInactiveBg:"transparent", categoryInactiveText:"#a4133c",
      columnsDesktop:"auto", columnsMobile:"1", cardLayout:"vertical", imageAspectRatio:"4/3",
      footerBg:"linear-gradient(180deg, #2b0813 0%, #150308 100%)",
      footerText:"rgba(255, 225, 235, 0.8)", footerAccent:"#ff4d6d",
    },
  },
  {
    name: "Organico Verde", emoji: "🍃", desc: "Frescura botanica, verdes naturales y saludables",
    accent: "#2e7d32", bg: "#f4fbf6",
    values: {
      appBg:"#f4fbf6", fontFamily:"Outfit",
      heroBg:"linear-gradient(180deg, #e8f5e9 0%, #c8e6c9 100%)",
      heroHeaderBg:"rgba(255, 255, 255, 0.85)", heroCtaBg:"#2e7d32", heroCtaText:"#ffffff",
      heroBadgeBg:"rgba(46, 125, 50, 0.15)", heroBadgeText:"#2e7d32",
      heroFloatCartBg:"#1b5e20", heroFloatCartText:"#ffffff",
      promotionsBg:"#e8f5e9", promotionsCardBg:"#ffffff", promotionsAccent:"#2e7d32",
      combosBg:"#f1f8f3", combosCardBg:"#ffffff", combosAccent:"#2e7d32",
      bgColor:"#e8f5e9", cardBg:"#ffffff",
      ignored2:"rgba(46, 125, 50, 0.15)", ignored1:"#2e7d32",
      textPrimary:"#1b5e20", textMuted:"#388e3c",
      borderColor:"rgba(46, 125, 50, 0.15)", cardRadius:"18px", cardShadow:"md",
      btnPrimaryBg:"#2e7d32", btnPrimaryText:"#ffffff",
      btnDetailsBg:"transparent", btnDetailsText:"#1b5e20",
      btnDetailsBorder:"rgba(46, 125, 50, 0.25)",
      priceTagBg:"#1b5e20", priceTagText:"#ffffff",
      badgePopularBg:"#2e7d32", badgePopularText:"#ffffff",
      categoryBarBg:"rgba(255, 255, 255, 0.85)", categoryActiveBg:"#2e7d32",
      categoryActiveText:"#ffffff", categoryInactiveBg:"transparent", categoryInactiveText:"#388e3c",
      columnsDesktop:"auto", columnsMobile:"1", cardLayout:"vertical", imageAspectRatio:"4/3",
      footerBg:"linear-gradient(180deg, #0d2810 0%, #051408 100%)",
      footerText:"rgba(235, 250, 240, 0.75)", footerAccent:"#4caf50",
    },
  },
  {
    name: "Minimal Blanco", emoji: "⬜", desc: "Alto contraste, limpio y ultra profesional",
    accent: "#0f172a", bg: "#ffffff",
    values: {
      appBg:"#ffffff", fontFamily:"Inter",
      heroBg:"linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
      heroHeaderBg:"rgba(255, 255, 255, 0.9)", heroCtaBg:"#0f172a", heroCtaText:"#ffffff",
      heroBadgeBg:"rgba(15, 23, 42, 0.08)", heroBadgeText:"#0f172a",
      heroFloatCartBg:"#0f172a", heroFloatCartText:"#ffffff",
      promotionsBg:"#f8fafc", promotionsCardBg:"#ffffff", promotionsAccent:"#0f172a",
      combosBg:"#f1f5f9", combosCardBg:"#ffffff", combosAccent:"#0f172a",
      bgColor:"#f8fafc", cardBg:"#ffffff",
      ignored2:"rgba(15, 23, 42, 0.08)", ignored1:"#0f172a",
      textPrimary:"#0f172a", textMuted:"#64748b",
      borderColor:"rgba(226, 232, 240, 1)", cardRadius:"12px", cardShadow:"sm",
      btnPrimaryBg:"#0f172a", btnPrimaryText:"#ffffff",
      btnDetailsBg:"transparent", btnDetailsText:"#0f172a",
      btnDetailsBorder:"rgba(203, 213, 225, 1)",
      priceTagBg:"#0f172a", priceTagText:"#ffffff",
      badgePopularBg:"#0f172a", badgePopularText:"#ffffff",
      categoryBarBg:"#ffffff", categoryActiveBg:"#0f172a",
      categoryActiveText:"#ffffff", categoryInactiveBg:"transparent", categoryInactiveText:"#64748b",
      columnsDesktop:"auto", columnsMobile:"1", cardLayout:"vertical", imageAspectRatio:"4/3",
      footerBg:"#0f172a", footerText:"rgba(241, 245, 249, 0.8)", footerAccent:"#94a3b8",
    },
  },
  {
    name: "Fast Food Neon", emoji: "🍔", desc: "Energetico, vibrante, amarillo y rojo neon",
    accent: "#ffd600", bg: "#1a1a1a",
    values: {
      appBg:"#111111", fontFamily:"Poppins",
      heroBg:"linear-gradient(180deg, #1a1a1a 0%, #2d1f00 100%)",
      heroHeaderBg:"rgba(17, 17, 17, 0.9)", heroCtaBg:"#ffd600", heroCtaText:"#111111",
      heroBadgeBg:"rgba(255, 214, 0, 0.18)", heroBadgeText:"#ffd600",
      heroFloatCartBg:"#e53935", heroFloatCartText:"#ffffff",
      promotionsBg:"#1a1a1a", promotionsCardBg:"#262626", promotionsAccent:"#ffd600",
      combosBg:"#141414", combosCardBg:"#262626", combosAccent:"#e53935",
      bgColor:"#1a1a1a", cardBg:"#262626",
      ignored2:"rgba(255, 214, 0, 0.12)", ignored1:"#ffd600",
      textPrimary:"#ffffff", textMuted:"#aaaaaa",
      borderColor:"rgba(255, 214, 0, 0.2)", cardRadius:"10px", cardShadow:"lg",
      btnPrimaryBg:"#ffd600", btnPrimaryText:"#111111",
      btnDetailsBg:"transparent", btnDetailsText:"#ffd600",
      btnDetailsBorder:"rgba(255, 214, 0, 0.4)",
      priceTagBg:"#e53935", priceTagText:"#ffffff",
      badgePopularBg:"#ffd600", badgePopularText:"#111111",
      categoryBarBg:"rgba(26, 26, 26, 0.95)", categoryActiveBg:"#ffd600",
      categoryActiveText:"#111111", categoryInactiveBg:"transparent", categoryInactiveText:"#aaaaaa",
      columnsDesktop:"3", columnsMobile:"2", cardLayout:"vertical", imageAspectRatio:"1/1",
      footerBg:"#0a0a0a", footerText:"rgba(255, 255, 255, 0.65)", footerAccent:"#ffd600",
    },
  },
];

// FONT PAIRS
const FONT_PAIRS = [
  { id: "Montserrat", label: "Moderna", subtitle: "Montserrat - Limpia y geometrica", preview: "Montserrat" },
  { id: "Inter", label: "Tech / SaaS", subtitle: "Inter - Ultra legible para catalogos", preview: "Inter" },
  { id: "Poppins", label: "Amigable", subtitle: "Poppins - Redondeada y accesible", preview: "Poppins" },
  { id: "Playfair Display", label: "Gourmet Clasico", subtitle: "Playfair Display - Elegancia editorial", preview: "Playfair Display" },
  { id: "Outfit", label: "Organica", subtitle: "Outfit - Moderna con calidez", preview: "Outfit" },
];

const CARD_STYLES = [
  { id: "md", label: "Moderno", desc: "Sombra suave y profundidad", icon: "◻" },
  { id: "flat", label: "Flat", desc: "Borde delgado, sin sombra", icon: "▭" },
  { id: "none", label: "Minimo", desc: "Sin borde ni fondo", icon: "—" },
];

const RADIUS_OPTIONS = [
  { id: "0px", label: "Ninguno", preview: "0px" },
  { id: "8px", label: "Suave", preview: "8px" },
  { id: "16px", label: "Redondeado", preview: "16px" },
  { id: "24px", label: "Pildora", preview: "24px" },
];

const DESKTOP_COLS = [
  { id: "auto", label: "Auto", icon: "⣿", desc: "Adaptable" },
  { id: "2", label: "2 Col", icon: "■■", desc: "Grandes y destacadas" },
  { id: "3", label: "3 Col", icon: "■■■", desc: "Equilibrado" },
  { id: "4", label: "4 Col", icon: "■■■■", desc: "Compacto" },
];

const MOBILE_COLS = [
  { id: "1", label: "1 Col", icon: "■", desc: "Clasico vertical" },
  { id: "2", label: "2 Col", icon: "■■", desc: "Catalogo compacto" },
];

const CARD_LAYOUTS = [
  { id: "vertical", label: "Imagen Arriba", icon: "🖼" },
  { id: "horizontal", label: "Imagen Lateral", icon: "▣" },
];

const ASPECT_RATIOS = [
  { id: "1/1", label: "1:1", desc: "Cuadrado" },
  { id: "4/3", label: "4:3", desc: "Estandar" },
  { id: "16/9", label: "16:9", desc: "Panoramico" },
  { id: "16/11", label: "16:11", desc: "Compacto" },
];

// WCAG contrast utilities
const hexToRgb = (hex) => {
  if (!hex || typeof hex !== "string") return null;
  const clean = hex.trim().replace(/^#/, "");
  if (clean.length === 3) {
    return { r: parseInt(clean[0]+clean[0],16), g: parseInt(clean[1]+clean[1],16), b: parseInt(clean[2]+clean[2],16) };
  }
  if (clean.length === 6) {
    return { r: parseInt(clean.slice(0,2),16), g: parseInt(clean.slice(2,4),16), b: parseInt(clean.slice(4,6),16) };
  }
  return null;
};

const getLuminance = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r,g,b] = [rgb.r/255, rgb.g/255, rgb.b/255].map(c => c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4));
  return 0.2126*r + 0.7152*g + 0.0722*b;
};

const getContrastRatio = (hex1, hex2) => {
  const l1=getLuminance(hex1), l2=getLuminance(hex2);
  const bright=Math.max(l1,l2), dark=Math.min(l1,l2);
  return (bright+0.05)/(dark+0.05);
};

// ContrastBadge component
const ContrastBadge = ({ fg, bg, label }) => {
  if (!fg || !bg) return null;
  const ratio = getContrastRatio(fg, bg);
  const ratioFixed = ratio.toFixed(1);
  const isAA = ratio >= 4.5;
  const isAAA = ratio >= 7;
  return (
    <div className="diseno-contrast-badge" title={"Ratio: " + ratioFixed + ":1"}>
      {isAA
        ? <CheckCircle size={11} className="diseno-contrast-icon--ok" />
        : <AlertTriangle size={11} className="diseno-contrast-icon--warn" />
      }
      <span className={"diseno-contrast-label " + (isAA ? "ok" : "warn")}>
        {isAAA ? "AAA" : isAA ? "AA" : "Bajo"} {ratioFixed}:1
      </span>
      {label && <span className="diseno-contrast-field-label">{label}</span>}
    </div>
  );
};

// TokenColorField component
const TokenColorField = ({ label, desc, value, onChange, contrastWith, contrastLabel }) => {
  const safeHex = (value && /^#[0-9A-Fa-f]{3,6}$/.test(value.trim())) ? value.trim() : "#d92b38";
  return (
    <div className="diseno-token-field">
      {label && (
        <div className="diseno-token-field__header">
          <label className="diseno-token-field__label">{label}</label>
          {contrastWith && <ContrastBadge fg={safeHex} bg={contrastWith} label={contrastLabel} />}
        </div>
      )}
      {desc && <p className="diseno-token-field__desc">{desc}</p>}
      <div className="diseno-token-field__row">
        <div className="diseno-token-field__swatch" style={{ backgroundColor: value || safeHex }}>
          <input
            type="color"
            value={safeHex}
            onChange={(e) => onChange(e.target.value)}
            className="diseno-token-field__native"
            title="Seleccionar color"
          />
        </div>
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="admin-field__input diseno-token-field__text"
        />
        {contrastWith && <ContrastBadge fg={safeHex} bg={contrastWith} label={contrastLabel} />}
      </div>
    </div>
  );
};

// Accordion section
const AccordionSection = ({ title, icon: Icon, children, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div className="diseno-accordion">
      <button
        type="button"
        className="diseno-accordion__trigger"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="diseno-accordion__title">
          {Icon && <Icon size={15} />} {title}
        </span>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      {open && <div className="diseno-accordion__content">{children}</div>}
    </div>
  );
};

// MAIN COMPONENT
const Diseno = () => {
  const [form, setForm] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [previewMode, setPreviewMode] = useState("section");
  const [activeTab, setActiveTab] = useState("temas");

  const heroRef = useRef(null);
  const promosRef = useRef(null);
  const menuRef = useRef(null);
  const combosRef = useRef(null);
  const footerRef = useRef(null);
  const viewportRef = useRef(null);

  const cargarDatos = useCallback(async () => {
    try {
      const [d, prods, cats, sett] = await Promise.all([
        getCatalogDesign(), getProducts(), getCategories(), getSettings(),
      ]);
      setForm(d || { ...DEFAULT_CATALOG_DESIGN });
      setProducts(prods || []);
      setCategories(cats || []);
      setSettings(sett || {});
    } catch (e) {
      Swal.fire({ title: "Error al cargar datos", text: e.message, icon: "error", confirmButtonColor: "#3D2314" });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
    const unsubscribe = subscribeToCatalog(() => cargarDatos());
    return () => unsubscribe();
  }, [cargarDatos]);

  useEffect(() => {
    if (previewMode !== "full") return;
    const timer = setTimeout(() => {
      const refMap = { hero: heroRef, promos: promosRef, menu: menuRef, combos: combosRef, footer: footerRef };
      const target = refMap[activeTab];
      if (target?.current) target.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => clearTimeout(timer);
  }, [activeTab, previewMode]);

  const estadoNegocio = useMemo(() => estaAbiertoSegunHorario(settings), [settings]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const applyPreset = (preset) => {
    setForm(prev => ({ ...prev, ...preset.values }));
    Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Tema aplicado: " + preset.name, showConfirmButton: false, timer: 1800 });
  };

  const resetToDefaults = () => {
    Swal.fire({
      title: "Restablecer diseno?",
      text: "Se restauraran los colores y estilos originales.",
      icon: "warning", showCancelButton: true,
      confirmButtonText: "Si, restablecer", cancelButtonText: "Cancelar",
      confirmButtonColor: "#d92b38", cancelButtonColor: "#666",
    }).then(res => {
      if (res.isConfirmed) {
        setForm({ ...DEFAULT_CATALOG_DESIGN });
        Swal.fire({ toast: true, position: "top-end", icon: "info", title: "Diseno restablecido", showConfirmButton: false, timer: 1600 });
      }
    });
  };

  const guardar = async (e) => {
    if (e) e.preventDefault();
    setGuardando(true);
    try {
      await updateCatalogDesign(form);
      Swal.fire({ icon: "success", title: "Diseno guardado!", text: "Cambios publicados en tiempo real.", confirmButtonColor: "#3D2314" });
    } catch (err) {
      Swal.fire({ title: "Error al guardar", text: err.message, icon: "error", confirmButtonColor: "#3D2314" });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando || !form) return <LoadingOverlay fullScreen text="Cargando estudio de diseno..." />;

  const TABS = [
    { id: "temas", label: "Temas & Estilo", icon: Sparkles },
    { id: "tipografia", label: "Tipografia", icon: Type },
    { id: "layout", label: "Layout", icon: LayoutGrid },
    { id: "avanzado", label: "Avanzado", icon: Sliders },
  ];

  return (
    <div className="admin-page admin-page--diseno">
      {guardando && <LoadingOverlay text="Publicando diseno del catalogo..." />}

      <header className="admin-page__header">
        <div className="admin-page__header-title-wrap">
          <h1 className="admin-page__titulo">Personalizador del Catalogo</h1>
          <p className="admin-page__sub">Configura la apariencia de tu tienda en menos de 2 minutos.</p>
        </div>
        <div className="admin-page__header-actions" style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="admin-btn-ghost" onClick={resetToDefaults} title="Restablecer">
            <RotateCcw size={15} /> Restablecer
          </button>
          <button type="button" className="admin-btn-primary admin-btn-primary--compacto" onClick={guardar} disabled={guardando}>
            <Save size={15} /> Guardar Todo
          </button>
        </div>
      </header>

      <div className="diseno-workspace">
        {/* PANEL IZQUIERDO */}
        <div className="diseno-controls-panel">
          <nav className="diseno-tabs" role="tablist">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id} type="button" role="tab"
                aria-selected={activeTab === id}
                className={"diseno-tab " + (activeTab === id ? "diseno-tab--active" : "")}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </nav>

          <div className="diseno-tab-content admin-card">
            {/* TAB TEMAS */}
            {activeTab === "temas" && (
              <div className="diseno-fields-group">
                <div>
                  <h3 className="diseno-group-title"><Sparkles size={16} /> Temas por Nicho — 1 Clic</h3>
                  <p className="diseno-group-desc">Cada tema aplica automaticamente colores, fuente y estilos de tu tienda.</p>
                  <div className="diseno-presets-grid-v2">
                    {PRESETS.map((p) => (
                      <button key={p.name} type="button" className="diseno-preset-card" onClick={() => applyPreset(p)} title={p.desc}>
                        <div className="diseno-preset-card__strip" style={{ background: "linear-gradient(135deg, " + p.bg + " 50%, " + p.accent + " 100%)" }}>
                          <span className="diseno-preset-card__emoji">{p.emoji}</span>
                        </div>
                        <div className="diseno-preset-card__body">
                          <strong className="diseno-preset-card__name">{p.name}</strong>
                          <span className="diseno-preset-card__desc">{p.desc}</span>
                          <div className="diseno-preset-card__swatches">
                            <span style={{ background: p.bg }} title="Fondo" />
                            <span style={{ background: p.accent }} title="Acento" />
                            <span style={{ background: p.values.textPrimary }} title="Texto" />
                            <span style={{ background: p.values.cardBg }} title="Tarjeta" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="diseno-group-title" style={{ marginTop: "0.5rem" }}><Palette size={16} /> Paleta de Marca — 4 Tokens Globales</h3>
                  <p className="diseno-group-desc">Estos 4 colores controlan toda la tienda. El sistema propaga los cambios automaticamente.</p>
                  <div className="diseno-tokens-grid">
                    <div className="diseno-token-card diseno-token-card--accent">
                      <div className="diseno-token-card__badge">01</div>
                      <p className="diseno-token-card__role">Color Primario / Acento</p>
                      <p className="diseno-token-card__hint">Botones, precios, badges, enlaces</p>
                      <TokenColorField
                        label="Color acento"
                        value={form.btnPrimaryBg}
                        onChange={(v) => {
                          handleChange("btnPrimaryBg", v);
                          handleChange("priceTagBg", v);
                          handleChange("badgePopularBg", v);
                          handleChange("categoryActiveBg", v);
                          handleChange("promotionsAccent", v);
                          handleChange("combosAccent", v);
                          handleChange("footerAccent", v);
                          handleChange("heroCtaBg", v);
                        }}
                        contrastWith={form.btnPrimaryText}
                        contrastLabel="sobre boton"
                      />
                      <p className="diseno-token-card__subhint">Texto sobre acento:</p>
                      <TokenColorField
                        label=""
                        value={form.btnPrimaryText}
                        onChange={(v) => {
                          handleChange("btnPrimaryText", v);
                          handleChange("priceTagText", v);
                          handleChange("badgePopularText", v);
                          handleChange("categoryActiveText", v);
                          handleChange("heroCtaText", v);
                        }}
                        contrastWith={form.btnPrimaryBg}
                      />
                    </div>
                    <div className="diseno-token-card">
                      <div className="diseno-token-card__badge">02</div>
                      <p className="diseno-token-card__role">Fondo General</p>
                      <p className="diseno-token-card__hint">Fondo de toda la tienda y seccion menu</p>
                      <TokenColorField
                        label=""
                        value={form.bgColor}
                        onChange={(v) => {
                          handleChange("bgColor", v);
                          handleChange("appBg", v);
                          handleChange("promotionsBg", v);
                          handleChange("combosBg", v);
                        }}
                        contrastWith={form.textPrimary}
                        contrastLabel="texto/fondo"
                      />
                    </div>
                    <div className="diseno-token-card">
                      <div className="diseno-token-card__badge">03</div>
                      <p className="diseno-token-card__role">Tarjetas / Superficies</p>
                      <p className="diseno-token-card__hint">Fondo de tarjetas de productos</p>
                      <TokenColorField
                        label=""
                        value={form.cardBg}
                        onChange={(v) => {
                          handleChange("cardBg", v);
                          handleChange("promotionsCardBg", v);
                          handleChange("combosCardBg", v);
                        }}
                        contrastWith={form.textPrimary}
                        contrastLabel="texto/tarjeta"
                      />
                    </div>
                    <div className="diseno-token-card">
                      <div className="diseno-token-card__badge">04</div>
                      <p className="diseno-token-card__role">Texto Principal</p>
                      <p className="diseno-token-card__hint">Titulos, nombres de productos</p>
                      <TokenColorField
                        label=""
                        value={form.textPrimary}
                        onChange={(v) => { handleChange("textPrimary", v); }}
                        contrastWith={form.bgColor}
                        contrastLabel="sobre fondo"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB TIPOGRAFIA */}
            {activeTab === "tipografia" && (
              <div className="diseno-fields-group">
                <h3 className="diseno-group-title"><Type size={16} /> Tipografia y Modo Visual</h3>

                <div>
                  <p className="diseno-token-card__hint" style={{ marginBottom: "0.75rem" }}>Fuente Pre-emparejada</p>
                  <div className="diseno-font-grid">
                    {FONT_PAIRS.map((f) => (
                      <button
                        key={f.id} type="button"
                        className={"diseno-font-card " + (form.fontFamily === f.id ? "diseno-font-card--active" : "")}
                        onClick={() => handleChange("fontFamily", f.id)}
                        style={{ fontFamily: f.preview }}
                      >
                        <span className="diseno-font-card__label">{f.label}</span>
                        <span className="diseno-font-card__name">{f.subtitle}</span>
                        <span className="diseno-font-card__preview">Aa Bb 123</span>
                        {form.fontFamily === f.id && <span className="diseno-font-card__check"><Check size={12} /></span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="diseno-token-card__hint" style={{ marginBottom: "0.75rem" }}>Estilo Visual de Tarjetas</p>
                  <div className="diseno-style-grid">
                    {CARD_STYLES.map((s) => (
                      <button
                        key={s.id} type="button"
                        className={"diseno-style-btn " + (form.cardShadow === s.id ? "diseno-style-btn--active" : "")}
                        onClick={() => handleChange("cardShadow", s.id)}
                      >
                        <span className="diseno-style-btn__icon">{s.icon}</span>
                        <span className="diseno-style-btn__label">{s.label}</span>
                        <span className="diseno-style-btn__desc">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="diseno-token-card__hint" style={{ marginBottom: "0.75rem" }}>Borde Redondeado</p>
                  <div className="diseno-radius-grid">
                    {RADIUS_OPTIONS.map((r) => (
                      <button
                        key={r.id} type="button"
                        className={"diseno-radius-btn " + (form.cardRadius === r.id ? "diseno-radius-btn--active" : "")}
                        onClick={() => handleChange("cardRadius", r.id)}
                      >
                        <div className="diseno-radius-btn__preview" style={{ borderRadius: r.preview }} />
                        <span className="diseno-radius-btn__label">{r.label}</span>
                        <span className="diseno-radius-btn__val">{r.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <AccordionSection title="Fondo Global de la Aplicacion" icon={Layers}>
                  <GradientPickerField
                    label="Fondo del Body / App Completa"
                    value={form.appBg}
                    onChange={(v) => handleChange("appBg", v)}
                    description="Color o gradiente base visible en todo el viewport."
                  />
                </AccordionSection>
              </div>
            )}

            {/* TAB LAYOUT */}
            {activeTab === "layout" && (
              <div className="diseno-fields-group">
                <h3 className="diseno-group-title"><LayoutGrid size={16} /> Estructura y Layout del Catalogo</h3>

                <div>
                  <p className="diseno-token-card__hint" style={{ marginBottom: "0.6rem" }}>Columnas en Desktop</p>
                  <div className="diseno-col-grid">
                    {DESKTOP_COLS.map((c) => (
                      <button key={c.id} type="button"
                        className={"diseno-col-btn " + (form.columnsDesktop === c.id ? "diseno-col-btn--active" : "")}
                        onClick={() => handleChange("columnsDesktop", c.id)}
                      >
                        <span className="diseno-col-btn__icon">{c.icon}</span>
                        <span className="diseno-col-btn__label">{c.label}</span>
                        <span className="diseno-col-btn__desc">{c.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="diseno-token-card__hint" style={{ marginBottom: "0.6rem" }}>Columnas en Movil</p>
                  <div className="diseno-col-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    {MOBILE_COLS.map((c) => (
                      <button key={c.id} type="button"
                        className={"diseno-col-btn " + (form.columnsMobile === c.id ? "diseno-col-btn--active" : "")}
                        onClick={() => handleChange("columnsMobile", c.id)}
                      >
                        <span className="diseno-col-btn__icon">{c.icon}</span>
                        <span className="diseno-col-btn__label">{c.label}</span>
                        <span className="diseno-col-btn__desc">{c.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="diseno-token-card__hint" style={{ marginBottom: "0.6rem" }}>Formato de Tarjeta</p>
                  <div className="diseno-col-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    {CARD_LAYOUTS.map((l) => (
                      <button key={l.id} type="button"
                        className={"diseno-col-btn " + (form.cardLayout === l.id ? "diseno-col-btn--active" : "")}
                        onClick={() => handleChange("cardLayout", l.id)}
                      >
                        <span className="diseno-col-btn__icon">{l.icon}</span>
                        <span className="diseno-col-btn__label">{l.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="diseno-token-card__hint" style={{ marginBottom: "0.6rem" }}>Proporcion de Imagen</p>
                  <div className="diseno-ratio-grid">
                    {ASPECT_RATIOS.map((r) => (
                      <button key={r.id} type="button"
                        className={"diseno-ratio-btn " + (form.imageAspectRatio === r.id ? "diseno-ratio-btn--active" : "")}
                        onClick={() => handleChange("imageAspectRatio", r.id)}
                      >
                        <div className="diseno-ratio-btn__preview" style={{ aspectRatio: r.id.replace("/", " / ") }} />
                        <span className="diseno-ratio-btn__label">{r.label}</span>
                        <span className="diseno-ratio-btn__desc">{r.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB AVANZADO */}
            {activeTab === "avanzado" && (
              <div className="diseno-fields-group">
                <h3 className="diseno-group-title"><Sliders size={16} /> Ajustes Avanzados por Seccion</h3>
                <p className="diseno-group-desc">Control granular para disenadores. Modifica colores individuales de cada seccion.</p>

                <AccordionSection title="Hero & Cabecera" icon={Compass}>
                  <GradientPickerField label="Fondo del Hero" value={form.heroBg} onChange={(v) => handleChange("heroBg", v)} description="Fondo de la portada principal." />
                  <ColorPickerField label="Header Glass (Barra navegacion)" value={form.heroHeaderBg} onChange={(v) => handleChange("heroHeaderBg", v)} placeholder="rgba(255,255,255,0.72)" description="Efecto cristal translucido detras del logotipo." />
                  <div className="diseno-grid-2">
                    <ColorPickerField label="Boton CTA (Fondo)" value={form.heroCtaBg} onChange={(v) => handleChange("heroCtaBg", v)} />
                    <ColorPickerField label="Boton CTA (Texto)" value={form.heroCtaText} onChange={(v) => handleChange("heroCtaText", v)} />
                  </div>
                  <div className="diseno-grid-2">
                    <ColorPickerField label="Carrito Flotante (Fondo)" value={form.heroFloatCartBg} onChange={(v) => handleChange("heroFloatCartBg", v)} />
                    <ColorPickerField label="Carrito Flotante (Texto)" value={form.heroFloatCartText} onChange={(v) => handleChange("heroFloatCartText", v)} />
                  </div>
                  <div className="diseno-grid-2">
                    <ColorPickerField label="Badge Destacado (Fondo)" value={form.heroBadgeBg} onChange={(v) => handleChange("heroBadgeBg", v)} placeholder="rgba(255,255,255,0.92)" />
                    <ColorPickerField label="Badge Destacado (Texto)" value={form.heroBadgeText} onChange={(v) => handleChange("heroBadgeText", v)} />
                  </div>
                </AccordionSection>

                <AccordionSection title="Menu y Tarjetas" icon={LayoutGrid}>
                  <div className="diseno-grid-2">
                    <ColorPickerField label="Fondo Seccion Menu" value={form.bgColor} onChange={(v) => handleChange("bgColor", v)} />
                    <ColorPickerField label="Fondo de Tarjeta" value={form.cardBg} onChange={(v) => handleChange("cardBg", v)} />
                  </div>
                  <div className="diseno-grid-2">
                    <ColorPickerField label="Texto Titulos" value={form.textPrimary} onChange={(v) => handleChange("textPrimary", v)} />
                    <ColorPickerField label="Texto Descripciones" value={form.textMuted} onChange={(v) => handleChange("textMuted", v)} />
                  </div>
                  <div className="diseno-grid-2">
                    <ColorPickerField label="Boton + Agregar (Fondo)" value={form.btnPrimaryBg} onChange={(v) => handleChange("btnPrimaryBg", v)} />
                    <ColorPickerField label="Boton + Agregar (Texto)" value={form.btnPrimaryText} onChange={(v) => handleChange("btnPrimaryText", v)} />
                  </div>
                  <div className="diseno-grid-2">
                    <ColorPickerField label="Precio (Fondo)" value={form.priceTagBg} onChange={(v) => handleChange("priceTagBg", v)} />
                    <ColorPickerField label="Precio (Texto)" value={form.priceTagText} onChange={(v) => handleChange("priceTagText", v)} />
                  </div>
                  <div className="diseno-grid-2">
                    <ColorPickerField label="Badge Popular (Fondo)" value={form.badgePopularBg} onChange={(v) => handleChange("badgePopularBg", v)} />
                    <ColorPickerField label="Badge Popular (Texto)" value={form.badgePopularText} onChange={(v) => handleChange("badgePopularText", v)} />
                  </div>
                  <div className="diseno-grid-2">
                    <ColorPickerField label="Barra Categorias (Fondo)" value={form.categoryBarBg} onChange={(v) => handleChange("categoryBarBg", v)} placeholder="rgba(255,255,255,0.7)" />
                    <ColorPickerField label="Categoria Activa (Fondo)" value={form.categoryActiveBg} onChange={(v) => handleChange("categoryActiveBg", v)} />
                  </div>
                  <div className="diseno-grid-2">
                    <ColorPickerField label="Categoria Activa (Texto)" value={form.categoryActiveText} onChange={(v) => handleChange("categoryActiveText", v)} />
                    <ColorPickerField label="Categorias Inactivas (Texto)" value={form.categoryInactiveText} onChange={(v) => handleChange("categoryInactiveText", v)} />
                  </div>
                  <ColorPickerField label="Color de Bordes" value={form.borderColor} onChange={(v) => handleChange("borderColor", v)} placeholder="rgba(61,35,20,0.08)" />
                </AccordionSection>

                <AccordionSection title="Boton Ver Detalles" icon={Eye}>
                  <div className="diseno-grid-2">
                    <ColorPickerField label="Fondo" value={form.btnDetailsBg} onChange={(v) => handleChange("btnDetailsBg", v)} />
                    <ColorPickerField label="Texto" value={form.btnDetailsText} onChange={(v) => handleChange("btnDetailsText", v)} />
                  </div>
                  <ColorPickerField label="Borde" value={form.btnDetailsBorder} onChange={(v) => handleChange("btnDetailsBorder", v)} placeholder="rgba(255,255,255,0.15)" />
                </AccordionSection>

                <AccordionSection title="Promociones" icon={Tag}>
                  <div className="diseno-grid-2">
                    <ColorPickerField label="Fondo Seccion" value={form.promotionsBg} onChange={(v) => handleChange("promotionsBg", v)} />
                    <ColorPickerField label="Fondo Tarjeta" value={form.promotionsCardBg} onChange={(v) => handleChange("promotionsCardBg", v)} />
                  </div>
                  <ColorPickerField label="Color de Acento" value={form.promotionsAccent} onChange={(v) => handleChange("promotionsAccent", v)} />
                </AccordionSection>

                <AccordionSection title="Combos & Packs" icon={Gift}>
                  <div className="diseno-grid-2">
                    <ColorPickerField label="Fondo Seccion" value={form.combosBg} onChange={(v) => handleChange("combosBg", v)} />
                    <ColorPickerField label="Fondo Tarjeta" value={form.combosCardBg} onChange={(v) => handleChange("combosCardBg", v)} />
                  </div>
                  <ColorPickerField label="Color de Acento" value={form.combosAccent} onChange={(v) => handleChange("combosAccent", v)} />
                </AccordionSection>

                <AccordionSection title="Footer / Pie de Pagina" icon={Store}>
                  <GradientPickerField label="Fondo del Footer" value={form.footerBg} onChange={(v) => handleChange("footerBg", v)} description="Gradiente o color para la seccion final." />
                  <div className="diseno-grid-2">
                    <ColorPickerField label="Textos del Footer" value={form.footerText} onChange={(v) => handleChange("footerText", v)} placeholder="rgba(255,255,255,0.7)" />
                    <ColorPickerField label="Acento / Marca" value={form.footerAccent} onChange={(v) => handleChange("footerAccent", v)} />
                  </div>
                </AccordionSection>
              </div>
            )}

          </div>
        </div>

        {/* PANEL DERECHO: SIMULADOR */}
        <aside className="diseno-preview-panel">
          <div className="diseno-preview-header">
            <div className="diseno-preview-title"><Eye size={16} /><span>Vista Previa en Vivo</span></div>
            <div className="diseno-preview-controls-row">
              <div className="diseno-mode-toggle">
                <button type="button" className={"diseno-mode-btn " + (previewMode === "section" ? "diseno-mode-btn--active" : "")} onClick={() => setPreviewMode("section")} title="Seccion activa">
                  <Focus size={13} /> Seccion
                </button>
                <button type="button" className={"diseno-mode-btn " + (previewMode === "full" ? "diseno-mode-btn--active" : "")} onClick={() => setPreviewMode("full")} title="Catalogo completo">
                  <Globe size={13} /> Completo
                </button>
              </div>
              <div className="diseno-device-toggle">
                <button type="button" className={"diseno-device-btn " + (previewDevice === "desktop" ? "diseno-device-btn--active" : "")} onClick={() => setPreviewDevice("desktop")} title="Desktop">
                  <Monitor size={14} /> Desktop
                </button>
                <button type="button" className={"diseno-device-btn " + (previewDevice === "mobile" ? "diseno-device-btn--active" : "")} onClick={() => setPreviewDevice("mobile")} title="Movil">
                  <Smartphone size={14} /> Movil
                </button>
              </div>
            </div>
          </div>

          <div
            ref={viewportRef}
            className={"diseno-preview-viewport " + (previewDevice === "mobile" ? "diseno-preview-viewport--mobile" : "")}
            style={{ backgroundColor: form.appBg || "#fdfbf7", fontFamily: form.fontFamily }}
          >
            {previewMode === "section" && (
              <div>
                {(activeTab === "temas" || activeTab === "tipografia") && (
                  <div>
                    <div className="diseno-section-badge"><Sparkles size={14} /> Vista Global: Tema Completo</div>
                    <Hero cartCount={1} onOpenCart={() => {}} estadoNegocio={estadoNegocio} design={form} products={products} settings={settings} />
                    <Menu data={products.slice(0, 4)} categories={categories} selectedProduct={null} setSelectedProduct={() => {}} addToCart={() => {}} design={form} />
                    <Footer settings={settings} design={form} />
                  </div>
                )}
                {activeTab === "layout" && (
                  <div>
                    <div className="diseno-section-badge"><LayoutGrid size={14} /> Menu y Tarjetas ({products.length} productos)</div>
                    <Menu data={products} categories={categories} selectedProduct={null} setSelectedProduct={() => {}} addToCart={() => {}} design={form} />
                  </div>
                )}
                {activeTab === "avanzado" && (
                  <div>
                    <div className="diseno-section-badge"><Sliders size={14} /> Vista: Catalogo Completo</div>
                    <Hero cartCount={2} onOpenCart={() => {}} estadoNegocio={estadoNegocio} design={form} products={products} settings={settings} />
                    <Menu data={products.slice(0, 6)} categories={categories} selectedProduct={null} setSelectedProduct={() => {}} addToCart={() => {}} design={form} />
                    <Footer settings={settings} design={form} />
                  </div>
                )}
              </div>
            )}
            {previewMode === "full" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div ref={heroRef} style={{ scrollMarginTop: "15px" }}>
                  <Hero cartCount={1} onOpenCart={() => {}} estadoNegocio={estadoNegocio} design={form} products={products} settings={settings} />
                </div>
                <div ref={promosRef} style={{ scrollMarginTop: "15px" }}>
                  <Promociones design={form} />
                </div>
                <div ref={menuRef} style={{ scrollMarginTop: "15px" }}>
                  <Menu data={products} categories={categories} selectedProduct={null} setSelectedProduct={() => {}} addToCart={() => {}} design={form} />
                </div>
                <div ref={combosRef} style={{ scrollMarginTop: "15px" }}>
                  <Combos design={form} onAddToCart={() => {}} />
                </div>
                <div ref={footerRef} style={{ scrollMarginTop: "15px" }}>
                  <Footer settings={settings} design={form} />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Diseno;
