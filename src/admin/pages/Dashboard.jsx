import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import {
  getOrders,
  getProducts,
  getSettings,
  subscribeToOrders,
  isUsingSupabase,
} from "../../data/dataSource";
import { estaAbiertoSegunHorario } from "../../utils/horario";
import { formatCOP } from "../../utils/price";
import {
  Bell,
  CakeSlice,
  ChefHat,
  ClipboardList,
  Eye,
  Package,
  RefreshCw,
  Star,
  Tag,
  TrendingUp,
  Wallet,
  Wifi,
  WifiOff,
  XCircle,
  Settings,
  ArrowRight
} from "lucide-react";
import "../../css/estadoNegocio.css";
import { Plus } from "lucide-react";


//---------------------------------
const esHoy = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  const h = new Date();
  return (
    d.getFullYear() === h.getFullYear() &&
    d.getMonth() === h.getMonth() &&
    d.getDate() === h.getDate()
  );
};

const horaCorta = (iso) =>
  new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
//---------------------------------

const Dashboard = () => {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState(null); // null = carga inicial sin completar
  const [productos, setProductos] = useState(null);
  const [settings, setSettings] = useState(null);
  const [nuevosSinVer, setNuevosSinVer] = useState(0);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const timeOut = 1500;
  const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  //******************************** */
  const cargar = useCallback(async () => {
    setError("");
    setCargando(true);
    try {
      const [p, prods, cfg] = await Promise.allSettled([
        getOrders(),
        getProducts(),
        getSettings(),
        esperar(timeOut)
      ]);

      if (p.status === "fulfilled") {
        setPedidos(p.value);
      } else {
        setPedidos([]);
        setError("No se pudieron cargar los pedidos: " + p.reason?.message);
      }

      if (prods.status === "fulfilled") setProductos(prods.value);
      else setProductos([]);

      if (cfg.status === "fulfilled") setSettings(cfg.value);
    } catch (e) {
      setError(e.message);
    } finally {
      // ✅ Solución: Desactivar la bandera de carga al finalizar
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const off = subscribeToOrders((evento, pedido) => {
      if (evento === "insert") {
        setPedidos((prev) => (prev ? [pedido, ...prev] : [pedido]));
        setNuevosSinVer((n) => n + 1);
      } else {
        setPedidos((prev) =>
          prev?.map((x) => (x.id === pedido.id ? pedido : x)) ?? [pedido],
        );
      }
    });
    return off;
  }, [cargar]);

  const m = useMemo(() => {
    const hoy = (pedidos || []).filter((p) => esHoy(p.created_at) && p.estado !== "cancelado");
    const ventasHoy = hoy.reduce((s, p) => s + (p.total || 0), 0);
    const ticketPromedio = hoy.length ? Math.round(ventasHoy / hoy.length) : 0;

    const porEstado = { nuevo: 0, preparacion: 0, camino: 0 };
    for (const p of pedidos || []) {
      if (p.estado in porEstado) porEstado[p.estado] += 1;
    }

    const agotados = (productos || []).filter((p) => p.disponible === false);
    const destacados = (productos || []).filter((p) => p.destacado);
    const activos = (productos || []).filter((p) => p.disponible !== false);

    return { hoy, ventasHoy, ticketPromedio, porEstado, agotados, destacados, activos };
  }, [pedidos, productos]);

  const estadoNegocio = estaAbiertoSegunHorario(settings || {});

  // Carga inicial (Pantalla Completa mientras se obtiene el primer paquete de datos)
  if (pedidos === null || productos === null) {
    return (
      <LoadingOverlay fullScreen text="Cargando Dashboard" minTime={timeOut} />
    );
  }

  // *****************************************/
  return (
    <div className="adm-page" style={{ position: "relative" }}>
      {/*  Carga en segundo plano al pulsar "Sincronizar" */}
      {cargando && (
        <LoadingOverlay text="Sincronizando información" minTime={timeOut} />
      )}

      {/* Encabezado */}
      <header className="adm-dashboard__header">
        <div>
          <h1 className="admin-page__titulo">Dashboard</h1>
          <p className="adm-dashboard__sub">
            {new Date().toLocaleDateString("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric"
            })}
          </p>
        </div>

        <div className="adm-dashboard__header-actions">
          <span
            className={`adm-conn ${isUsingSupabase() ? "adm-conn--ok" : "adm-conn--local"}`}
            title={
              isUsingSupabase()
                ? "Conectado en tiempo real con Supabase"
                : "Modo Local Activo"
            }
          >
            {isUsingSupabase() ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isUsingSupabase() ? "En Línea" : "Modo Local"}
          </span>

          <button
            type="button"
            className="admin-btn-ghost"
            onClick={cargar}
            disabled={cargando}
          >
            <RefreshCw size={14} className={cargando ? "adm-spin" : ""} />
            <span>Sincronizar</span>
          </button>
        </div>
      </header>

      {/* Banner de Estado del Negocio */}
      <div className={`estado-banner ${estadoNegocio.abierto ? "abierto" : "cerrado"}`}>
        <span className="estado-dot" />
        <div className="estado-texto">
          <strong>{estadoNegocio.abierto ? "Negocio Abierto" : "Negocio Cerrado"}</strong>
          <small>
            {estadoNegocio.fuerzaCierre
              ? "🚨 Cierre de emergencia activo: la tienda solo acepta pedidos agendados."
              : estadoNegocio.abierto
                ? "Recibiendo pedidos en horario regular."
                : "Fuera de horario de atención comercial."}
          </small>
        </div>
        <small className="estado-horario">{estadoNegocio.horarioTexto}</small>
        <button
          type="button"
          className="admin-btn-ghost"
          onClick={() => navigate("/admin/configuracion")}
        >
          Gestionar
        </button>
      </div>

      {error && <div className="adm-dashboard__error">⚠️ {error}</div>}

      {/* Grid de Tarjetas KPI */}
      <section className="adm-dash__grid">
        <div className="adm-dash__card adm-dash__card--ventas">
          <div className="adm-dash__card-icono"><Wallet size={22} /></div>
          <div className="adm-dash__card-info">
            <span className="adm-dash__card-label">Ventas de hoy</span>
            <span className="adm-dash__card-valor">{formatCOP(m.ventasHoy)}</span>
          </div>
        </div>

        <div className="adm-dash__card">
          <div className="adm-dash__card-icono"><ClipboardList size={22} /></div>
          <div className="adm-dash__card-info">
            <span className="adm-dash__card-label">Pedidos recibidos</span>
            <span className="adm-dash__card-valor">{m.hoy.length}</span>
          </div>
        </div>

        <div className="adm-dash__card">
          <div className="adm-dash__card-icono"><TrendingUp size={22} /></div>
          <div className="adm-dash__card-info">
            <span className="adm-dash__card-label">Ticket promedio</span>
            <span className="adm-dash__card-valor">{formatCOP(m.ticketPromedio)}</span>
          </div>
        </div>

        <div className="adm-dash__card">
          <div className="adm-dash__card-icono"><Package size={22} /></div>
          <div className="adm-dash__card-info">
            <span className="adm-dash__card-label">Catálogo activo</span>
            <span className="adm-dash__card-valor">{m.activos.length}</span>
          </div>
        </div>
      </section>

      {/* Flujo de pedidos y Accesos rápidos */}
      <div className="adm-dash__fila">
        <section className="adm-dash__panel">
          <h2 className="adm-dash__panel-titulo">
            <ChefHat size={18} /> Flujo de pedidos en tiempo real
          </h2>

          <div className="adm-dash__flujo">
            <button
              type="button"
              className="adm-dash__flujo-item adm-dash__flujo-item--nuevo"
              onClick={() => navigate("/admin/pedidos")}
            >
              <span className="adm-dash__flujo-num">{m.porEstado.nuevo}</span>
              <span className="adm-dash__flujo-label">🆕 Nuevos</span>
            </button>

            <span className="adm-dash__flujo-flecha"><ArrowRight size={16} /></span>

            <button
              type="button"
              className="adm-dash__flujo-item adm-dash__flujo-item--prep"
              onClick={() => navigate("/admin/pedidos")}
            >
              <span className="adm-dash__flujo-num">{m.porEstado.preparacion}</span>
              <span className="adm-dash__flujo-label">👨‍🍳 Preparación</span>
            </button>

            <span className="adm-dash__flujo-flecha"><ArrowRight size={16} /></span>

            <button
              type="button"
              className="adm-dash__flujo-item adm-dash__flujo-item--camino"
              onClick={() => navigate("/admin/pedidos")}
            >
              <span className="adm-dash__flujo-num">{m.porEstado.camino}</span>
              <span className="adm-dash__flujo-label">🛵 En camino</span>
            </button>
          </div>

          {nuevosSinVer > 0 && (
            <p className="adm-dash__nuevos">
              <Bell size={14} /> <strong>{nuevosSinVer}</strong> pedido(s) nuevo(s) en espera
            </p>
          )}
        </section>

        <section className="adm-dash__panel">
          <h2 className="adm-dash__panel-titulo">
            <Tag size={18} /> Accesos Rápidos
          </h2>
          <div className="adm-dash__accesos">
            <button type="button" className="adm-dash__acceso" onClick={() => navigate("/admin/productos")}>
              <CakeSlice size={18} /> Gestor Productos
            </button>
            <button type="button" className="adm-dash__acceso" onClick={() => navigate("/admin/categorias")}>
              <Tag size={18} /> Categorías
            </button>
            <button type="button" className="adm-dash__acceso" onClick={() => navigate("/admin/pedidos")}>
              <ClipboardList size={18} /> Gestión Pedidos
            </button>
            <button type="button" className="adm-dash__acceso" onClick={() => navigate("/admin/configuracion")}>
              <Settings size={18} /> Configuración
            </button>
          </div>
        </section>
      </div>

      {/* Atención requerida y Últimos pedidos */}
      <div className="adm-dash__fila">
        <section className="adm-dash__panel">
          <div className="adm-dash__panel-header">
            <h2 className="adm-dash__panel-titulo">
              <Package size={18} /> Requieren Atención
            </h2>
            <button
              type="button"
              className="admin-btn-ghost"
              onClick={() => navigate("/admin/productos")}
            >
              Ver Productos
            </button>
          </div>

          {m.agotados.length === 0 && m.destacados.length === 0 ? (
            <p className="adm-dash__vacio">✅ Todo al día.</p>
          ) : (
            <div className="adm-dash__atencion-container">
              {m.agotados.length > 0 && (
                <ul className="adm-dash__lista">
                  {m.agotados.slice(0, 3).map((p) => (
                    <li key={p.id} className="adm-dash__item--alerta">
                      <XCircle size={14} className="text-red-400" />
                      <span className="adm-dash__item-nombre">{p.nombre}</span>
                      <span className="adm-badge adm-badge--danger">No disponible</span>
                    </li>
                  ))}
                  {m.agotados.length >= 3 && (
                    <li className="adm-dash__item--alerta">
                      <Plus size={14} className="text-red-400" />
                      <span className="adm-dash__item-nombre">{m.agotados.length - 3} más</span>
                    </li>
                  )}
                </ul>
              )}

              {m.destacados.length > 0 && (
                <ul className="adm-dash__lista">
                  {m.destacados.slice(0, 3).map((p) => (
                    <li key={p.id}>
                      <Star size={14} className="text-amber-400" />
                      <span className="adm-dash__item-nombre">{p.nombre}</span>
                      <span className="adm-badge adm-badge--warning">Destacado</span>
                    </li>
                  ))}
                  {m.destacados.length >= 3 && (
                    <li className="adm-dash__item--alerta">
                      <Plus size={14} className="text-amber-400" />
                      <span className="adm-dash__item-nombre">{m.destacados.length - 3} más</span>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="adm-dash__panel">
          <div className="adm-dash__panel-header">
            <h2 className="adm-dash__panel-titulo">
              <ClipboardList size={18} /> Últimos Pedidos
            </h2>
            <button
              type="button"
              className="admin-btn-ghost admin-btn-ghost--compact"
              onClick={() => navigate("/admin/pedidos")}
            >
              <Eye size={14} /> Ver Todos
            </button>
          </div>

          {(pedidos || []).length === 0 ? (
            <p className="adm-dash__vacio">Aún no hay pedidos registrados hoy.</p>
          ) : (
            <div className="adm-dash__table-wrapper">
              <table className="adm-dash__table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.slice(0, 5).map((p) => (
                    <tr key={p.id} onClick={() => navigate("/admin/pedidos")} className="adm-dash__row-link">
                      <td className="adm-dash__table-id">#{p.numero || p.id?.slice(0, 4)}</td>
                      <td className="adm-dash__table-cliente">{p.nombre}</td>
                      <td>
                        <span className={`adm-badge adm-badge--${p.estado}`}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="adm-dash__table-total">{formatCOP(p.total)}</td>
                      <td className="adm-dash__table-hora">
                        {esHoy(p.created_at) ? horaCorta(p.created_at) : "Anterior"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;