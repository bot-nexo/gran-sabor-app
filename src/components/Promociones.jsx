import React, { useRef, useState, useEffect, useCallback } from "react";
import { Tag, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { DEFAULT_CATALOG_DESIGN } from "../data/dataSource";
import "../css/Promociones.css";

const AUTOPLAY_TIME = 5500;

const Promociones = ({ design = DEFAULT_CATALOG_DESIGN, onPromoClick }) => {
  const d = design || DEFAULT_CATALOG_DESIGN;
  const trackRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const items = d.promotionsItems && d.promotionsItems.length > 0
    ? d.promotionsItems
    : [];

  const cssVars = {
    "--promos-bg": d.promotionsBg && !d.promotionsBg.includes("fff") && !d.promotionsBg.includes("fdf") ? d.promotionsBg : "#120a06",
    "--promos-card-bg": d.promotionsCardBg && !d.promotionsCardBg.includes("fff") ? d.promotionsCardBg : "#180e09",
    "--promos-accent": d.promotionsAccent || "#ffcc00",
  };

  const checkScroll = () => {
    if (!trackRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scrollToSlide = useCallback((index) => {
    if (!trackRef.current) return;
    const cards = trackRef.current.children;
    if (cards[index]) {
      trackRef.current.scrollTo({
        left: cards[index].offsetLeft - trackRef.current.offsetLeft,
        behavior: "smooth",
      });
      setCurrentIndex(index);
      setProgress(0);
    }
  }, []);

  const handleNext = useCallback(() => {
    const nextIdx = (currentIndex + 1) % items.length;
    scrollToSlide(nextIdx);
  }, [currentIndex, items.length, scrollToSlide]);

  const handlePrev = useCallback(() => {
    const prevIdx = (currentIndex - 1 + items.length) % items.length;
    scrollToSlide(prevIdx);
  }, [currentIndex, items.length, scrollToSlide]);

  // Autoplay tipo carrusel de destacados
  useEffect(() => {
    if (isPaused || items.length <= 1) return;

    const startTime = Date.now();
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / AUTOPLAY_TIME) * 100, 100));
    }, 35);

    const autoplayTimer = setTimeout(() => {
      handleNext();
    }, AUTOPLAY_TIME);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(autoplayTimer);
    };
  }, [currentIndex, isPaused, items.length, handleNext]);

  useEffect(() => {
    checkScroll();
    const el = trackRef.current;
    if (el) el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el && el.removeEventListener("scroll", checkScroll);
  }, [items]);

  if (d.showPromotions === false || items.length === 0) return null;

  return (
    <section
      id="promociones"
      className="promotions-section"
      style={cssVars}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="container">
        {/* Cabecera compacta con controles de navegación */}
        <div className="promotions-header">
          <div className="promotions-header__left">
            <div className="promotions-badge">
              <Tag size={13} />
              <span>Ofertas Imperdibles</span>
            </div>
            <h2 className="promotions-title">
              {d.promotionsTitle || "Promociones Especiales"}
            </h2>
            {d.promotionsSubtitle && (
              <p className="promotions-subtitle">{d.promotionsSubtitle}</p>
            )}
          </div>


        </div>

        {/* Carrusel Deslizable Compacto */}
        <div className="promotions-carousel-track" ref={trackRef}>
          {items.map((promo, idx) => (
            <article
              key={promo.id || `promo-${idx}`}
              className={`promo-card--cinematic ${currentIndex === idx ? "promo-card--active" : ""}`}
              style={{ 
                width: "100%", flex: "0 0 100%", maxWidth: "100%", 
                cursor: "pointer", 
                position: "relative", 
                height: "240px", 
                borderRadius: "24px", 
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.05)"
              }}
              onClick={onPromoClick}
            >
              <img
                src={promo.imagen || "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=1000&auto=format&fit=crop&q=80"}
                alt={promo.titulo}
                style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0, transition: "transform 0.5s ease" }}
                className="hover:scale-105"
                loading="lazy"
              />
              <div style={{
                position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                background: "linear-gradient(to top, rgba(13,8,5,0.95) 0%, rgba(13,8,5,0.5) 50%, rgba(13,8,5,0.1) 100%)",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                padding: "1.5rem", color: "white"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  {promo.tag ? (
                    <span style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", color: "#fff", padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", border: "1px solid rgba(255,255,255,0.2)" }}>
                      {promo.tag}
                    </span>
                  ) : <div></div>}
                  {promo.descuento && (
                    <div style={{ background: d.promotionsAccent || "#ffcc00", color: "#000", padding: "6px 14px", borderRadius: "12px", fontSize: "0.95rem", fontWeight: "900", boxShadow: "0 4px 15px rgba(255,204,0,0.4)", transform: "rotate(-2deg)" }}>
                      {promo.descuento}
                    </div>
                  )}
                </div>

                <div>
                  <h3 style={{ fontSize: "1.5rem", fontWeight: "900", margin: "0 0 6px 0", lineHeight: "1.1", textShadow: "0 2px 10px rgba(0,0,0,0.8)", fontFamily: d.fontFamily || "inherit" }}>
                    {promo.titulo}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.8)", margin: "0 0 12px 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                    {promo.descripcion}
                  </p>
                  
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: d.promotionsAccent || "#ffcc00", fontSize: "0.85rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Ver menú de promociones <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </article>


          ))}
        </div>
      </div>


    </section>
  );
};

export default Promociones;
