import { useState, useMemo } from "react";
import { Plus, Eye, Sparkles, X, Flame, Clock } from "lucide-react";
import { formatCOP } from "../utils/price";
import "../css/MenuCard.css";

const MenuCard = ({
  product,
  isDetailsOpen,
  onToggleDetails,
  onAddToCart,
  design,
  settings,
}) => {
  const d = design || {};

  const formattedPrice = formatCOP(product.precio ?? 0);
  // Precio de referencia original tachado si tiene descuento o calculado sugerido
  const originalPrice = product.precioOriginal
    ? formatCOP(product.precioOriginal)
    : product.descuento
      ? formatCOP(Math.round((product.precio ?? 0) * 1.25))
      : null;

  const imageSrc = product.imagen || "/images/placeholder.png";
  const videoSrc = product.video || product.video_url || product.videoUrl || "";
  const titleText = product.nombre || "Postre Gourmet";
  const descriptionText =
    product.descripcion ||
    "Deliciosa creación artesanal preparada con ingredientes seleccionados de primera calidad.";

  // Extracción limpia de tags / micro-chips
  const tagsList = useMemo(() => {
    if (Array.isArray(product.tags) && product.tags.length > 0) {
      return product.tags;
    }
    if (typeof product.tags === "string" && product.tags.trim()) {
      return product.tags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    if (Array.isArray(product.etiquetas) && product.etiquetas.length > 0) {
      return product.etiquetas;
    }
    return [];
  }, [product.tags, product.etiquetas]);

  // Layout & Shadow Classes
  const layoutClass =
    d.cardLayout === "list"
      ? "menu-card--layout-list"
      : d.cardLayout === "horizontal"
        ? "menu-card--layout-horizontal"
        : "";
  const shadowClass = `menu-card--shadow-${d.cardShadow || "md"}`;

  // Inyección de tokens directos del Admin para que cualquier cambio en Diseno.jsx se refleje al 100%
  const cardCustomStyles = useMemo(() => {
    const styles = {};
    if (d.cardBg) styles["--card-bg"] = d.cardBg;
    if (d.cardRadius) styles["--card-radius"] = d.cardRadius;
    if (d.borderColor) styles["--border-color"] = d.borderColor;
    if (d.textPrimary) styles["--text-primary"] = d.textPrimary;
    if (d.textMuted) styles["--text-muted"] = d.textMuted;
    if (d.fontFamily) styles["--menu-font"] = d.fontFamily;
    if (d.btnPrimaryBg) styles["--btn-primary-bg"] = d.btnPrimaryBg;
    if (d.btnPrimaryText) styles["--btn-primary-text"] = d.btnPrimaryText;
    if (d.btnDetailsBg) styles["--btn-details-bg"] = d.btnDetailsBg;
    if (d.btnDetailsText) styles["--btn-details-text"] = d.btnDetailsText;
    if (d.btnDetailsBorder) styles["--btn-details-border"] = d.btnDetailsBorder;
    if (d.priceTagBg) styles["--price-tag-bg"] = d.priceTagBg;
    if (d.priceTagText) styles["--price-tag-text"] = d.priceTagText;
    if (d.badgePopularBg) styles["--badge-popular-bg"] = d.badgePopularBg;
    if (d.badgePopularText) styles["--badge-popular-text"] = d.badgePopularText;
    if (d.imageAspectRatio) styles["--image-aspect-ratio"] = d.imageAspectRatio.replace("/", " / ");
    return styles;
  }, [d]);

  const [videoError, setVideoError] = useState(false);

  return (
    <article
      className={`menu-card ${layoutClass} ${shadowClass}`}
      style={{ ...cardCustomStyles, cursor: "pointer" }}
      onClick={() => {
        if (onToggleDetails) onToggleDetails(product);
      }}
      tabIndex={0}
      role="button"
      aria-label={`Ver detalles de ${titleText}`}
    >
      <div className="menu-card__inner">
        {/* Media: Foto Base HD + Video Loop MP4 Seguro */}
        <div className="menu-card__media">
          <img
            src={imageSrc}
            alt={titleText}
            className="menu-card__image"
            loading="lazy"
          />

          {videoSrc && !videoError && (
            <video
              src={videoSrc}
              poster={imageSrc}
              autoPlay
              loop
              muted
              playsInline
              className="menu-card__image menu-card__video"
              onError={() => setVideoError(true)}
            />
          )}

          <div className="menu-card__media-overlay" aria-hidden="true" />

          {/* Badges Flotantes Estilo Saborio / Acerkt */}
          <div className="menu-card__badges-wrap">
            <div className="menu-card__badges-left">
              {product.descuento && (
                <span className="saborio-badge-discount">
                  {product.descuento}
                </span>
              )}
              {product.destacado && (
                <span className="saborio-badge-popular">
                  <Flame size={12} className="saborio-badge-icon" />
                  Más popular
                </span>
              )}
            </div>

            {(product.tiempo_preparacion_horas || product.tiempo) && (
              <span className="saborio-badge-time">
                <Clock size={11} />
                {product.tiempo_preparacion_horas
                  ? `${product.tiempo_preparacion_horas}h`
                  : product.tiempo}
              </span>
            )}
          </div>
        </div>

        {/* Contenido de la Tarjeta */}
        <div className="menu-card__content">
          <div className="menu-card__body">
            <h3 className="menu-card__title">{titleText}</h3>
            <p className="menu-card__description">{descriptionText}</p>

            {/* Micro-Chips de Atributos e Ingredientes (Estilo Acerkt Gourmet) */}
            {tagsList.length > 0 && (
              <div className="menu-card__tags-row">
                {tagsList.slice(0, 3).map((tag, idx) => (
                  <span key={idx} className="menu-card__tag-chip">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {product.nota && (
              <span className="menu-card__nota">
                <Sparkles size={12} />
                {product.nota}
              </span>
            )}
          </div>

          {/* Pie de Tarjeta Simétrico: Precio + Botón Circular (+) */}
          <div className="menu-card__footer">
            <div className="menu-card__price-box">
              {originalPrice && (
                <span className="menu-card__price-old">{originalPrice}</span>
              )}
              <span className="menu-card__price">{formattedPrice}</span>
            </div>

            <div className="menu-card__actions">
              {/* Botón Circular Rápido (+) con Micro-Interacción */}
              <button
                type="button"
                className="saborio-quick-add-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                aria-label={`Agregar ${titleText} al carrito`}
                title="Añadir al pedido"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default MenuCard;