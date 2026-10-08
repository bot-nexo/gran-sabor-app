import React from "react";
import { Home, Compass, UtensilsCrossed, MessageCircle, Star, Award } from "lucide-react";
import Swal from "sweetalert2";
import "../css/BottomNavigation.css";
import { isLoyaltyEnabled } from "../utils/badges";

const BottomNavigation = ({ cartCount = 0, onOpenCart, onNavigateMenu, whatsappNumber, settings, customer, onOpenCustomerModal, mesaMode = false }) => {
  const handleScrollTo = (elementId) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };



  return (
    <nav className="saborio-bottom-nav" aria-label="Navegación fija de la app">
      <div className="saborio-bottom-nav__container">
        {/* 1. Inicio */}
        <button
          type="button"
          className="saborio-nav-item saborio-nav-item--active"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <Home size={21} className="saborio-nav-icon" />
          <span className="saborio-nav-label">Inicio</span>
        </button>

        {/* 2. Explorar */}
        <button
          type="button"
          className="saborio-nav-item"
          onClick={() => handleScrollTo("menu")}
        >
          <Compass size={21} className="saborio-nav-icon" />
          <span className="saborio-nav-label">Explorar</span>
        </button>

        {/* 3. Botón Central Flotante (FAB): Mi Pedido */}
        <div className="saborio-nav-fab-wrapper">
          <button
            type="button"
            className="saborio-nav-fab"
            onClick={onOpenCart}
            aria-label="Abrir mi pedido"
          >
            <div className="saborio-nav-fab-inner">
              <UtensilsCrossed size={22} className="saborio-fab-icon" />
              {cartCount > 0 && (
                <span className="saborio-fab-badge">{cartCount}</span>
              )}
            </div>
          </button>
          <span className="saborio-fab-label">Mi pedido</span>
        </div>


        {/* 4. Nivel del Cliente */}
        {!mesaMode && isLoyaltyEnabled(settings) && (
          <button
            type="button"
            className="saborio-nav-item"
            onClick={onOpenCustomerModal}
          >
            <div className="relative">
              <Award size={21} className="saborio-nav-icon" />
              {customer?.nombre && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse border border-neutral-900" />
              )}
            </div>
            <span className="saborio-nav-label">Nivel</span>
          </button>
        )}

        {/* 5. Calificar */}
        {!mesaMode && (
        <button
          type="button"
          className="saborio-nav-item"
          onClick={() => window.dispatchEvent(new CustomEvent("open-rating"))}
        >
          <Star size={21} className="saborio-nav-icon" />
          <span className="saborio-nav-label">Calificar</span>
        </button>
        )}
        {/* 5. Contacto */}
        <button
          type="button"
          className="saborio-nav-item"
          onClick={() => {
            const contactEl = document.getElementById("contacto");
            if (contactEl) {
              contactEl.scrollIntoView({ behavior: "smooth" });
            } else if (whatsappNumber) {
              window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`, "_blank");
            } else {
              window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
            }
          }}
          aria-label="Contacto y WhatsApp"
        >
          <MessageCircle size={21} className="saborio-nav-icon" />
          <span className="saborio-nav-label">Contacto</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;
