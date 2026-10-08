import React, { useMemo } from "react";
import { Check } from "lucide-react";

// Paleta de colores rápidos recomendados para la app
const BRAND_SWATCHES = [
  { color: "#d92b38", label: "Fresa Pavé" },
  { color: "#3d2314", label: "Chocolate Intenso" },
  { color: "#fdfbf7", label: "Crema Vainilla" },
  { color: "#fecdcd", label: "Rosa Suave" },
  { color: "#d4af37", label: "Dorado Gourmet" },
  { color: "#2e7d32", label: "Verde Menta" },
  { color: "#ff4d6d", label: "Rosa Vibrante" },
  { color: "#0f172a", label: "Pizarra Oscuro" },
  { color: "#ffffff", label: "Blanco Puro" },
  { color: "#140e0a", label: "Choco Noir" },
  { color: "#7a6353", label: "Marrón Suave" },
  { color: "#e2e8f0", label: "Gris Borde" },
];

/**
 * Convierte valores como rgba(r, g, b, a) o hex corto a hex #rrggbb para el input[type="color"]
 */
const toHexForPicker = (val) => {
  if (!val || typeof val !== "string") return "#d92b38";
  const trimmed = val.trim();

  // Si ya es #rrggbb
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return trimmed;
  }
  // Si es #rgb
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    const r = trimmed[1], g = trimmed[2], b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  // Si es rgba(...) o rgb(...)
  const rgbMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10)).toString(16).padStart(2, "0");
    const g = Math.min(255, parseInt(rgbMatch[2], 10)).toString(16).padStart(2, "0");
    const b = Math.min(255, parseInt(rgbMatch[3], 10)).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }

  return "#d92b38";
};

const ColorPickerField = ({
  label,
  value,
  onChange,
  description,
  placeholder = "#d92b38",
  swatches = BRAND_SWATCHES,
  className = "",
}) => {
  const safeHex = useMemo(() => toHexForPicker(value), [value]);

  const handlePickerChange = (e) => {
    onChange(e.target.value);
  };

  const handleTextChange = (e) => {
    onChange(e.target.value);
  };

  const isCurrentSwatch = (swatchColor) => {
    return (value || "").toLowerCase() === swatchColor.toLowerCase();
  };

  return (
    <div className={`color-field-container ${className}`}>
      {label && (
        <div className="color-field__label-wrap">
          <span className="admin-field__label" style={{ margin: 0 }}>{label}</span>
          {description && <span className="color-field__desc">{description}</span>}
        </div>
      )}

      <div className="color-field__input-row">
        {/* Swatch interactivo con input color nativo encima */}
        <div className="color-field__picker-box" style={{ backgroundColor: value || safeHex }}>
          <input
            type="color"
            value={safeHex}
            onChange={handlePickerChange}
            className="color-field__native-input"
            title="Abrir selector de color visual"
          />
        </div>

        {/* Input de texto para código HEX o RGBA */}
        <div className="color-field__text-wrap">
          <input
            type="text"
            value={value || ""}
            onChange={handleTextChange}
            placeholder={placeholder}
            className="admin-field__input color-field__text-input"
          />
        </div>
      </div>

      {/* Mini paleta de colores rápidos recomendados */}
      {swatches && swatches.length > 0 && (
        <div className="color-field__swatches-tray" title="Colores rápidos sugeridos">
          {swatches.map((s) => {
            const active = isCurrentSwatch(s.color);
            return (
              <button
                key={s.color}
                type="button"
                className={`color-field__swatch-dot ${active ? "color-field__swatch-dot--active" : ""}`}
                style={{ backgroundColor: s.color }}
                onClick={() => onChange(s.color)}
                title={`${s.label} (${s.color})`}
              >
                {active && (
                  <Check
                    size={10}
                    color={["#ffffff", "#fdfbf7", "#fecdcd", "#e2e8f0"].includes(s.color) ? "#3d2314" : "#ffffff"}
                    strokeWidth={3}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ColorPickerField;
