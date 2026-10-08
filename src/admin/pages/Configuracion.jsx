import { CreditCard, Loader2, MapPin, Navigation, Plus, Power, Save, Star, Trash2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { getSettings, updateSettings } from "../../data/dataSource";
import { formatCOP } from "../../utils/price";
import "../admin.css";

const Configuracion = () => {
  const [form, setForm] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const timeOut = 1500;
  const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  useEffect(() => {
    const cargarConfig = async () => {
      setCargando(true);
      try {
        const [s] = await Promise.all([getSettings(), esperar(timeOut)]);
        setForm({
          deliveryFee: s.deliveryFee ?? 5000,
          freeDeliveryThreshold: s.freeDeliveryThreshold ?? 40000,
          offersDelivery: s.offersDelivery !== false,
          offersPickup: s.offersPickup !== false,
          offersLocal: s.offersLocal !== false,
          forceClosed: s.forceClosed === true,
          bankAccounts: Array.isArray(s.bankAccounts) ? s.bankAccounts : [],
          // Domicilio Dinámico
          dynamicDeliveryEnabled: s.dynamicDeliveryEnabled === true,
          storeLat: s.storeLat ?? "",
          storeLng: s.storeLng ?? "",
          baseDeliveryFee: s.baseDeliveryFee ?? 3000,
          pricePerKm: s.pricePerKm ?? 1500,
          maxDeliveryRadiusKm: s.maxDeliveryRadiusKm ?? 15,
          // Permisos del superadmin para la vista
          _plan_domicilio_dinamico: s.plan_domicilio_dinamico !== false,
        });
      } catch (e) {
        Swal.fire({
          title: "Error al cargar",
          text: e.message,
          icon: "error",
          confirmButtonColor: "#3D2314",
        });
      } finally {
        setCargando(false);
      }
    };

    cargarConfig();
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    const fee = Number(form.deliveryFee);
    const umbral = Number(form.freeDeliveryThreshold);

    if (!(fee >= 0) || !(umbral >= 0)) {
      Swal.fire({
        icon: "warning",
        text: "Los valores deben ser números positivos (0 permitido).",
        confirmButtonColor: "#3D2314",
      });
      return;
    }

    if (!form.offersDelivery && !form.offersPickup && !form.offersLocal) {
      Swal.fire({
        icon: "warning",
        text: "Debes mantener al menos una modalidad de entrega activa.",
        confirmButtonColor: "#3D2314",
      });
      return;
    }

    // Validar coordenadas si domicilio dinámico está activo
    if (form.dynamicDeliveryEnabled) {
      const lat = Number(form.storeLat);
      const lng = Number(form.storeLng);
      if (!lat || !lng || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        Swal.fire({
          icon: "warning",
          text: "Para activar el domicilio dinámico, debes ingresar coordenadas válidas del local (lat entre -90 y 90, lng entre -180 y 180).",
          confirmButtonColor: "#3D2314",
        });
        return;
      }
    }

    setGuardando(true);
    try {
      await Promise.all([
        updateSettings({
          deliveryFee: fee,
          freeDeliveryThreshold: umbral,
          offersDelivery: form.offersDelivery,
          offersPickup: form.offersPickup,
          offersLocal: form.offersLocal,
          // Domicilio Dinámico
          dynamicDeliveryEnabled: form.dynamicDeliveryEnabled,
          storeLat: form.storeLat ? Number(form.storeLat) : null,
          storeLng: form.storeLng ? Number(form.storeLng) : null,
          baseDeliveryFee: Number(form.baseDeliveryFee) || 3000,
          pricePerKm: Number(form.pricePerKm) || 1500,
          maxDeliveryRadiusKm: Number(form.maxDeliveryRadiusKm) || 15,
          bankAccounts: form.bankAccounts
            .map((acc) => ({ bankName: acc.bankName.trim(), accountNumber: acc.accountNumber.trim() }))
            .filter((acc) => acc.bankName || acc.accountNumber),
        }),
        esperar(timeOut),
      ]);

      Swal.fire({
        icon: "success",
        title: "Configuración actualizada",
        text: "Carrito y checkout usan los nuevos valores en segundos.",
        toast: true,
        position: "top-end",
        timer: 2400,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        title: "No se pudo guardar",
        text: err.message,
        icon: "error",
        confirmButtonColor: "#3D2314",
      });
    } finally {
      setGuardando(false);
    }
  };

  const addBankAccount = () =>
    setForm((f) => ({ ...f, bankAccounts: [...f.bankAccounts, { bankName: "", accountNumber: "" }] }));

  const updateBankAccount = (index, field, value) =>
    setForm((f) => ({
      ...f,
      bankAccounts: f.bankAccounts.map((acc, i) => (i === index ? { ...acc, [field]: value } : acc)),
    }));

  const removeBankAccount = (index) =>
    setForm((f) => ({ ...f, bankAccounts: f.bankAccounts.filter((_, i) => i !== index) }));

  // 1. Carga inicial (Pantalla Completa mientras cargando sea true o form sea null)
  if (cargando || !form) {
    return (
      <LoadingOverlay fullScreen text="Cargando configuración" minTime={timeOut} />
    );
  }

  return (
    <div className="admin-page" style={{ position: "relative" }}>
      {/* 2. Overlay durante la acción de guardar */}
      {guardando && (
        <LoadingOverlay text="Sincronizando configuración" minTime={timeOut} />
      )}

      <header className="admin-page__header">
        <h1 className="admin-page__titulo">Configuración de pedidos</h1>
        <p className="admin-page__sub">
          Costos de domicilio — afectan carrito y checkout.
        </p>
      </header>

      <div className="admin-main-content">
        <form className="admin-card adm-cfg" onSubmit={guardar} style={{ position: "relative" }}>
          <div className="adm-cfg__grid">
            <label className="admin-field">
              <span className="admin-field__label">Valor del domicilio fijo (COP)</span>
              <div className="admin-field__input">
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={form.deliveryFee}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))}
                />
              </div>
              <span className="adm-modal__precio-hint">
                {formatCOP(Number(form.deliveryFee) || 0)}
                {form.dynamicDeliveryEnabled && (
                  <span style={{ color: "#ffaa29", marginLeft: 8 }}>
                    (Fallback — se usa solo si Mapbox falla)
                  </span>
                )}
              </span>
            </label>

            <label className="admin-field">
              <span className="admin-field__label">Envío gratis a partir de (COP)</span>
              <div className="admin-field__input">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={form.freeDeliveryThreshold}
                  onChange={(e) => setForm((f) => ({ ...f, freeDeliveryThreshold: e.target.value }))}
                />
              </div>
              <span className="adm-modal__precio-hint">
                {formatCOP(Number(form.freeDeliveryThreshold) || 0)}
              </span>
            </label>
          </div>



          {/* Modalidades de entrega */}
          <div className="adm-cfg__seccion">
            <div className="adm-cfg__seccion-titulo">
              <Truck size={15} /> Modalidades de entrega
            </div>
            <div className="adm-cfg__checks">
              <label className="adm-toggle-fila">
                <input
                  type="checkbox"
                  checked={form.offersDelivery}
                  onChange={(e) => setForm((f) => ({ ...f, offersDelivery: e.target.checked }))}
                />
                <span>🛵 Domicilio</span>
              </label>
              <label className="adm-toggle-fila">
                <input
                  type="checkbox"
                  checked={form.offersPickup}
                  onChange={(e) => setForm((f) => ({ ...f, offersPickup: e.target.checked }))}
                />
                <span>💁‍♂️ Recoger en tienda</span>
              </label>
              <label className="adm-toggle-fila">
                <input
                  type="checkbox"
                  checked={form.offersLocal}
                  onChange={(e) => setForm((f) => ({ ...f, offersLocal: e.target.checked }))}
                />
                <span>🍽️ Local</span>
              </label>
            </div>
            <span className="adm-modal__precio-hint">
              El checkout solo ofrece las modalidades activas. Debe quedar al menos una.
            </span>
          </div>

          {/* Datos para pagos por transferencia */}
          <div className="adm-cfg__seccion">
            <div className="adm-cfg__seccion-titulo adm-cfg__seccion-titulo--acciones">
              <span><CreditCard size={15} /> Datos para pagos por transferencia</span>
              <button type="button" onClick={addBankAccount} className="admin-btn-primary admin-btn-primary--compacto">
                <Plus size={14} /> Añadir cuenta
              </button>
            </div>

            {form.bankAccounts.map((acc, index) => (
              <div key={index} className="adm-cfg__grid adm-cfg__cuenta">
                <button
                  type="button"
                  className="adm-cfg__cuenta-quitar"
                  onClick={() => removeBankAccount(index)}
                  title="Eliminar cuenta"
                >
                  <Trash2 size={16} />
                </button>
                <label className="admin-field">
                  <span className="admin-field__label">Banco {index + 1} (Ej: Bancolombia / Nequi)</span>
                  <div className="admin-field__input">
                    <input
                      type="text"
                      value={acc.bankName}
                      onChange={(e) => updateBankAccount(index, "bankName", e.target.value)}
                    />
                  </div>
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Número de cuenta</span>
                  <div className="admin-field__input">
                    <input
                      type="text"
                      value={acc.accountNumber}
                      onChange={(e) => updateBankAccount(index, "accountNumber", e.target.value)}
                    />
                  </div>
                </label>
              </div>
            ))}

            {form.bankAccounts.length === 0 && (
              <div className="adm-cfg__cuenta adm-cfg__cuenta--vacia">
                No hay cuentas configuradas. Usa "Añadir cuenta" para agregar una.
              </div>
            )}

            <span className="adm-modal__precio-hint">
              Si configuras estas cuentas, se mostrarán en el checkout indicando a dónde transferir.
            </span>
          </div>

        {/* Cierre de emergencia */}
          <div className={"adm-cfg__seccion " + (form.forceClosed ? "adm-cfg__seccion--alerta" : "")}>
            <div className="adm-cfg__seccion-titulo">
              <Power size={15} /> Estado del negocio
            </div>
            {form.forceClosed ? (
              <p className="adm-cfg__alerta-texto">
                ⚠️ El negocio está <strong>CERRADO por emergencia</strong>: la tienda muestra el aviso,
                se pueden seguir agendando pedidos y se preparan al abrir, en orden de llegada.
              </p>
            ) : (
              <p className="adm-cfg__alerta-texto">
                El horario configurado en <strong className="text-blue-300">Empresa</strong> controla si estás abierto. Usa el
                cierre solo para emergencias.
              </p>
            )}
            <button
              type="button"
              className={form.forceClosed ? "admin-btn-primary admin-btn-primary--compacto" : "admin-btn-ghost"}
              onClick={async () => {
                const nuevo = !form.forceClosed;
                const res = await Swal.fire({
                  title: nuevo ? "¿Cerrar el negocio ahora?" : "¿Reabrir el negocio?",
                  text: nuevo
                    ? "La tienda mostrará 'Cerrado — agenda tu pedido'. Los pedidos se siguen recibiendo."
                    : "La tienda volverá a mostrar el estado según tu horario.",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonText: nuevo ? "Sí, cerrar" : "Sí, reabrir",
                  cancelButtonText: "Cancelar",
                  confirmButtonColor: "#ffaa29ff",
                  cancelButtonColor: "#5e5e5eff",
                  reverseButtons: true,
                });
                if (!res.isConfirmed) return;
                try {
                  setGuardando(true);
                  await Promise.all([
                    updateSettings({ forceClosed: nuevo }),
                    esperar(timeOut)
                  ]);
                  setForm((f) => ({ ...f, forceClosed: nuevo }));
                  Swal.fire({
                    icon: "success",
                    title: nuevo ? "Negocio cerrado" : "Negocio reabierto",
                    toast: true,
                    position: "top-end",
                    timer: 2200,
                    showConfirmButton: false,
                  });
                } catch (err) {
                  Swal.fire({ title: "No se pudo guardar", text: err.message, icon: "error", confirmButtonColor: "#3D2314" });
                } finally {
                  setGuardando(false);
                }
              }}
            >
              {form.forceClosed ? "✅ Reabrir negocio" : "🔒 Cierre de emergencia"}
            </button>
          </div>

          {/* Vista previa del comportamiento (tarifa fija) */}
          {!form.dynamicDeliveryEnabled && (() => {
            const deliveryFee = Number(form.deliveryFee) || 0;
            const freeThreshold = Number(form.freeDeliveryThreshold) || 0;
            const hasFreeDelivery = freeThreshold > 0;

            const sampleAmount = freeThreshold > 5000 ? freeThreshold - 5000 : Math.max(0, freeThreshold / 2);
            const neededForFree = Math.max(0, freeThreshold - sampleAmount);

            return (
              <div className="adm-cfg__preview">
                <div className="adm-cfg__preview-titulo">
                  <Truck size={15} /> Vista previa del comportamiento
                </div>
                <ul>
                  <li>
                    Pedido de <strong>{formatCOP(sampleAmount)}</strong> →{" "}
                    {hasFreeDelivery && sampleAmount < freeThreshold ? (
                      <>
                        paga domicilio de <strong>{formatCOP(deliveryFee)}</strong>
                        {neededForFree > 0 && (
                          <> (le faltan <strong>{formatCOP(neededForFree)}</strong> para envío gratis)</>
                        )}
                      </>
                    ) : (
                      <span className="adm-cfg__gratis">domicilio GRATIS 🎉</span>
                    )}
                  </li>

                  <li>
                    Pedido de <strong>{formatCOP(freeThreshold)}</strong> o más →{" "}
                    <span className="adm-cfg__gratis">domicilio GRATIS 🎉</span>
                  </li>
                </ul>
              </div>
            );
          })()}

          <div className="adm-cfg__pie">
            <button type="submit" className="admin-btn-primary admin-btn-primary--compacto" disabled={guardando}>
              {guardando ? <Loader2 size={15} className="adm-spin" /> : <Save size={15} />}
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Configuracion;
