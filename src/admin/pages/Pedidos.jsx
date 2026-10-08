import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Pagination from "../Pagination";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import PedidoDetalleModal from "../PedidoDetalleModal";
import {
  getOrders,
  updateOrderStatus,
  subscribeToOrders,
} from "../../data/dataSource";
import { formatCOP } from "../../utils/price";
import { Eye, RefreshCw, Calendar, Printer, MessageCircle } from "lucide-react";
import { printTicket } from "../../utils/printTicket";
import { esPedidoLocal, etiquetaEntrega } from "../../utils/entrega";
import { notificarCambioEstado, generarMensajeWhatsApp } from "../../utils/notifications";
import "../admin.css";

const ESTADOS = [
  { id: "todos", label: "Todos" },
  { id: "nuevo", label: "🆕 Nuevos" },
  { id: "preparacion", label: "👨‍🍳 En preparación" },
  { id: "camino", label: "🛵 En camino" },
  { id: "entregado", label: "✅ Entregados" },
  { id: "agendados", label: "📅 Futuros (Agendados)" },
  { id: "cancelado", label: "❌ Cancelados" },
];

const SIGUIENTE = {
  nuevo: { estado: "preparacion", label: "Aceptar" },
  preparacion: { estado: "camino", label: "Despachar" },
  camino: { estado: "entregado", label: "Entregar" },
};

const labelEstado = (estado) =>
({
  nuevo: "🆕 Nuevo",
  preparacion: "👨‍🍳 Preparación",
  camino: "🛵 En camino",
  entregado: "✅ Entregado",
  cancelado: "❌ Cancelado",
}[estado] || estado);

const resumen = (p) => {
  if (!p.items?.length) return "—";
  const texto = p.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ");
  return texto.length > 44 ? texto.slice(0, 44) + "…" : texto;
};

// Utilidades para determinar la urgencia del agendamiento
const getAgendadoDate = (p) => {
  let text = p.observaciones || "";
  if (!text.includes("AGENDADO PARA:")) {
    if (p.items) {
      const item = p.items.find(i => i.observaciones && i.observaciones.includes("AGENDADO PARA:"));
      if (item) text = item.observaciones;
    }
  }
  const match = text.match(/AGENDADO PARA: (\d{4}-\d{2}-\d{2})/);
  if (match) {
    const [y, m, d] = match[1].split('-');
    return new Date(y, m - 1, d);
  }
  return null;
};

const getAgendadoInfo = (p) => {
  const agendadoDate = getAgendadoDate(p);
  if (!agendadoDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Calcular inicio (lunes) y fin (domingo) de esta semana
  const currentDay = today.getDay(); // 0 = Domingo
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + distanceToMonday);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const aDate = new Date(agendadoDate);
  aDate.setHours(0, 0, 0, 0);

  if (aDate.getTime() === tomorrow.getTime()) {
    return { clase: "agendado-manana", label: "Para Mañana", color: "#facc15", text: "#111" }; // Amarillo
  } else if (aDate.getTime() >= startOfWeek.getTime() && aDate.getTime() <= endOfWeek.getTime()) {
    return { clase: "agendado-semana", label: "Esta Semana", color: "#3b82f6", text: "#fff" }; // Azul
  } else {
    return { clase: "agendado-futuro", label: "Más Adelante", color: "#22c55e", text: "#fff" }; // Verde
  }
};

