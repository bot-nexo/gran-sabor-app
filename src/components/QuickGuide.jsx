import React, { useState, useEffect } from "react";
import { X, PlayCircle } from "lucide-react";
import "../css/QuickGuide.css";
import help from "../assets/images/GifHelp.gif"

const QuickGuide = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasClickedGuide, setHasClickedGuide] = useState(true);

  useEffect(() => {
    const clicked = localStorage.getItem("hasClickedGuide");
    setHasClickedGuide(!!clicked);
  }, []);

  const openGuide = () => {
    setIsModalOpen(true);
    if (!hasClickedGuide) {
      localStorage.setItem("hasClickedGuide", "true");
      setHasClickedGuide(true);
    }
  };

  //***************************** */
  return (
    <>
      <div className="quick-guide-banner" onClick={openGuide}>
        <div className="qg-banner-content">
          <span>🎥 ¿Cómo pedir fácilmente?</span>
        </div>
        {!hasClickedGuide && <div className="qg-pulsing-badge"></div>}
      </div>

      {isModalOpen && (
        <div className="qg-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="qg-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="qg-close-btn" onClick={() => setIsModalOpen(false)}>
              <X size={20} />
            </button>
            <h3 className="qg-modal-title">¡Es muy fácil pedir!</h3>

            <div className="qg-video-container">
              <img
                src={help}
                alt="Guía de pedido"
                className="qg-gif"
                onError={(e) => { e.target.src = "https://via.placeholder.com/300x500?text=Guia+Animada"; }}
              />
            </div>

            <ul className="qg-steps">
              <li>
                <span>🍨</span>
                <span>Elige tu pavé o torta favorita.</span>
              </li>
              <li>
                <span>📅</span>
                <span>Selecciona la fecha de entrega si es un pedido programado.</span>
              </li>
              <li>
                <span>🛵</span>
                <span>Completa tu dirección y ¡listo!</span>
              </li>
            </ul>

            <button className="qg-action-btn" onClick={() => setIsModalOpen(false)}>
              ¡Entendido, ir al menú!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickGuide;
