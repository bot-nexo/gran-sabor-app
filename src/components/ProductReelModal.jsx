import { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeft, Volume2, VolumeX, Heart, Share2, Plus, Sparkles, Check } from "lucide-react";
import { formatCOP } from "../utils/price";
import Swal from "sweetalert2";
import "../css/ProductReelModal.css";

const ProductReelModal = ({
  product,
  onClose,
  onAddToCart,
  onOpenCheckout,
  design = {},
  settings = {},
}) => {
  const d = design || {};
  const [isMuted, setIsMuted] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const videoRef = useRef(null);

  const formattedPrice = formatCOP(product?.precio ?? 0);
  const imageSrc = product?.imagen || "/images/placeholder.png";
  const videoSrc = product?.video || product?.video_url || product?.videoUrl || "";
  const titleText = product?.nombre || "Producto Gourmet";
  const categoryText = product?.category || product?.categoria || "Menú Gourmet";
  const descriptionText =
    product?.descripcion ||
    "Deliciosa preparación artesanal elaborada con ingredientes seleccionados de primera calidad.";

  // Extract tags / micro-chips
  const tagsList = useMemo(() => {
    if (Array.isArray(product?.tags) && product.tags.length > 0) return product.tags;
    if (typeof product?.tags === "string" && product.tags.trim()) {
      return product.tags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    if (Array.isArray(product?.etiquetas) && product.etiquetas.length > 0) return product.etiquetas;
    return [];
  }, [product?.tags, product?.etiquetas]);

  // Lock body scroll when modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: titleText,
          text: `¡Mira este delicioso plato en ${settings?.name || "Gran Sabor"}! ${titleText} por solo ${formattedPrice}`,
          url: window.location.href,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Enlace copiado al portapapeles",
        showConfirmButton: false,
        timer: 1800,
      });
    }
  };

  const handleAdd = () => {
    // 1. Cerrar primero el modal que muestra el producto
    if (onClose) {
      onClose();
    }
    // 2. Abrir inmediatamente el modal de pedir / personalizar producto
    if (onAddToCart && product) {
      onAddToCart(product);
    }
  };

  // Dynamic CSS variables from design
  const modalStyles = {
    "--btn-primary-bg": d.btnPrimaryBg || "#ffcc00",
    "--btn-primary-text": d.btnPrimaryText || "#120a06",
    "--price-tag-bg": d.priceTagBg || "#ffcc00",
    "--menu-font": d.fontFamily || "Montserrat, sans-serif",
    "--card-radius": d.cardRadius || "22px",
  };

  return (
    <div className="product-reel-backdrop" onClick={onClose} style={modalStyles}>
      <div
        className="product-reel-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-reel-title"
      >
        {/* ── Story Progress Bar (Top) ────────────────────────────────────── */}
        <div className="product-reel__progress-wrap">
          <div className="product-reel__progress-bar" />
        </div>

        {/* ── Top Navigation Bar: Volver, Categoria, Audio ─────────────────── */}
        <header className="product-reel__header">
          <button
            type="button"
            className="product-reel__btn-back"
            onClick={onClose}
            aria-label="Volver al menú"
          >
            <ArrowLeft size={16} />
            <span>Volver</span>
          </button>

          <span className="product-reel__category-title">{categoryText}</span>

          {videoSrc ? (
            <button
              type="button"
              className="product-reel__btn-audio"
              onClick={toggleMute}
              aria-label={isMuted ? "Activar audio" : "Silenciar audio"}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          ) : (
            <div className="product-reel__btn-audio--placeholder" />
          )}
        </header>

        {/* ── Media de Fondo (Video Loop MP4 o Foto HD) ────────────────────── */}
        <div className="product-reel__media-box">
          <img
            src={imageSrc}
            alt={titleText}
            className="product-reel__media-img"
          />

          {videoSrc && (
            <video
              ref={videoRef}
              src={videoSrc}
              poster={imageSrc}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="product-reel__media-video"
            />
          )}

          <div className="product-reel__media-gradient" />
        </div>

        {/* ── Tarjeta Inferior de Cristal (Glassmorphism Sheet) ─────────────── */}
        <div className="product-reel__sheet">
          {/* Header de la tarjeta inferior */}
          <div className="product-reel__sheet-header">
            <div className="product-reel__sheet-meta">
              <div className="product-reel__sheet-icon">
                <Sparkles size={16} />
              </div>
              <div className="product-reel__sheet-title-box">
                <span className="product-reel__sheet-badge">{categoryText}</span>
                <h2 id="product-reel-title" className="product-reel__sheet-title">
                  {titleText}
                </h2>
              </div>
            </div>

            <div className="product-reel__sheet-price-box">
              <span className="product-reel__sheet-price">{formattedPrice}</span>
            </div>
          </div>

          {/* Descripción completa */}
          <p className="product-reel__sheet-description">{descriptionText}</p>

          {/* Micro-Chips de Atributos e Ingredientes */}
          {tagsList.length > 0 && (
            <div className="product-reel__sheet-tags">
              {tagsList.map((tag, idx) => (
                <span key={idx} className="product-reel__tag-chip">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Barra de Acciones: Favorito, Compartir y Botón + Agregar */}
          <div className="product-reel__sheet-actions">
            <div className="product-reel__sheet-secondary-actions">
              <button
                type="button"
                className={`product-reel__action-btn ${isFavorite ? "product-reel__action-btn--fav" : ""}`}
                onClick={() => setIsFavorite(!isFavorite)}
                title="Marcar favorito"
                aria-label="Marcar favorito"
              >
                <Heart size={18} fill={isFavorite ? "#ff4757" : "none"} color={isFavorite ? "#ff4757" : "currentColor"} />
              </button>

              <button
                type="button"
                className="product-reel__action-btn"
                onClick={handleShare}
                title="Compartir producto"
                aria-label="Compartir producto"
              >
                <Share2 size={18} />
              </button>
            </div>

            <button
              type="button"
              className={`product-reel__btn-add ${addedAnimation ? "product-reel__btn-add--added" : ""}`}
              onClick={handleAdd}
              aria-label={`Agregar ${titleText} al carrito`}
            >
              {addedAnimation ? (
                <>
                  <Check size={18} />
                  <span>¡Agregado!</span>
                </>
              ) : (
                <>
                  <Plus size={18} />
                  <span>Agregar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductReelModal;