//-----------------------------------------
const Pedidos = () => {
  const [pedidos, setPedidos] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [filtroMes, setFiltroMes] = useState(""); // "" = Todos, o "YYYY-MM"
  const [detalle, setDetalle] = useState(null);
  const [cargandoId, setCargandoId] = useState(null);
  const [nuevos, setNuevos] = useState(0);
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);
  const [pedidoExpandido, setPedidoExpandido] = useState(null); // ID del pedido expandido

  const [cargandoGlobal, setCargandoGlobal] = useState(true);
  const timeOut = 1500;
  const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  //***************************** */
  const cargar = useCallback(async () => {
    try {
      setCargandoGlobal(true);
      const [data] = await Promise.all([getOrders(), esperar(timeOut)]);
      setPedidos(data);
      setPedidoExpandido(null); // Resetear acordeón al recargar
    } catch (e) {
      Swal.fire({
        title: "Error al cargar pedidos",
        text: e.message,
        icon: "error",
        confirmButtonColor: "#3D2314",
      });
      setPedidos([]);
    } finally {
      setCargandoGlobal(false);
    }
  }, []);

  // Carga inicial + realtime (pedido nuevo o cambio desde otro dispositivo)
  useEffect(() => {
    cargar();
    const unsubscribe = subscribeToOrders((evento, pedido) => {
      if (evento === "insert") {
        setPedidos((prev) => (prev ? [pedido, ...prev] : [pedido]));
        if (pedido.estado === "nuevo") {
          setNuevos((n) => n + 1);
          Swal.fire({
            icon: "info",
            title: `¡Pedido #${pedido.numero}!`,
            text: `${pedido.nombre} — ${formatCOP(pedido.total)}`,
            toast: true,
            position: "top-end",
            timer: 6000,
            showConfirmButton: false,
          });
        }
      }
      if (evento === "update") {
        setPedidos((prev) => prev?.map((p) => (p.id === pedido.id ? pedido : p)));
        setDetalle((d) => (d?.id === pedido.id ? pedido : d));
      }
    });
    return unsubscribe;
  }, [cargar]);

  // ... (el resto del código de filtros y paginación se mantiene igual hasta el render)
  // Calcular los meses disponibles basados en los pedidos
  const mesesDisponibles = useMemo(() => {
    if (!pedidos) return [];
    const setMeses = new Set();
    pedidos.forEach((p) => {
      const d = new Date(p.created_at);
      const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      setMeses.add(mes);
    });

    return Array.from(setMeses)
      .sort()
      .reverse()
      .map((m) => {
        const [year, month] = m.split("-");
        const date = new Date(year, month - 1);
        const label = date.toLocaleString("es-CO", { month: "long", year: "numeric" });
        return {
          value: m,
          label: label.charAt(0).toUpperCase() + label.slice(1),
        };
      });
  }, [pedidos]);

  // Auto-seleccionar el mes actual o el más reciente al cargar
  useEffect(() => {
    if (mesesDisponibles.length > 0 && !filtroMes) {
      const hoy = new Date();
      const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
      if (mesesDisponibles.some((m) => m.value === mesActual)) {
        setFiltroMes(mesActual);
      } else {
        setFiltroMes(mesesDisponibles[0].value);
      }
    }
  }, [mesesDisponibles, filtroMes]);

  // Resetear a página 1 y cerrar acordeón al cambiar filtros
  useEffect(() => {
    setPaginaActual(1);
    setPedidoExpandido(null);
  }, [filtro, filtroMes]);

  const conteos = useMemo(() => {
    const base = { todos: 0, agendados: 0 };
    pedidos?.forEach((p) => {
      const d = new Date(p.created_at);
      const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!filtroMes || filtroMes === "todos" || mes === filtroMes) {
        base.todos++;
        base[p.estado] = (base[p.estado] || 0) + 1;

        let isAgendado = p.observaciones && p.observaciones.includes("AGENDADO PARA:");
        if (!isAgendado && p.items) {
          isAgendado = p.items.some(item => item.observaciones && item.observaciones.includes("AGENDADO PARA:"));
        }
        if (isAgendado) base.agendados++;
      }
    });
    return base;
  }, [pedidos, filtroMes]);

  const filtrados = useMemo(() => {
    return (pedidos || []).filter((p) => {
      const d = new Date(p.created_at);
      const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      let pasaEstado = false;
      if (filtro === "agendados") {
        pasaEstado = p.observaciones && p.observaciones.includes("AGENDADO PARA:");
        if (!pasaEstado && p.items) {
          // Check if any item has "AGENDADO PARA:" in its name or note (since it's appended in buildOrderItems to item's name/notes in legacy versions)
          pasaEstado = p.items.some(item => item.observaciones && item.observaciones.includes("AGENDADO PARA:"));
        }
      } else {
        pasaEstado = filtro === "todos" || p.estado === filtro;
      }
      const pasaMes = !filtroMes || filtroMes === "todos" || mes === filtroMes;
      return pasaEstado && pasaMes;
    });
  }, [pedidos, filtro, filtroMes]);

  const paginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    return filtrados.slice(inicio, inicio + itemsPorPagina);
  }, [filtrados, paginaActual, itemsPorPagina]);

  const cambiarEstado = async (pedido, nuevoEstado) => {
    setCargandoId(pedido.id);
    try {
      await Promise.all([updateOrderStatus(pedido.id, nuevoEstado), esperar(timeOut)]);
      setPedidos((prev) =>
        prev.map((p) => (p.id === pedido.id ? { ...p, estado: nuevoEstado } : p)),
      );
      setDetalle((d) => (d?.id === pedido.id ? { ...d, estado: nuevoEstado } : d));

      try {
        const resultadoEmail = await notificarCambioEstado(pedido, nuevoEstado);
        if (resultadoEmail.sent) {
          Swal.fire({
            icon: "success",
            title: "Correo enviado al cliente",
            toast: true,
            position: "top-end",
            timer: 2400,
            showConfirmButton: false,
          });
        } else {
          const sinEmail = resultadoEmail.reason === "cliente-sin-email";
          Swal.fire({
            icon: sinEmail ? "warning" : "info",
            title: sinEmail
              ? "Estado actualizado; cliente sin correo"
              : "Estado actualizado; correo no enviado",
            text: sinEmail
              ? "Verifica que el cliente tenga un correo registrado."
              : "Revisa la configuración del correo automático.",
            toast: true,
            position: "top-end",
            timer: 4000,
            showConfirmButton: false,
          });
        }
      } catch (e) {
        Swal.fire({
          title: "Estado actualizado; correo no enviado",
          text: e.message,
          icon: "error",
          confirmButtonColor: "#3D2314",
        });
      }
    } catch (e) {
      Swal.fire({
        title: "No se pudo actualizar",
        text: e.message,
        icon: "error",
        confirmButtonColor: "#3D2314",
      });
    } finally {
      setCargandoId(null);
    }
  };

  const avanzarEstado = (pedido) => {
    const paso = SIGUIENTE[pedido.estado];
    if (paso) cambiarEstado(pedido, paso.estado);
  };

  const toggleExpandir = (id) => {
    setPedidoExpandido((prev) => (prev === id ? null : id));
  };

  if (cargandoGlobal || pedidos === null) {
    return (
      <div className="adm-page" style={{ minHeight: "80vh", position: "relative" }}>
        <LoadingOverlay fullScreen text="Sincronizando pedidos..." minTime={timeOut} />
      </div>
    );
  }

  //******************************** */
  return (
    <div className="admin-page admin-main-content" style={{ position: "relative" }}>
      <header className="admin-page__header admin-page__header--row">
        <h1 className="admin-page__titulo">Pedidos</h1>
        <div className="admin-page__acciones">
          <div className="adm-ped__filtro-mes">
            <Calendar size={15} />
            <select
              value={filtroMes}

              onChange={(e) => setFiltroMes(e.target.value)}
              className="adm-ped__select-mes"
            >
              <option value="todos">Todos los tiempos</option>
              {mesesDisponibles.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="admin-btn-ghost admin-btn-ghost--recargar" onClick={cargar}>
            <RefreshCw size={15} /> Recargar
          </button>
        </div>
      </header>

      {/* Chips de estado con conteo */}
      <div className="adm-ped__chips">
        {ESTADOS.map((e) => (
          <button
            key={e.id}
            type="button"
            className={"adm-ped__chip" + (filtro === e.id ? " adm-ped__chip--activa" : "")}
            onClick={() => setFiltro(e.id)}
          >
            {e.label}
            <span className="adm-ped__chip-count">{conteos[e.id] || 0}</span>
          </button>
        ))}
      </div>

      {/* Lista de Pedidos (Acordeón) */}
      <div className="adm-ped__grid">
        {filtrados.length === 0 ? (
          <div className="admin-card" style={{ gridColumn: "1 / -1" }}>
            <p className="adm-prod__vacio">
              {filtro === "todos"
                ? "Aún no hay pedidos en este rango de tiempo."
                : "No hay pedidos en este estado."}
            </p>
          </div>
        ) : (
          paginados.map((p) => {
            const paso = SIGUIENTE[p.estado];
            const isAgendadoStr = p.observaciones?.includes("AGENDADO PARA:") || p.items?.some(i => i.observaciones?.includes("AGENDADO PARA:"));
            const agendadoInfo = (filtro === "agendados" || isAgendadoStr) ? getAgendadoInfo(p) : null;

            return (
              <div
                key={p.id}
                className={`adm-ped-card adm-ped-card--clickable ${p.estado === "cancelado" ? "adm-ped-card--cancelado" : ""} ${agendadoInfo ? agendadoInfo.clase : ""}`}
                onClick={() => setDetalle(p)}
              >
                <div className="adm-ped-card__header">
                  <div className="adm-ped-card__header-info">
                    <span className="adm-ped-card__numero">#{p.numero}</span>
                    <span className="adm-ped-card__fecha">
                      {new Date(p.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                    {agendadoInfo && (
                      <span className="adm-ped__badge-agendado" style={{ backgroundColor: agendadoInfo.color, color: agendadoInfo.text }}>
                        <Calendar size={11} style={{ marginRight: '2px' }}/> {agendadoInfo.label}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '-5px' }}>
                    <span className={`adm-ped__estado adm-ped__estado--${p.estado}`}>
                      {labelEstado(p.estado)}
                    </span>
                    <button
                      type="button"
                      className="admin-btn-ghost"
                      style={{
                        padding: '5px', minWidth: 'auto', border: '1px solid rgba(79, 79, 79, 1)',
                        marginTop: "-7px", background: '#d69f4b', color: '#000000ff'
                      }}
                      onClick={(e) => { e.stopPropagation(); printTicket(p); }}
                      title="Imprimir Comanda"
                    >
                      <Printer size={16} />
                    </button>
                    {(() => {
                      const waData = generarMensajeWhatsApp(p, p.estado);
                      if (waData.hasPhone) {
                        return (
                          <a
                            href={waData.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-btn-ghost"
                            style={{
                              padding: '5px', minWidth: 'auto', border: '1px solid #25D366',
                              marginTop: "-7px", background: '#25D366', color: '#fff',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            onClick={(e) => e.stopPropagation()}
                            title="Notificar por WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </a>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                <div className="adm-ped-card__body">
                  <div className="adm-ped-card__cliente">
                    <span className="adm-ped-card__nombre">{p.nombre}</span>
                    <span className="adm-ped-card__info">
                      {p.tipo_entrega === "recogida" ? (
                        <strong>💁‍♂️ Recoger en tienda</strong>
                      ) : esPedidoLocal(p) ? (
                        <strong>🍽️ {etiquetaEntrega(p)}</strong>
                      ) : (
                        <>🏍️ Domicilio</>
                      )}
                      {" · "}{formatCOP(p.total)}
                    </span>
                  </div>
                  <div className="adm-ped-card__resumen-linea">
                    {resumen(p)}
                  </div>
                </div>

                {paso && (
                  <div className="adm-ped-card__footer">
                    <button
                      type="button"
                      className={`admin-btn-primary admin-btn-primary--full adm-btn-estado--${paso.estado}`}
                      disabled={cargandoId === p.id}
                      onClick={(e) => { e.stopPropagation(); avanzarEstado(p); }}
                    >
                      {paso.label}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {filtrados.length > 0 && (
        <Pagination
          paginaActual={paginaActual}
          totalItems={filtrados.length}
          itemsPorPagina={itemsPorPagina}
          onCambiarPagina={(p) => setPaginaActual(p)}
          onCambiarItemsPorPagina={(n) => {
            setItemsPorPagina(n);
            setPaginaActual(1);
          }}
        />
      )}

      {detalle && (
        <PedidoDetalleModal
          pedido={detalle}
          onClose={() => setDetalle(null)}
          onEstado={cambiarEstado}
          onCancel={(p) => {
            if (window.confirm("¿Seguro que deseas cancelar este pedido?")) {
              cambiarEstado(p, "cancelado");
              setDetalle(null);
            }
          }}
        />
      )}
    </div>
  );
};

export default Pedidos;
