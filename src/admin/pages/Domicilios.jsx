import React, { useState, useEffect } from "react";
import { Navigation, MapPin, Save } from "lucide-react";
import Swal from "sweetalert2";
import { getSettings, updateSettings } from "../../data/dataSource";
import { formatCOP } from "../../utils/price";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import "../admin.css";

const Domicilios = () => {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const s = await getSettings();
      setForm({
        dynamicDeliveryEnabled: s.dynamicDeliveryEnabled === true,
        storeLat: s.storeLat ?? "",
        storeLng: s.storeLng ?? "",
        baseDeliveryFee: s.baseDeliveryFee ?? 3000,
        pricePerKm: s.pricePerKm ?? 1500,
        maxDeliveryRadiusKm: s.maxDeliveryRadiusKm ?? 15,
      });
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Error al cargar la logística",
        text: e.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleGuardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        dynamicDeliveryEnabled: form.dynamicDeliveryEnabled,
        storeLat: form.storeLat ? Number(form.storeLat) : null,
        storeLng: form.storeLng ? Number(form.storeLng) : null,
        baseDeliveryFee: Number(form.baseDeliveryFee),
        pricePerKm: Number(form.pricePerKm),
        maxDeliveryRadiusKm: Number(form.maxDeliveryRadiusKm),
      };

      if (payload.dynamicDeliveryEnabled && (!payload.storeLat || !payload.storeLng)) {
        throw new Error("Si activas el cálculo por distancia, debes ingresar latitud y longitud.");
      }

      await updateSettings(payload);

      Swal.fire({
        icon: "success",
        title: "Guardado",
        text: "Configuración de envíos actualizada",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Error al guardar",
        text: e.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return <LoadingOverlay fullScreen text="Cargando logística" />;
  }

  //********************* */
  return (
    <div className="admin-page" style={{ position: "relative" }}>
      {saving && <LoadingOverlay text="Guardando..." />}

      <header className="admin-page__header" style={{ display: "flex", justifyContent: "space-between" }}>
        <div >
          <h1 className="admin-page__titulo" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MapPin size={28} color="#ffcc00" /> Logística y Envíos
          </h1>
          <p className="admin-page__sub">
            Configura el cálculo dinámico de domicilios por distancia y Mapbox.
          </p>
        </div>
        <button type="submit" form="domicilios-form" className="admin-btn-primary">
          <Save size={18} /> Guardar
        </button>
      </header>

      <div className="admin-main-content">
        <form id="domicilios-form" className="admin-card adm-cfg" onSubmit={handleGuardar}>
          {/* ═══ DOMICILIO DINÁMICO POR DISTANCIA ═══ */}
          <div className={`adm-cfg__seccion ${form.dynamicDeliveryEnabled ? "adm-cfg__seccion--activa" : ""}`}
            style={form.dynamicDeliveryEnabled ? {
              borderColor: "rgba(255, 204, 0, 0.3)",
              background: "rgba(255, 204, 0, 0.03)"
            } : {}}>
            <div className="adm-cfg__seccion-titulo">
              <Navigation size={15} /> Domicilio dinámico por distancia (estilo Rappi)
            </div>
            <div className="adm-cfg__checks">
              <label className="adm-toggle-fila">
                <input
                  type="checkbox"
                  checked={form.dynamicDeliveryEnabled}
                  onChange={(e) => setForm((f) => ({ ...f, dynamicDeliveryEnabled: e.target.checked }))}
                />
                <span>🗺️ Activar cálculo de domicilio basado en distancia real (Mapbox)</span>
              </label>
            </div>
            <span className="adm-modal__precio-hint">
              Al activar, el cliente escribe su dirección con autocompletado y el costo se calcula en tiempo real
              según los kilómetros de distancia por carretera.
            </span>

            {form.dynamicDeliveryEnabled && (
              <div className="adm-cfg__dynamic-fields">
                {/* Coordenadas del local */}
                <div className="adm-cfg__field-row">
                  <label className="admin-field" style={{ flex: 1, minWidth: 180 }}>
                    <span className="admin-field__label">
                      <MapPin size={12} style={{ display: "inline", marginRight: 4 }} />
                      Latitud del local
                    </span>
                    <div className="admin-field__input">
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="Ej: 6.2442"
                        value={form.storeLat}
                        onChange={(e) => setForm((f) => ({ ...f, storeLat: e.target.value }))}
                      />
                    </div>
                  </label>
                  <label className="admin-field" style={{ flex: 1, minWidth: 180 }}>
                    <span className="admin-field__label">
                      <MapPin size={12} style={{ display: "inline", marginRight: 4 }} />
                      Longitud del local
                    </span>
                    <div className="admin-field__input">
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="Ej: -75.5812"
                        value={form.storeLng}
                        onChange={(e) => setForm((f) => ({ ...f, storeLng: e.target.value }))}
                      />
                    </div>
                  </label>
                </div>
                <span className="adm-modal__precio-hint">
                  💡 Para obtener las coordenadas: abre{" "}
                  <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" style={{ color: "#ffcc00" }}>
                    Google Maps
                  </a>, haz clic derecho sobre tu local y copia las coordenadas.
                </span>

                {/* Tarifa base y precio/km */}
                <div className="adm-cfg__field-row">
                  <label className="admin-field" style={{ flex: 1, minWidth: 180 }}>
                    <span className="admin-field__label">Tarifa base fija (COP)</span>
                    <div className="admin-field__input">
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={form.baseDeliveryFee}
                        onChange={(e) => setForm((f) => ({ ...f, baseDeliveryFee: e.target.value }))}
                      />
                    </div>
                    <span className="adm-modal__precio-hint">{formatCOP(Number(form.baseDeliveryFee) || 0)}</span>
                  </label>
                  <label className="admin-field" style={{ flex: 1, minWidth: 180 }}>
                    <span className="admin-field__label">Precio por kilómetro (COP/km)</span>
                    <div className="admin-field__input">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={form.pricePerKm}
                        onChange={(e) => setForm((f) => ({ ...f, pricePerKm: e.target.value }))}
                      />
                    </div>
                    <span className="adm-modal__precio-hint">{formatCOP(Number(form.pricePerKm) || 0)} / km</span>
                  </label>
                </div>

                {/* Radio máximo */}
                <label className="admin-field" style={{ maxWidth: 300 }}>
                  <span className="admin-field__label">Radio máximo de entrega (km)</span>
                  <div className="admin-field__input">
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={form.maxDeliveryRadiusKm}
                      onChange={(e) => setForm((f) => ({ ...f, maxDeliveryRadiusKm: e.target.value }))}
                    />
                  </div>
                  <span className="adm-modal__precio-hint">
                    Pedidos más allá de {form.maxDeliveryRadiusKm} km serán rechazados automáticamente.
                  </span>
                </label>

                {/* Simulación en vivo */}
                <div className="adm-cfg__preview" style={{ marginTop: "0.5rem" }}>
                  <div className="adm-cfg__preview-titulo">
                    <Navigation size={15} /> Simulación de tarifas por distancia
                  </div>
                  <ul>
                    {[2, 5, 8, 12].map((km) => {
                      const baseFee = Number(form.baseDeliveryFee) || 0;
                      const perKm = Number(form.pricePerKm) || 0;
                      const maxRadius = Number(form.maxDeliveryRadiusKm) || 15;
                      const fee = Math.round((baseFee + km * perKm) / 100) * 100;
                      const fueraDeRango = km > maxRadius;
                      return (
                        <li key={km} style={fueraDeRango ? { color: "#ff4d4d" } : {}}>
                          Cliente a <strong>{km} km</strong> →{" "}
                          {fueraDeRango ? (
                            <span style={{ color: "#ff4d4d" }}>❌ Fuera de cobertura</span>
                          ) : (
                            <strong>{formatCOP(fee)}</strong>
                          )}
                          {!fueraDeRango && (
                            <span style={{ color: "#888", marginLeft: 6, fontSize: "0.82rem" }}>
                              ({formatCOP(baseFee)} + {km} × {formatCOP(perKm)})
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Domicilios;
