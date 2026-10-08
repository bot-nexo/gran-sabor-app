// ── AddressAutocomplete ─────────────────────────────────────────────────────
// Input de dirección con autocompletado Mapbox + cálculo de distancia en
// tiempo real. Muestra badge de distancia/costo y bloquea si fuera de rango.
import React, { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Navigation, AlertTriangle, Loader, Clock } from "lucide-react";
import {
  searchAddress,
  retrieveAddress,
  calculateDistance,
  calculateDeliveryFee,
  isWithinCoverage,
  isMapboxConfigured,
} from "../services/mapboxService";
import { formatCOP } from "../utils/price";
import "../css/AddressAutocomplete.css";

/**
 * @param {object} props
 * @param {string}  props.value              – Valor actual de la dirección (formData.direccion)
 * @param {Function} props.onChange          – Callback (addressText: string)
 * @param {Function} props.onDeliveryResult – Callback con los resultados del cálculo:
 *    { fee: number, distanceKm: number, durationMin: number, lat: number, lng: number,
 *      fullAddress: string, withinCoverage: boolean } | null
 * @param {object}  props.deliveryConfig     – Configuración del admin:
 *    { storeLat, storeLng, baseDeliveryFee, pricePerKm, maxDeliveryRadiusKm, dynamicDeliveryEnabled }
 * @param {string}  props.placeholder
 */
const AddressAutocomplete = ({
  value,
  onChange,
  onDeliveryResult,
  deliveryConfig,
  placeholder = "Ej: Carrera 50 # 49 - 20, Barrio San Pedro",
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [deliveryResult, setDeliveryResult] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Si Mapbox no está configurado o el delivery dinámico está desactivado,
  // este componente se comporta como un input normal
  const isDynamic =
    isMapboxConfigured &&
    deliveryConfig?.dynamicDeliveryEnabled &&
    deliveryConfig?.storeLat &&
    deliveryConfig?.storeLng;

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  const handleInputChange = useCallback(
    (e) => {
      const text = e.target.value;
      onChange(text);

      // Limpiar resultado previo si cambió el texto
      if (deliveryResult) {
        setDeliveryResult(null);
        onDeliveryResult?.(null);
      }

      if (!isDynamic) return;

      clearTimeout(debounceRef.current);

      if (text.trim().length < 3) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        const results = await searchAddress(text, {
          proximityLat: deliveryConfig.storeLat,
          proximityLng: deliveryConfig.storeLng,
        });
        setSuggestions(results);
        setShowDropdown(results.length > 0);
        setActiveIndex(-1);
        setIsLoading(false);
      }, 350);
    },
    [isDynamic, deliveryConfig, onChange, onDeliveryResult, deliveryResult]
  );

  // Seleccionar una sugerencia
  const handleSelect = useCallback(
    async (suggestion) => {
      setShowDropdown(false);
      setSuggestions([]);
      setIsCalculating(true);

      // 1. Retrieve: obtener coordenadas completas
      const details = await retrieveAddress(suggestion.mapbox_id);
      if (!details || !details.lat || !details.lng) {
        setIsCalculating(false);
        setDeliveryResult({
          error: "No se pudieron obtener las coordenadas. Intenta otra dirección.",
        });
        onDeliveryResult?.(null);
        return;
      }

      // Actualizar el input con la dirección completa
      onChange(details.fullAddress || suggestion.fullAddress);

      // 2. Calcular distancia real
      const dist = await calculateDistance(
        deliveryConfig.storeLat,
        deliveryConfig.storeLng,
        details.lat,
        details.lng
      );

      if (!dist) {
        setIsCalculating(false);
        setDeliveryResult({
          error: "No se pudo calcular la ruta. Intenta otra dirección.",
        });
        onDeliveryResult?.(null);
        return;
      }

      // 3. Validar cobertura
      const withinCov = isWithinCoverage(
        dist.distanceKm,
        deliveryConfig.maxDeliveryRadiusKm
      );

      // 4. Calcular fee
      const fee = calculateDeliveryFee(
        dist.distanceKm,
        deliveryConfig.baseDeliveryFee,
        deliveryConfig.pricePerKm
      );

      const result = {
        fee,
        distanceKm: dist.distanceKm,
        durationMin: dist.durationMin,
        lat: details.lat,
        lng: details.lng,
        fullAddress: details.fullAddress,
        withinCoverage: withinCov,
      };

      setDeliveryResult(result);
      onDeliveryResult?.(result);
      setIsCalculating(false);
    },
    [deliveryConfig, onChange, onDeliveryResult]
  );

  // Navegación con teclado
  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div className="address-autocomplete" ref={wrapperRef}>
      <div className="input-with-icon">
        <MapPin size={16} className="input-icon" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          required
          autoComplete="off"
        />
        {isLoading && (
          <div className="address-loading">
            <div className="address-spinner" />
          </div>
        )}
      </div>

      {/* Dropdown de sugerencias */}
      {showDropdown && suggestions.length > 0 && (
        <div className="address-suggestions">
          {suggestions.map((s, idx) => (
            <div
              key={s.mapbox_id || idx}
              className={`address-suggestion-item ${idx === activeIndex ? "active" : ""}`}
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <div className="suggestion-icon">
                <MapPin size={14} />
              </div>
              <div className="suggestion-text">
                <span className="suggestion-name">{s.name}</span>
                <span className="suggestion-address">{s.fullAddress}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Atribución Mapbox (requerida por TOS) */}
      {isDynamic && (
        <span className="mapbox-attribution">
          Powered by{" "}
          <a href="https://www.mapbox.com" target="_blank" rel="noopener noreferrer">
            Mapbox
          </a>
        </span>
      )}

      {/* Badge: calculando */}
      {isCalculating && (
        <div className="delivery-distance-badge delivery-distance-badge--calculating">
          <Loader size={16} className="badge-icon" style={{ animation: "spinAddr 0.6s linear infinite" }} />
          <div className="delivery-distance-details">
            <span className="distance-main">Calculando distancia y costo…</span>
          </div>
        </div>
      )}

      {/* Badge: resultado OK */}
      {!isCalculating && deliveryResult && !deliveryResult.error && deliveryResult.withinCoverage && (
        <div className="delivery-distance-badge delivery-distance-badge--ok">
          <Navigation size={16} className="badge-icon" />
          <div className="delivery-distance-details">
            <span className="distance-main">
              {deliveryResult.distanceKm} km — Domicilio: {formatCOP(deliveryResult.fee)}
            </span>
            <span className="distance-sub">
              <Clock size={10} style={{ display: "inline", marginRight: 3, verticalAlign: "middle" }} />
              Tiempo estimado: ~{deliveryResult.durationMin} min
            </span>
          </div>
        </div>
      )}

      {/* Badge: fuera de cobertura */}
      {!isCalculating && deliveryResult && !deliveryResult.error && !deliveryResult.withinCoverage && (
        <div className="delivery-distance-badge delivery-distance-badge--error">
          <AlertTriangle size={16} className="badge-icon" />
          <div className="delivery-distance-details">
            <span className="distance-main">
              Tu ubicación está fuera de nuestro rango de cobertura
            </span>
            <span className="distance-sub">
              Distancia: {deliveryResult.distanceKm} km — Máximo: {deliveryConfig.maxDeliveryRadiusKm} km
            </span>
          </div>
        </div>
      )}

      {/* Badge: error genérico */}
      {!isCalculating && deliveryResult?.error && (
        <div className="delivery-distance-badge delivery-distance-badge--error">
          <AlertTriangle size={16} className="badge-icon" />
          <div className="delivery-distance-details">
            <span className="distance-main">{deliveryResult.error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
