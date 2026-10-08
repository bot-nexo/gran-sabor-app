import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import Pagination from "../Pagination";
import ProductFormModal from "../ProductFormModal";
import Switch from "../Switch";
import {
  getProducts,
  getCategoriesRaw,
  updateProduct,
  deleteProduct,
} from "../../data/dataSource";
import { formatCOP } from "../../utils/price";
import { Plus, Search, Pencil, Trash2, RefreshCw } from "lucide-react";
import "../admin.css";

const Productos = () => {
  const [productos, setProductos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos"); // "todos" | "disponibles" | "inactivos"
  const [modal, setModal] = useState({ abierto: false, producto: null });
  const [procesandoId, setProcesandoId] = useState(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(5);
  const [cargandoGlobal, setCargandoGlobal] = useState(true);

  const timeOut = 1500;
  const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  //********************************** */
  const cargar = useCallback(async () => {
    try {
      setCargandoGlobal(true);
      const [[prods, cats]] = await Promise.all([
        Promise.all([getProducts(), getCategoriesRaw()]),
        esperar(timeOut),
      ]);
      const tempCats = cats?.filter((c) => c.nombre !== "Todos") ?? cats;
      setProductos(prods);
      setCategorias(tempCats);
    } catch (e) {
      Swal.fire({
        title: "Error al cargar",
        text: e.message,
        icon: "error",
        confirmButtonColor: "#3D2314",
      });
      setProductos([]);
    } finally {
      setCargandoGlobal(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Resetear a página 1 al filtrar o buscar
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroCategoria, filtroEstado]);

  const filtrados = useMemo(() => {
    if (!productos) return [];
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      const okCat    = !filtroCategoria || p.category === filtroCategoria;
      const okBus    = !q || p.nombre.toLowerCase().includes(q);
      const okEstado =
        filtroEstado === "todos"       ? true
        : filtroEstado === "disponibles" ? p.disponible !== false
        : /* inactivos */                 p.disponible === false;
      return okCat && okBus && okEstado;
    });
  }, [productos, busqueda, filtroCategoria, filtroEstado]);

  const paginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    return filtrados.slice(inicio, inicio + itemsPorPagina);
  }, [filtrados, paginaActual, itemsPorPagina]);

  /** Alterna disponible/destacado — sin LoadingOverlay global (solo deshabilita el switch) */
  const toggleCampo = async (p, campo) => {
    const nuevo = !p[campo];
    setProcesandoId(p.id);
    try {
      await updateProduct(p.id, { [campo]: nuevo });
      setProductos((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, [campo]: nuevo } : x)),
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

  const eliminar = async (p) => {
    const res = await Swal.fire({
      title: `¿Eliminar "${p.nombre}"?`,
      text: "Esta acción no se puede deshacer. También se borrará su foto del alojamiento.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#E07A5F",
      cancelButtonColor: "#3D2314",
      reverseButtons: true,
    });
    if (!res.isConfirmed) return;

    setProcesandoId(p.id);
    try {
      setCargandoGlobal(true);
      await Promise.all([
        deleteProduct(p.id),
        esperar(timeOut),
      ]);
      setProductos((prev) => prev.filter((x) => x.id !== p.id));
      Swal.fire({
        icon: "success",
        title: "Producto eliminado",
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
      setProcesandoId(null);
      setCargandoGlobal(false);
    }
  };

  const totalAgotados = productos?.filter((p) => p.disponible === false).length ?? 0;
  const totalDestacados = productos?.filter((p) => p.destacado).length ?? 0;

  // 1. Carga inicial (Pantalla Completa)
  if (cargandoGlobal && productos === null) {
    return (
      <LoadingOverlay fullScreen text="Cargando productos" minTime={timeOut} />
    );
  }

  //****************************** */
  return (
    <div className="admin-page" style={{ position: "relative" }}>
      {cargandoGlobal && (
        <LoadingOverlay text="Sincronizando productos" minTime={timeOut} />
      )}

      <header className="admin-page__header admin-page__header--row">
        <div className="admin-page__badges">
          <h1 className="admin-page__titulo">Productos</h1>
          {productos ? (
            <>
              <span className="adm-chip">
                <strong className="adm-chip__num">{productos.length}</strong> Productos
              </span>
              <span className="adm-chip adm-chip--peligro">
                <strong className="adm-chip__num">{totalAgotados}</strong> Inactivos
              </span>
              <span className="adm-chip adm-chip--acento">
                <strong className="adm-chip__num">{totalDestacados}</strong> Destacados
              </span>
            </>
          ) : (
            <span className="adm-chip adm-chip--cargando">Cargando catálogo…</span>
          )}
        </div>
        <div className="admin-page__acciones">
          <button
            type="button"
            className="admin-btn-ghost"
            onClick={cargar}
            title="Recargar desde la base de datos"
          >
            <RefreshCw size={15} /> Recargar
          </button>
          <button
            type="button"
            className="admin-btn-primary admin-btn-primary--compacto"
            onClick={() => setModal({ abierto: true, producto: null })}
          >
            <Plus size={16} /> Nuevo
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
        <select
          className="adm-prod__select"
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>

        {/* Filtro de estado — segmented control */}
        <div className="adm-filtro-estado" role="group" aria-label="Filtrar por estado">
          {[
            { valor: "todos",       etiqueta: "Todos",       num: productos?.length ?? 0 },
            { valor: "disponibles", etiqueta: "Disponibles", num: productos?.filter((p) => p.disponible !== false).length ?? 0 },
            { valor: "inactivos",   etiqueta: "Inactivos",   num: productos?.filter((p) => p.disponible === false).length ?? 0 },
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

      {/* Tabla */}
      <div className="admin-card admin-card--tabla">
        {filtrados.length === 0 ? (
          <p className="adm-prod__vacio">
            No hay productos que coincidan con la búsqueda.
          </p>
        ) : (
          <table className="adm-prod__tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Disponible</th>
                <th>Destacado</th>
                <th className="adm-prod__col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginados.map((p) => (
                <tr
                  key={p.id}
                  className={p.disponible === false ? "adm-prod__fila--agotada" : ""}
                >
                  <td>
                    <div className="adm-prod__celda-nombre">
                      <img src={p.imagen} alt="" className="adm-prod__miniatura" />
                      <div>
                        <strong>{p.nombre}</strong>
                        {p.nota && <small>{p.nota}</small>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="adm-chip">{p.category || "—"}</span>
                  </td>
                  <td className="adm-prod__precio">{formatCOP(p.precio)}</td>
                  <td>
                    <Switch
                      activo={p.disponible !== false}
                      disabled={procesandoId === p.id}
                      onChange={() => toggleCampo(p, "disponible")}
                      etiqueta={p.disponible === false ? "Marcar disponible" : "Marcar agotado"}
                    />
                  </td>
                  <td>
                    <Switch
                      activo={!!p.destacado}
                      disabled={procesandoId === p.id}
                      onChange={() => toggleCampo(p, "destacado")}
                      etiqueta={p.destacado ? "Quitar destacado" : "Destacar"}
                    />
                  </td>
                  <td className="adm-prod__col-acciones">
                    <button
                      type="button"
                      className="adm-icono-btn"
                      title="Editar"
                      onClick={() => setModal({ abierto: true, producto: p })}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="adm-icono-btn adm-icono-btn--peligro"
                      title="Eliminar"
                      disabled={procesandoId === p.id}
                      onClick={() => eliminar(p)}
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

      {modal.abierto && (
        <ProductFormModal
          producto={modal.producto}
          categorias={categorias}
          ordenSugerido={
            (productos?.reduce((max, p) => Math.max(max, p.orden || 0), 0) || 0) + 1
          }
          onClose={() => setModal({ abierto: false, producto: null })}
          onSaved={async () => {
            setModal({ abierto: false, producto: null });
            await cargar();
          }}
        />
      )}
    </div>
  );
};

export default Productos;