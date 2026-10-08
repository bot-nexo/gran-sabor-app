import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { X, Check, Calendar, Clock } from "lucide-react";
import "../css/CustomizationModal.css"; // Keep for common elements like option-card
import "../css/CakeScheduleModal.css";
import { formatCOP } from "../utils/price";
import { calculateMinDeliveryDate, getAvailableTimeSlots } from "../utils/scheduleUtils";

const CakeScheduleModal = ({ product, isOpen, onClose, onConfirm, settings }) => {
  const [selectedOptions, setSelectedOptions]     = useState({});
  const [selectedToppings, setSelectedToppings]   = useState([]);
  const [selectedAdiciones, setSelectedAdiciones] = useState({}); // { [id]: item }
  const [selectedSalsas, setSelectedSalsas]       = useState({}); // { [id]: item }
  const [observaciones, setObservaciones]         = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [storeHours, setStoreHours] = useState("");
  const [storeDays, setStoreDays] = useState([1, 2, 3, 4, 5, 6]);

  useEffect(() => {
    // Fetch settings for dynamic schedule slots
    import("../data/dataSource").then((module) => {
      module.getSettings().then((s) => {
        if (s && s.hours1) setStoreHours(s.hours1);
        if (s && s.day1) {
          try {
            const parsed = JSON.parse(s.day1);
            if (Array.isArray(parsed)) setStoreDays(parsed);
          } catch (e) {
            setStoreDays([1, 2, 3, 4, 5, 6]);
          }
        }
      });
    });

    if (isOpen && product) {
      if (product.customizations) {
        setSelectedOptions(product.customizations.options || {});
        setSelectedToppings(product.customizations.toppings || []);
        setSelectedAdiciones(product.customizations.adiciones || {});
        setSelectedSalsas(product.customizations.salsas || {});
        setObservaciones(product.customizations.observaciones || "");
        setDeliveryDate(product.customizations.deliveryDate || "");
        setDeliveryTime(product.customizations.deliveryTime || "");
      } else {
        setSelectedOptions({});
        setSelectedToppings([]);
        setSelectedAdiciones({});
        setSelectedSalsas({});
        setObservaciones("");
        setDeliveryDate("");
        setDeliveryTime("");
      }
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const productName = product.nombre || "Postre";
  const productDescription = product.descripcion || "";
  const basePrice = product.precio ?? 0;

  const handleSelectRadioOption = (groupName, item) => {
    setSelectedOptions((prev) => ({ ...prev, [groupName]: item }));
  };

  const handleToggleTopping = (topping) => {
    const toppingName = typeof topping === "string" ? topping : topping.nombre;
    setSelectedToppings((prev) => {
      const exists = prev.some(
        (t) => (typeof t === "string" ? t === toppingName : t.nombre === toppingName),
      );
      if (exists) {
        return prev.filter((t) =>
          typeof t === "string" ? t !== toppingName : t.nombre !== toppingName,
        );
      }
      return [...prev, topping];
    });
  };

  const calculateTotalPrice = () => {
    let extra = 0;
    Object.values(selectedOptions).forEach((opt) => {
      extra += opt.precio || opt.price || 0;
    });
    selectedToppings.forEach((top) => {
      if (typeof top === "object") extra += top.precio || top.price || 0;
    });
    Object.values(selectedAdiciones).forEach((a) => {
      extra += a.precio || 0;
    });
    Object.values(selectedSalsas).forEach((s) => {
      extra += s.precio || 0;
    });
    return basePrice + extra;
  };

  const handleConfirm = () => {
    const productOptions = product.options || {};
    // Validar opciones tipo radio (obligatorias)
    for (const groupName in productOptions) {
      if (groupName !== "adiciones" && groupName !== "toppings" && !selectedOptions[groupName]) {
        Swal.fire({
          title: "Atencion!",
          text: `Por favor elige una opcion de: ${groupName.toUpperCase()}`,
          icon: "warning",
          confirmButtonColor: "#3D2314",
        });
        return;
      }
    }

    // Validar adiciones requeridas
    const adicionesReq = (product.adiciones || []).filter((a) => a.requerido);
    for (const a of adicionesReq) {
      if (!selectedAdiciones[a.id]) {
        Swal.fire({
          title: "Adición requerida",
          text: `Debes elegir la adición: ${a.nombre}`,
          icon: "warning",
          confirmButtonColor: "#3D2314",
        });
        return;
      }
    }

    // Validar salsas requeridas (al menos 1 si alguna está marcada como requerida)
    const salsasReq = (product.salsas || []).filter((s) => s.requerido);
    if (salsasReq.length > 0 && Object.keys(selectedSalsas).length === 0) {
      Swal.fire({
        title: "Salsa requerida",
        text: "Debes elegir al menos una salsa.",
        icon: "warning",
        confirmButtonColor: "#3D2314",
      });
      return;
    }

    if (product.tiempo_preparacion_horas > 0) {
      if (!deliveryDate || !deliveryTime) {
        Swal.fire({
          title: "Falta Agendar",
          text: "Debes elegir la fecha y hora de entrega para este producto.",
          icon: "warning",
          confirmButtonColor: "#3D2314",
        });
        return;
      }
    }

    onConfirm(product, {
      options: selectedOptions,
      toppings: selectedToppings,
      adiciones: selectedAdiciones,
      salsas: selectedSalsas,
      observaciones,
      deliveryDate,
      deliveryTime,
      precioCalculado: calculateTotalPrice(),
    });
    onClose();
  };

  const productOptions = product.options || {};
  const productToppings = product.toppings || productOptions.adiciones || productOptions.toppings || [];


  const availableSlots = deliveryDate 
    ? getAvailableTimeSlots(new Date(deliveryDate + "T00:00:00"), calculateMinDeliveryDate([{tiempo_preparacion_horas: product.tiempo_preparacion_horas}]), storeHours)
    : [];

  return (
    <div className="cake-modal-overlay" onClick={onClose}>
      <div className="cake-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="cake-modal-close" onClick={onClose} type="button">
          <X size={20} />
        </button>

        {product.image_url ? (
          <div className="cake-modal-hero">
            <img src={product.image_url} alt={productName} />
            <div className="cake-modal-hero-gradient" />
          </div>
        ) : (
          <div style={{height: "20px"}}></div>
        )}

        <div className="cake-modal-body">
          <h3 className="cake-modal-title">{productName}</h3>
          <p className="cake-modal-desc">{productDescription}</p>

          <div className="cake-modal-section-title">
            📅 Fecha de Entrega
          </div>
          
          <div className="cake-date-picker-container">
            <input 
              type="date"
              className="cake-date-input"
              value={deliveryDate}
              min={
                calculateMinDeliveryDate([{tiempo_preparacion_horas: product.tiempo_preparacion_horas}])
                ?.toISOString().split("T")[0]
              }
              onChange={(e) => {
                const selected = e.target.value;
                if (!selected) {
                  setDeliveryDate("");
                  setDeliveryTime("");
                  return;
                }
            
                const dateObj = new Date(selected + "T00:00:00");
                const dayIndex = dateObj.getDay();
                
                if (!storeDays.includes(dayIndex)) {
                  Swal.fire({
                    icon: "error",
                    title: "Día no disponible",
                    text: "Lo sentimos, no realizamos entregas en este día de la semana.",
                    confirmButtonColor: "#ffcc00",
                    color: "#fdfbf7",
                    background: "#160e0a"
                  });
                  setDeliveryDate("");
                  setDeliveryTime("");
                  return;
                }
                
                setDeliveryDate(selected);
                setDeliveryTime("");
              }}
            />
          </div>

          {deliveryDate && (
            <>
              <div className="cake-modal-section-title">
                🕒 Hora de Entrega
              </div>
              <div className="cake-time-grid">
                {availableSlots.length > 0 ? availableSlots.map((slot, i) => (
                  <div 
                    key={i}
                    className={`cake-time-slot ${deliveryTime === slot.label ? 'cake-time-slot--active' : ''}`}
                    onClick={() => setDeliveryTime(slot.label)}
                  >
                    {slot.label}
                  </div>
                )) : (
                  <div style={{gridColumn: '1 / -1', color: '#aaa', fontSize: '0.9rem', textAlign: 'center', padding: '10px 0'}}>
                    No hay horarios disponibles este día.
                  </div>
                )}
              </div>
            </>
          )}

          {/* Opciones y extras (sólo mostrar si existen) */}
          {Object.keys(productOptions).length > 0 && (
            <div style={{marginTop: '20px', borderTop: '1px solid #333', paddingTop: '20px'}}>
              {Object.keys(productOptions).map((groupName) => {
                if (groupName === "adiciones" || groupName === "toppings") return null;
                const items = productOptions[groupName];
                return (
                  <div key={groupName} className="custom-section" style={{marginBottom: '15px'}}>
                    <h4 style={{ textTransform: "capitalize", color: '#fff', marginBottom: '10px', fontSize: '1rem' }}>{groupName} *</h4>
                    <div className="options-grid">
                      {items.map((item) => {
                        const itemName = item.nombre || item.name;
                        const itemPrice = item.precio || item.price || 0;
                        const isSelected = selectedOptions[groupName]?.id === item.id;
                        return (
                          <label key={item.id || itemName} className={`option-card ${isSelected ? "active" : ""}`}>
                            <input type="radio" name={groupName} onChange={() => handleSelectRadioOption(groupName, item)} checked={isSelected} />
                            <div className="option-info">
                              <span className="option-name">{itemName}</span>
                              {itemPrice > 0 && <span className="option-price">+{formatCOP(itemPrice)}</span>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {settings?.plan_adiciones !== false && productToppings.length > 0 && (
            <div className="custom-section" style={{marginBottom: '15px'}}>
              <h4 style={{ color: '#fff', marginBottom: '10px', fontSize: '1rem' }}>Toppings & Extras</h4>
              <div className="options-grid">
                {productToppings.map((top) => {
                  const topName = typeof top === "object" ? top.nombre || top.name : top;
                  const topPrice = typeof top === "object" ? top.precio || top.price || 0 : 0;
                  const isSelected = selectedToppings.some((t) => (typeof t === "object" ? t.id === top.id : t === top));
                  return (
                    <label key={typeof top === "object" ? top.id : top} className={`option-card ${isSelected ? "active" : ""}`}>
                      <input type="checkbox" onChange={() => handleToggleTopping(top)} checked={isSelected} />
                      <div className="option-info">
                        <span className="option-name">{topName}</span>
                        {topPrice > 0 && <span className="option-price">+{formatCOP(topPrice)}</span>}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="custom-section" style={{marginBottom: '15px'}}>
            <h4 style={{ color: '#fff', marginBottom: '10px', fontSize: '1rem' }}>Observaciones especiales</h4>
            <textarea
              className="checkout-modal__textarea"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#222', border: '1px solid #333', color: '#fff', fontSize: '0.95rem' }}
              placeholder="Ej: Mensaje en la torta, enviar bien frio..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows="3"
            />
          </div>
        </div>

        <div className="cake-modal-footer">
          <button className="cake-btn-cancel" onClick={onClose} type="button">
            Cancelar
          </button>
          <button 
            className="cake-btn-confirm" 
            onClick={handleConfirm}
            type="button"
            disabled={!deliveryDate || !deliveryTime}
          >
            Agregar ({formatCOP(calculateTotalPrice())})
          </button>
        </div>
      </div>
    </div>
  );
};

export default CakeScheduleModal;
