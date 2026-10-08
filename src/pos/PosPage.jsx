import { KeyRound, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { logoutAdmin } from "../admin/sessionStore";
import { useAdminSession } from "../admin/useAdminSession";
import ArmaTuPaveModal from "../components/ArmaTuPaveModal";
import CakeScheduleModal from "../components/CakeScheduleModal";
import CartModal from "../components/CartModal";
import CustomizationModal from "../components/CustomizationModal";
import LocalCheckoutModal from "../components/LocalCheckoutModal";
import Menu from "../components/Menu";
import { createLocalOrder, getMyColaborador, solicitarCambioPassword } from "../data/dataSource";
import useCart from "../hooks/useCart";
import useCatalog from "../hooks/useCatalog";
import { calculateItemUnitPrice, formatCOP } from "../utils/price";

const COLOR = "#3D2314";

const btnHeader = {
  background: "rgba(255,255,255,.15)",
  color: "#fff",
  border: 0,
  borderRadius: 10,
  padding: "10px 12px",
  cursor: "pointer",
};

const Aviso = ({ titulo, texto, onSalir }) => (
  <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0d0805", color: "#fff", padding: 24, textAlign: "center" }}>
    <div style={{ maxWidth: 380 }}>
      <h2>{titulo}</h2>
      <p style={{ opacity: 0.8 }}>{texto}</p>
      <button type="button" onClick={onSalir} style={{ padding: "12px 20px", borderRadius: 10, border: 0, fontWeight: 700 }}>
        Salir
      </button>
    </div>
  </div>
);

/** Punto de venta para colaboradores: elegir productos, forma de pago y enviar. */
const PosPage = () => {
  const navigate = useNavigate();
  const { session, role, ready } = useAdminSession();
  const { categories, products, settings, design } = useCatalog();
  const {
    cart, cartCount, isCartOpen, isCustomizing, isCheckoutOpen, productToCustomize,
    closeCustomizationModal, openCart, closeCart, openCheckout, closeCheckout, addToCart,
    editCartItem, addOneMore, confirmCustomization, removeItemByStoreKey, updateQuantity,
    setCart, setIsCheckoutOpen, isArmaModalOpen, setIsArmaModalOpen, armaEditItem,
    setArmaEditItem, addArmaToCart,
  } = useCart();

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [perfil, setPerfil] = useState(undefined); // undefined = cargando, null = sin perfil
  const [enviando, setEnviando] = useState(false);

  const esColaborador = role === "colaborador";
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    if (!esColaborador) {
      setPerfil(null);
      return;
    }
    getMyColaborador(userId)
      .then(setPerfil)
      .catch(() => setPerfil(null));
  }, [userId, esColaborador]);

  const salir = async () => {
    await logoutAdmin();
    navigate("/admin/login", { replace: true });
  };

  if (!ready) return null;
  if (!session) return <Navigate to="/admin/login" replace />;
  if (settings?.isActive === undefined) return <div style={{ minHeight: "100vh", background: "#0d0805" }} />;
  if (esColaborador && perfil === undefined) return <div style={{ minHeight: "100vh", background: "#0d0805" }} />;

  if (esColaborador && !perfil?.activo) {
    return <Aviso titulo="Acceso desactivado" texto="Tu usuario está desactivado. Habla con el administrador." onSalir={salir} />;
  }
  if (settings.plan_colaboradores !== true) {
    return <Aviso titulo="Módulo no disponible" texto="El punto de venta no está habilitado para este negocio." onSalir={salir} />;
  }
  if (settings.isActive === false) {
    return <Aviso titulo="Servicio suspendido" texto="El negocio no está recibiendo pedidos en este momento." onSalir={salir} />;
  }

  const nombre = perfil?.nombre || "Administrador";
  const total = Math.round(cart.reduce((t, i) => t + calculateItemUnitPrice(i) * i.quantity, 0));

  const pedirCambioPassword = async () => {
    if (!perfil?.usuario) return;
    const res = await Swal.fire({
      title: "¿Solicitar cambio de contraseña?",
      text: "Se avisará al administrador para que te asigne una nueva.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Solicitar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: COLOR,
    });
    if (!res.isConfirmed) return;
    try {
      await solicitarCambioPassword(perfil.usuario);
      Swal.fire({ icon: "success", title: "Solicitud enviada", confirmButtonColor: COLOR });
    } catch (e) {
      Swal.fire({ icon: "error", title: "No se pudo enviar", text: e.message, confirmButtonColor: COLOR });
    }
  };

  const enviarPedido = async ({ pago, nombre: cliente, observaciones }) => {
    setEnviando(true);
    try {
      const numero = await createLocalOrder({ origen: "colaborador", nombre: cliente, pago, observaciones }, cart);
      setCart([]);
      setIsCheckoutOpen(false);
      closeCart();
      await Swal.fire({
        icon: "success",
        title: "¡Pedido enviado!",
        html: `<div>Número de pedido</div><div style="font-size:4rem;font-weight:800;line-height:1.1">${Number(numero)}</div><div>Díselo al cliente</div>`,
        confirmButtonText: "Nuevo pedido",
        confirmButtonColor: COLOR,
      });
    } catch (e) {
      Swal.fire({ icon: "error", title: "No se pudo enviar el pedido", text: e.message, confirmButtonColor: COLOR });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="app-wrapper"
      style={{
        backgroundColor: design?.appBg && !design.appBg.includes("fff") && !design.appBg.includes("fdf") ? design.appBg : "#0d0805",
        fontFamily: design?.fontFamily || "inherit",
        minHeight: "100vh",
        paddingBottom: 90,
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 14px",
          background: COLOR,
          color: "#fff",
        }}
      >
        <div>
          <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>Punto de venta</div>
          <strong>{nombre}</strong>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {esColaborador && (
            <button type="button" onClick={pedirCambioPassword} title="Solicitar cambio de contraseña" style={btnHeader}>
              <KeyRound size={16} />
            </button>
          )}
          <button type="button" onClick={salir} title="Salir" style={btnHeader}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

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
      />

      <button
        type="button"
        onClick={openCart}
        disabled={cartCount === 0}
        style={{
          position: "fixed",
          left: 12,
          right: 12,
          bottom: 12,
          zIndex: 60,
          padding: 16,
          borderRadius: 14,
          border: 0,
          background: cartCount === 0 ? "#64748b" : "#16a34a",
          color: "#fff",
          fontWeight: 800,
          fontSize: "1.05rem",
        }}
      >
        {cartCount === 0 ? "Selecciona productos" : `Ver pedido · ${cartCount} · ${formatCOP(total)}`}
      </button>

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
        checkoutLabel="Cobrar y enviar"
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

      <LocalCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={closeCheckout}
        onConfirm={enviarPedido}
        cart={cart}
        title="Pedido en el local"
        askName
        submitting={enviando}
      />
    </div>
  );
};

export default PosPage;
