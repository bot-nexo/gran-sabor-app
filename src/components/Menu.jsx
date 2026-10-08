import { useState, useEffect, useMemo, useRef } from "react";
import MenuCard from "./MenuCard";
import { ArrowRight, Search, X, Sparkles } from "lucide-react";
import Promociones from "./Promociones";
import Combos from "./Combos";
// import QuickGuide from "./QuickGuide";
import { DEFAULT_CATALOG_DESIGN } from "../data/dataSource";
//import { getCustomerBadge } from "../utils/badges";
import "../css/Menu.css";

const Menu = ({
  data = [],
  categories = [],
  selectedProduct,
  setSelectedProduct,
  addToCart,
  design = DEFAULT_CATALOG_DESIGN,
  searchQuery = "",
  setSearchQuery,
  onOpenArmaModal,
  settings,
  customer,
  badges,
  onOpenCustomerModal,
}) => {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  const promoTimerRef = useRef(null);

  const d = design || DEFAULT_CATALOG_DESIGN;

  //*************************** */
  // Promociones relámpago dinámicas desde la BD (catalog_design.promotions_items)
  const flashPromotions = useMemo(() => {
    if (settings?.plan_promociones === false) return [];
    if (d.promotionsItems && Array.isArray(d.promotionsItems) && d.promotionsItems.length > 0) {
      return d.promotionsItems;
    }
    return [];
  }, [d.promotionsItems, settings?.plan_promociones]);

  // Lógica condicional estricta para el Secondary Banner:
  // Si hay más de 1 promoción activa, activar autoplay del carrusel; si hay 1 sola, se muestra estática
  useEffect(() => {
    if (flashPromotions.length <= 1) return;

    promoTimerRef.current = setInterval(() => {
      setCurrentPromoIndex((prev) => (prev + 1) % flashPromotions.length);
    }, 5000);

    return () => {
      if (promoTimerRef.current) clearInterval(promoTimerRef.current);
    };
  }, [flashPromotions.length]);

  // Escuchar evento personalizado para abrir promociones u otra categoria desde navbar
  useEffect(() => {
    // Ya no se usa "Mis Favoritos", si hay algo viejo aquí lo limpiamos.
  }, []);

  // Inyección de variables CSS dinámicas para modo oscuro permanente
  const cssVariables = useMemo(() => {
    return {
      "--menu-bg": d.bgColor || "#0d0805",
      "--card-bg": d.cardBg || "#160e0a",
      "--text-primary": d.textPrimary || "#fdfbf7",
      "--text-muted": d.textMuted || "#bda899",
      "--menu-font": d.fontFamily || "Montserrat, sans-serif",
      "--border-color": d.borderColor || "rgba(255, 255, 255, 0.08)",
      "--card-radius": d.cardRadius || "22px",
      "--btn-primary-bg": d.btnPrimaryBg || "#ffcc00",
      "--btn-primary-text": d.btnPrimaryText || "#120a06",
      "--price-tag-bg": d.priceTagBg || "#ffcc00",
      "--price-tag-text": d.priceTagText || "#140d09",
      "--category-bar-bg": d.categoryBarBg || "transparent",
      "--category-active-bg": d.categoryActiveBg || "#ffcc00",
      "--category-active-text": d.categoryActiveText || "#140d09",
      "--image-aspect-ratio": (d.imageAspectRatio || "16/11").replace("/", " / "),
    };
  }, [d]);

  // Mapeo de categorías con imágenes representativas dinámicas
  const categoryImages = useMemo(() => {
    const map = {};
    data.forEach((p) => {
      const cat = p.category || p.categoria;
      if (cat && !map[cat] && p.imagen) {
        map[cat] = p.imagen;
      }
    });
    return map;
  }, [data]);

  // Categorías de la BD integrando "Promociones especiales" y "Combos" como categorías estándar
  const navCategories = useMemo(() => {
    const list = [
      { id: "Todos", label: "Todos", emoji: "🌟" },
    ];

    // Categorías normales provenientes de Supabase
    categories
      .filter((c) => c.id !== "Todos" && c.id !== "Todo")
      .forEach((c) => {
        list.push({
          id: c.nombre || c.id,
          label: c.label || c.nombre || c.id,
          emoji: c.emoji || "🍰",
        });
      });

    // Integración obligatoria de "Promociones especiales" como categoría estándar
    if (d.showPromotions !== false && settings?.plan_promociones !== false) {
      const yaTienePromos = list.some((c) => c.id.toLowerCase().includes("promo") || c.id.toLowerCase().includes("oferta"));
      if (!yaTienePromos) {
        list.push({
          id: "Promociones especiales",
          label: "Promociones",
          emoji: "🏷️",
          isSpecialPromo: true,
        });
      }
    }

    // Integración obligatoria de "Combos" como categoría estándar
    if (d.showCombos !== false && settings?.plan_promociones !== false) {
      const yaTieneCombos = list.some((c) => c.id.toLowerCase().includes("combo"));
      if (!yaTieneCombos) {
        list.push({
          id: "Combos",
          label: "Combos",
          emoji: "🎁",
          isSpecialCombo: true,
        });
      }
    }

    return list;
  }, [categories, d.showPromotions, d.showCombos, settings?.plan_promociones]);

  // Combos de la BD adaptados al shape de producto para cuando se seleccione la categoría Combos
  const dynamicComboProducts = useMemo(() => {
    if (!d.combosItems || !Array.isArray(d.combosItems)) return [];
    return d.combosItems.map((c, i) => ({
      id: c.id || `combo-${i}`,
      nombre: c.nombre,
      precio: c.precio,
      precioOriginal: c.precioOriginal,
      descuento: c.badge || "-15%",
      imagen: c.imagen,
      descripcion: c.descripcion || (c.incluye ? c.incluye.join(" · ") : "Combo especial."),
      category: "Combos",
      categoria: "Combos",
      destacado: true,
    }));
  }, [d.combosItems]);

  // Promociones dinámicas de la BD adaptadas al shape de producto
  const dynamicPromoProducts = useMemo(() => {
    if (!d.promotionsItems || !Array.isArray(d.promotionsItems)) return [];
    return d.promotionsItems.map((p, i) => ({
      id: p.id || `promo-${i}`,
      nombre: p.titulo || "Promoción Especial",
      precio: p.precio || null,
      precioOriginal: p.precioOriginal || null,
      descuento: p.descuento || p.tag,
      imagen: p.imagen,
      descripcion: p.descripcion,
      category: "Promociones especiales",
      categoria: "Promociones especiales",
      destacado: true,
    }));
  }, [d.promotionsItems]);

  // Filtrado reactivo por categoría y buscador en vivo
  const filteredProducts = useMemo(() => {
    if (!data && dynamicComboProducts.length === 0 && dynamicPromoProducts.length === 0) return [];

    let pool = [];

    if (activeCategory === "Todos") {
      pool = [...data];
    } else if (activeCategory === "Combos") {
      const combosFromProducts = data.filter((p) =>
        (p.category || p.categoria || "").toLowerCase().includes("combo")
      );
      pool = [...dynamicComboProducts, ...combosFromProducts];
    } else if (activeCategory === "Promociones especiales") {
      // Mostrar ÚNICAMENTE las promociones creadas en el panel de control
      pool = [...dynamicPromoProducts];
    } else {
      // Filtro estándar por categoría
      pool = data.filter((item) => {
        const itemCategory = (item.category || item.categoria || "").trim().toLowerCase();
        const targetCategory = activeCategory.trim().toLowerCase();
        return itemCategory === targetCategory || itemCategory.includes(targetCategory);
      });
    }

    // Filtro en vivo del buscador superior (aplica para cualquier categoría en la que esté)
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      pool = pool.filter((item) => {
        const nombre = (item.nombre || item.name || "").toLowerCase();
        const desc = (item.descripcion || item.description || "").toLowerCase();
        return nombre.includes(query) || desc.includes(query);
      });
    }

    return pool;
  }, [activeCategory, searchQuery, data, dynamicComboProducts, dynamicPromoProducts]);

  // Productos con descuento para la sección "Promociones del día"
  const dealProducts = useMemo(() => {
    if (!data || data.length === 0) return [];
    // Priorizar los que tengan descuento o destacados
    const deals = data.filter((p) => p.descuento || p.destacado || p.precioOriginal);
    return deals.length > 0 ? deals : data.slice(0, 6);
  }, [data]);

  //*************************** */
  return (
    <section id="menu" className="menu-section bg-neutral-950 text-neutral-100" style={cssVariables}>
      <div className="container mx-auto px-4 max-w-5xl">

        {/* ── Banner de Guía Rápida ── */}
        {/* <QuickGuide /> */}

        {/* ── 1. Sección de Categorías: "Explora por universo" (Saborio Style) ─ */}
        <div className="universe-section my-6">
          <div className="universe-header mb-4">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Explora por universo
            </h2>
            <p className="text-xs md:text-sm font-medium text-neutral-400">
              Elige tu mundo, nosotros lo llevamos a tu mesa.
            </p>
          </div>

          {/* Carrusel Horizontal de Categorías con Scroll Suave y Altura Homogénea */}
          <div className="overflow-x-auto scrollbar-none py-3 -mx-2 px-2">
            <div className="flex items-center gap-3 min-w-max pb-1">
              {navCategories.map((cat) => {
                const isActive = activeCategory === cat.id;
                const previewImg = categoryImages[cat.id] || (data[0] ? data[0].imagen : null);

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setTimeout(() => {
                        const el = document.getElementById("catalog-section");
                        if (el) {
                          const yOffset = -80; // Ajuste para el header sticky
                          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                          window.scrollTo({ top: y, behavior: 'smooth' });
                        }
                      }, 50);
                    }}
                    className={`universe-card flex flex-col items-center justify-between p-2.5 rounded-2xl transition-all duration-200 w-[102px] min-w-[102px] max-w-[102px] h-[116px] min-h-[116px] flex-shrink-0 border ${isActive
                      ? "universe-card--active border-[#ffcc00] bg-gradient-to-b from-[#ffcc00]/15 to-neutral-900 shadow-[0_0_18px_rgba(255,204,0,0.35)]"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20"
                      }`}
                  >
                    {/* Orbe Circular con Resplandor de Fondo */}
                    <div className="universe-card__orb relative w-13 h-13 rounded-full flex items-center justify-center flex-shrink-0 my-auto">
                      <div
                        className={`universe-card__ring absolute inset-[-3px] rounded-full border transition-all duration-300 ${isActive
                          ? "border-[#ffcc00] shadow-[0_0_10px_#ffcc00]"
                          : "border-white/20"
                          }`}
                      />
                      <div className="universe-card__inner w-full h-full rounded-full overflow-hidden bg-neutral-900 flex items-center justify-center">
                        {previewImg && !cat.isSpecialPromo && !cat.isSpecialCombo && cat.id !== "Todos" ? (
                          <img
                            src={previewImg}
                            alt={cat.label}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-xl">{cat.emoji || "🍰"}</span>
                        )}
                      </div>
                    </div>

                    {/* Título de la Categoría con altura fija para alineación 100% simétrica */}
                    <div className="h-[32px] w-full flex items-center justify-center text-center px-0.5">
                      <span className={`text-[11.5px] font-bold leading-tight line-clamp-2 ${isActive ? "text-[#ffcc00]" : "text-white"}`}>
                        {cat.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>


        {/* ── Banner Evento Especial (Flotante Top) ── */}
        {d.specialEvent?.active && (
          <div
            className="fixed top-5 left-1/2 z-[999] w-[92%] max-w-md text-center p-2.5 md:p-3 rounded-full shadow-2xl border overflow-hidden cursor-pointer"
            style={{
              background: d.specialEvent.bgColor || "#d92b38",
              color: d.specialEvent.textColor || "#ffffff",
              borderColor: `${d.specialEvent.textColor}30`,
              boxShadow: `0 10px 40px -5px ${(d.specialEvent.bgColor || "#d92b38")}90`,
              transform: "translateX(-50%)",
              animation: "floatBanner 3.5s ease-in-out infinite"
            }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <style>{`
              @keyframes floatBanner {
                0%, 100% { transform: translateX(-50%) translateY(0px); }
                50% { transform: translateX(-50%) translateY(-6px); }
              }
            `}</style>
            <div className="absolute inset-0 opacity-20  rounded-full" style={{ background: "linear-gradient(45deg, transparent 20%, white 50%, transparent 80%)", backgroundSize: "200% 200%", animation: "shimmer 3s infinite linear" }} />
            <h3 className="relative z-10 text-[0.8rem] md:text-[0.9rem]
            tracking-widest uppercase m-0 leading-none drop-shadow-md">
              {d.specialEvent.texto}
            </h3>
          </div>
        )}

        {/* ── 2.5 Carruseles de Promos y Combos ── */}
        {d.showPromotions !== false && settings?.plan_promociones !== false && (
          <Promociones
            design={design}
            onPromoClick={() => {
              setActiveCategory("Promociones especiales");
              setTimeout(() => {
                const el = document.getElementById("catalog-section");
                if (el) {
                  const yOffset = -80;
                  const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                  window.scrollTo({ top: y, behavior: 'smooth' });
                }
              }, 50);
            }}
          />
        )}
        {d.showCombos !== false && settings?.plan_promociones !== false && (
          <Combos
            design={design}
            onComboClick={() => {
              setActiveCategory("Combos");
              setTimeout(() => {
                const el = document.getElementById("catalog-section");
                if (el) {
                  const yOffset = -80;
                  const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                  window.scrollTo({ top: y, behavior: 'smooth' });
                }
              }, 50);
            }}
          />
        )}

        {/* ── 0. Barra de Búsqueda Integrada al Menú ─ */}
        <div
          className="menu-search-wrapper"
          style={{ top: d.specialEvent?.active ? '75px' : '0' }}
        >
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <div className="menu-search-box" style={{ flex: 1 }}>
              <Search size={17} className="menu-search-icon" />
              <input
                id="menu-search-input"
                type="text"
                className="menu-search-input"
                placeholder="¿Qué antojo tienes hoy?"
                value={searchQuery}
                onChange={(e) => {
                  if (setSearchQuery) setSearchQuery(e.target.value);
                }}
                aria-label="Buscar en el menú"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="menu-search-clear"
                  onClick={() => { if (setSearchQuery) setSearchQuery(""); }}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            {/* {settings?.plan_adiciones !== false && (
              <button
                type="button"
                style={{ background: "#ffcc00", color: "#120a06", padding: '0 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '0.85rem' }}
                onClick={onOpenArmaModal}
              >
                <Sparkles size={14} /> Arma tu Pavé
              </button>
            )} */}
          </div>
          {searchQuery && (
            <p className="menu-search-results-hint">
              {filteredProducts.length === 0
                ? "Sin resultados para "
                : `${filteredProducts.length} resultado${filteredProducts.length !== 1 ? "s" : ""} para `}
              <strong>"{searchQuery}"</strong>
            </p>
          )}
        </div>
        {/* ── 4. Catálogo Completo / Productos de la Categoría Seleccionada ── */}
        <div id="catalog-section" className="catalog-section">
          <div className="catalog-header">
            <div className="catalog-title-wrap">
              <h2 className="catalog-title">
                {activeCategory === "Todos"
                  ? "Todos los postres"
                  : activeCategory === "Promociones especiales"
                    ? "Ofertas y Promociones"
                    : activeCategory}
              </h2>
              <span className="catalog-badge">
                {filteredProducts.length}
              </span>
            </div>

            {activeCategory !== "Todos" && (
              <button
                type="button"
                onClick={() => {
                  if (setSearchQuery) setSearchQuery("");
                  setActiveCategory("Todos");
                }}
                className="catalog-reset-btn"
              >
                <span>Ver todos</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>

          {/* Grid de Productos */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {filteredProducts.map((product) => (
                <MenuCard
                  key={product.id || product.nombre}
                  product={product}
                  isDetailsOpen={selectedProduct?.id === product.id}
                  onToggleDetails={() =>
                    setSelectedProduct(
                      selectedProduct?.id === product.id ? null : product
                    )
                  }
                  onAddToCart={addToCart}
                  design={d}
                  settings={settings}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
              <span className="text-4xl block mb-2">🔍</span>
              <h3 className="text-base font-bold text-white mb-1">
                No hay delicias en esta sección
              </h3>
              <p className="text-xs text-neutral-400 mb-4">
                Explora nuestras otras categorías o restablece los filtros.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (setSearchQuery) setSearchQuery("");
                  setActiveCategory("Todos");
                }}
                className="px-5 py-2 rounded-full bg-[#ffcc00] text-neutral-950 text-xs font-extrabold"
              >
                Ver todos los postres
              </button>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};

export default Menu;
