import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {  User, Star} from "lucide-react";
import Swal from "sweetalert2";
import logoImg from "../assets/images/logo.png";
import useCatalog from "../hooks/useCatalog";
import { DEFAULT_CATALOG_DESIGN, getStoreRatingStats, submitStoreRating } from "../data/dataSource";
import { products as localProducts } from "../data/menu";
import "../css/Hero.css";

const Hero = ({
  estadoNegocio,
  design = DEFAULT_CATALOG_DESIGN,
  products: propProducts,
  settings: propSettings,
  onAddToCart,
  searchQuery = "",
  onSearchChange,
  customer = null,
  onOpenCustomerModal,
  badgeLabel = "",
}) => {
  const catalog = useCatalog();
  const products = propProducts !== undefined ? propProducts : catalog.products || [];
  const settings = propSettings !== undefined ? propSettings : catalog.settings || {};
  const d = design || DEFAULT_CATALOG_DESIGN;
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ratingStats, setRatingStats] = useState({ average: 5, total: 0 });
  const intervalRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    getStoreRatingStats().then((stats) => {
      setRatingStats(stats);
    });
  }, []);

  const handleRateBusiness = () => {
    if (!customer || !customer.telefono) {
      return onOpenCustomerModal(); // Require user to be logged in to rate
    }

    Swal.fire({
      title: '¡Califica nuestra Tienda!',
      html: `
        <div style="font-size: 1.5rem; color: #ffcc00; margin-bottom: 10px;">
          <input type="number" id="rating-input" min="1" max="5" value="5" style="width: 60px; text-align: center; border-radius: 8px; border: 1px solid #333; background: #222; color: #fff; padding: 5px;">
          / 5 Estrellas
        </div>
        <textarea id="rating-comment" placeholder="Déjanos un comentario (opcional)" style="width: 100%; height: 80px; border-radius: 8px; border: 1px solid #333; background: #222; color: #fff; padding: 10px; resize: none; margin-top: 10px;"></textarea>
      `,
      showCancelButton: true,
      confirmButtonText: 'Enviar Calificación',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ffcc00',
      cancelButtonColor: '#444',
      customClass: { popup: 'saborio-swal-dark' },
      preConfirm: () => {
        const rating = parseInt(document.getElementById('rating-input').value);
        const comment = document.getElementById('rating-comment').value;
        if (rating < 1 || rating > 5) {
          Swal.showValidationMessage('La calificación debe ser entre 1 y 5');
          return false;
        }
        return { rating, comment };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await submitStoreRating(customer.telefono, result.value.rating, result.value.comment);
          const newStats = await getStoreRatingStats();
          setRatingStats(newStats);
          Swal.fire({
            icon: 'success',
            title: '¡Gracias por calificar!',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ya has enviado una calificación recientemente o hubo un problema.'
          });
        }
      }
    });
  };

  const AUTOPLAY_DURATION = 6500;

  const featured = useMemo(() => {
    const pool = (products && products.length > 0) ? products : localProducts;
    const populares = pool.filter(p => p.destacado);
    if (populares.length > 0) return populares;
    return [...pool].sort(() => 0.5 - Math.random()).slice(0, 5);
  }, [products]);

  //***************************** */
  // const formatCOP = (val) => {
  //   if (!val) return "$0";
  //   return new Intl.NumberFormat("es-CO", {
  //     style: "currency",
  //     currency: "COP",
  //     maximumFractionDigits: 0,
  //   }).format(val);
  // };

  const next = useCallback(() => {
    if (featured.length === 0) return;
    setCurrent((prev) => (prev + 1) % featured.length);
    setProgress(0);
  }, [featured.length]);

  const goToSlide = (idx) => {
    setCurrent(idx);
    setProgress(0);
  };

  useEffect(() => {
    if (isPaused || featured.length === 0) {
      clearTimeout(intervalRef.current);
      clearInterval(progressRef.current);
      return;
    }

    const start = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / AUTOPLAY_DURATION) * 100, 100));
    }, 35);

    intervalRef.current = setTimeout(() => {
      next();
    }, AUTOPLAY_DURATION);

    return () => {
      clearTimeout(intervalRef.current);
      clearInterval(progressRef.current);
    };
  }, [current, isPaused, featured.length, next]);

  const slideVariants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.45, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      scale: 1.02,
      transition: { duration: 0.3, ease: "easeIn" },
    },
  };

  const renderEstadoNegocio = () => {
    if (!estadoNegocio) return null;

    if (estadoNegocio.abierto) {
      return (
        <div className="saborio-status-badge saborio-status-badge--open">
          <span className="saborio-status-dot" />
          <span>Abierto ahora</span>
        </div>
      );
    }

    if (estadoNegocio.fuerzaCierre) {
      return (
        <div className="saborio-status-badge saborio-status-badge--closed">
          <span className="saborio-status-dot saborio-status-dot--closed" />
          <span>Cerrado temporal</span>
        </div>
      );
    }

    return (
      <div className="saborio-status-badge saborio-status-badge--closed">
        <span className="saborio-status-dot saborio-status-dot--closed" />
        <span>
          {!estadoNegocio.esDiaAbierto
            ? "Hoy no hay servicio"
            : `Cerrado ${estadoNegocio.openHour ? `· Abre ${estadoNegocio.openHour}` : ""}`}
        </span>
      </div>
    );
  };

  const activeProduct = featured[current] || {};

  const handleCtaClick = () => {
    if (onAddToCart && activeProduct?.id) {
      onAddToCart(activeProduct);
    } else {
      const menuEl = document.getElementById("menu");
      if (menuEl) menuEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSearchInput = (e) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
    // Si el usuario escribe y aún está en la zona del Hero, hace scroll suave al menú
    // solo si ya hay texto (no al borrar) para no interrumpir la experiencia
    if (e.target.value && window.scrollY < 100) {
      const menuEl = document.getElementById("menu");
      if (menuEl) menuEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  //******************************* */
  return (
    <section className="saborio-hero-section">
      <div className="container">
        {/* ── Top Bar: Logo Oficial + Estado + Avatar ───────────────────────── */}
        <header className="saborio-top-bar">
          <div className="saborio-top-bar__left">
            <div className="saborio-logo-wrap">
              <img
                src={settings?.logo_url || logoImg}
                alt={settings?.razonSocial || "Logo del negocio"}
                className="saborio-logo-img"
              />
              <div className="saborio-brand-info">
                <div className="saborio-brand-title">
                  <span className="saborio-brand-name">{settings?.razonSocial}</span>
                </div>
                <span className="saborio-brand-tagline">
                  {settings?.slogan || "EXPERIENCIA GASTRONÓMICA ARTESANAL"}
                </span>
              </div>
            </div>
          </div>

          <div className="saborio-top-bar__right">
            {renderEstadoNegocio()}
            {badgeLabel ? (
              <span className="saborio-user-badge-btn" style={{ cursor: "default" }}>
                <span className="saborio-user-badge-name">{badgeLabel}</span>
              </span>
            ) : customer && customer.nombre ? (
              <button
                type="button"
                onClick={onOpenCustomerModal}
                className="saborio-user-badge-btn"
                title="Perfil y datos de cliente"
              >
                <User size={13} className="text-[#ffcc00]" />
                <span className="saborio-user-badge-name">Hola, {customer.nombre.split(" ")[0]}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenCustomerModal}
                className="saborio-user-badge-btn"
                title="Ingresar mis datos"
              >
                <User size={13} className="text-[#ffcc00]" />
                <span className="saborio-user-badge-name">Ingresar</span>
              </button>
            )}
          </div>
        </header>

        {/* ── Hero Card: Banner Principal de Impacto Estilo Saborio ─────────── */}
        {featured.length > 0 && (
          <div
            className="saborio-card-banner"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeProduct.id || current}
                className="saborio-card-banner__inner"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {/* Lado Izquierdo: Contenido Tipográfico de Gran Impacto */}
                <div className="saborio-card-banner__content">
                  <h2 className="saborio-card-banner__headline" style={{ marginTop: "1rem" }}>
                    <span className="headline-light">
                      {activeProduct.nombre?.split(" ")[0] || "SABORES"}
                    </span>
                    <span className="headline-yellow">
                      {activeProduct.nombre?.split(" ").slice(1).join(" ") || "SIN LÍMITES"}
                    </span>
                  </h2>

                  <p className="saborio-card-banner__subtitle">
                    {activeProduct.descripcion || "Descubre combinaciones únicas, creadas para los que se atreven a más."}
                  </p>
                </div>

                {/* Lado Derecho: Imagen Gastronómica + Badge Flotante */}
                <div className="saborio-card-banner__visual">
                  <img
                    src={activeProduct.imagen || activeProduct.image}
                    alt={activeProduct.nombre || "Postre destacado"}
                    className="saborio-banner-product-img"
                  />
                  <div className="saborio-banner-glow" />

                  {/* Rating Badge Flotante (Izquierda) */}
                  <button type="button" onClick={handleRateBusiness} className="saborio-hero-rating-badge" title="Calificar Negocio">
                    <Star size={14} color="#ffcc00" fill="#ffcc00" />
                    <span>{ratingStats.average}</span>
                  </button>

                  {/* Badge Flotante Circular Estilo Saborio (Derecha) */}
                  <div className="saborio-discount-badge">
                    <span className="discount-top">The</span>
                    <span className="discount-main">Best</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots de Navegación Estilo Saborio / FoodVibe */}
            {featured.length > 1 && (
              <div className="saborio-dots-nav">
                {featured.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`saborio-dot ${current === idx ? "saborio-dot--active" : ""}`}
                    onClick={() => goToSlide(idx)}
                    aria-label={`Ir a destacado ${idx + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Barra de progreso de autoplay continuo */}
            <div className="saborio-progress-track">
              <div
                className="saborio-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>


    </section>
  );
};

export default Hero;
