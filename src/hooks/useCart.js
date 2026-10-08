import { useState, useCallback } from "react";
import { parsePrice } from "../utils/price";

/**
 * Custom hook encapsulating all cart state and operations.
 * Returns everything App.jsx needs to wire up modals and WhatsApp.
 */
const useCart = () => {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [productToCustomize, setProductToCustomize] = useState(null);
  const [editingItemKey, setEditingItemKey] = useState(null);

  const [isArmaModalOpen, setIsArmaModalOpen] = useState(false);
  const [armaEditItem, setArmaEditItem] = useState(null);

  // ── Open / close helpers ──────────────────────────────────────────────
  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const openCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };
  const closeCheckout = () => setIsCheckoutOpen(false);

  // ── Add / Edit flow ──────────────────────────────────────────────────
  const addToCart = (product) => {
    setProductToCustomize(product);
    setEditingItemKey(null);
    setIsCustomizing(true);
  };

  const editCartItem = (item) => {
    if (item.isCustom) {
      setArmaEditItem(item);
      setIsArmaModalOpen(true);
      setIsCartOpen(false);
      return;
    }
    setProductToCustomize(item);
    setEditingItemKey(item.customizationKey);
    setIsCustomizing(true);
    setIsCartOpen(false);
  };

  const closeCustomizationModal = () => {
    setIsCustomizing(false);
    setProductToCustomize(null);
    setEditingItemKey(null);
  };
  // ── Confirm customization (add or update) ────────────────────────────
  const confirmCustomization = useCallback(
    (product, customizations) => {
      setCart((prevCart) => {
        const optionsIds = Object.keys(customizations.options || {})
          .map((key) => customizations.options[key]?.id || "")
          .sort();

        // Incluimos adiciones y salsas en la clave para que combos distintos
        // nunca se fusionen en la misma línea del carrito.
        const adicionesIds = Object.keys(customizations.adiciones || {}).sort();
        const salsasIds    = Object.keys(customizations.salsas    || {}).sort();

        const customizationKey = JSON.stringify({
          productId: product.id,
          options: optionsIds,
          toppings: (customizations.toppings || []).map((t) =>
            typeof t === "string" ? t : t.nombre || t.name || "",
          ),
          adiciones: adicionesIds,
          salsas: salsasIds,
          observaciones: customizations.observaciones,
        });

        let newCart = [...prevCart];
        if (editingItemKey) {
          newCart = newCart.filter(
            (item) => item.customizationKey !== editingItemKey,
          );
        }

        const existingItem = newCart.find(
          (item) => item.customizationKey === customizationKey,
        );

        if (existingItem) {
          return newCart.map((item) =>
            item.customizationKey === customizationKey
              ? { ...item, quantity: item.quantity + (product.quantity || 1) }
              : item,
          );
        }

        return [
          ...newCart,
          {
            ...product,
            quantity: product.quantity || 1,
            customizations,
            customizationKey,
          },
        ];
      });

      setEditingItemKey(null);
      setIsCustomizing(false);
    },
    [editingItemKey],
  );

  /**
   * addOneMore – abre el modal de personalización pre-cargado con las
   * customizaciones del ítem existente. Si el usuario confirma con el
   * mismo combo → se suma cantidad. Si cambia algo → línea nueva.
   */
  const addOneMore = useCallback((item) => {
    // Usamos el producto + sus customizaciones actuales como punto de partida
    setProductToCustomize({ ...item, customizations: item.customizations });
    setEditingItemKey(null);   // null = modo "agregar", no reemplazar
    setIsCustomizing(true);
    setIsCartOpen(false);
  }, []);

  // Agrega o edita una creación de "Arma tu Pavé" (compartido por tienda y punto de venta)
  const addArmaToCart = (customProduct, isEdit, oldKey) => {
    if (isEdit) {
      setCart((prev) => prev.filter((c) => c.customizationKey !== oldKey));
    }
    const adicionesIds = Object.keys(customProduct.customizations.adiciones || {}).sort();
    const salsasIds = Object.keys(customProduct.customizations.salsas || {}).sort();
    const newKey = JSON.stringify({
      productId: customProduct.id,
      baseId: customProduct.customizations.base.id,
      adiciones: adicionesIds,
      salsas: salsasIds,
    });
    customProduct.customizationKey = newKey;
    const qty = isEdit ? armaEditItem.quantity : 1;
    setCart((prev) => {
      const existing = prev.find((c) => c.customizationKey === newKey);
      if (existing) {
        return prev.map((c) => (c.customizationKey === newKey ? { ...c, quantity: c.quantity + qty } : c));
      }
      return [...prev, { ...customProduct, quantity: qty }];
    });
  };

  // ── Cart mutations ───────────────────────────────────────────────────
  const removeItemByStoreKey = (storeKey) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.customizationKey !== storeKey),
    );
  };

  const updateQuantity = (storeKey, delta) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.customizationKey === storeKey) {
          return { ...item, quantity: Math.max(1, item.quantity + delta) };
        }
        return item;
      }),
    );
  };

  // ── Derived value ────────────────────────────────────────────────────
  const cartCount = cart.reduce((a, b) => a + b.quantity, 0);

  return {
    // state
    cart,
    cartCount,
    isCartOpen,
    isCustomizing,
    isCheckoutOpen,
    productToCustomize,

    // actions
    closeCustomizationModal,
    openCart,
    closeCart,
    openCheckout,
    closeCheckout,
    addToCart,
    editCartItem,
    addOneMore,
    confirmCustomization,
    
    // Arma Tu Pave
    isArmaModalOpen,
    setIsArmaModalOpen,
    armaEditItem,
    setArmaEditItem,
    addArmaToCart,

    removeItemByStoreKey,
    updateQuantity,
    setCart,
    setIsCartOpen,
    setIsCustomizing,
    setIsCheckoutOpen,
  };
};

export default useCart;
