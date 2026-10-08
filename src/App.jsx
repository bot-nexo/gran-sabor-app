import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import AOS from "aos";
import Swal from "sweetalert2";
import "aos/dist/aos.css";
import "./css/estadoNegocio.css";

import Hero from "./components/Hero";
import Menu from "./components/Menu";
import Footer from "./components/Footer";
import BottomNavigation from "./components/BottomNavigation";
import CartModal from "./components/CartModal";
import CustomizationModal from "./components/CustomizationModal";
import CakeScheduleModal from "./components/CakeScheduleModal";
import CheckoutModal from "./components/CheckoutModal";
import LocalCheckoutModal from "./components/LocalCheckoutModal";
import CustomerIdentifyModal from "./components/CustomerIdentifyModal";
import ArmaTuPaveModal from "./components/ArmaTuPaveModal";
import RatingModal from "./components/RatingModal";
import ScrollToTopButton from "./components/ScrollToTopButton";
import DemoToolbar from "./components/DemoToolbar";
import { AdminRoutes } from "./admin/AppRoutes";
import { info, VALOR_DOMICILIO_DEFAULT, MINIMO_ENVIO_GRATIS_DEFAULT } from "./data/menu";

import useCart from "./hooks/useCart";
import useCatalog from "./hooks/useCatalog";

import { createLocalOrder, createOrder, getMesaActiva, getOrCreateCustomer, incrementCustomerOrderCount } from "./data/dataSource";
import { sendOrderConfirmationEmail } from "./services/emailService";
import { resolveCustomerBadge } from "./utils/badges";
import { estaAbiertoSegunHorario } from "./utils/horario";
import {
  calculateItemUnitPrice,
  calculateOrderSummary
} from "./utils/price";

const PosPage = lazy(() => import("./pos/PosPage"));

// Modo mesa: el QR abre la tienda con ?mesa=N; se recuerda durante la sesión del navegador
const leerMesaInicial = () => {
  try {
    const param = new URLSearchParams(window.location.search).get("mesa");
    if (param !== null) {
      const n = Number(param);
      if (Number.isInteger(n) && n > 0) {
        sessionStorage.setItem("paves_mesa", String(n));
        return n;
      }
      sessionStorage.removeItem("paves_mesa");
      return null;
    }
    const guardada = Number(sessionStorage.getItem("paves_mesa"));
    return Number.isInteger(guardada) && guardada > 0 ? guardada : null;
  } catch {
    return null;
  }
};

