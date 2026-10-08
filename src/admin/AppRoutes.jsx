import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminLogin from "./AdminLogin";
import AdminLayout from "./AdminLayout";
import { useAdminSession } from "./useAdminSession";

// Lazy: el código del panel NO se carga cuando un cliente visita la tienda
const AdminDashboard    = lazy(() => import("./pages/Dashboard"));
const AdminProductos    = lazy(() => import("./pages/Productos"));
const AdminCategorias   = lazy(() => import("./pages/Categorias"));
const AdminAdiciones    = lazy(() => import("./pages/Adiciones"));
const AdminPedidos      = lazy(() => import("./pages/Pedidos"));
const AdminNegocio      = lazy(() => import("./pages/Empresa"));
const AdminConfiguracion = lazy(() => import("./pages/Configuracion"));
const AdminDiseno       = lazy(() => import("./pages/Diseno"));
const AdminPromociones  = lazy(() => import("./pages/Promociones"));
const AdminReportes     = lazy(() => import("./pages/Reportes"));
const AdminFidelizacion = lazy(() => import("./pages/Fidelizacion"));
const AdminDomicilios   = lazy(() => import("./pages/Domicilios"));
const AdminSuper         = lazy(() => import("./pages/Superadmin"));
const AdminColaboradores = lazy(() => import("./pages/Colaboradores"));
const AdminMesas         = lazy(() => import("./pages/Mesas"));

/** Guard: solo con sesión activa se ve el panel. Mientras carga la sesión, no decide. */
const RequiereSesion = ({ children }) => {
  const { session, ready } = useAdminSession();
  if (!ready) return null; // evita redirigir por error antes de leer la sesión real
  return session ? children : <Navigate to="/admin/login" replace />;
};

const Cargando = () => (
  <div className="admin-main">
    <p style={{ color: "var(--texto-dim, #8f7c6b)" }}>Cargando módulo…</p>
  </div>
);

/** Rutas del panel. Se monta desde App.jsx solo si Supabase está configurado. */
export const AdminRoutes = () => (
  <Routes>
    <Route path="login" element={<AdminLogin />} />
    <Route
      path=""
      element={
        <RequiereSesion>
          <AdminLayout />
        </RequiereSesion>
      }
    >
      <Route index element={<Suspense fallback={<Cargando />}><AdminDashboard /></Suspense>} />
      <Route path="productos"     element={<Suspense fallback={<Cargando />}><AdminProductos /></Suspense>} />
      <Route path="categorias"    element={<Suspense fallback={<Cargando />}><AdminCategorias /></Suspense>} />
      <Route path="adiciones"     element={<Suspense fallback={<Cargando />}><AdminAdiciones /></Suspense>} />
      <Route path="pedidos"       element={<Suspense fallback={<Cargando />}><AdminPedidos /></Suspense>} />
      <Route path="diseno"        element={<Suspense fallback={<Cargando />}><AdminDiseno /></Suspense>} />
      <Route path="promociones"   element={<Suspense fallback={<Cargando />}><AdminPromociones /></Suspense>} />
      <Route path="fidelizacion"  element={<Suspense fallback={<Cargando />}><AdminFidelizacion /></Suspense>} />
      <Route path="domicilios"    element={<Suspense fallback={<Cargando />}><AdminDomicilios /></Suspense>} />
      <Route path="reportes"      element={<Suspense fallback={<Cargando />}><AdminReportes /></Suspense>} />
      <Route path="empresa"       element={<Suspense fallback={<Cargando />}><AdminNegocio /></Suspense>} />
      <Route path="configuracion" element={<Suspense fallback={<Cargando />}><AdminConfiguracion /></Suspense>} />
      <Route path="colaboradores" element={<Suspense fallback={<Cargando />}><AdminColaboradores /></Suspense>} />
      <Route path="mesas"         element={<Suspense fallback={<Cargando />}><AdminMesas /></Suspense>} />
      <Route path="super"         element={<Suspense fallback={<Cargando />}><AdminSuper /></Suspense>} />
      {/* Ruta desconocida dentro del panel → al dashboard */}
      <Route path="*" element={<Navigate to="" replace />} />
    </Route>
  </Routes>
);
