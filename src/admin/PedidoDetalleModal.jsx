import { X, MapPin, Phone, CreditCard, Package, MessageCircle, StickyNote, Printer } from "lucide-react";
import { formatCOP } from "../utils/price";
import { printTicket } from "../utils/printTicket";
import { esPedidoLocal, etiquetaEntrega } from "../utils/entrega";
import "./admin.css";

const labelEstado = (estado) =>
({
  nuevo: "🆕 Nuevo",
  preparacion: "👨‍🍳 Preparación",
  camino: "🛵 En camino",
  entregado: "✅ Entregado",
  cancelado: "❌ Cancelado",
}[estado] || estado);

//--------------------------
const PedidoDetalleModal = ({ pedido, onClose, onCancel }) => {
  const items = pedido.items || [];
  const fecha = new Date(pedido.created_at).toLocaleString("es-CO", {
    dateStyle: "long",
  });
  const hora = new Date(pedido.created_at).toLocaleTimeString("es-CO", {
    timeStyle: "short",
  });

  const abrirWhatsApp = () => {
    const tel = pedido.telefono.replace(/\D/g, "");
    const conIndicativo = tel.startsWith("57") ? tel : `57${tel}`;
    const msg = encodeURIComponent(
      `Hola ${pedido.nombre}! 🍨 Te contactamos sobre tu pedido #${pedido.numero}.`,
    );
    window.open(`https://wa.me/${conIndicativo}?text=${msg}`, "_blank");
  };

  const imprimirComanda = () => {
    printTicket(pedido);
  };

  //************************************ */
  return (
    <div className="adm-modal__overlay" onClick={onClose}>
      <div className="adm-modal adm-modal--compacto" onClick={(e) => e.stopPropagation()}>
        <header className="adm-modal__header" style={{ alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>
              Pedido #{pedido.numero} · {fecha} a las {hora}
            </h2>
            <span className={`adm-ped__estado adm-ped__estado--${pedido.estado}`}
              style={{ alignSelf: "flex-start", fontSize: '0.8rem' }}>
              {labelEstado(pedido.estado)}
            </span>
          </div>
          <button type="button" className="adm-icono-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="adm-modal__cuerpo adm-modal__cuerpo--columna">
          <section className="adm-det__seccion">
            <h3 className="adm-det__titulo">
              <MapPin size={15} /> Datos de entrega
            </h3>
            <div className="adm-det__datos">
              <p>
                <strong>{pedido.nombre}</strong>
              </p>
              {pedido.telefono && (
                <p>
                  <Phone size={13} /> {pedido.telefono}
                </p>
              )}
              {pedido.direccion && (
                <p>
                  <MapPin size={13} /> {pedido.direccion}
                  {pedido.unidad ? `, ${pedido.unidad}` : ""}
                  {pedido.apto ? `, ${pedido.apto}` : ""}
                </p>
              )}
              <p>
                <CreditCard size={13} /> {pedido.pago || "—"}
              </p>
              <p>
                {pedido.tipo_entrega === "recogida"
                  ? "🏪 Recoge en tienda (sin domicilio)"
                  : esPedidoLocal(pedido)
                    ? `🍽️ ${etiquetaEntrega(pedido)}`
                    : "🛵 Entrega a domicilio"}
              </p>
              {pedido.observaciones && (
                <p className="adm-det__nota">
                  <StickyNote size={13} /> "{pedido.observaciones}"
                </p>
              )}
            </div>
          </section>

          <section className="adm-det__seccion">
            <h3 className="adm-det__titulo">
              <Package size={15} /> Productos ({items.length})
            </h3>
            {items.map((item, i) => (
              <div key={i} className="adm-det__item">
                <span className="adm-det__item-cant">{item.cantidad}×</span>
                <div className="adm-det__item-info">
                  <strong>{item.nombre}</strong>
                  {[...(item.opciones || []), ...(item.toppings || [])].filter(Boolean).length >
                    0 && (
                      <small>
                        {[...(item.opciones || []), ...(item.toppings || [])]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    )}
                  {item.observaciones && <small>"{item.observaciones}"</small>}
                </div>
                <span className="adm-det__item-precio">
                  {formatCOP((item.precio_unitario || 0) * (item.cantidad || 1))}
                </span>
              </div>
            ))}
            <div className="adm-det__totales">
              <div>
                <span>Subtotal:</span>
                <span>{formatCOP(pedido.subtotal)}</span>
              </div>
              {pedido.tipo_entrega !== "recogida" && !esPedidoLocal(pedido) && (
                <div>
                  <span>Domicilio:</span>
                  <span>
                    {pedido.delivery_fee === 0 ? "GRATIS" : formatCOP(pedido.delivery_fee)}
                  </span>
                </div>
              )}
              <div className="adm-det__total-final">
                <span>Total:</span>
                <span>{formatCOP(pedido.total)}</span>
              </div>
            </div>
          </section>
        </div>

        <footer className="adm-det__pie" style={{ flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
          <button type="button" className="admin-btn-primary admin-btn-primary--compacto" onClick={imprimirComanda}>
            <Printer size={15} /> Imprimir Comanda
          </button>

          {pedido.telefono && (
          <button type="button" className="admin-btn-ghost" onClick={abrirWhatsApp}>
            <MessageCircle size={15} /> WhatsApp
          </button>
          )}

          {pedido.estado !== "cancelado" && pedido.estado !== "entregado" && onCancel && (
            <button
              type="button"
              className="admin-btn-ghost"
              style={{ color: "#ef4444", backgroundColor: "#373737ff", borderColor: "transparent" }}
              onClick={() => onCancel(pedido)}
            >
              Cancelar Pedido
            </button>
          )}

          <button type="button" className="admin-btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PedidoDetalleModal;
