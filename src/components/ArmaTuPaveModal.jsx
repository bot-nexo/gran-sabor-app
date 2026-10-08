import { useState, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, Check, Sparkles, Plus, Flame } from "lucide-react";
import { getAdditions, getSauces, getBases, getSizes } from "../data/dataSource";
import { formatCOP } from "../utils/price";
import "../css/CustomizationModal.css"; // Reuse existing modal styles

const ArmaTuPaveModal = ({ isOpen, onClose, onAddToCart, editItem, settings }) => {
  const [step, setStep] = useState(1);
  const [cargando, setCargando] = useState(true);
  
  // Opciones desde BD
  const [bases, setBases] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [additions, setAdditions] = useState([]);
  const [sauces, setSauces] = useState([]);

  // Selecciones del usuario
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedBase, setSelectedBase] = useState(null);
  const [selectedAdditions, setSelectedAdditions] = useState({});
  const [selectedSauces, setSelectedSauces] = useState({});

  useEffect(() => {
    if (isOpen) {
      cargarOpciones();
      
      if (editItem) {
        setStep(1);
        
        // El precio y nombre del tamaño están en editItem.precio original antes de sumarle la base,
        // pero la base también tiene su precio. 
        // Para simplificar, buscamos los ids si podemos, pero si no están (porque editItem no guarda ids de base/tamaño en el primer nivel),
        // los obtenemos de customizations.
        const base = editItem.customizations?.base || null;
        setSelectedBase(base);
        
        // Tamaños: como en cart guardamos el nombre del tamaño en "nombre", ej: "Pavé a tu gusto (Familiar)"
        // podríamos buscarlo por string o simplemente crearlo.
        // Lo mejor es buscar en los sizes cargados por nombre (esto se hará en el cargarOpciones luego de la promesa),
        // Pero para no complicarnos, guardaremos los ids temporales:
        setSelectedSize({ nombre: editItem.nombre.replace("Pavé a tu gusto (", "").replace(")", ""), precio: editItem.precio - (base?.precio || 0) });
        
        const adic = editItem.customizations?.adiciones || {};
        const sals = editItem.customizations?.salsas || {};
        setSelectedAdditions(adic);
        setSelectedSauces(sals);
      } else {
        setStep(1);
        setSelectedSize(null);
        setSelectedBase(null);
        setSelectedAdditions({});
        setSelectedSauces({});
      }
    }
  }, [isOpen, editItem]);

  const cargarOpciones = async () => {
    setCargando(true);
    try {
      const [b, s, a, sauce] = await Promise.all([
        getBases(), getSizes(), getAdditions(), getSauces()
      ]);
      const availableBases = b.filter(x => x.disponible !== false);
      const availableSizes = s.filter(x => x.disponible !== false);
      setBases(availableBases);
      setSizes(availableSizes);
      setAdditions(a.filter(x => x.disponible !== false));
      setSauces(sauce.filter(x => x.disponible !== false));
      
      // Fix selectedSize object if editing, to ensure it matches the ID
      if (editItem) {
        const sizeName = editItem.nombre.replace("Pavé a tu gusto (", "").replace(")", "");
        const realSize = availableSizes.find(size => size.nombre === sizeName);
        if (realSize) setSelectedSize(realSize);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);

  const toggleAddition = (id, item) => {
    setSelectedAdditions(prev => {
      const copy = { ...prev };
      if (copy[id]) delete copy[id];
      else copy[id] = item;
      return copy;
    });
  };

  const toggleSauce = (id, item) => {
    setSelectedSauces(prev => {
      const copy = { ...prev };
      if (copy[id]) delete copy[id];
      else copy[id] = item;
      return copy;
    });
  };

  const calculateTotal = () => {
    let total = 0;
    if (selectedSize) total += Number(selectedSize.precio || 0);
    if (selectedBase) total += Number(selectedBase.precio || 0);
    Object.values(selectedAdditions).forEach(a => total += Number(a.precio || 0));
    Object.values(selectedSauces).forEach(s => total += Number(s.precio || 0));
    return total;
  };

  const handleAddToCart = () => {
    if (!selectedSize || !selectedBase) return;

    const customProduct = {
      id: `custom-pave-${Date.now()}`,
      nombre: `Pavé a tu gusto (${selectedSize.nombre})`,
      precio: selectedSize.precio,
      imagen: "https://yccblysusjcejvzgxrph.supabase.co/storage/v1/object/public/product-images/productos/pave-custom.jpg", // Usa una genérica o predeterminada
      descripcion: `Base de ${selectedBase.nombre}. Creado a tu medida.`,
      categoria: "Arma tu Pavé",
      isCustom: true,
      customizations: {
        base: selectedBase,
        adiciones: selectedAdditions,
        salsas: selectedSauces,
        opciones: {}
      }
    };
    
    // We add the base price as an option so it's calculated in cart if needed
    customProduct.precio = Number(selectedSize.precio) + Number(selectedBase.precio);

    onAddToCart(customProduct, !!editItem, editItem?.customizationKey);
    onClose();
  };

  const renderStep = () => {
    if (cargando) return <div style={{ padding: "2rem", textAlign: "center", color: "#3d2314" }}>Cargando opciones...</div>;

    switch (step) {
      case 1:
        return (
          <div className="custom-modal-body">
            <div className="custom-section">
              <h4>1. Elige el Tamaño</h4>
              <div className="options-grid">
                {sizes.length === 0 && <p style={{ color: "#aaa" }}>No hay tamaños disponibles</p>}
                {sizes.map(s => {
                  const isChecked = selectedSize?.id === s.id;
                  return (
                    <label key={s.id} className={`option-card ${isChecked ? "active" : ""}`}>
                      <input type="radio" name="size" checked={isChecked} onChange={() => setSelectedSize(s)} />
                      <div className="option-info">
                        <span className="option-name">{s.nombre}</span>
                        <span className="option-price">{formatCOP(s.precio)}</span>
                      </div>
                      {isChecked && <Check size={16} className="check-icon" />}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="custom-modal-body">
            <div className="custom-section">
              <h4>2. Elige tu Base</h4>
              <div className="options-grid">
                {bases.length === 0 && <p style={{ color: "#aaa" }}>No hay bases disponibles</p>}
                {bases.map(b => {
                  const isChecked = selectedBase?.id === b.id;
                  return (
                    <label key={b.id} className={`option-card ${isChecked ? "active" : ""}`}>
                      <input type="radio" name="base" checked={isChecked} onChange={() => setSelectedBase(b)} />
                      <div className="option-info">
                        <span className="option-name">{b.nombre}</span>
                        <span className="option-price">{b.precio > 0 ? `+${formatCOP(b.precio)}` : "Gratis"}</span>
                      </div>
                      {isChecked && <Check size={16} className="check-icon" />}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="custom-modal-body">
            <div className="custom-section">
              <h4><Sparkles size={16} style={{display: 'inline', marginRight: '5px'}}/>3. Adiciones y Toppings</h4>
              <p style={{ color: "#8a6652", fontSize: "0.85rem", marginBottom: "1rem" }}>Selecciona los extras que desees (opcional).</p>
              <div className="options-grid">
                {additions.length === 0 && <p style={{ color: "#aaa" }}>No hay adiciones disponibles</p>}
                {additions.map(a => {
                  const isChecked = !!selectedAdditions[a.id];
                  return (
                    <label key={a.id} className={`option-card ${isChecked ? "active" : ""}`}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleAddition(a.id, a)} />
                      <div className="option-info">
                        <span className="option-name">{a.nombre}</span>
                        <span className="option-price">{a.precio > 0 ? `+${formatCOP(a.precio)}` : "Gratis"}</span>
                      </div>
                      {isChecked && <Check size={16} className="check-icon" />}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="custom-modal-body">
            <div className="custom-section">
              <h4><Flame size={16} style={{display: 'inline', marginRight: '5px'}}/>4. Salsas</h4>
              <p style={{ color: "#8a6652", fontSize: "0.85rem", marginBottom: "1rem" }}>Báñalo con tu salsa favorita (opcional).</p>
              <div className="options-grid">
                {sauces.length === 0 && <p style={{ color: "#aaa" }}>No hay salsas disponibles</p>}
                {sauces.map(s => {
                  const isChecked = !!selectedSauces[s.id];
                  return (
                    <label key={s.id} className={`option-card ${isChecked ? "active" : ""}`}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleSauce(s.id, s)} />
                      <div className="option-info">
                        <span className="option-name">{s.nombre}</span>
                        <span className="option-price">{s.precio > 0 ? `+${formatCOP(s.precio)}` : "Gratis"}</span>
                      </div>
                      {isChecked && <Check size={16} className="check-icon" />}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="custom-modal-content" style={{ display: "flex", flexDirection: "column", height: "85vh", maxHeight: "700px" }}>
        
        {/* Header */}
        <header className="custom-modal-header">
          <div>
            <h3 className="custom-modal-title">{editItem ? "Modificar Pavé" : "Arma tu Pavé"}</h3>
            <p style={{ fontSize: "0.85rem", marginTop: "2px", color: "#a3a3a3" }}>Paso {step} de 4</p>
          </div>
          <button type="button" onClick={onClose} className="custom-modal-close" aria-label="Cerrar">
            <X size={22} />
          </button>
        </header>

        {/* Progress bar */}
        <div style={{ width: "100%", height: "4px", background: "#f2eae5" }}>
          <div style={{ width: `${(step / 4) * 100}%`, height: "100%", background: "#ffcc00", transition: "width 0.3s ease" }}></div>
        </div>

        {/* Body content scrollable */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {renderStep()}
        </div>

        {/* Footer actions */}
        <div className="custom-modal-footer" style={{ display: "flex", gap: "10px", padding: "1.25rem 1.5rem" }}>
          {step > 1 && (
            <button type="button" className="btn-cancel" style={{ padding: "0.85rem", flex: 0.3, display: "flex", justifyContent: "center" }} onClick={handlePrev}>
              <ArrowLeft size={18} />
            </button>
          )}
          
          {step < 4 ? (
            <button 
              type="button" 
              className="btn-add-to-cart" 
              style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onClick={handleNext}
              disabled={(step === 1 && !selectedSize) || (step === 2 && !selectedBase)}
            >
              <span>Siguiente</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <button 
              type="button" 
              className="btn-add-to-cart" 
              style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onClick={handleAddToCart}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span>{editItem ? "Guardar Cambios" : "Agregar al Pedido"}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: "normal" }}>{formatCOP(calculateTotal())}</span>
              </div>
              <Check size={20} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ArmaTuPaveModal;
