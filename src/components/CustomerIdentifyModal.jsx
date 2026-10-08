import { ArrowLeft, ArrowRight, Calendar, CheckCircle2, Loader2, Phone, Sparkles, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { findCustomerByPhone } from "../data/dataSource";
import { getCustomerBadge, isLoyaltyEnabled } from "../utils/badges";
import { formatApplyDays } from "../utils/price";
import "../css/CustomerIdentifyModal.css";

const CustomerIdentifyModal = ({ isOpen, onClose, onSaveCustomer, currentCustomer = null, settings, badges = [] }) => {
  const [step, setStep] = useState(1);
  const [telefono, setTelefono] = useState(currentCustomer?.telefono || "");
  const [nombre, setNombre] = useState(currentCustomer?.nombre || "");
  const [email, setEmail] = useState(currentCustomer?.email || "");
  const [fechaCumple, setFechaCumple] = useState(currentCustomer?.fecha_cumple || "");
  const [isChecking, setIsChecking] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const [customerBadge, setCustomerBadge] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [pedidosCount, setPedidosCount] = useState(0);

  //*************************************** */
  useEffect(() => {
    if (isOpen) {
      if (currentCustomer && currentCustomer.nombre) {
        setStep(3);
        setWelcomeName(currentCustomer.nombre);
        setPedidosCount(currentCustomer.pedidos_count || 0);
        setCustomerBadge(
          isLoyaltyEnabled(settings) ? getCustomerBadge(currentCustomer.pedidos_count || 0, badges) : null
        );
      } else {
        setStep(1);
        setWelcomeName("");
        setCustomerBadge(null);
        setPedidosCount(0);
      }
      setErrorMsg("");
      setIsChecking(false);
      setTelefono(currentCustomer?.telefono || "");
      setNombre(currentCustomer?.nombre || "");
      setEmail(currentCustomer?.email || "");
      setFechaCumple(currentCustomer?.fecha_cumple || "");
    }
  }, [isOpen, currentCustomer, settings?.plan_fidelizacion, settings?.useCustomerBadges, badges]);

  if (!isOpen) return null;
  const loyaltyOn = isLoyaltyEnabled(settings);

  // Paso 1: Validar únicamente el teléfono en Supabase DB
  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanPhone = telefono.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 7) {
      setErrorMsg("Por favor ingresa un número de celular / WhatsApp válido.");
      return;
    }

    setIsChecking(true);
    try {
      const dbCust = await findCustomerByPhone(cleanPhone);
      setIsChecking(false);

      if (dbCust) {
        // EL CLIENTE YA EXISTE EN LA BD -> Ingresa derecho automáticamente
        setWelcomeName(dbCust.nombre || "Cliente");
        const count = dbCust.pedidos_count ?? dbCust.cant_pedidos_concretados ?? 0;
        setPedidosCount(count);

        setCustomerBadge(isLoyaltyEnabled(settings) ? getCustomerBadge(count, badges) : null);

        const fullCust = {
          nombre: dbCust.nombre,
          telefono: dbCust.telefono || cleanPhone,
          email: dbCust.email || "",
          fecha_cumple: dbCust.fecha_cumple || null,
          pedidos_count: count,
        };

        // Guardar cliente e ingresar al menú sin pedir más datos
        setTimeout(() => {
          onSaveCustomer(fullCust);
        }, 1500);
      } else {
        // EL CLIENTE NO EXISTE -> Pasar a Paso 2 para solicitar Nombre y Cumpleaños
        setStep(2);
      }
    } catch (err) {
      console.warn("Error buscando cliente:", err);
      setIsChecking(false);
      setStep(2);
    }
  };

  // Paso 2: Registrar nuevo cliente con Nombre y Cumpleaños
  const handleRegisterNewCustomer = (e) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanNombre = nombre.trim();
    const cleanPhone = telefono.replace(/\D/g, "");

    if (!cleanNombre) {
      setErrorMsg("Por favor ingresa tu nombre completo para continuar.");
      return;
    }

    onSaveCustomer({
      nombre: cleanNombre,
      telefono: cleanPhone,
      email: email.trim() || null,
      fecha_cumple: fechaCumple || null,
    });
  };


  //*************************************** */
  return (
    <div className="customer-modal-backdrop"  onClick={onClose}>
      <div className="customer-modal-card" onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button
            type="button"
            className="customer-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        )}

        <div className="customer-modal-header">
          <div className="customer-modal-icon-badge">
            <Sparkles size={24} className="text-[#ffcc00]" />
          </div>
          <h2 className="customer-modal-title">
            {step === 1
              ? `¡Bienvenido a ${settings?.razonSocial || "nuestro menú"}! 🍰`
              : step === 3
                ? `¡Bienvenido de nuevo! 🎉`
                : "¡Es tu primera vez con nosotros! 🎉"}
          </h2>
          <p className="customer-modal-subtitle">
            {step === 1
              ? "📱 Modo Demo: Ingresa tu WhatsApp para recibir el pedido de ejemplo en tu chat y activar tus beneficios."
              : step === 3
                ? loyaltyOn ? "Estos son tus beneficios y tu nivel actual." : "Ya estás identificado, puedes hacer tu pedido."
                : "Completa tus datos para recibir el comprobante y el seguimiento del pedido por correo."}
          </p>
        </div>

        {step === 3 ? (
          <div className="customer-welcome-banner" style={{ display: "flex", flexDirection: "column", width: "100%", boxSizing: "border-box", padding: "1rem" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem", width: "100%" }}>
              <h4 style={{ fontSize: "1.6rem", fontWeight: "700", marginBottom: "0.25rem", color: "#fff" }}>¡Hola, {welcomeName}!</h4>
            </div>

            {customerBadge && (
              <div className="premium-badge-card" style={{
                background: "linear-gradient(145deg, rgba(30,30,30,0.8), rgba(20,20,20,0.95))",
                borderRadius: "16px",
                border: `1px solid ${customerBadge.color}40`,
                boxShadow: `0 8px 32px ${customerBadge.glow || 'rgba(0,0,0,0.3)'}`,
                padding: "2rem 1.5rem",
                position: "relative",
                overflow: "hidden",
                width: "100%",
                boxSizing: "border-box"
              }}>
                {/* Fondo decorativo */}
                <div style={{ position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%", background: `radial-gradient(circle, ${customerBadge.color}15 0%, transparent 60%)`, pointerEvents: "none" }} />

                <div style={{ position: "relative", zIndex: 1, textAlign: "center", width: "100%" }}>
                  <img src={customerBadge.image} alt={`Nivel ${customerBadge.name}`} style={{
                    width: "90px", height: "90px", objectFit: "cover", borderRadius: "50%",
                    border: `3px solid ${customerBadge.color}`,
                    boxShadow: `0 0 20px ${customerBadge.glow || customerBadge.color}`,
                    margin: "0 auto", display: "block", marginBottom: "1rem"
                  }} />

                  <span style={{ fontSize: "0.85rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "600" }}>Tu nivel actual</span>
                  <strong style={{ color: customerBadge.color, fontSize: "1.8rem", display: "block", textTransform: "uppercase", letterSpacing: "2px", margin: "0.25rem 0 0.5rem", textShadow: `0 0 10px ${customerBadge.color}40` }}>
                    {customerBadge.name}
                  </strong>

                  {/* Beneficios actuales */}
                  <div style={{ margin: "1.25rem 0", padding: "1rem", background: "rgba(0,0,0,0.3)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", width: "100%", boxSizing: "border-box" }}>
                    <p style={{ color: "#e2e8f0", fontSize: "0.95rem", margin: 0, lineHeight: 1.5 }}>
                      {customerBadge.description}
                    </p>
                    {(customerBadge.discount_percentage > 0 || customerBadge.free_delivery || customerBadge.has_2x1) && (
                      <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%", boxSizing: "border-box" }}>
                        {customerBadge.has_2x1 && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#ffcc00", fontSize: "0.9rem", fontWeight: "600" }}>
                            <Sparkles size={16} /> <span>2x1 en tus productos</span>
                          </div>
                        )}
                        {customerBadge.discount_percentage > 0 && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#ffcc00", fontSize: "0.9rem", fontWeight: "600" }}>
                            <Sparkles size={16} /> <span>{customerBadge.discount_percentage}% descuento automático</span>
                          </div>
                        )}
                        {customerBadge.free_delivery && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#10b981", fontSize: "0.9rem", fontWeight: "600" }}>
                            <CheckCircle2 size={16} /> <span>Envío totalmente gratis</span>
                          </div>
                        )}
                        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
                          {formatApplyDays(customerBadge.apply_days)
                            ? "Válido: " + formatApplyDays(customerBadge.apply_days)
                            : "Beneficios sin días habilitados por ahora"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Barra de Progreso y Siguiente Nivel */}
                  {customerBadge.nextBadge && (
                    <div style={{ marginTop: "1.5rem", textAlign: "left", width: "100%", boxSizing: "border-box" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.85rem", color: "#aaa" }}>
                          Faltan <strong>{customerBadge.ordersForNext} pedidos</strong> para <span style={{color: "#fff", fontWeight: "bold"}}>{customerBadge.nextBadge.name}</span>
                        </span>
                        <span style={{ fontSize: "0.8rem", color: customerBadge.color, fontWeight: "bold" }}>
                          {customerBadge.progressPercentage}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{
                          width: `${customerBadge.progressPercentage}%`,
                          height: "100%",
                          background: customerBadge.gradient || customerBadge.color,
                          borderRadius: "4px",
                          boxShadow: `0 0 10px ${customerBadge.color}`
                        }} />
                      </div>

                      {/* Beneficio del siguiente nivel (Motivador) */}
                      {(customerBadge.nextBadge.beneficio || customerBadge.nextBadge.discount_percentage > 0 || customerBadge.nextBadge.free_delivery) && (
                        <div style={{ marginTop: "1rem", padding: "0.85rem", background: `linear-gradient(to right, rgba(255,255,255,0.02), rgba(255,255,255,0.05))`, borderRadius: "8px", borderLeft: `3px solid #ffcc00`, width: "100%", boxSizing: "border-box" }}>
                          <span style={{ display: "block", fontSize: "0.8rem", color: "#ffcc00", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase" }}>Desbloquea en el próximo nivel:</span>
                          <span style={{ fontSize: "0.9rem", color: "#e2e8f0" }}>
                             {customerBadge.nextBadge.beneficio || (customerBadge.nextBadge.discount_percentage > 0 ? `Obtén ${customerBadge.nextBadge.discount_percentage}% de descuento extra.` : "Mejores beneficios en tus pedidos.")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {!customerBadge.nextBadge && (
                    <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(255,215,0,0.1)", borderRadius: "12px", border: "1px solid rgba(255,215,0,0.3)", width: "100%", boxSizing: "border-box" }}>
                      <span style={{ fontSize: "1.2rem", display: "block", marginBottom: "0.5rem" }}>🏆</span>
                      <strong style={{ color: "#ffdf00" }}>¡Eres nivel máximo!</strong>
                      <p style={{ color: "#e2e8f0", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>Disfrutas de los mejores beneficios posibles. Gracias por tu fidelidad.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "2rem", width: "100%", boxSizing: "border-box" }}>
              <button type="button" onClick={onClose} className="customer-submit-btn" style={{ padding: "0.85rem", fontSize: "1.05rem", fontWeight: "600", letterSpacing: "0.5px", width: "100%", boxSizing: "border-box" }}>
                {loyaltyOn ? "Comprar ahora y usar mis beneficios" : "Ir al menú"}
              </button>
              <button type="button" onClick={() => { localStorage.removeItem("paves_customer_info"); sessionStorage.removeItem("paves_customer_info"); window.location.reload(); }} className="customer-skip-btn" style={{ fontSize: "0.85rem", opacity: 0.7, width: "100%", boxSizing: "border-box" }}>
                Cerrar sesión (Cambiar cuenta)
              </button>
            </div>
          </div>
        ) : welcomeName ? (
          <div className="customer-welcome-banner" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "2rem 1rem" }}>
            <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: "1rem" }} />
            <div>
              <h4 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>¡Hola, {welcomeName}!</h4>
              <p style={{ color: "#aaa", marginBottom: "1rem" }}>Te identificamos con éxito. Ingresando al menú...</p>
            </div>

            {customerBadge && (
              <div className="customer-badge-display" style={{ marginTop: "1rem", padding: "1.5rem", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "10px", textAlign: "center", width: "100%" }}>

                  <img src={customerBadge.image} alt={`Nivel ${customerBadge.name}`} style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "50%", border: `2px solid ${customerBadge.color}`, margin: "0 auto", display: "block", marginBottom: "0.5rem" }} />

                <strong style={{ color: customerBadge.color, fontSize: "1.2rem", display: "block", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Nivel {customerBadge.name}
                </strong>
                <span style={{ fontSize: "0.9rem", color: "#aaa" }}>{customerBadge.description}</span>
              </div>
            )}
          </div>
        ) : step === 1 ? (
          /* ── PASO 1: SOLICITAR SOLO TELÉFONO ───────────────────────────── */
          <form onSubmit={handleVerifyPhone} className="customer-modal-form">
            {errorMsg && <div className="customer-modal-error">{errorMsg}</div>}

            <div className="customer-field-group">
              <label className="customer-field-label">Teléfono Celular / WhatsApp *</label>
              <div className="customer-input-wrap">
                <Phone size={18} className="customer-input-icon" />
                <input
                  type="tel"
                  className="customer-input"
                  placeholder="Ej. 3001234567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  autoFocus
                />
              </div>
              <span className="customer-field-hint">
                💡 Ingresa tu número de WhatsApp real para ver cómo te llega la confirmación del pedido de prueba y las notificaciones a tu celular.
              </span>
            </div>

            <button type="submit" className="customer-submit-btn" disabled={isChecking}>
              {isChecking ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Validando en la BD...</span>
                </>
              ) : (
                <>
                  <span>Validar e Ingresar</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <button type="button" onClick={onClose} className="customer-skip-btn">
              Ver menú como invitado (Sin registrarme)
            </button>
          </form>
        ) : (
          /* ── PASO 2: SOLICITAR NOMBRE Y CUMPLEAÑOS (NUEVO CLIENTE) ─────── */
          <form onSubmit={handleRegisterNewCustomer} className="customer-modal-form">
            {errorMsg && <div className="customer-modal-error">{errorMsg}</div>}

            <div className="customer-phone-pill">
              <Phone size={14} />
              <span>{telefono}</span>
              <button type="button" onClick={() => setStep(1)} className="customer-phone-change-btn">
                Cambiar
              </button>
            </div>

            <div className="customer-field-group">
              <label className="customer-field-label">Nombre Completo *</label>
              <div className="customer-input-wrap">
                <User size={18} className="customer-input-icon" />
                <input
                  type="text"
                  className="customer-input"
                  placeholder="Ej. Juan Carlos"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="customer-field-group">
              <label className="customer-field-label">Correo Electrónico *</label>
              <div className="customer-input-wrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="customer-input-icon"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                <input
                  type="email"
                  className="customer-input"
                  placeholder="Ej. tu-correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <span className="customer-field-hint">
                📧 Te enviaremos el comprobante del pedido y los avisos de estado por correo.
              </span>
            </div>

            <div className="customer-field-group">
              <label className="customer-field-label">Fecha de Cumpleaños (Opcional) 🎂</label>
              <div className="customer-input-wrap">
                <Calendar size={18} className="customer-input-icon" />
                <input
                  type="date"
                  className="customer-input"
                  value={fechaCumple}
                  onChange={(e) => setFechaCumple(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="customer-submit-btn">
              <span>Completar Registro e Ingresar</span>
              <Sparkles size={16} />
            </button>

            <button type="button" onClick={() => setStep(1)} className="customer-skip-btn">
              <ArrowLeft size={14} style={{ display: "inline", marginRight: "4px" }} />
              Volver atrás
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CustomerIdentifyModal;
