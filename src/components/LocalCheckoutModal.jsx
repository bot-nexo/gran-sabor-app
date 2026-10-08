import { useEffect, useState } from "react";
import { getPaymentMethods } from "../data/dataSource";
import { calculateItemUnitPrice, formatCOP } from "../utils/price";

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.6)",
  zIndex: 2000,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
};
const card = {
  background: "#fff",
  color: "#1e293b",
  width: "100%",
  maxWidth: 480,
  maxHeight: "92vh",
  overflowY: "auto",
  borderRadius: "18px 18px 0 0",
  padding: 20,
  boxSizing: "border-box",
};
const input = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px",
  fontSize: "1rem",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  marginTop: 4,
};

/**
 * Cierre de pedido en el local (punto de venta y mesas): solo forma de pago,
 * sin dirección ni datos de contacto.
 */
const LocalCheckoutModal = ({ isOpen, onClose, onConfirm, cart, title, askName = false, submitting = false }) => {
  const [metodos, setMetodos] = useState([]);
  const [pago, setPago] = useState("");
  const [nombre, setNombre] = useState("");
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    getPaymentMethods()
      .then((m) => {
        const lista = m && m.length ? m : [{ id: "efectivo", nombre: "Efectivo" }];
        setMetodos(lista);
        setPago((prev) => (lista.some((x) => x.nombre === prev) ? prev : lista[0].nombre));
      })
      .catch(() => {
        setMetodos([{ id: "efectivo", nombre: "Efectivo" }]);
        setPago("Efectivo");
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const total = Math.round(cart.reduce((t, i) => t + calculateItemUnitPrice(i) * i.quantity, 0));

  const enviar = (e) => {
    e.preventDefault();
    if (submitting || !pago) return;
    onConfirm({ pago, nombre: nombre.trim(), observaciones: observaciones.trim() });
  };

  return (
    <div style={overlay} onClick={submitting ? undefined : onClose}>
      <form style={card} onClick={(e) => e.stopPropagation()} onSubmit={enviar}>
        <h2 style={{ margin: "0 0 4px" }}>{title}</h2>
        <p style={{ margin: "0 0 14px", color: "#64748b" }}>
          {cart.reduce((a, i) => a + i.quantity, 0)} producto(s) · <strong>{formatCOP(total)}</strong>
        </p>

        <div style={{ fontWeight: 600, marginBottom: 6 }}>Forma de pago</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {metodos.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPago(m.nombre)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: pago === m.nombre ? "2px solid #3D2314" : "1px solid #cbd5e1",
                background: pago === m.nombre ? "#3D2314" : "#fff",
                color: pago === m.nombre ? "#fff" : "#1e293b",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {m.nombre}
            </button>
          ))}
        </div>

        {askName && (
          <label style={{ display: "block", marginBottom: 12 }}>
            Nombre del cliente (opcional)
            <input style={input} value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} />
          </label>
        )}

        <label style={{ display: "block", marginBottom: 16 }}>
          Observaciones (opcional)
          <textarea
            style={{ ...input, minHeight: 64, resize: "vertical" }}
            value={observaciones}
            maxLength={500}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 600 }}
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={submitting || !pago}
            style={{ flex: 2, padding: 14, borderRadius: 12, border: 0, background: "#3D2314", color: "#fff", fontWeight: 700, fontSize: "1rem" }}
          >
            {submitting ? "Enviando…" : "Enviar pedido"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LocalCheckoutModal;
