import { useState, useEffect } from "react";
import { Plus, Eye, Sparkles, X, Star, Flame, Heart } from "lucide-react";
import { formatCOP } from "../utils/price";
import "../css/MenuCard.css";

const MenuCard = ({
  product,
  isDetailsOpen,
  onToggleDetails,
  onAddToCart,
  design,
  settings
}) => {
  const formattedPrice = formatCOP(product.precio ?? 0);
  // Precio de referencia original tachado si tiene descuento o calculado sugerido
  const originalPrice = product.precioOriginal
    ? formatCOP(product.precioOriginal)
    : product.descuento
      ? formatCOP(Math.round((product.precio ?? 0) * 1.25))
      : null;

  const imageSrc = product.imagen || "/images/placeholder.png";
  const titleText = product.nombre || "Postre";
  const descriptionText =
    product.descripcion ||
    "Delicioso postre artesanal preparado con crema y Leche Klim.";

  const layoutClass =
    design?.cardLayout === "horizontal" ? "menu-card--layout-horizontal" : "";
  const shadowClass = `menu-card--shadow-${design?.cardShadow || "md"}`;

  return (
    <article
      className={`menu-card ${layoutClass} ${shadowClass} ${isDetailsOpen ? "menu-card--open" : ""}`}
      aria-expanded={isDetailsOpen}
    >
      <div className="menu-card__inner">
        {/* Imagen Gourmet con Badges y Botón de Favorito */}
        <div className="menu-card__media">
          <img
            src={imageSrc}
            alt={titleText}
            className="menu-card__image"
            loading="lazy"
          />
          <div className="menu-card__media-overlay" aria-hidden="true" />

          {/* Badges Flotantes Estilo Saborio */}
          <div className="menu-card__badges-wrap">
            {product.descuento ? (
              <span className="saborio-badge-discount">
                {product.descuento}
              </span>
            ) : product.destacado ? (
              <span className="saborio-badge-popular">
                <Flame size={12} className="saborio-badge-icon" />
                Más popular
              </span>
            ) : null}
          </div>
        </div>

        {/* Contenido de la Tarjeta */}
        <div className="menu-card__content">
          <div className="menu-card__body">
            <h3 className="menu-card__title">{titleText}</h3>
            <p className="menu-card__description">{descriptionText}</p>

            {product.nota && (
              <span className="menu-card__nota">
                <Sparkles size={12} />
                {product.nota}
              </span>
            )}
          </div>

          {/* Pie de Tarjeta Estilo Saborio: Precio Dorado + Botón Circular (+) */}
          <div className="menu-card__footer">
            <div className="menu-card__price-box">
              {originalPrice && (
                <span className="menu-card__price-old">{originalPrice}</span>
              )}
              <span className="menu-card__price">{formattedPrice}</span>
            </div>

            <div className="menu-card__actions">
              <button
                type="button"
                className="menu-card__btn-details"
                onClick={onToggleDetails}
                aria-expanded={isDetailsOpen}
                aria-controls={`menu-card-details-${product.id}`}
                title="Ver ingredientes y detalles"
              >
                <Eye size={15} />
                <span>Info</span>
              </button>

              {/* Botón Circular Rápido (+) Estilo Saborio */}
              <button
                type="button"
                className="saborio-quick-add-btn"
                onClick={() => onAddToCart(product)}
                aria-label={`Agregar ${titleText} al carrito`}
                title="Añadir al pedido"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Panel Deslizante de Detalles */}
        <div
          className="menu-card__panel"
          id={`menu-card-details-${product.id}`}
          aria-hidden={!isDetailsOpen}
        >
          <div className="menu-card__panel-header">
            <div className="menu-card__panel-title-wrap">
              <h4 className="menu-card__panel-title">Detalles del Postre</h4>
              {settings?.plan_adiciones !== false && ((product.adiciones?.length > 0) || (product.salsas?.length > 0)) && (
                <span className="menu-card__badge-tag">
                  ✨ Personalizable
                </span>
              )}
            </div>
            <button
              type="button"
              className="menu-card__panel-close"
              onClick={onToggleDetails}
              aria-label="Cerrar detalles"
            >
              <X size={16} />
            </button>
          </div>

          <div className="menu-card__panel-body">
            <p className="menu-card__panel-description">{descriptionText}</p>

            {product.toppings?.length > 0 && (
              <div className="menu-card__toppings">
                <span className="menu-card__toppings-title">Toppings incluidos:</span>
                <div className="menu-card__toppings-list">
                  {product.toppings.map((top, i) => (
                    <span key={i} className="menu-card__topping-pill">
                      {top}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default MenuCard;