const App = () => {
  // Catálogo dinámico (Supabase ↔ local): productos, categorías, settings y diseño
  const { categories, products, settings, design, badges } = useCatalog();

  const {
    cart,
    cartCount,
    isCartOpen,
    isCustomizing,
    isCheckoutOpen,
    productToCustomize,
    closeCustomizationModal,
    openCart,
    closeCart,
    openCheckout,
    closeCheckout,
    addToCart,
    editCartItem,
    addOneMore,
    confirmCustomization,
    removeItemByStoreKey,
    updateQuantity,
    setCart,
    setIsCheckoutOpen,
    isArmaModalOpen,
    setIsArmaModalOpen,
    armaEditItem,
    setArmaEditItem,
    addArmaToCart,
  } = useCart();

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Estado del cliente (identificación por nombre y teléfono cel)
  const [customer, setCustomer] = useState(() => {
    try {
      const saved = sessionStorage.getItem("paves_customer_info") || localStorage.getItem("paves_customer_info");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  const [mesa, setMesa] = useState(leerMesaInicial);
  const [mesaOk, setMesaOk] = useState(null); // null = validando
  const [enviandoMesa, setEnviandoMesa] = useState(false);
  const mesaMode = mesa !== null && mesaOk === true;

  // Valida la mesa del QR: módulo habilitado por el superadmin y mesa activa
  useEffect(() => {
    if (mesa === null || settings.isActive === undefined) return;
    let cancelado = false;
    const invalidar = () => {
      sessionStorage.removeItem("paves_mesa");
      setMesa(null);
      setMesaOk(null);
      Swal.fire({
        icon: "info",
        title: "Mesa no disponible",
        text: "Este código QR no está activo. Puedes hacer tu pedido normalmente.",
        confirmButtonColor: "#3D2314",
      });
      setIsCustomerModalOpen(true);
    };
    if (settings.plan_mesas !== true) {
      invalidar();
      return;
    }
    getMesaActiva(mesa).then((m) => {
      if (cancelado) return;
      if (m) setMesaOk(true);
      else invalidar();
    });
    return () => {
      cancelado = true;
    };
  }, [mesa, settings.plan_mesas, settings.isActive]);


  // Al cerrar o salir de la página del menú, eliminar la info del cliente de storage para garantizar la seguridad de los datos
  useEffect(() => {
    const handleClearCustomerStorage = () => {
      try {
        localStorage.removeItem("paves_customer_info");
        sessionStorage.removeItem("paves_customer_info");
      } catch {
        /* noop */
      }
    };
    window.addEventListener("beforeunload", handleClearCustomerStorage);
    window.addEventListener("pagehide", handleClearCustomerStorage);

    return () => {
      window.removeEventListener("beforeunload", handleClearCustomerStorage);
      window.removeEventListener("pagehide", handleClearCustomerStorage);
    };
  }, []);

  useEffect(() => {
    const handleOpenRating = () => {
      if (!customer || !customer.telefono) {
        setIsCustomerModalOpen(true);
      } else {
        setIsRatingOpen(true);
      }
    };
    window.addEventListener("open-rating", handleOpenRating);
    return () => window.removeEventListener("open-rating", handleOpenRating);
  }, [customer]);

  useEffect(() => {
    // Si al ingresar a la tienda el cliente aún no se ha identificado, abrir el modal automáticamente
    if (mesa === null && (!customer || !customer.telefono)) {
      setIsCustomerModalOpen(true);
    }
  }, []);

  const handleSaveCustomer = async (customerData) => {
    try {
      // Validar o registrar cliente en la BD de Supabase real
      const dbCust = await getOrCreateCustomer(
        customerData.nombre,
        customerData.telefono,
        customerData.fecha_cumple,
        customerData.email
      );

      const mergedCustomer = {
        ...customerData,
        pedidos_count: dbCust?.pedidos_count ?? 0,
        fecha_cumple: dbCust?.fecha_cumple || customerData.fecha_cumple || null
      };

      // Guardar en sessionStorage para que sea volátil (se borra al cerrar la pestaña) y limpiar localStorage
      sessionStorage.setItem("paves_customer_info", JSON.stringify(mergedCustomer));
      localStorage.removeItem("paves_customer_info");

      setCustomer(mergedCustomer);
      setIsCustomerModalOpen(false);
    } catch (e) {
      console.warn("Error al guardar cliente en BD real:", e);
    }
  };


  // WhatsApp y costos ahora vienen de settings (panel admin). Fallback a info local.
  const whatsappNumber = settings.phone || info.phone;

  // Estado del negocio: abierto/cerrado según horario + cierre de emergencia
  const estadoNegocio = estaAbiertoSegunHorario(settings);

  useEffect(() => {
    window.scrollTo(0, 0);
    AOS.init({ duration: 1600, once: true, offset: 100 });
  }, []);

  useEffect(() => {
    AOS.refresh();
  }, [selectedProduct]);


  const sendOrderToWhatsApp = async (deliveryData) => {
    if (cart.length === 0) return;

    // 1) Persistir el pedido en la BD (no bloquea: si falla, seguimos a WhatsApp)
    const esDomicilio = deliveryData.tipoEntrega === "domicilio";
    const feeBase = settings.deliveryFee ?? VALOR_DOMICILIO_DEFAULT;
    const freeThreshold = settings.freeDeliveryThreshold ?? MINIMO_ENVIO_GRATIS_DEFAULT;

    // Si hay delivery dinámico (Mapbox), usar el fee calculado
    const dynamicFee = (esDomicilio && deliveryData.deliveryMeta?.calculatedFee != null)
      ? deliveryData.deliveryMeta.calculatedFee
      : null;

    const currentBadge = resolveCustomerBadge(settings, customer, badges);
    const summary = calculateOrderSummary(cart, feeBase, freeThreshold, esDomicilio, dynamicFee, currentBadge);
    const deliveryFee = summary.deliveryFee;

    const beneficios = [];
    if (summary.descuento2x1 > 0) beneficios.push("2x1 -$" + summary.descuento2x1);
    if (summary.descuentoBadge > 0) beneficios.push(summary.porcentaje + "% -$" + summary.descuentoBadge);
    if (esDomicilio && summary.esGratis) beneficios.push("envio gratis");
    const notaBeneficios = beneficios.length
      ? "INSIGNIA " + currentBadge.name + ": " + beneficios.join(", ")
      : "";
    const orderData = notaBeneficios
      ? {
          ...deliveryData,
          observaciones: [deliveryData.observaciones, notaBeneficios].filter(Boolean).join(" | "),
        }
      : deliveryData;

    if (deliveryData.telefono) {
      await getOrCreateCustomer(
        deliveryData.nombre,
        deliveryData.telefono,
        null,
        deliveryData.email,
      );
    }

    const saved = await createOrder(orderData, cart, {
      subtotal: summary.subtotal,
      deliveryFee,
      total: summary.totalNeto,
      deliveryMeta: deliveryData.deliveryMeta || null,
    });

    // Envío asíncrono de confirmación por correo electrónico (EmailJS)
    sendOrderConfirmationEmail({
      orderData,
      cart,
      summary,
      savedOrder: saved,
      settings,
    }).catch((err) => console.warn("[App] Error enviando email de confirmación:", err));

    // Incrementa el contador de compras concretadas del cliente en la BD real de Supabase
    if (deliveryData.telefono) {
      incrementCustomerOrderCount(deliveryData.telefono, deliveryData.nombre).then((nuevoConteo) => {
        if (nuevoConteo == null) return;
        setCustomer((prev) => {
          if (!prev) return prev;
          const actualizado = { ...prev, pedidos_count: nuevoConteo };
          try {
            sessionStorage.setItem("paves_customer_info", JSON.stringify(actualizado));
          } catch {
            /* noop */
          }
          return actualizado;
        });
      });
    }

    // 2) Armar el mensaje de WhatsApp (idéntico al actual + nº de pedido si existe)
    let message = "*NUEVO PEDIDO *";
    if (saved.numero) message += "\n*Nº " + saved.numero + "*";
    message += "\n";

    // Fuera de horario o cierre de emergencia: el pedido queda AGENDADO y se
    // prepara al abrir, en orden de llegada (el cliente lo debe saber)
    if (!estadoNegocio.abierto) {
      message += "⚠️ *PEDIDO AGENDADO* (negocio cerrado ahora)\n";
      if (estadoNegocio.horarioTexto) {
        message += "Horario: " + estadoNegocio.horarioTexto + "\n";
      }
      message += "Se preparará al abrir, en orden de llegada.\n\n";
    }
    if (deliveryData.tipoEntrega === "recogida") {
      message += "🏪 *MODALIDAD: RECOGER EN TIENDA*\n\n";
    } else if (deliveryData.tipoEntrega === "local") {
      message += "🍽️ *MODALIDAD: COMER EN EL LOCAL*\n\n";
    } else {
      message += "🛵 *MODALIDAD: DOMICILIO*\n\n";
    }
    message += "--------------------------------\n\n";
    message += "*DATOS DEL CLIENTE*\n";
    message += "• *Nombre:* " + deliveryData.nombre + "\n";
    message += "• *Telefono:* " + deliveryData.telefono + "\n";

    if (esDomicilio) {
      message += "• *Direccion:* " + deliveryData.direccion + "\n";
      if (deliveryData.unidad) message += "• *Unidad:* " + deliveryData.unidad + "\n";
      if (deliveryData.apto) message += "• *Apto/Piso:* " + deliveryData.apto + "\n";
      // Agregar info de distancia si hay delivery dinámico
      if (deliveryData.deliveryMeta) {
        message += "• *Distancia:* " + deliveryData.deliveryMeta.distanceKm + " km\n";
        message += "• *Tiempo est.:* ~" + deliveryData.deliveryMeta.durationMin + " min\n";
      }
    }

    message += "• *Pago:* " + deliveryData.pago + "\n";
    if (/transferencia/i.test(deliveryData.pago) && settings.bankAccounts?.length > 0) {
      settings.bankAccounts.forEach((acc) => {
        message += "   _Bco: " + acc.bankName + " N° " + acc.accountNumber + "_\n";
      });
      message += "   _👉 *POR FAVOR ENVÍA EL COMPROBANTE AQUÍ*_ \n";
    }
    message += "\n*DETALLE DEL PEDIDO*\n";

    let total = 0;

    cart.forEach((item) => {
      const itemPrice = calculateItemUnitPrice(item);
      message += "• *" + item.quantity + "x " + item.nombre.trim() + "*\n";

      if (item.customizations) {
        Object.keys(item.customizations.options || {}).forEach((groupName) => {
          const selection = item.customizations.options[groupName];
          if (selection) {
            message += "   _" + groupName.toUpperCase() + ": " + (selection.nombre || selection.name) + "_\n";
          }
        });
        if (item.customizations.bebida) {
          const b = item.customizations.bebida;
          const saborText = b.sabor ? " (" + b.sabor + ")" : "";
          message += "   _BEBIDA: " + b.name + saborText + "_\n";
        }
        if (item.customizations.toppings && item.customizations.toppings.length > 0) {
          const toppingsText = item.customizations.toppings.map(t => typeof t === "object" ? t.nombre || t.name : t).join(", ");
          message += "   _Toppings: " + toppingsText + "_\n";
        }
        if (item.customizations.adiciones && Object.keys(item.customizations.adiciones).length > 0) {
          const adicionesText = Object.values(item.customizations.adiciones).map(a => a.nombre).join(", ");
          message += "   _Adiciones: " + adicionesText + "_\n";
        }
        if (item.customizations.salsas && Object.keys(item.customizations.salsas).length > 0) {
          const salsasText = Object.values(item.customizations.salsas).map(s => s.nombre).join(", ");
          message += "   _Salsas: " + salsasText + "_\n";
        }
        if (item.customizations.observaciones) {
          message += "   _Nota: " + item.customizations.observaciones + "_\n";
        }
        if (item.customizations.deliveryDate && item.customizations.deliveryTime) {
          message += "   *📅 AGENDADO PARA: " + item.customizations.deliveryDate + " - " + item.customizations.deliveryTime + "*\n";
        }
      }

      const subtotal = itemPrice * item.quantity;
      total += subtotal;
      message += "   Subtotal: $" + (subtotal / 1000).toLocaleString() + " K\n\n";
    });

    const esGratis = !esDomicilio || summary.esGratis;
    const totalFinal = summary.totalNeto;

    message += "--------------------------------\n";
    message += "   Subtotal platos: $" + (total / 1000).toLocaleString() + " K\n";
    if (summary.descuento2x1 > 0) {
      message += "   🎉 2x1 (" + currentBadge.name + "): -$" + (summary.descuento2x1 / 1000).toLocaleString() + " K\n";
    }
    if (summary.descuentoBadge > 0) {
      message += "   Descuento " + summary.porcentaje + "% (" + currentBadge.name + "): -$" + (summary.descuentoBadge / 1000).toLocaleString() + " K\n";
    }
    message +=
      "   Domicilio: " +
      (!esDomicilio ? "No aplica" : esGratis ? "GRATIS" : "$" + (deliveryFee / 1000).toLocaleString() + " K") +
      (esDomicilio && deliveryData.deliveryMeta ? " (" + deliveryData.deliveryMeta.distanceKm + " km)" : "") +
      "\n";
    message += "--------------------------------\n";
    message += "*TOTAL A PAGAR: $" + (totalFinal / 1000).toLocaleString() + " K* \n";
    message += "\n_Pedido generado desde la web_";

    window.open(
      "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(message),
      "_blank",
      "noopener,noreferrer"
    );

    Swal.fire({
      title: " Pedido Enviado!",
      text: "Tu pedido ha sido enviado correctamente a WhatsApp.",
      icon: "success",
      confirmButtonColor: "#3D2314",
    });

    setCart([]);
    setIsCheckoutOpen(false);
    closeCart();
  };

  // Pedido desde la mesa: va directo a la BD (sin WhatsApp) y se despacha desde Pedidos
  const sendMesaOrder = async ({ pago, nombre, observaciones }) => {
    setEnviandoMesa(true);
    try {
      const numero = await createLocalOrder({ origen: "mesa", mesa, nombre, pago, observaciones }, cart);
      setCart([]);
      setIsCheckoutOpen(false);
      closeCart();
      Swal.fire({
        icon: "success",
        title: "¡Pedido recibido!",
        html: `<div>Tu número de pedido</div><div style="font-size:3.5rem;font-weight:800;line-height:1.1">${Number(numero)}</div><div>Mesa ${mesa}. En breve te lo llevamos.</div>`,
        confirmButtonColor: "#3D2314",
      });
    } catch (e) {
      Swal.fire({ icon: "error", title: "No se pudo enviar el pedido", text: e.message, confirmButtonColor: "#3D2314" });
    } finally {
      setEnviandoMesa(false);
    }
  };

  //***************************** */
  return (
    <>
      <DemoToolbar />
      <Routes>
        {/* Punto de venta de colaboradores */}
        <Route path="/pos/*" element={<Suspense fallback={null}><PosPage /></Suspense>} />

        {/* Panel de administración */}
        <Route path="/admin/*" element={<AdminRoutes />} />

        {/* Tienda y catálogo público */}
        <Route
        path="/*"
        element={
          <div
            className="app-wrapper has-bottom-nav"
            style={{
              backgroundColor: design?.appBg && !design.appBg.includes("fff") && !design.appBg.includes("fdf") ? design.appBg : "#0d0805",
              fontFamily: design?.fontFamily || "inherit",
            }}
          >
            {settings.isActive === false && (
              <div style={{ backgroundColor: "#d32f2f", color: "white", textAlign: "center", padding: "10px", fontWeight: "bold", fontSize: "0.9rem", zIndex: 1000, position: "relative" }}>
                Estamos en mantenimiento o actualización. Pronto volveremos a recibir pedidos.
              </div>
            )}
            <Hero
              cartCount={cartCount}
              onOpenCart={openCart}
              estadoNegocio={estadoNegocio}
              design={design}
              products={products}
              settings={settings}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onAddToCart={addToCart}
              customer={customer}
              onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
              badgeLabel={mesaMode ? `Mesa ${mesa}` : ""}
            />

            <Menu
              data={products}
              categories={categories}
              selectedProduct={selectedProduct}
              setSelectedProduct={setSelectedProduct}
              addToCart={addToCart}
              design={design}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onOpenArmaModal={() => { setArmaEditItem(null); setIsArmaModalOpen(true); }}
              settings={settings}
              customer={customer}
              badges={badges}
              onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
            />

            <ScrollToTopButton />
            <Footer settings={settings} design={design} />

            <BottomNavigation
              cartCount={cartCount}
              onOpenCart={openCart}
              whatsappNumber={whatsappNumber}
              settings={settings}
              customer={customer}
              badges={badges}
              onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
              mesaMode={mesaMode}
            />



            <CartModal
              cart={cart}
              isOpen={isCartOpen}
              onClose={closeCart}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItemByStoreKey}
              onEdit={editCartItem}
              onAddOneMore={addOneMore}
              onCheckout={openCheckout}
              settings={settings}
              checkoutLabel={mesaMode ? "Confirmar pedido" : undefined}
            />

            {productToCustomize && productToCustomize.tiempo_preparacion_horas > 0 ? (
              <CakeScheduleModal
                product={productToCustomize}
                isOpen={isCustomizing}
                onClose={closeCustomizationModal}
                onConfirm={confirmCustomization}
                settings={settings}
              />
            ) : (
              <CustomizationModal
                product={productToCustomize}
                isOpen={isCustomizing}
                onClose={closeCustomizationModal}
                onConfirm={confirmCustomization}
                settings={settings}
              />
            )}

            <ArmaTuPaveModal
              isOpen={isArmaModalOpen}
              onClose={() => { setIsArmaModalOpen(false); setArmaEditItem(null); }}
              settings={settings}
              onAddToCart={addArmaToCart}
              editItem={armaEditItem}
            />


            {mesaMode ? (
              <LocalCheckoutModal
                isOpen={isCheckoutOpen}
                onClose={closeCheckout}
                onConfirm={sendMesaOrder}
                cart={cart}
                title={`Pedido mesa ${mesa}`}
                askName
                submitting={enviandoMesa}
              />
            ) : (
              <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={closeCheckout}
                onConfirm={sendOrderToWhatsApp}
                cart={cart}
                settings={settings}
                estadoNegocio={estadoNegocio}
                badges={badges}
                customer={customer}
              />
            )}

            <CustomerIdentifyModal
              isOpen={isCustomerModalOpen && !mesaMode}
              onClose={() => setIsCustomerModalOpen(false)}
              onSaveCustomer={handleSaveCustomer}
              currentCustomer={customer}
              settings={settings}
              badges={badges}
            />

            <RatingModal
              isOpen={isRatingOpen}
              onClose={() => setIsRatingOpen(false)}
              currentCustomer={customer}
              settings={settings}
            />
          </div>
        }
      />
    </Routes>
    </>
  );
};

export default App;
