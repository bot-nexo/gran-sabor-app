import { useState, useEffect } from "react";
import "./LoadingOverlay.css";

/**
 * @param {string} text - Texto descriptivo opcional.
 * @param {number} minTime - Tiempo mínimo en milisegundos para mostrar el loader (por defecto 1s).
 * @param {object} settings - Objeto opcional de configuración de empresa.
 */
const LoadingOverlay = ({
  text = "Cargando...",
  minTime = 1000,
  settings = null
}) => {

  const [mostrar, setMostrar] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMostrar(false);
    }, minTime);

    return () => clearTimeout(timer);
  }, [minTime]);

  if (!mostrar) return null;

  return (
    <div className="app-loader-overlay">
      <div className="app-loader-backdrop" />

      <div className="app-loader-content">
        <div className="app-loader-spinner-ring">
          {/*<div className="app-loader-logo-wrap">
             <img src={logoSrc} alt="Logo" className="app-loader-logo" /> 
          </div>*/}
        </div>

        <div className="app-loader-info">
          <h1 className="app-loader-title">
            {settings?.razonSocial?.toUpperCase() || "Nexo Menú"}
          </h1>
        </div>

        <div className="app-loader-progress">
          <div className="app-loader-track">
            <div className="app-loader-bar" />
          </div>
          <p className="app-loader-status">
            {/* {text} */}
            Cargando ...

          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;