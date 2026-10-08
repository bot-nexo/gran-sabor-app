import React, { useState, useEffect } from "react";
import { Sliders, Disc } from "lucide-react";
import ColorPickerField from "./ColorPickerField";

const DIRECTIONS = [
  { id: "180deg", label: "⬇️ Vertical (Arriba a Abajo)" },
  { id: "90deg", label: "➡️ Horizontal (Izq a Der)" },
  { id: "135deg", label: "↘️ Diagonal (Esquina a Esquina)" },
  { id: "45deg", label: "↗️ Diagonal Inversa" },
  { id: "radial", label: "◉ Radial (Centro a Bordes)" },
];

/**
 * Extrae 2 colores aproximados de un string linear-gradient o color sólido
 */
const parseGradientColors = (gradientStr) => {
  if (!gradientStr || typeof gradientStr !== "string") {
    return { color1: "#fdf1f1", color2: "#fecdcd", dir: "180deg", isGradient: false };
  }

  const isGrad = gradientStr.includes("gradient");

  // Detectar dirección
  let dir = "180deg";
  if (gradientStr.includes("radial")) dir = "radial";
  else if (gradientStr.includes("90deg")) dir = "90deg";
  else if (gradientStr.includes("135deg")) dir = "135deg";
  else if (gradientStr.includes("45deg")) dir = "45deg";

  // Extraer hex o rgb
  const hexMatches = gradientStr.match(/#[0-9A-Fa-f]{3,8}/g);
  if (hexMatches && hexMatches.length >= 2) {
    return { color1: hexMatches[0], color2: hexMatches[1], dir, isGradient: isGrad };
  } else if (hexMatches && hexMatches.length === 1) {
    return { color1: hexMatches[0], color2: hexMatches[0], dir, isGradient: isGrad };
  }

  return { color1: "#fdf1f1", color2: "#fecdcd", dir, isGradient: isGrad };
};

const GradientPickerField = ({
  label,
  value,
  onChange,
  description,
  className = "",
}) => {
  const initialParsed = parseGradientColors(value);
  // Modos: "builder" (2 colores) | "solid" (color sólido)
  const [mode, setMode] = useState(initialParsed.isGradient ? "builder" : "solid");

  const [customColor1, setCustomColor1] = useState(initialParsed.color1);
  const [customColor2, setCustomColor2] = useState(initialParsed.color2);
  const [customDir, setCustomDir] = useState(initialParsed.dir);

  // Sincronizar estado interno cuando cambia el valor desde afuera (ej. presets)
  useEffect(() => {
    const p = parseGradientColors(value);
    setCustomColor1(p.color1);
    setCustomColor2(p.color2);
    setCustomDir(p.dir);
    if (p.isGradient && mode !== "builder") {
      setMode("builder");
    } else if (!p.isGradient && mode !== "solid") {
      setMode("solid");
    }
  }, [value]);

  const buildGradientString = (c1, c2, dir) => {
    if (dir === "radial") {
      return `radial-gradient(circle, ${c1} 0%, ${c2} 100%)`;
    }
    return `linear-gradient(${dir}, ${c1} 0%, ${c2} 100%)`;
  };

  const handleSwitchToBuilder = () => {
    setMode("builder");
    const newGradient = buildGradientString(customColor1, customColor2, customDir);
    onChange(newGradient);
  };

  const handleSwitchToSolid = () => {
    setMode("solid");
    onChange(customColor1 || "#fdfbf7");
  };

  const handleColor1Change = (c1) => {
    setCustomColor1(c1);
    const grad = buildGradientString(c1, customColor2, customDir);
    onChange(grad);
  };

  const handleColor2Change = (c2) => {
    setCustomColor2(c2);
    const grad = buildGradientString(customColor1, c2, customDir);
    onChange(grad);
  };

  const handleDirChange = (dir) => {
    setCustomDir(dir);
    const grad = buildGradientString(customColor1, customColor2, dir);
    onChange(grad);
  };

  return (
    <div className={`gradient-field-container ${className}`}>
      {/* Encabezado */}
      <div className="gradient-field__header">
        <div className="color-field__label-wrap">
          <span className="admin-field__label" style={{ margin: 0 }}>{label}</span>
          {description && <span className="color-field__desc">{description}</span>}
        </div>

        {/* Píldora con Live Preview del Fondo Actual */}
        <div
          className="gradient-field__preview-pill"
          style={{ background: value || "#fecdcd" }}
          title={`Fondo actual: ${value}`}
        />
      </div>

      {/* Selector de Modos Reducido (Solo 2 Opciones 100% Funcionales) */}
      <div className="gradient-field__mode-nav">
        <button
          type="button"
          className={`gradient-field__mode-btn ${mode === "builder" ? "gradient-field__mode-btn--active" : ""}`}
          onClick={handleSwitchToBuilder}
        >
          <Sliders size={13} /> Creador 2 Colores
        </button>
        <button
          type="button"
          className={`gradient-field__mode-btn ${mode === "solid" ? "gradient-field__mode-btn--active" : ""}`}
          onClick={handleSwitchToSolid}
        >
          <Disc size={13} /> Color Sólido
        </button>
      </div>

      {/* CONTENIDO DEL MODO */}
      <div className="gradient-field__body">
        {/* MODO 1: CREADOR 2 COLORES */}
        {mode === "builder" && (
          <div className="gradient-field__builder">
            <div className="gradient-field__builder-row">
              <ColorPickerField
                label="Color Inicial (Color 1)"
                value={customColor1}
                onChange={handleColor1Change}
              />
              <ColorPickerField
                label="Color Final (Color 2)"
                value={customColor2}
                onChange={handleColor2Change}
              />
            </div>

            <div className="admin-field" style={{ marginTop: "0.5rem" }}>
              <span className="admin-field__label">Dirección del Gradiente</span>
              <select
                value={customDir}
                onChange={(e) => handleDirChange(e.target.value)}
                className="admin-field__input"
              >
                {DIRECTIONS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="gradient-field__builder-preview" style={{ background: value }}>
              <span className="gradient-field__builder-preview-label">Muestra del Gradiente ({customDir})</span>
            </div>
          </div>
        )}

        {/* MODO 2: COLOR SÓLIDO */}
        {mode === "solid" && (
          <div className="gradient-field__solid-box">
            <ColorPickerField
              label="Color Sólido del Fondo"
              value={value && !value.includes("gradient") ? value : customColor1}
              onChange={(newColor) => {
                setCustomColor1(newColor);
                onChange(newColor);
              }}
              description="Aplica un color plano, uniforme y limpio."
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GradientPickerField;
