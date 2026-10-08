import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { X, Check } from "lucide-react";
import "../css/CustomizationModal.css";
import { formatCOP } from "../utils/price";

const CustomizationModal = ({ product, isOpen, onClose, onConfirm, settings }) => {
  const [selectedOptions, setSelectedOptions]     = useState({});
  const [selectedToppings, setSelectedToppings]   = useState([]);
  const [selectedAdiciones, setSelectedAdiciones] = useState({}); // { [id]: item }
  const [selectedSalsas, setSelectedSalsas]       = useState({}); // { [id]: item }
  const [observaciones, setObservaciones]         = useState("");
  useEffect(() => {
    if (isOpen && product) {
      if (product.customizations) {
        setSelectedOptions(product.customizations.options || {});
        setSelectedToppings(product.customizations.toppings || []);
        setSelectedAdiciones(product.customizations.adiciones || {});
        setSelectedSalsas(product.customizations.salsas || {});
        setObservaciones(product.customizations.observaciones || "");
      } else {
        setSelectedOptions({});
        setSelectedToppings([]);
        setSelectedAdiciones({});
        setSelectedSalsas({});
        setObservaciones("");
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

    onConfirm(product, {
      options: selectedOptions,
      toppings: selectedToppings,
      adiciones: selectedAdiciones,
      salsas: selectedSalsas,
      observaciones,
      precioCalculado: calculateTotalPrice(),
    });
    onClose();
  };

  const productOptions = product.options || {};
  const productToppings = product.toppings || productOptions.adiciones || productOptions.toppings || [];

  //********************************* */
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="custom-modal-header">
          <div className="header-info">
            <h3>{productName}</h3>
            <p className="product-base-desc">{productDescription}</p>
          </div>
          <button className="btn-close-modal" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        <div className="custom-modal-body">
          {Object.keys(productOptions).map((groupName) => {
            if (groupName === "adiciones" || groupName === "toppings") return null;
            const items = productOptions[groupName];
            return (
              <div key={groupName} className="custom-section">
                <h4 style={{ textTransform: "capitalize" }}>{groupName} *</h4>
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

          {settings?.plan_adiciones !== false && productToppings.length > 0 && (
            <div className="custom-section">
              <h4>Toppings & Adiciones Extra</h4>
              <div className="options-grid">
                {productToppings.map((topping, idx) => {
                  const toppingName = typeof topping === "string" ? topping : topping.nombre;
                  const toppingPrice = typeof topping === "object" ? topping.precio || 0 : 0;
                  const isChecked = selectedToppings.some((t) =>
                    typeof t === "string" ? t === toppingName : t.nombre === toppingName,
                  );
                  return (
                    <label key={idx} className={`option-card ${isChecked ? "active" : ""}`}>
                      <input type="checkbox" onChange={() => handleToggleTopping(topping)} checked={isChecked} />
                      <div className="option-info">
                        <span className="option-name">{toppingName}</span>
                        {toppingPrice > 0 && <span className="option-price">+{formatCOP(toppingPrice)}</span>}
                      </div>
                      {isChecked && <Check size={16} className="check-icon" />}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Adiciones del producto (desde BD) ────────────────────────── */}
          {settings?.plan_adiciones !== false && (product.adiciones || []).length > 0 && (
            <div className="custom-section">
              <h4>
                ✨ Adiciones
                {(product.adiciones || []).some((a) => a.requerido) && (
                  <span style={{ color: "#e68d8d", fontSize: "12px", marginLeft: "6px" }}>* requerido</span>
                )}
              </h4>
              <div className="options-grid">
                {(product.adiciones || []).map((a) => {
                  const isChecked = !!selectedAdiciones[a.id];
                  return (
                    <label key={a.id} className={`option-card ${isChecked ? "active" : ""}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          setSelectedAdiciones((prev) => {
                            const next = { ...prev };
                            if (isChecked) delete next[a.id];
                            else next[a.id] = a;
                            return next;
                          })
                        }
                      />
                      <div className="option-info">
                        <span className="option-name">
                          {a.nombre}{a.requerido ? " *" : ""}
                        </span>
                        {a.precio > 0 && <span className="option-price">+{formatCOP(a.precio)}</span>}
                      </div>
                      {isChecked && <Check size={16} className="check-icon" />}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Salsas del producto (desde BD) ───────────────────────────── */}
          {settings?.plan_adiciones !== false && (product.salsas || []).length > 0 && (
            <div className="custom-section">
              <h4>
                🔥 Salsas
                {(product.salsas || []).some((s) => s.requerido) && (
                  <span style={{ color: "#e68d8d", fontSize: "12px", marginLeft: "6px" }}>* elige al menos 1</span>
                )}
              </h4>
              <div className="options-grid">
                {(product.salsas || []).map((s) => {
                  const isChecked = !!selectedSalsas[s.id];
                  return (
                    <label key={s.id} className={`option-card ${isChecked ? "active" : ""}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          setSelectedSalsas((prev) => {
                            const next = { ...prev };
                            if (isChecked) delete next[s.id];
                            else next[s.id] = s;
                            return next;
                          })
                        }
                      />
                      <div className="option-info">
                        <span className="option-name">{s.nombre}</span>
                        {s.precio > 0 && <span className="option-price">+{formatCOP(s.precio)}</span>}
                      </div>
                      {isChecked && <Check size={16} className="check-icon" />}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="custom-section">
            <h4>Observaciones especiales</h4>
            <textarea
              placeholder="Ej: Sin queso rallado, extra lecherita, enviar bien frio..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="custom-modal-footer">
          <button className="btn-cancel" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="btn-confirm-add" onClick={handleConfirm} type="button">
            {product.customizations ? "Guardar Cambios" : `Agregar (${formatCOP(calculateTotalPrice())})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomizationModal;
