
import { useState, useEffect } from "react";
import "./LoadingOverlay.css";

/**
 * @param {string} text - Texto descriptivo opcional.
 * @param {number} minTime - Tiempo mínimo en milisegundos para mostrar el loader (por defecto 2s).
 */
const LoadingOverlay = ({
  text = "Cargando...",
  minTime = 1000,
  settings = null
}) => {
  const logoSrc = "/logo.png";
  const [mostrar, setMostrar] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMostrar(false);
    }, minTime);

    return () => clearTimeout(timer); // Limpia el temporizador si el componente se desmonta antes
  }, [minTime]);

  if (!mostrar) return null;

  //********************************** */
  return (
    <div id="pm-loader" className="pm-loader-wrapper">
      <div className="pm-backdrop">
        <div className="pm-nebula pm-nebula-gold"></div>
        <div className="pm-nebula pm-nebula-pink"></div>
      </div>

      <div className="pm-center">
        <div className="pm-rings-container">
          <div className="pm-conic-ring"></div>
          <div className="pm-pulse-ring"></div>
          <div className="pm-orbit-satellite"></div>
        </div>

        <div className="pm-emblem-wrap">
          <div className="pm-sheen-layer"></div>

          <img src={logoSrc} alt="" className="pm-badge-img" />
          <div className="pm-glint pm-glint-1">✦</div>
          <div className="pm-glint pm-glint-2">✦</div>
        </div>

        <div className="pm-brand-info">
          <h1 className="pm-title">{settings?.razonSocial?.toUpperCase() || "BIENVENIDO"}</h1>
        </div>

        <div className="pm-progress-container">
          <div className="pm-track">
            <div className="pm-fill"></div>
          </div>
          <div className="pm-status-row">
            <span className="pm-status-label">{text}
              <span className="pm-dots-indicator"><span>•</span><span>•</span><span>•</span><span>•</span></span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;

