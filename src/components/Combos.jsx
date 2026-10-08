import React, { useRef, useState, useEffect, useCallback } from "react";
import { Gift, Plus, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { DEFAULT_CATALOG_DESIGN } from "../data/dataSource";
import { formatCOP } from "../utils/price";
import "../css/Combos.css";

const AUTOPLAY_TIME = 6000;

const Combos = ({ design = DEFAULT_CATALOG_DESIGN, onComboClick }) => {
  const d = design || DEFAULT_CATALOG_DESIGN;
  const trackRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const items = d.combosItems && d.combosItems.length > 0
    ? d.combosItems
    : [];

  const cssVars = {
    "--combos-bg": d.combosBg && !d.combosBg.includes("fbf") && !d.combosBg.includes("fff") && !d.combosBg.includes("fdf") ? d.combosBg : "#0f0906",
    "--combos-card-bg": d.combosCardBg && !d.combosCardBg.includes("fff") ? d.combosCardBg : "#180e09",
    "--combos-accent": d.combosAccent || "#d92b38",
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



  if (d.showCombos === false || items.length === 0) return null;

  return (
    <section
      id="combos"
      className="combos-section"
      style={cssVars}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="container">
        {/* Cabecera compacta con controles de navegación */}
        <div className="combos-header">
          <div className="combos-header__left">
            <div className="combos-badge">
              <Gift size={13} />
              <span>Packs & Ahorro</span>
            </div>
            <h2 className="combos-title">
              {d.combosTitle || "Combos para Compartir"}
            </h2>
            {d.combosSubtitle && (
              <p className="combos-subtitle">{d.combosSubtitle}</p>
            )}
          </div>


        </div>

        {/* Carrusel Deslizable Compacto */}
        <div className="combos-carousel-track" ref={trackRef}>
          {items.map((combo, idx) => (
            <article
              key={combo.id || `combo-${idx}`}
              className={`combo-card--cinematic ${currentIndex === idx ? "combo-card--active" : ""}`}
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
              onClick={onComboClick}
            >
              <img
                src={combo.imagen || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1000&auto=format&fit=crop&q=80"}
                alt={combo.nombre}
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
                  {combo.badge ? (
                    <span style={{ background: d.combosAccent || "#d92b38", color: "#fff", padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", display: "inline-flex", alignItems: "center", gap: "4px", boxShadow: "0 4px 10px rgba(217,43,56,0.4)" }}>
                      <Sparkles size={12} /> {combo.badge}
                    </span>
                  ) : <div></div>}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.3rem", fontWeight: "900", color: d.combosAccent || "#d92b38", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
                      {formatCOP(combo.precio)}
                    </div>
                    {combo.precioOriginal && (
                      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", textDecoration: "line-through", marginTop: "-2px" }}>
                        {formatCOP(combo.precioOriginal)}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: "1.5rem", fontWeight: "900", margin: "0 0 6px 0", lineHeight: "1.1", textShadow: "0 2px 10px rgba(0,0,0,0.8)", fontFamily: d.fontFamily || "inherit" }}>
                    {combo.nombre}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.8)", margin: "0 0 10px 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                    {combo.descripcion}
                  </p>
                  
                  {combo.incluye && combo.incluye.length > 0 && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                      {combo.incluye.slice(0, 3).map((inc, i) => (
                        <span key={i} style={{ fontSize: "0.7rem", color: "#fff", background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: "10px", backdropFilter: "blur(2px)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          ✓ {inc}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: d.combosAccent || "#d92b38", fontSize: "0.85rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Explorar este combo <ChevronRight size={14} />
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

export default Combos;
