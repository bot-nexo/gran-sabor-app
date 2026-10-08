import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import "../css/ScrollToTopButton.css";

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [target, setTarget] = useState("catalog");

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const catalogEl = document.getElementById("catalog-section");
      
      if (scrollY > 400) {
        setIsVisible(true);
        if (catalogEl) {
          const catalogTop = catalogEl.getBoundingClientRect().top + window.pageYOffset;
          // Si pasamos el catálogo, el botón nos lleva al menú. Si ya estamos en o sobre el catálogo, lleva al inicio.
          if (scrollY > catalogTop + 150) {
            setTarget("catalog");
          } else {
            setTarget("top");
          }
        } else {
          setTarget("top");
        }
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Llamado inicial
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    if (target === "catalog") {
      const catalogEl = document.getElementById("catalog-section");
      if (catalogEl) {
        const yOffset = -80; // Altura aproximada de la barra de búsqueda sticky
        const y = catalogEl.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  //******************************* */
  return (
    <button 
      className={`scroll-to-top-btn ${isVisible ? 'visible' : ''}`}
      onClick={handleClick}
      aria-label="Volver arriba"
    >
      <ChevronUp size={22} className="scroll-icon" />
    </button>
  );
};

export default ScrollToTopButton;
