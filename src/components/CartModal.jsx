
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Pencil,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { FaMotorcycle, FaShoppingCart } from "react-icons/fa";
import {
  formatCOP,
  calculateItemUnitPrice,
  calculateOrderSummary,
} from "../utils/price";
import "../css/CartModal.css";

// settings llega del dataSource vía useCatalog (App.jsx); fee/umbral configurables
const CartModal = ({
  cart,
  isOpen,
  onClose,
  onUpdateQuantity,
  onRemove,
  onEdit,
  onAddOneMore,
  onCheckout,
  settings,
  checkoutLabel = "Datos de entrega",
}) => {
  if (!isOpen) return null;

  const { subtotal: totalPlatos, esGratis, totalNeto, faltanteGratis } =
    calculateOrderSummary(cart, settings?.deliveryFee, settings?.freeDeliveryThreshold, true);

  //******************************************* */
  return (
    <div className="cart-modal-overlay" onClick={onClose}>
      <div className="cart-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cart-header">
          <div className="cart-header-title">
            <FaShoppingCart size={22} className="cart-icon" />
            <h2>Tu Pedido</h2>
            <span className="cart-badge-count">
              {cart.reduce((acc, i) => acc + i.quantity, 0)}
            </span>
          </div>
          <button className="close-cart" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {/* Empty Cart */}
        {cart.length === 0 ? (
          <div className="empty-cart">
            <div className="empty-cart-icon">
              <ShoppingBag size={48} />
            </div>
            <h3>Tu carrito está vacío</h3>
            <p>¡Explora nuestro menú y antojate de nuestras delicias artesanales!</p>
            <button
              className="cart-btn-primary"
              onClick={() => {
                onClose();
                setTimeout(() => {
                  const menuSection = document.getElementById("menu");
                  if (menuSection) {
                    menuSection.scrollIntoView({ behavior: "smooth" });
                  }
                }, 100);
              }}
            >
              Ver Menu
            </button>
          </div>
        ) : (
          <div className="cart-with-footer">
            {/* Product List */}
            <div className="cart-items">
              {cart.map((item, index) => {
                const itemUnitPrice = calculateItemUnitPrice(item);
                const itemTotalPrice = itemUnitPrice * item.quantity;
                const itemName = item.nombre || "Postre";

                // ¿El ítem tiene adiciones o salsas seleccionadas?
                const tieneAdiciones =
                  item.customizations?.adiciones &&
                  Object.keys(item.customizations.adiciones).length > 0;
                const tieneSalsas =
                  item.customizations?.salsas &&
                  Object.keys(item.customizations.salsas).length > 0;
                const esPersonalizado = tieneAdiciones || tieneSalsas;

                return (
                  <div
                    key={item.customizationKey || index}
                    className="cart-item"
                  >
                    <div className="item-info">
                      <div className="item-title-price">
                        <h4>{itemName}</h4>
                        <span className="item-price">
                          {formatCOP(itemTotalPrice)}
                        </span>
                      </div>

                      {item.customizations && (
                        <div className="item-customs">
                          {Object.keys(item.customizations.options || {}).map(
                            (groupName) => {
                              const selection =
                                item.customizations.options[groupName];
                              return selection ? (
                                <p key={groupName} className="custom-detail">
                                  <span className="custom-label">
                                    {groupName}:
                                  </span>{" "}
                                  {selection.nombre}
                                </p>
                              ) : null;
                            },
                          )}

                          {item.customizations.toppings &&
                            item.customizations.toppings.length > 0 && (
                              <p className="custom-detail">
                                <span className="custom-label">Toppings:</span>{" "}
                                {item.customizations.toppings
                                  .map((t) => (typeof t === "string" ? t : t.nombre))
                                  .join(", ")}
                              </p>
                            )}

                          {item.customizations.adiciones &&
                            Object.keys(item.customizations.adiciones).length > 0 && (
                              <p className="custom-detail">
                                <span className="custom-label">Adiciones:</span>{" "}
                                {Object.values(item.customizations.adiciones)
                                  .map((a) => a.nombre)
                                  .join(", ")}
                              </p>
                            )}

                          {item.customizations.salsas &&
                            Object.keys(item.customizations.salsas).length > 0 && (
                              <p className="custom-detail">
                                <span className="custom-label">Salsas:</span>{" "}
                                {Object.values(item.customizations.salsas)
                                  .map((s) => s.nombre)
                                  .join(", ")}
                              </p>
                            )}

                          {item.customizations.observaciones && (
                            <p className="custom-detail note">
                              {item.customizations.observaciones}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="item-controls">
                      <div className="quantity-selector">
                        <button
                          onClick={() => {
                            if (item.quantity === 1) {
                              onRemove(item.customizationKey);
                            } else {
                              onUpdateQuantity(item.customizationKey, -1);
                            }
                          }}
                          className="qty-btn"
                          type="button"
                          title={item.quantity === 1 ? "Eliminar" : "Reducir cantidad"}
                        >
                          {item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                        </button>
                        <span className="qty-value">{item.quantity}</span>
                        <button
                          onClick={() =>
                            esPersonalizado
                              ? onAddOneMore(item)
                              : onUpdateQuantity(item.customizationKey, 1)
                          }
                          className={`qty-btn${esPersonalizado ? " qty-btn--custom" : ""}`}
                          type="button"
                          title={esPersonalizado ? "Agregar otro (elige adiciones)" : "Agregar uno más"}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="item-actions-extra">
                        <button
                          onClick={() => onEdit(item)}
                          className="action-icon-btn edit"
                          title="Editar producto"
                          type="button"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => onRemove(item.customizationKey)}
                          className="action-icon-btn remove"
                          title="Eliminar"
                          type="button"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer with Summary */}
            <div className="cart-footer">

              <div className="cart-breakdown">
                <div className="breakdown-row total">
                  <span>Subtotal carrito:</span>
                  <span>{formatCOP(totalPlatos)}</span>
                </div>
              </div>

              <div className="cart-actions">
                <button className="cart-btn-secondary" onClick={onClose} type="button">
                  Seguir pidiendo
                </button>
                {settings.isActive === false ? (
                  <button className="cart-btn-primary" type="button" disabled style={{ backgroundColor: "#999", cursor: "not-allowed" }}>
                    En Mantenimiento <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    className="cart-btn-primary"
                    onClick={onCheckout}
                    type="button"
                  >
                    {checkoutLabel} <ArrowRight size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;
