import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  X,
  User,
  Phone,
  CreditCard,
  MapPin,
  Building,
  Home,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Send,
  Clock,
  Store,
  Check,
  Navigation
} from "lucide-react";
import { FaMotorcycle, FaWhatsapp } from "react-icons/fa";
import "../css/CheckoutModal.css";
import {
  formatCOP,
  calculateItemUnitPrice,
  calculateOrderSummary,
} from "../utils/price";
import { resolveCustomerBadge } from "../utils/badges";
import { info as infoLocal, VALOR_DOMICILIO_DEFAULT } from "../data/menu";
import { getPaymentMethods } from "../data/dataSource";
import AddressAutocomplete from "./AddressAutocomplete";

// settings llega del dataSource vía useCatalog (App.jsx); fee/umbral configurables
const CheckoutModal = ({
  isOpen,
  onClose,
  onConfirm,
  cart = [],
  settings = infoLocal,
  design = {},
  estadoNegocio = null,
  badges = [],
  customer = null,
}) => {
  const [step, setStep] = useState(1);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    tipoEntrega: settings.offersDelivery !== false ? "domicilio" 
                 : settings.offersLocal !== false ? "local" 
                 : "recogida",
    direccion: "",
    unidad: "",
    apto: "",
    pago: "",
    observaciones: "",
  });

  // ── Estado del delivery dinámico (Mapbox) ─────────────────────────────
  const [deliveryResult, setDeliveryResult] = useState(null);
  // deliveryResult = { fee, distanceKm, durationMin, lat, lng, fullAddress, withinCoverage } | null

  const isDynamicDelivery = settings.plan_domicilio_dinamico !== false && settings.dynamicDeliveryEnabled &&
    settings.storeLat && settings.storeLng;

  useEffect(() => {
    if (isOpen) {
      getPaymentMethods().then(methods => {
        setPaymentMethods(methods);
        if (methods.length > 0 && !methods.find(m => m.nombre === formData.pago)) {
          setFormData(prev => ({ ...prev, pago: methods[0].nombre }));
        } else if (methods.length === 0) {
          setFormData(prev => ({ ...prev, pago: "" }));
        }
      });
    }
  }, [isOpen]);

  const esDomicilio = formData.tipoEntrega === "domicilio";
  const esLocal = formData.tipoEntrega === "local";
  const textoModalidad = esDomicilio ? 'Domicilio' : esLocal ? 'Local' : 'Recoger en tienda';

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDeliveryResult(null);
      try {
        const savedCust = sessionStorage.getItem("paves_customer_info") || localStorage.getItem("paves_customer_info");
        if (savedCust) {
          const cust = JSON.parse(savedCust);
          setFormData((prev) => ({
            ...prev,
            nombre: prev.nombre || cust.nombre || "",
            telefono: prev.telefono || cust.telefono || "",
            email: prev.email || cust.email || "",
          }));
        }
      } catch {
        /* noop */
      }
    }
  }, [isOpen]);

  // Limpiar delivery result cuando cambia de tipo de entrega
  useEffect(() => {
    if (!esDomicilio) {
      setDeliveryResult(null);
    }
  }, [esDomicilio]);

  if (!isOpen) return null;

  // ── Cálculo del fee efectivo ──────────────────────────────────────────
  // Si el delivery dinámico está activo y hay resultado, usar ese fee
  const dynamicFee = (esDomicilio && isDynamicDelivery && deliveryResult?.withinCoverage)
    ? deliveryResult.fee
    : null;

  // Calcular badge actual del cliente para aplicar beneficios
  const currentBadge = resolveCustomerBadge(settings, customer, badges);

  const {
    subtotal: totalProductos,
    esGratis,
    totalNeto: totalNetoAPagar,
    effectiveFee,
    descuentoBadge,
    descuento2x1,
    porcentaje,
    tieneBeneficios,
    beneficiosAplican,
  } = calculateOrderSummary(
    cart,
    settings?.deliveryFee,
    settings?.freeDeliveryThreshold,
    esDomicilio,
    dynamicFee,
    currentBadge
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Callback del AddressAutocomplete cuando calcula distancia
  const handleDeliveryResult = (result) => {
    setDeliveryResult(result);
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (paymentMethods.length === 0) {
      Swal.fire({
        title: "Sin métodos de pago",
        text: "No se puede continuar con la compra porque no hay métodos de pago configurados. Por favor intenta más tarde o contacta al negocio.",
        icon: "warning",
        confirmButtonColor: "#ffcc00",
        customClass: { popup: "saborio-swal-dark" }
      });
      return;
    }

    const faltantes =
      !formData.nombre.trim() ||
      !formData.telefono.trim() ||
      !formData.email.trim() ||
      !formData.pago ||
      (esDomicilio && (!formData.direccion.trim() || !formData.apto.trim()));
    if (faltantes) {
      Swal.fire({
        title: "Campos incompletos",
        text: esDomicilio
          ? "Por favor completa los campos obligatorios para continuar."
          : "Nombre, teléfono, email y medio de pago son obligatorios.",
        icon: "warning",
        confirmButtonColor: "#3D2314",
      });
      return;
    }

    // Validar cobertura si delivery dinámico está activo
    if (esDomicilio && isDynamicDelivery) {
      if (!deliveryResult) {
        Swal.fire({
          title: "Selecciona una dirección",
          text: "Debes seleccionar una dirección de la lista de sugerencias para calcular el costo del domicilio.",
          icon: "warning",
          confirmButtonColor: "#ffcc00",
          customClass: { popup: "saborio-swal-dark" }
        });
        return;
      }
      if (!deliveryResult.withinCoverage) {
        Swal.fire({
          title: "Fuera de cobertura",
          html: `Tu dirección está a <strong>${deliveryResult.distanceKm} km</strong> de nuestro local.<br>Nuestro rango máximo de entrega es <strong>${settings.maxDeliveryRadiusKm} km</strong>.`,
          icon: "error",
          confirmButtonColor: "#ffcc00",
          customClass: { popup: "saborio-swal-dark" }
        });
        return;
      }
    }

    setStep(2);
  };

  const handleSubmit = () => {
    if (/transferencia/i.test(formData.pago)) {
      onClose();
      Swal.fire({
        title: "¡Información Importante!",
        html: `<div style="text-align:left"><h4 style="margin-bottom:5px;font-weight:800">💳 Sobre tu Pago</h4><p style="margin:0;font-size:0.95rem;line-height:1.4">Recuerda transferir a nuestras cuentas y enviarnos el comprobante por WhatsApp para hacer efectivo tu pedido.</p></div>`,
        icon: "info",
        confirmButtonText: "Entendido, enviar pedido",
        confirmButtonColor: "#3D2314",
        allowOutsideClick: false,
      }).then((result) => {
        if (result.isConfirmed) enviarPedido();
      });
      return;
    }
    enviarPedido();
  };

  const enviarPedido = () => {
    // Incluir metadatos de delivery dinámico en el formData
    const deliveryMeta = (esDomicilio && isDynamicDelivery && deliveryResult?.withinCoverage)
      ? {
          lat: deliveryResult.lat,
          lng: deliveryResult.lng,
          distanceKm: deliveryResult.distanceKm,
          durationMin: deliveryResult.durationMin,
          fullAddress: deliveryResult.fullAddress,
          calculatedFee: deliveryResult.fee,
        }
      : null;

    onConfirm({
      ...formData,
      observaciones: formData.observaciones || "",
      deliveryMeta,
    });
    setStep(1);
    setDeliveryResult(null);
    setFormData((prev) => ({
      nombre: "",
      telefono: "",
      email: "",
      tipoEntrega: prev.tipoEntrega,
      direccion: "",
      unidad: "",
      apto: "",
      pago: "Efectivo",
      observaciones: "",
    }));
  };

  // ── Delivery config para el AddressAutocomplete ───────────────────────
  const deliveryConfig = {
    storeLat: settings.storeLat,
    storeLng: settings.storeLng,
    baseDeliveryFee: settings.baseDeliveryFee,
    pricePerKm: settings.pricePerKm,
    maxDeliveryRadiusKm: settings.maxDeliveryRadiusKm,
    dynamicDeliveryEnabled: settings.dynamicDeliveryEnabled,
  };

  // ── Texto de domicilio para el resumen ────────────────────────────────
  const renderDeliveryFeeText = () => {
    if (!esDomicilio) return <span className="totals-value free">No aplica</span>;
    
    if (esGratis && (!isDynamicDelivery || deliveryResult?.withinCoverage)) {
      return <span className="totals-value free">🎁 GRATIS ({currentBadge?.name})</span>;
    }

    if (isDynamicDelivery && deliveryResult?.withinCoverage) {
      return (
        <span className="totals-value">
          {formatCOP(deliveryResult.fee)}
          <span style={{ fontSize: "0.7rem", color: "#a3a3a3", marginLeft: "0.4rem" }}>
            ({deliveryResult.distanceKm} km)
          </span>
        </span>
      );
    }
    
    if (isDynamicDelivery && !deliveryResult) {
      return <span className="totals-value" style={{ color: "#a3a3a3", fontStyle: "italic" }}>Ingresa tu dirección</span>;
    }

    return <span className="totals-value">{formatCOP(settings.deliveryFee ?? VALOR_DOMICILIO_DEFAULT)}</span>;
  };

  return (
    <div className="checkout-overlay" onClick={onClose} style={{ 
      "--color-primario": design?.color_primario || "#ffcc00",
      "--color-fondo": design?.color_fondo || "#171717",
      "--color-texto": design?.color_texto || "#f5f5f5"
    }}>
      <div className="checkout-container" onClick={(e) => e.stopPropagation()}>
        
        {/* -- ENCABEZADO -- */}
        <div className="checkout-top-bar">
          <div className="checkout-top-title">
            <span className="brand-name">PAVÉS</span>
            <h3>Finalizar Pedido</h3>
          </div>
          
          <div className="checkout-stepper">
            <div className={`step ${step >= 1 ? "active" : ""}`}>
              <span className="step-num">{step > 1 ? <Check size={12} /> : "1"}</span> 
              <span className="step-text">Datos & Pago</span>
            </div>
            <div className="step-divider"></div>
            <div className={`step ${step >= 2 ? "active" : ""}`}>
              <span className="step-num">2</span> 
              <span className="step-text">Confirmación</span>
            </div>
          </div>

          <button className="btn-close-checkout" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {/* -- CONTENIDO DIVIDIDO -- */}
        <div className="checkout-layout">
          
          {/* COLUMNA IZQUIERDA: Formularios / Confirmación */}
          <div className="checkout-left-panel">
            {estadoNegocio && !estadoNegocio.abierto && (
              <div className="checkout-aviso-cerrado">
                <Clock size={16} />
                <span>
                  <strong>
                    {!estadoNegocio.esDiaAbierto ? "Hoy no hay servicio." : "Estamos cerrados ahora."}
                  </strong>
                  {estadoNegocio.horarioTexto && estadoNegocio.esDiaAbierto
                    ? ` Horario de atención: ${estadoNegocio.horarioTexto}.`
                    : !estadoNegocio.esDiaAbierto && estadoNegocio.horarioTexto
                    ? ` Abrimos: ${estadoNegocio.horarioTexto}.`
                    : ""}
                  {" "}Tu pedido se agendará.
                </span>
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleNext} className="checkout-form">
                <div className="form-section-title">
                  <span className="section-num">1</span>
                  <h4>¿Dónde entregamos tu pedido?</h4>
                </div>
                
                <div className="form-grid">
                  {(settings.offersDelivery !== false || settings.offersPickup !== false || settings.offersLocal !== false) && (
                    <div className="form-group full-width">
                      <div className="entrega-options">
                        {settings.offersDelivery !== false && (
                          <button
                            type="button"
                            className={`entrega-option ${esDomicilio ? "entrega-option--activa" : ""}`}
                            onClick={() => setFormData((p) => ({ ...p, tipoEntrega: "domicilio" }))}
                          >
                            <FaMotorcycle size={18} />
                            <span>Domicilio</span>
                          </button>
                        )}
                        {settings.offersPickup !== false && (
                          <button
                            type="button"
                            className={`entrega-option ${formData.tipoEntrega === "recogida" ? "entrega-option--activa" : ""}`}
                            onClick={() => setFormData((p) => ({ ...p, tipoEntrega: "recogida" }))}
                          >
                            <Store size={18} />
                            <span>Recoger</span>
                          </button>
                        )}
                        {settings.offersLocal !== false && (
                          <button
                            type="button"
                            className={`entrega-option ${esLocal ? "entrega-option--activa" : ""}`}
                            onClick={() => setFormData((p) => ({ ...p, tipoEntrega: "local" }))}
                          >
                            <User size={18} />
                            <span>Local</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="form-group full-width">
                    <label>Nombre y Apellido *</label>
                    <div className="input-with-icon">
                      <User size={16} className="input-icon" />
                      <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Ej: Carolina Restrepo" required />
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label>Teléfono Celular / WhatsApp *</label>
                    <div className="input-with-icon">
                      <Phone size={16} className="input-icon" />
                      <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Ej: 310 123 4567" required />
                    </div>
                    <small className="input-hint"><FaWhatsapp style={{display: "inline", marginRight: "4px"}} color="#25D366" />💡 Ingresa tu WhatsApp para que te llegue el mensaje del pedido de prueba a tu chat.</small>
                  </div>

                  <div className="form-group full-width">
                    <label>Correo Electrónico *</label>
                    <div className="input-with-icon">
                      <MessageSquare size={16} className="input-icon" />
                      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Ej: tu-correo@ejemplo.com" required />
                    </div>
                    <small className="input-hint">📧 Te enviaremos el comprobante y las notificaciones por email a este correo para que pruebes cómo funciona.</small>
                  </div>

                  {esDomicilio && (
                    <>
                      <div className="form-group full-width">
                        <label>Dirección Principal *</label>
                        {isDynamicDelivery ? (
                          <AddressAutocomplete
                            value={formData.direccion}
                            onChange={(text) => setFormData((p) => ({ ...p, direccion: text }))}
                            onDeliveryResult={handleDeliveryResult}
                            deliveryConfig={deliveryConfig}
                            placeholder="Escribe tu dirección y selecciona de la lista"
                          />
                        ) : (
                          <div className="input-with-icon">
                            <MapPin size={16} className="input-icon" />
                            <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Ej: Carrera 50 # 49 - 20, Barrio San Pedro" required />
                          </div>
                        )}
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group half-width">
                          <label>Unidad / Edificio (opcional)</label>
                          <div className="input-with-icon">
                            <Building size={16} className="input-icon" />
                            <input type="text" name="unidad" value={formData.unidad} onChange={handleChange} placeholder="Ej: Edificio Los Pinos" />
                          </div>
                        </div>
                        <div className="form-group half-width">
                          <label>Apto / Casa / Piso *</label>
                          <div className="input-with-icon">
                            <Home size={16} className="input-icon" />
                            <input type="text" name="apto" value={formData.apto} onChange={handleChange} placeholder="Ej: Apto 302" required />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="form-group full-width">
                    <label>Indicaciones para el repartidor (opcional)</label>
                    <div className="input-with-icon textarea-icon">
                      <MessageSquare size={16} className="input-icon" />
                      <textarea name="observaciones" rows={2} value={formData.observaciones} onChange={handleChange} placeholder="Ej: Dejar en portería, timbrar dos veces..." />
                    </div>
                  </div>
                </div>

                <div className="form-section-title" style={{ marginTop: "2rem" }}>
                  <span className="section-num">2</span>
                  <h4>Método de Pago *</h4>
                </div>

                <div className="payment-options">
                  {paymentMethods.length > 0 ? (
                    paymentMethods.map(method => (
                      <label key={method.id} className={`payment-card ${formData.pago === method.nombre ? "selected" : ""}`}>
                        <input type="radio" name="pago" value={method.nombre} checked={formData.pago === method.nombre} onChange={handleChange} required />
                        <div className="payment-icon-bg">
                          {method.icono === "Phone" ? <Phone size={20} /> : <CreditCard size={20} />}
                        </div>
                        <strong>{method.nombre}</strong>
                        {method.descripcion && <span>{method.descripcion}</span>}
                        {formData.pago === method.nombre && <CheckCircle size={16} className="check-icon" />}
                      </label>
                    ))
                  ) : (
                    <div className="checkout-aviso-cerrado" style={{ backgroundColor: "rgba(255, 60, 60, 0.1)", color: "#ff4d4d", margin: 0 }}>
                      <span>Actualmente no hay métodos de pago configurados.</span>
                    </div>
                  )}
                </div>

                {/transferencia/i.test(formData.pago) && settings.bankAccounts?.length > 0 && (
                  <span style={{ display: "block", fontSize: "0.78rem", color: "#d92b38", marginTop: "0.5rem", fontStyle: "italic" }}>
                    * Las cuentas bancarias se mostrarán en el siguiente paso.
                  </span>
                )}

                <div className="checkout-footer form-actions">
                  <button type="button" className="btn-volver" onClick={onClose}>
                    <ArrowLeft size={16} /> Volver al Menú
                  </button>
                  <button
                    type="submit"
                    className="btn-continuar"
                    disabled={esDomicilio && isDynamicDelivery && deliveryResult && !deliveryResult.withinCoverage}
                  >
                    Revisar y Confirmar <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            ) : (
              <div className="checkout-confirmation-panel">
                <div className="confirm-banner">
                  <div className="confirm-icon-bg"><Check size={24} color="#fff" /></div>
                  <div className="confirm-banner-text">
                    <h4>¡Casi listo! Revisa tus datos de entrega</h4>
                    <p>Verifica que todo esté correcto antes de enviar tu pedido por WhatsApp.</p>
                  </div>
                </div>

                <div className="confirm-details-card">
                  <div className="confirm-detail-row">
                    <span className="detail-label"><User size={14} /> DESTINATARIO</span>
                    <strong className="detail-value">{formData.nombre}</strong>
                  </div>
                  
                  <div className="confirm-detail-row">
                    <span className="detail-label"><Phone size={14} /> CELULAR WHATSAPP</span>
                    <strong className="detail-value">{formData.telefono}</strong>
                  </div>

                  <div className="confirm-detail-row">
                    <span className="detail-label"><MapPin size={14} /> DIRECCIÓN DE ENTREGA</span>
                    <strong className="detail-value">
                      {esDomicilio ? `${formData.direccion}${formData.unidad ? `, ${formData.unidad}` : ''}, ${formData.apto}` : textoModalidad}
                    </strong>
                  </div>

                  {/* Mostrar distancia/tiempo si delivery dinámico */}
                  {esDomicilio && isDynamicDelivery && deliveryResult?.withinCoverage && (
                    <div className="confirm-detail-row">
                      <span className="detail-label"><Navigation size={14} /> DISTANCIA</span>
                      <strong className="detail-value" style={{ color: "#25D366" }}>
                        {deliveryResult.distanceKm} km — ~{deliveryResult.durationMin} min
                      </strong>
                    </div>
                  )}

                  <div className="confirm-detail-row">
                    <span className="detail-label"><CreditCard size={14} /> MEDIO DE PAGO</span>
                    <span className="payment-badge">{formData.pago}</span>
                  </div>

                  {/transferencia/i.test(formData.pago) && settings.bankAccounts?.length > 0 && (
                    <div className="checkout-aviso-transferencia">
                      <div className="checkout-aviso-transferencia-header">
                        <CreditCard size={15} />
                        <span>Cuentas para transferir:</span>
                      </div>
                      <ul className="checkout-aviso-transferencia-list">
                        {settings.bankAccounts.map((acc, i) => (
                          <li key={i}>
                            <span className="checkout-aviso-transferencia-banco">{acc.bankName}</span>
                            <span className="checkout-aviso-transferencia-cuenta">{acc.accountNumber}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="checkout-aviso-transferencia-nota">
                        Envía el comprobante por WhatsApp para hacer efectivo tu pedido.
                      </p>
                    </div>
                  )}
                </div>

                <div className="modify-section">
                  <span className="modify-text">¿Deseas cambiar algo en la entrega o el medio de pago?</span>
                  <button type="button" className="btn-modify" onClick={() => setStep(1)}>
                    Modificar datos
                  </button>
                </div>

                <div className="checkout-footer confirm-actions">
                  <button type="button" className="btn-volver" onClick={() => setStep(1)}>
                    <ArrowLeft size={16} /> Volver a editar
                  </button>
                  <button type="button" className="btn-whatsapp-send" onClick={handleSubmit}>
                    <FaWhatsapp size={18} /> Enviar Pedido a WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: Resumen del Pedido */}
          <div className="checkout-right-panel">
            <div className="resumen-header">
              <h4>Resumen del Pedido</h4>
              <span className="items-count">{cart.reduce((acc, i) => acc + i.quantity, 0)} items</span>
            </div>

            <div className="resumen-items-list">
              {cart.map((item, idx) => {
                const itemUnitPrice = calculateItemUnitPrice(item);
                const itemSubtotal = itemUnitPrice * item.quantity;
                const itemName = item.nombre || "Postre";
                
                const customOptions = item.customizations ? [
                  ...Object.values(item.customizations.options || {}).map((o) => o?.nombre).filter(Boolean),
                  ...(item.customizations.toppings || []).map((t) => (typeof t === "string" ? t : t.nombre)).filter(Boolean),
                  ...Object.values(item.customizations.adiciones || {}).map((a) => a.nombre).filter(Boolean),
                  ...Object.values(item.customizations.salsas || {}).map((s) => s.nombre).filter(Boolean),
                ] : [];

                return (
                  <div key={idx} className="resumen-item">
                    <div className="resumen-item-qty">{item.quantity}x</div>
                    <div className="resumen-item-details">
                      <div className="resumen-item-title-price">
                        <span className="resumen-item-name">{itemName}</span>
                        <span className="resumen-item-price">{formatCOP(itemSubtotal)}</span>
                      </div>
                      {customOptions.length > 0 && (
                        <div className="resumen-item-customs">
                          {customOptions.map((opt, i) => (
                            <span key={i} className="resumen-custom-badge">{opt}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="resumen-totals">
              <div className="totals-row">
                <span className="totals-label">Subtotal productos:</span>
                <span className="totals-value">{formatCOP(totalProductos)}</span>
              </div>
              <div className="totals-row">
                <span className="totals-label">Domicilio:</span>
                {renderDeliveryFeeText()}
              </div>

              {/* Desglose dinámico: tarifa base + km */}
              {esDomicilio && isDynamicDelivery && deliveryResult?.withinCoverage && (
                <div style={{ paddingLeft: "0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <div className="totals-row" style={{ fontSize: "0.78rem" }}>
                    <span className="totals-label" style={{ fontSize: "0.78rem", color: "#666" }}>Tarifa base:</span>
                    <span className="totals-value" style={{ fontSize: "0.78rem", color: "#888" }}>{formatCOP(settings.baseDeliveryFee)}</span>
                  </div>
                  <div className="totals-row" style={{ fontSize: "0.78rem" }}>
                    <span className="totals-label" style={{ fontSize: "0.78rem", color: "#666" }}>
                      {deliveryResult.distanceKm} km × {formatCOP(settings.pricePerKm)}/km:
                    </span>
                    <span className="totals-value" style={{ fontSize: "0.78rem", color: "#888" }}>
                      {formatCOP(Math.round(deliveryResult.distanceKm * settings.pricePerKm / 100) * 100)}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="totals-divider"></div>
              
              {descuento2x1 > 0 && (
                <div className="totals-row" style={{ color: "#22c55e" }}>
                  <span className="totals-label">🎉 2x1 ({currentBadge?.name}):</span>
                  <span className="totals-value">-{formatCOP(descuento2x1)}</span>
                </div>
              )}

              {descuentoBadge > 0 && (
                <div className="totals-row" style={{ color: "#22c55e" }}>
                  <span className="totals-label">Descuento {porcentaje}% ({currentBadge?.name}):</span>
                  <span className="totals-value">-{formatCOP(descuentoBadge)}</span>
                </div>
              )}

              {currentBadge && tieneBeneficios && !beneficiosAplican && (
                <div className="totals-row" style={{ fontSize: "0.8rem", color: "#f59e0b", fontStyle: "italic" }}>
                  <span>⚠️ Tu insignia {currentBadge.name} no aplica beneficios hoy.</span>
                </div>
              )}

              <div className="totals-row grand-total">
                <span className="totals-label">Total a Pagar:</span>
                <span className="totals-value highlighted">{formatCOP(totalNetoAPagar)}</span>
              </div>
            </div>

            <div className="resumen-guarantees">
              <div className="guarantee-item">
                <Clock size={12} color="#8a6652" />
                <span>Preparado al instante</span>
              </div>
              <div className="guarantee-item">
                <CheckCircle size={12} color="#8a6652" />
                <span>Pedido seguro por WhatsApp</span>
              </div>
              {esDomicilio && isDynamicDelivery && deliveryResult?.withinCoverage && (
                <div className="guarantee-item">
                  <Navigation size={12} color="#25D366" />
                  <span style={{ color: "#25D366" }}>
                    Entrega estimada: ~{deliveryResult.durationMin} min
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
