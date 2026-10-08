import {
  AlertOctagon,
  Award,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Dessert,
  ExternalLink,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  Menu,
  Palette,
  QrCode,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Tags,
  User,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import logoImg from "../assets/images/logo.png";
import useCatalog from "../hooks/useCatalog";
import PasswordModal from "./PasswordModal";
import "./admin.css";
import NotificationBell from "./components/NotificationBell";
import { logoutAdmin } from "./sessionStore";
import { useAdminSession } from "./useAdminSession";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/productos", label: "Productos", icon: Dessert },
  { to: "/admin/categorias", label: "Categorías", icon: Tags },
  { to: "/admin/adiciones", label: "Adiciones & Salsas", icon: Sparkles },
  { to: "/admin/pedidos", label: "Pedidos", icon: Receipt },
  { to: "/admin/mesas", label: "Mesas & QR", icon: QrCode },
  { to: "/admin/colaboradores", label: "Colaboradores", icon: Users },
  { to: "/admin/reportes", label: "Reportes e Informes", icon: BarChart3 },
  { to: "/admin/domicilios", label: "Domicilios", icon: MapPin },
  { to: "/admin/fidelizacion", label: "Fidelización", icon: Award },
  { to: "/admin/promociones", label: "Promos & Combos", icon: Tag },
  { to: "/admin/diseno", label: "Diseño Menú", icon: Palette },
  { to: "/admin/empresa", label: "Empresa", icon: Store },
  { to: "/admin/configuracion", label: "Configuración", icon: Settings },
];

