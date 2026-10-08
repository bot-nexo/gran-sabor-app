import {
    AlertTriangle,
    Award,
    BarChart3,
    Calendar,
    CheckCircle2,
    CreditCard,
    DollarSign,
    Download,
    FileText,
    Filter,
    Layers,
    Printer,
    RefreshCw,
    ShoppingBag,
    TrendingUp
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import "../../css/Reportes.css";
import { getOrdersByRange, getProducts } from "../../data/dataSource";
import { formatCOP } from "../../utils/price";

const PRESET_FILTERS = [
  { id: "hoy", label: "Hoy" },
  { id: "ayer", label: "Ayer" },
  { id: "semana", label: "Esta Semana" },
  { id: "mes", label: "Este Mes" },
  { id: "30dias", label: "Últimos 30 Días" },
  { id: "todos", label: "Todo el Historial" },
  { id: "custom", label: "Rango Personalizado" },
];

// YYYY-MM-DD en hora local (toISOString usa UTC y corre el día después de las 7pm en Colombia)
const fechaLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const Reportes = () => {
  const [cargando, setCargando] = useState(true);
  const [pedidosRaw, setPedidosRaw] = useState([]);
  const [productosRaw, setProductosRaw] = useState([]);

  // Filtros de fecha (arranca en "Este Mes" para no descargar todo el historial al entrar)
  const [preset, setPreset] = useState("mes");
  const [fechaInicio, setFechaInicio] = useState(() => {
    const ahora = new Date();
    return fechaLocal(new Date(ahora.getFullYear(), ahora.getMonth(), 1));
  });
  const [fechaFin, setFechaFin] = useState(() => fechaLocal(new Date()));

  // Pestaña o Tipo de Reporte activo
  const [tipoReporte, setTipoReporte] = useState("financiero"); // 'financiero' | 'pedidos' | 'productos'
  const reportRef = useRef(null);
  const cargaIdRef = useRef(0);

  // Cargar datos del rango directamente desde la BD
  const cargarDatos = async () => {
    const cargaId = ++cargaIdRef.current;
    setCargando(true);
    try {
      const [ordersData, productsData] = await Promise.all([
        getOrdersByRange(fechaInicio, fechaFin),
        getProducts()
      ]);
      // Ignorar respuestas de un rango anterior si el usuario ya cambió el filtro
      if (cargaId !== cargaIdRef.current) return;
      setPedidosRaw(ordersData || []);
      setProductosRaw(productsData || []);
    } catch (err) {
      if (cargaId !== cargaIdRef.current) return;
      console.error("Error al cargar datos para reportes:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar los datos de los reportes.",
        confirmButtonColor: "#3D2314"
      });
    } finally {
      if (cargaId === cargaIdRef.current) setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin]);

  const seleccionarPreset = async (id) => {
    if (id === "todos" && preset !== "todos") {
      const { isConfirmed } = await Swal.fire({
        icon: "warning",
        title: "¿Cargar todo el historial?",
        text: "Se descargarán todos los pedidos registrados. Con mucho historial puede tardar varios segundos. Para consultas habituales usa un rango de fechas.",
        showCancelButton: true,
        confirmButtonText: "Sí, cargar todo",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#3D2314",
        reverseButtons: true,
      });
      if (!isConfirmed) return;
    }
    setPreset(id);
  };

  // Manejador de cambio de Preset
  useEffect(() => {
    const ahora = new Date();
    const hoyInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

    if (preset === "hoy") {
      setFechaInicio(fechaLocal(hoyInicio));
      setFechaFin(fechaLocal(ahora));
    } else if (preset === "ayer") {
      const ayer = new Date(hoyInicio);
      ayer.setDate(ayer.getDate() - 1);
      setFechaInicio(fechaLocal(ayer));
      setFechaFin(fechaLocal(ayer));
    } else if (preset === "semana") {
      const primerDiaSemana = new Date(hoyInicio);
      const day = primerDiaSemana.getDay() || 7; // 1 (Lun) a 7 (Dom)
      primerDiaSemana.setDate(primerDiaSemana.getDate() - day + 1);
      setFechaInicio(fechaLocal(primerDiaSemana));
      setFechaFin(fechaLocal(ahora));
    } else if (preset === "mes") {
      const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      setFechaInicio(fechaLocal(primerDiaMes));
      setFechaFin(fechaLocal(ahora));
    } else if (preset === "30dias") {
      const hace30 = new Date(hoyInicio);
      hace30.setDate(hace30.getDate() - 30);
      setFechaInicio(fechaLocal(hace30));
      setFechaFin(fechaLocal(ahora));
    } else if (preset === "todos") {
      setFechaInicio("");
      setFechaFin("");
    }
  }, [preset]);

  // Filtrar pedidos según rango de fechas seleccionado
  const pedidosFiltrados = useMemo(() => {
    if (!pedidosRaw || pedidosRaw.length === 0) return [];

    return pedidosRaw.filter((p) => {
      if (!p.created_at) return true;
      const fechaPedido = fechaLocal(new Date(p.created_at));

      if (fechaInicio && fechaPedido < fechaInicio) return false;
      if (fechaFin && fechaPedido > fechaFin) return false;
      return true;
    });
  }, [pedidosRaw, fechaInicio, fechaFin]);

  // ── CÁLCULOS METRICAS FINANCIERAS ──────────────────────────────────────────
  const metricas = useMemo(() => {
    const pedidosValidos = pedidosFiltrados.filter(p => p.estado !== "cancelado");
    const totalVentas = pedidosValidos.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
    const cantPedidos = pedidosValidos.length;
    const ticketPromedio = cantPedidos > 0 ? totalVentas / cantPedidos : 0;

    // Desglose por método de pago
    const porPago = {};
    // Desglose por tipo de entrega
    const porEntrega = { domicilio: 0, recogida: 0, local: 0 };
    // Distribución por hora del día (24 horas)
    const porHora = Array(24).fill(0);
    // Distribución por día de la semana (0=Dom, 1=Lun... 6=Sáb)
    const porDiaSemana = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    // Conteo de productos
    const conteoProductos = {};

    pedidosValidos.forEach((p) => {
      // Método de pago
      const metodo = (p.pago || "Efectivo / No especificado").trim();
      porPago[metodo] = (porPago[metodo] || 0) + (Number(p.total) || 0);

      // Tipo de entrega
      const entrega = p.tipo_entrega || "domicilio";
      if (porEntrega[entrega] !== undefined) {
        porEntrega[entrega] += 1;
      }

      // Horas y Días
      if (p.created_at) {
        const d = new Date(p.created_at);
        const hora = d.getHours();
        const diaSem = d.getDay();
        porHora[hora] += (Number(p.total) || 0);
        porDiaSemana[diaSem] += (Number(p.total) || 0);
      }

      // Conteo de ítems vendidos
      if (Array.isArray(p.items)) {
        p.items.forEach((it) => {
          const nombre = it.nombre || it.title || "Producto";
          const cant = Number(it.cantidad || it.qty || 1);
          const subt = Number(it.precio_unitario || it.precio || it.price || 0) * cant;

          if (!conteoProductos[nombre]) {
            conteoProductos[nombre] = { unidades: 0, ingresos: 0 };
          }
          conteoProductos[nombre].unidades += cant;
          conteoProductos[nombre].ingresos += subt;
        });
      }
    });

    // Ordenar Top Productos
    const rankingProductos = Object.entries(conteoProductos)
      .map(([nombre, data]) => ({ nombre, ...data }))
      .sort((a, b) => b.unidades - a.unidades);

    // Identificar productos en menú sin ventas
    const nombresConVentas = new Set(rankingProductos.map(r => r.nombre.toLowerCase()));
    const productosSinVentas = productosRaw.filter(p => !nombresConVentas.has((p.nombre || p.title || "").toLowerCase()));

    // Hora pico
    let maxVentasHora = 0;
    let horaPico = null;
    porHora.forEach((v, h) => {
      if (v > maxVentasHora) {
        maxVentasHora = v;
        horaPico = h;
      }
    });

    return {
      totalVentas,
      cantPedidos,
      ticketPromedio,
      porPago,
      porEntrega,
      porHora,
      porDiaSemana,
      rankingProductos,
      productosSinVentas,
      horaPico: horaPico !== null ? `${horaPico}:00 - ${horaPico + 1}:00` : "N/A"
    };
  }, [pedidosFiltrados, productosRaw]);


  // ── EXPORTACIÓN EXCEL / CSV ──────────────────────────────────────────────────
  const exportarCSV = () => {
    if (pedidosFiltrados.length === 0) {
      Swal.fire({ icon: "info", title: "Sin datos", text: "No hay pedidos en el rango seleccionado.", confirmButtonColor: "#3D2314" });
      return;
    }

    // Encabezados con codificación UTF-8 BOM
    let csvContent = "\uFEFF";
    csvContent += "ID Pedido,Número,Fecha,Hora,Cliente,Teléfono,Dirección,Tipo Entrega,Método Pago,Estado,Subtotal,Costo Envío,Total,Items\n";

    pedidosFiltrados.forEach((p) => {
      const fechaStr = p.created_at ? new Date(p.created_at).toLocaleDateString("es-CO") : "";
      const horaStr = p.created_at ? new Date(p.created_at).toLocaleTimeString("es-CO", { hour: '2-digit', minute: '2-digit' }) : "";
      const itemsStr = Array.isArray(p.items) ? p.items.map(i => `${i.cantidad}x ${i.nombre}`).join(" | ") : "";

      const row = [
        `"${p.id || ""}"`,
        `"${p.numero || ""}"`,
        `"${fechaStr}"`,
        `"${horaStr}"`,
        `"${(p.nombre || "").replace(/"/g, '""')}"`,
        `"${p.telefono || ""}"`,
        `"${(p.direccion || "").replace(/"/g, '""')}"`,
        `"${p.tipo_entrega || "domicilio"}"`,
        `"${(p.pago || "").replace(/"/g, '""')}"`,
        `"${p.estado || "nuevo"}"`,
        p.subtotal || 0,
        p.delivery_fee || 0,
        p.total || 0,
        `"${itemsStr.replace(/"/g, '""')}"`
      ];

      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Pedidos_${fechaInicio || "inicio"}_al_${fechaFin || "hoy"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire({
      icon: "success",
      title: "Reporte Exportado",
      text: "El archivo CSV (compatible con Excel) se ha descargado correctamente.",
      toast: true,
      position: "top-end",
      timer: 2500,
      showConfirmButton: false,
    });
  };


  // ── IMPRIMIR / DESCARGAR PDF ────────────────────────────────────────────────
  const imprimirPDF = () => {
    window.print();
  };

  const DIAS_NOMBRES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  return (
    <div className="rep-container" ref={reportRef}>

      {/* HEADER DE LA PÁGINA */}
      <div className="rep-header no-print">
        <div>
          <h1 className="rep-title">Módulo de Reportes & Business Intelligence</h1>
          <p className="rep-subtitle">Analítica financiera, auditoría de pedidos y rotación de productos</p>
        </div>

        <div className="rep-header-actions">
          <button className="rep-btn rep-btn-excel" onClick={exportarCSV}>
            <Download size={18} />
            <span>Exportar Excel (.csv)</span>
          </button>
          <button className="rep-btn rep-btn-pdf" onClick={imprimirPDF}>
            <Printer size={18} />
            <span>Imprimir / PDF Resumen</span>
          </button>
        </div>
      </div>

      {/* FILTROS DE FECHA Y CONTROLES */}
      <div className="rep-filter-card no-print">
        <div className="rep-filter-presets">
          <span className="rep-filter-label"><Filter size={16} /> Rango de Fecha:</span>
          {PRESET_FILTERS.map((f) => (
            <button
              key={f.id}
              className={`rep-chip ${preset === f.id ? "active" : ""}`}
              onClick={() => seleccionarPreset(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="rep-date-inputs">
          <div className="rep-date-group">
            <label>Desde:</label>
            <input
              type="date"
              value={fechaInicio}
              max={fechaFin || undefined}
              onChange={(e) => {
                if (!e.target.value) return; // vacío = sin límite: solo vía "Todo el Historial"
                setPreset("custom");
                setFechaInicio(e.target.value);
              }}
            />
          </div>
          <div className="rep-date-group">
            <label>Hasta:</label>
            <input
              type="date"
              value={fechaFin}
              min={fechaInicio || undefined}
              onChange={(e) => {
                if (!e.target.value) return;
                setPreset("custom");
                setFechaFin(e.target.value);
              }}
            />
          </div>
          <button className="rep-reload-btn" onClick={cargarDatos} title="Actualizar datos">
            <RefreshCw size={16} className={cargando ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* SELECCIÓN DE TIPO DE REPORTE (PESTAÑAS) */}
      <div className="rep-tabs-selector no-print">
        <button
          className={`rep-tab-btn ${tipoReporte === "financiero" ? "active" : ""}`}
          onClick={() => setTipoReporte("financiero")}
        >
          <DollarSign size={18} />
          <span>Ventas & Cierre Financiero</span>
        </button>
        <button
          className={`rep-tab-btn ${tipoReporte === "pedidos" ? "active" : ""}`}
          onClick={() => setTipoReporte("pedidos")}
        >
          <FileText size={18} />
          <span>Detalle e Histórico Transaccional ({pedidosFiltrados.length})</span>
        </button>
        <button
          className={`rep-tab-btn ${tipoReporte === "productos" ? "active" : ""}`}
          onClick={() => setTipoReporte("productos")}
        >
          <BarChart3 size={18} />
          <span>Rendimiento de Productos & Rotación</span>
        </button>
      </div>

      {cargando ? (
        <div style={{ padding: "4rem 0", textAlign: "center" }}>
          <LoadingOverlay text="Procesando analíticas de negocio..." minTime={500} />
        </div>
      ) : (
        <>
          {/* HEADER IMPRIMIBLE (SOLO VISIBLE EN IMPRESIÓN / PDF) */}
          <div className="rep-print-header printable-only">
            <div className="rep-print-brand">
              <h2>INFORME GERENCIAL Y CIERRE DE VENTAS</h2>
              <p>Generado el: {new Date().toLocaleString("es-CO")}</p>
            </div>
            <div className="rep-print-meta">
              <p><strong>Período:</strong> {fechaInicio || "Inicio"} al {fechaFin || "Hoy"}</p>
              <p><strong>Total Registros:</strong> {pedidosFiltrados.length} pedidos</p>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────────────── */}
          {/* VISTA 1: VENTAS & CIERRE FINANCIERO */}
          {/* ────────────────────────────────────────────────────────────────────────── */}
          {(tipoReporte === "financiero" || window.matchMedia("print").matches) && (
            <div className="rep-section animate-fade-in">

              {/* METRICAS CLAVE (KPIS) */}
              <div className="rep-kpi-grid">
                <div className="rep-kpi-card">
                  <div className="rep-kpi-icon bg-gold">
                    <DollarSign size={24} />
                  </div>
                  <div className="rep-kpi-info">
                    <span className="rep-kpi-title">Ventas Totales (Ingresos)</span>
                    <h3 className="rep-kpi-value">{formatCOP(metricas.totalVentas)}</h3>
                    <span className="rep-kpi-sub">En el período seleccionado</span>
                  </div>
                </div>

                <div className="rep-kpi-card">
                  <div className="rep-kpi-icon bg-blue">
                    <ShoppingBag size={24} />
                  </div>
                  <div className="rep-kpi-info">
                    <span className="rep-kpi-title">Pedidos Concretados</span>
                    <h3 className="rep-kpi-value">{metricas.cantPedidos} pedidos</h3>
                    <span className="rep-kpi-sub">Excluye pedidos cancelados</span>
                  </div>
                </div>

                <div className="rep-kpi-card">
                  <div className="rep-kpi-icon bg-green">
                    <TrendingUp size={24} />
                  </div>
                  <div className="rep-kpi-info">
                    <span className="rep-kpi-title">Ticket Promedio por Pedido</span>
                    <h3 className="rep-kpi-value">{formatCOP(metricas.ticketPromedio)}</h3>
                    <span className="rep-kpi-sub">Promedio facturado</span>
                  </div>
                </div>

                <div className="rep-kpi-card">
                  <div className="rep-kpi-icon bg-purple">
                    <BarChart3 size={24} />
                  </div>
                  <div className="rep-kpi-info">
                    <span className="rep-kpi-title">Franja Horaria Pico</span>
                    <h3 className="rep-kpi-value">{metricas.horaPico}</h3>
                    <span className="rep-kpi-sub">Mayor acumulación de ventas</span>
                  </div>
                </div>
              </div>

              {/* FILA 2: METODOS DE PAGO Y TIPOS DE ENTREGA */}
              <div className="rep-grid-2">

                {/* Desglose Métodos de Pago */}
                <div className="rep-card">
                  <h3 className="rep-card-title">
                    <CreditCard size={18} /> Desglose por Método de Pago
                  </h3>
                  <div className="rep-list">
                    {Object.keys(metricas.porPago).length === 0 ? (
                      <p className="rep-empty">No hay datos de pagos en este rango.</p>
                    ) : (
                      Object.entries(metricas.porPago).map(([metodo, valor]) => {
                        const porcentaje = metricas.totalVentas > 0 ? ((valor / metricas.totalVentas) * 100).toFixed(1) : 0;
                        return (
                          <div key={metodo} className="rep-list-item">
                            <div className="rep-item-header">
                              <span className="rep-item-label">{metodo}</span>
                              <strong className="rep-item-value">{formatCOP(valor)} ({porcentaje}%)</strong>
                            </div>
                            <div className="rep-progress-bar">
                              <div className="rep-progress-fill bg-gold-fill" style={{ width: `${porcentaje}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Desglose Tipo de Entrega */}
                <div className="rep-card">
                  <h3 className="rep-card-title">
                    <Layers size={18} /> Modalidad de Entrega
                  </h3>
                  <div className="rep-delivery-stats">
                    <div className="rep-delivery-box">
                      <span className="rep-deliv-count">{metricas.porEntrega.domicilio}</span>
                      <span className="rep-deliv-label">🛵 Domicilio</span>
                    </div>
                    <div className="rep-delivery-box">
                      <span className="rep-deliv-count">{metricas.porEntrega.recogida}</span>
                      <span className="rep-deliv-label">🛍️ Recoger en Tienda</span>
                    </div>
                    <div className="rep-delivery-box">
                      <span className="rep-deliv-count">{metricas.porEntrega.local}</span>
                      <span className="rep-deliv-label">🍽️ Consumo en Local</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* FILA 3: VENTA POR DÍAS DE LA SEMANA */}
              <div className="rep-card" style={{ marginTop: "1.5rem" }}>
                <h3 className="rep-card-title">
                  <Calendar size={18} /> Ventas Acumuladas por Día de la Semana
                </h3>
                <div className="rep-bars-container">
                  {Object.entries(metricas.porDiaSemana).map(([diaNum, monto]) => {
                    const maxMonto = Math.max(...Object.values(metricas.porDiaSemana), 1);
                    const porcentaje = Math.round((monto / maxMonto) * 100);
                    return (
                      <div key={diaNum} className="rep-bar-col">
                        <span className="rep-bar-val">{formatCOP(monto)}</span>
                        <div className="rep-bar-track">
                          <div className="rep-bar-fill" style={{ height: `${porcentaje}%` }} />
                        </div>
                        <span className="rep-bar-day">{DIAS_NOMBRES[diaNum]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}


          {/* ────────────────────────────────────────────────────────────────────────── */}
          {/* VISTA 2: HISTÓRICO Y DETALLE DE PEDIDOS */}
          {/* ────────────────────────────────────────────────────────────────────────── */}
          {(tipoReporte === "pedidos" || window.matchMedia("print").matches) && (
            <div className="rep-section animate-fade-in" style={{ marginTop: window.matchMedia("print").matches ? "2rem" : 0 }}>
              <div className="rep-card">
                <div className="rep-card-header">
                  <h3 className="rep-card-title">
                    <FileText size={18} /> Registro Detallado de Transacciones ({pedidosFiltrados.length})
                  </h3>
                  <button className="rep-btn rep-btn-excel no-print" onClick={exportarCSV}>
                    <Download size={14} /> Descargar Tabla (.csv)
                  </button>
                </div>

                <div className="rep-table-wrap">
                  <table className="rep-table">
                    <thead>
                      <tr>
                        <th>Nº Pedido</th>
                        <th>Fecha / Hora</th>
                        <th>Cliente</th>
                        <th>Teléfono</th>
                        <th>Modalidad</th>
                        <th>Método Pago</th>
                        <th>Estado</th>
                        <th style={{ textAlign: "right" }}>Total ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "#888" }}>
                            No hay pedidos registrados en este período.
                          </td>
                        </tr>
                      ) : (
                        pedidosFiltrados.map((p) => {
                          const fecha = p.created_at ? new Date(p.created_at).toLocaleDateString("es-CO") : "—";
                          const hora = p.created_at ? new Date(p.created_at).toLocaleTimeString("es-CO", { hour: '2-digit', minute: '2-digit' }) : "";
                          return (
                            <tr key={p.id || Math.random()}>
                              <td><strong>#{p.numero || p.id?.slice(0, 6)}</strong></td>
                              <td>
                                <div style={{ fontSize: "0.85rem" }}>{fecha}</div>
                                <small style={{ color: "#888" }}>{hora}</small>
                              </td>
                              <td>{p.nombre || "Cliente"}</td>
                              <td>{p.telefono || "—"}</td>
                              <td>
                                <span className={`rep-badge badge-${p.tipo_entrega || "domicilio"}`}>
                                  {p.tipo_entrega || "domicilio"}
                                </span>
                              </td>
                              <td>{p.pago || "Efectivo"}</td>
                              <td>
                                <span className={`rep-badge badge-${p.estado || "nuevo"}`}>
                                  {p.estado || "nuevo"}
                                </span>
                              </td>
                              <td style={{ textAlign: "right", fontWeight: "bold" }}>
                                {formatCOP(p.total || 0)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}


          {/* ────────────────────────────────────────────────────────────────────────── */}
          {/* VISTA 3: RENDIMIENTO DE PRODUCTOS & ROTACIÓN */}
          {/* ────────────────────────────────────────────────────────────────────────── */}
          {(tipoReporte === "productos" || window.matchMedia("print").matches) && (
            <div className="rep-section animate-fade-in" style={{ marginTop: window.matchMedia("print").matches ? "2rem" : 0 }}>

              <div className="rep-grid-2">
                {/* Top 10 Productos Más Vendidos */}
                <div className="rep-card">
                  <h3 className="rep-card-title">
                    <Award size={18} color="#ffcc00" /> Top Productos Más Vendidos
                  </h3>
                  <div className="rep-table-wrap">
                    <table className="rep-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Producto</th>
                          <th style={{ textAlign: "center" }}>Unidades</th>
                          <th style={{ textAlign: "right" }}>Facturación ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricas.rankingProductos.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "#888" }}>
                              No hay ventas registradas.
                            </td>
                          </tr>
                        ) : (
                          metricas.rankingProductos.slice(0, 10).map((item, idx) => (
                            <tr key={item.nombre}>
                              <td><strong>#{idx + 1}</strong></td>
                              <td>{item.nombre}</td>
                              <td style={{ textAlign: "center" }}>
                                <span className="rep-pill-qty">{item.unidades}</span>
                              </td>
                              <td style={{ textAlign: "right", fontWeight: "bold", color: "#10b981" }}>
                                {formatCOP(item.ingresos)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Productos Sin Rotación (Alerta) */}
                <div className="rep-card">
                  <h3 className="rep-card-title">
                    <AlertTriangle size={18} color="#ef4444" /> Productos Sin Rotación (0 Ventas)
                  </h3>
                  <p style={{ color: "#a3a3a3", fontSize: "0.85rem", marginBottom: "1rem" }}>
                    Productos en tu catálogo que no han registrado ventas en el rango seleccionado. Considera promocionarlos o replantear su visibilidad.
                  </p>

                  <div className="rep-list">
                    {metricas.productosSinVentas.length === 0 ? (
                      <div className="rep-empty-good">
                        <CheckCircle2 size={24} color="#10b981" />
                        <span>¡Excelente! Todos tus productos han registrado al menos 1 venta en este período.</span>
                      </div>
                    ) : (
                      metricas.productosSinVentas.map((prod) => (
                        <div key={prod.id || prod.nombre} className="rep-unrotated-item">
                          <div>
                            <strong>{prod.nombre || prod.title}</strong>
                            <small style={{ display: "block", color: "#888" }}>Categoría: {prod.category || "General"}</small>
                          </div>
                          <span className="rep-price-tag">{formatCOP(prod.precio || prod.price || 0)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

        </>
      )}

    </div>
  );
};

export default Reportes;
