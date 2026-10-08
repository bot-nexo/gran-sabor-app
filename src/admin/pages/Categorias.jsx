import { useCallback, useEffect, useMemo, useState } from "react";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import Swal from "sweetalert2";
import Pagination from "../Pagination";
import CategoryFormModal from "../CategoryFormModal";
import Switch from "../Switch";
import {
  getProducts,
  getCategoriesRaw,
  updateCategory,
  deleteCategory,
} from "../../data/dataSource";
import { Plus, Pencil, Trash2, RefreshCw, Search } from "lucide-react";
import "../admin.css";

const Categorias = () => {
  const [categorias, setCategorias] = useState(null); // null = carga inicial
  const [productos, setProductos] = useState([]);
  const [modal, setModal] = useState({ abierto: false, categoria: null });
  const [procesandoId, setProcesandoId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos"); // "todos" | "visibles" | "ocultas"
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(5);
  const [cargando, setCargando] = useState(false);
  const timeOut = 1500;
  const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  //********************************** */
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [cats, prods] = await Promise.all([
        getCategoriesRaw(),
        getProducts(),
        esperar(timeOut)
      ]);
      setCategorias(cats);
      setProductos(prods);
    } catch (e) {
      Swal.fire({
        title: "Error al cargar",
        text: e.message,
        icon: "error",
        confirmButtonColor: "#3D2314",
      });
      setCategorias([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Resetear a página 1 al cambiar filtros
  useEffect(() => { setPaginaActual(1); }, [busqueda, filtroEstado]);

  const filtradas = useMemo(() => {
    if (!categorias) return [];
    const q = busqueda.trim().toLowerCase();
    return categorias.filter((c) => {
      const okBus = !q || c.nombre.toLowerCase().includes(q);
      const okEstado =
        filtroEstado === "todos" ? true
          : filtroEstado === "visibles" ? c.visible
            : /* ocultas */ !c.visible;
      return okBus && okEstado;
    });
  }, [categorias, busqueda, filtroEstado]);

  const paginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    return filtradas.slice(inicio, inicio + itemsPorPagina);
  }, [filtradas, paginaActual, itemsPorPagina]);

  const conteoPorCategoria = useMemo(() => {
    const mapa = {};
    productos.forEach((p) => {
      if (!p.category) return;
      mapa[p.category] = (mapa[p.category] || 0) + 1;
    });
    return mapa;
  }, [productos]);

  const contar = (nombreCat) => conteoPorCategoria[nombreCat] || 0;

  const toggleVisible = async (cat) => {
    const nuevo = !cat.visible;
    setProcesandoId(cat.id);
    try {
      await updateCategory(cat.id, { visible: nuevo });
      setCategorias((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, visible: nuevo } : c)),
      );
    } catch (e) {
      Swal.fire({
        title: "No se pudo actualizar",
        text: e.message,
        icon: "error",
        confirmButtonColor: "#3D2314",
      });
    } finally {
      setProcesandoId(null);
    }
  };

  const eliminar = async (cat) => {
    const n = contar(cat.nombre);
    if (n > 0) {
      Swal.fire({
        icon: "warning",
        title: "No se puede eliminar",
        text: `Tiene ${n} producto(s) asociado(s). Reasígnalos primero u oculta la categoría.`,
        confirmButtonColor: "#3D2314",
      });
      return;
    }

    const res = await Swal.fire({
      title: `¿Eliminar la categoría "${cat.nombre}"?`,
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#E07A5F",
      cancelButtonColor: "#3D2314",
      reverseButtons: true,
    });
    if (!res.isConfirmed) return;

    setProcesandoId(cat.id);
    try {
      setCargando(true);
      await deleteCategory(cat.id);
      setCategorias((prev) => prev.filter((c) => c.id !== cat.id));
      Swal.fire({
        icon: "success",
        title: "Categoría eliminada",
        toast: true,
        position: "top-end",
        timer: 2200,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire({
        title: "No se pudo eliminar",
        text: e.message,
        icon: "error",
        confirmButtonColor: "#3D2314",
      });
    } finally {
      setCargando(false);
      setProcesandoId(null);
    }
  };

  const totalVisibles = categorias?.filter((c) => c.visible).length ?? 0;

  // 1. Carga inicial (Pantalla Completa antes de recibir el primer arreglo de datos)
  if (categorias === null) {
    return (
      <LoadingOverlay fullScreen text="Cargando categorías" minTime={timeOut} />
    );
  }

  // ****************************************/
  return (
    <div className="admin-page">
      {/* 2. Carga secundaria (Al recargar manualmente o eliminar elementos) */}
      {cargando && (
        <LoadingOverlay text="Sincronizando categorías" minTime={timeOut} />
      )}

      <header className="admin-page__header admin-page__header--row">
        <div>
          <h1 className="admin-page__titulo">Categorías</h1>

        </div>
        <div className="admin-page__acciones">
          <button
            type="button"
            className="admin-btn-ghost"
            onClick={cargar}
            disabled={cargando}
          >
            <RefreshCw size={15} className={cargando ? "adm-spin" : ""} /> Recargar
          </button>
          <button
            type="button"
            className="admin-btn-primary admin-btn-primary--compacto"
            onClick={() => setModal({ abierto: true, categoria: null })}
          >
            <Plus size={16} /> Nueva
          </button>
        </div>
      </header>

      {/* Barra de filtros */}
      <div className="adm-prod__filtros">
        <div className="admin-field__input adm-prod__buscador">
          <Search size={15} className="admin-field__icon" />
          <input
            type="text"
            placeholder="Buscar por nombre…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="adm-filtro-estado" role="group" aria-label="Filtrar por estado">
          {[
            { valor: "todos", etiqueta: "Todas", num: categorias?.length ?? 0 },
            { valor: "visibles", etiqueta: "Visibles", num: categorias?.filter((c) => c.visible).length ?? 0 },
            { valor: "ocultas", etiqueta: "Ocultas", num: categorias?.filter((c) => !c.visible).length ?? 0 },
          ].map(({ valor, etiqueta, num }) => (
            <button
              key={valor}
              type="button"
              className={`adm-filtro-estado__btn${filtroEstado === valor ? " adm-filtro-estado__btn--activo" : ""}`}
              onClick={() => setFiltroEstado(valor)}
            >
              {etiqueta}
              <span className="adm-filtro-estado__num">{num}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card admin-card--tabla admin-main-content">
        {filtradas.length === 0 ? (
          <p className="adm-prod__vacio">No hay categorías que coincidan con el filtro.</p>
        ) : (
          <table className="adm-prod__tabla">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Productos</th>
                <th>Orden</th>
                <th>Visible</th>
                <th className="adm-prod__col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginadas.map((cat) => (
                <tr key={cat.id} className={cat.visible ? "" : "adm-prod__fila--agotada"}>
                  <td>
                    <div className="adm-prod__celda-nombre">
                      <span className="adm-cats__emoji">{cat.emoji || "🏷️"}</span>
                      <div>
                        <strong>{cat.nombre}</strong>
                        <small>{cat.label}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="adm-chip">{contar(cat.nombre)} productos</span>
                  </td>
                  <td>{cat.orden}</td>
                  <td>
                    <Switch
                      activo={cat.visible}
                      disabled={procesandoId === cat.id}
                      onChange={() => toggleVisible(cat)}
                      etiqueta={cat.visible ? "Ocultar de la tienda" : "Mostrar en la tienda"}
                    />
                  </td>
                  <td className="adm-prod__col-acciones">
                    <button
                      type="button"
                      className="adm-icono-btn"
                      title="Editar"
                      onClick={() => setModal({ abierto: true, categoria: cat })}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="adm-icono-btn adm-icono-btn--peligro"
                      title="Eliminar"
                      disabled={procesandoId === cat.id}
                      onClick={() => eliminar(cat)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filtradas.length > 0 && (
        <Pagination
          paginaActual={paginaActual}
          totalItems={filtradas.length}
          itemsPorPagina={itemsPorPagina}
          onCambiarPagina={(p) => setPaginaActual(p)}
          onCambiarItemsPorPagina={(n) => {
            setItemsPorPagina(n);
            setPaginaActual(1);
          }}
        />
      )}

      {modal.abierto && (
        <CategoryFormModal
          categoria={modal.categoria}
          ordenSugerido={
            (categorias?.reduce((max, c) => Math.max(max, c.orden || 0), 0) || 0) + 1
          }
          onClose={() => setModal({ abierto: false, categoria: null })}
          onSaved={async () => {
            setModal({ abierto: false, categoria: null });
            await cargar();
          }}
        />
      )}
    </div>
  );
};

export default Categorias;