const AdminLayout = () => {
  const rz = localStorage.getItem("store_razon_social");
  const { session, role } = useAdminSession();
  const { settings } = useCatalog();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleLogout = async () => {
    
    await logoutAdmin();
    navigate("/admin/login", { replace: true });
  };

  const toggleSidebar = () => setCollapsed(!collapsed);
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const email = session?.user?.email || "";

  // Lógica de bloqueo por falta de pago
  // useCatalog arranca con settings por defecto sin isActive: esperar a los reales
  if (settings?.isActive === undefined) {
    return <div className="admin-suspended" />;
  }

  // Los colaboradores solo usan el punto de venta
  if (role === "colaborador") {
    return <Navigate to="/pos" replace />;
  }

  const isSuspended = settings.isActive === false;

  if (isSuspended && role !== "superadmin") {
    return (
      <div className="admin-suspended">
        <div className="admin-suspended__card">
          <div className="admin-suspended__brand">
            <img src={settings?.logo_url || logoImg} alt="Logo" />
            <span>{rz || ""}</span>
          </div>

          <div className="admin-suspended__icon">
            <Lock size={28} />
          </div>

          <span className="admin-suspended__badge">
            <AlertOctagon size={12} /> Cuenta suspendida
          </span>

          <h1 className="admin-suspended__title">Acceso temporalmente restringido</h1>
          <p className="admin-suspended__text">
            El panel de administración se encuentra inactivo por un pago pendiente del plan.
            Tu información y la de tus clientes está segura y no se ha perdido.
          </p>

          <ul className="admin-suspended__list">
            <li>
              <ShieldCheck size={16} />
              <span>Tus productos, pedidos y configuración se conservan intactos.</span>
            </li>
            <li>
              <CreditCard size={16} />
              <span>Regulariza el pago con el proveedor del sistema para reactivar el servicio.</span>
            </li>
          </ul>

          <button type="button" onClick={handleLogout} className="admin-btn-primary admin-btn-primary--full">
            <LogOut size={16} /> Cerrar sesión
          </button>

          {email && <p className="admin-suspended__email">Sesión iniciada como {email}</p>}
        </div>
      </div>
    );
  }

  const navItemsToShow = NAV_ITEMS.filter((item) => {
    // Restricciones basadas en los permisos (por defecto activo si no existe)
    if (item.to === "/admin/adiciones" && settings?.plan_adiciones === false) return false;
    if (item.to === "/admin/promociones" && settings?.plan_promociones === false) return false;
    if (item.to === "/admin/reportes" && settings?.plan_reportes === false) return false;
    if (item.to === "/admin/domicilios" && settings?.plan_domicilio_dinamico === false) return false;
    if (item.to === "/admin/fidelizacion" && settings?.plan_fidelizacion === false) return false;
    if (item.to === "/admin/configuracion" && settings?.plan_configuracion === false) return false;
    if (item.to === "/admin/diseno" && settings?.plan_diseno === false) return false;
    if (item.to === "/admin/colaboradores" && settings?.plan_colaboradores !== true) return false;
    if (item.to === "/admin/mesas" && settings?.plan_mesas !== true) return false;
    return true;
  });

  if (role === "superadmin") {
    navItemsToShow.push({ to: "/admin/super", label: "Superadmin", icon: ShieldCheck });
  } else {
    console.log("No es superadmin", role);
  }

  const activeNavItem = navItemsToShow.find(({ to, end }) =>
    end
      ? location.pathname === to
      : location.pathname === to || location.pathname.startsWith(`${to}/`)
  );

  // Protección de rutas: si intentan entrar por URL a una ruta restringida, enviarlos al dashboard
  const currentPath = location.pathname;
  if (currentPath === "/admin/adiciones" && settings?.plan_adiciones === false) {
    return <Navigate to="/admin" replace />;
  }
  if (currentPath === "/admin/promociones" && settings?.plan_promociones === false) {
    return <Navigate to="/admin" replace />;
  }
  if (currentPath === "/admin/reportes" && settings?.plan_reportes === false) {
    return <Navigate to="/admin" replace />;
  }
  if (currentPath === "/admin/domicilios" && settings?.plan_domicilio_dinamico === false) {
    return <Navigate to="/admin" replace />;
  }
  if (currentPath === "/admin/fidelizacion" && settings?.plan_fidelizacion === false) {
    return <Navigate to="/admin" replace />;
  }
  if (currentPath === "/admin/configuracion" && settings?.plan_configuracion === false) {
    return <Navigate to="/admin" replace />;
  }
  if (currentPath === "/admin/diseno" && settings?.plan_diseno === false) {
    return <Navigate to="/admin" replace />;
  }

  if (currentPath === "/admin/colaboradores" && settings?.plan_colaboradores !== true) {
    return <Navigate to="/admin" replace />;
  }
  if (currentPath === "/admin/mesas" && settings?.plan_mesas !== true) {
    return <Navigate to="/admin" replace />;
  }

  //********************* */
  return (
    <div className={`admin-shell ${collapsed ? "admin-shell--collapsed" : ""}`}>
      {/* Overlay para móviles */}
      {mobileMenuOpen && (
        <div className="admin-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar Principal */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? "admin-sidebar--mobile-open" : ""}`}>
        {/* Header del Sidebar */}
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__logo-wrapper">
            <img src={settings?.logo_url || logoImg} alt="Logo" className="admin-sidebar__logo" />
          </div>
          {!collapsed && (
            <div className="admin-sidebar__brand-text">
              <span className="admin-sidebar__titulo" title={rz || "Gran Sabor Bistro"}>{rz || "Gran Sabor Bistro"}</span>
              <span className="admin-sidebar__subtitulo">Panel Admin</span>
            </div>
          )}
          <button
            type="button"
            className="admin-sidebar__toggle-btn"
            onClick={toggleSidebar}
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Menú de Navegación */}
        <nav className="admin-nav">
          {navItemsToShow.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => {
                setMobileMenuOpen(false);
              }}
              className={({ isActive }) =>
                "admin-nav__item" + (isActive ? " admin-nav__item--active" : "")
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={20} className="admin-nav__icon" />
              {!collapsed && <span className="admin-nav__label">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer del Sidebar */}
        <div className="admin-sidebar__pie">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-nav__item admin-nav__item--link"
            title={collapsed ? "Ver tienda" : undefined}
          >
            <ExternalLink size={20} className="admin-nav__icon" />
            {!collapsed && <span className="admin-nav__label">Ver tienda</span>}
          </a>

          <button
            type="button"
            className="admin-nav__item admin-nav__item--salir"
            onClick={handleLogout}
            title={collapsed ? "Cerrar sesión" : undefined}
          >
            <LogOut size={20} className="admin-nav__icon" />
            {!collapsed && <span className="admin-nav__label">Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Wrapper del Contenido Principal */}
      <div className="admin-layout__wrapper">
        {/* Topbar Superior */}
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-topbar__hamburger"
            onClick={toggleMobileMenu}
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="admin-topbar__title">
            <span>Panel {activeNavItem?.label || "Administración"}</span>
          </div>

          <div className="admin-topbar__actions">
            <NotificationBell />
            {email && (
              <button
                type="button"
                className="admin-topbar__user-badge"
                onClick={() => setIsPasswordModalOpen(true)}
                title="Cambiar contraseña"
                style={{ background: "none", border: "none", outline: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                <User size={14} />
                <span>{email}</span>
              </button>
            )}
          </div>
        </header>

        {/* Área donde se renderizan las páginas */}
        <main className="admin-main">
          <Outlet />
        </main>
      </div>

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        email={email}
        canChange={settings?.canChangePassword !== false}
      />
    </div>
  );
};

export default AdminLayout;
