import { ChevronLeft, ChevronRight } from "lucide-react";
import "./admin.css";

const Pagination = ({
  paginaActual,
  totalItems,
  itemsPorPagina,
  onCambiarPagina,
  onCambiarItemsPorPagina,
  opcionesPorPagina = [5, 8, 12],
}) => {
  const totalPaginas = Math.ceil(totalItems / itemsPorPagina) || 1;

  if (totalItems <= 0) return null;

  const inicio = (paginaActual - 1) * itemsPorPagina + 1;
  const fin = Math.min(paginaActual * itemsPorPagina, totalItems);

  const generarPaginas = () => {
    const paginas = [];
    const maxPaginasVisibles = 5;

    if (totalPaginas <= maxPaginasVisibles) {
      for (let i = 1; i <= totalPaginas; i++) {
        paginas.push(i);
      }
    } else {
      if (paginaActual <= 3) {
        paginas.push(1, 2, 3, 4, "...", totalPaginas);
      } else if (paginaActual >= totalPaginas - 2) {
        paginas.push(1, "...", totalPaginas - 3, totalPaginas - 2, totalPaginas - 1, totalPaginas);
      } else {
        paginas.push(1, "...", paginaActual - 1, paginaActual, paginaActual + 1, "...", totalPaginas);
      }
    }
    return paginas;
  };

  return (
    <div className="admin-pagination">
      <div className="admin-pagination__info">
        Mostrando <span className="admin-pagination__highlight">{inicio}</span> a{" "}
        <span className="admin-pagination__highlight">{fin}</span> de{" "}
        <span className="admin-pagination__highlight">{totalItems}</span> registros
      </div>

      <div className="admin-pagination__controls">
        <button
          type="button"
          className="admin-pagination__btn"
          onClick={() => onCambiarPagina(paginaActual - 1)}
          disabled={paginaActual === 1}
          title="Página anterior"
        >
          <ChevronLeft size={16} />
          <span>Anterior</span>
        </button>

        <div className="admin-pagination__pages">
          {generarPaginas().map((p, idx) =>
            p === "..." ? (
              <span key={`dots-${idx}`} className="admin-pagination__dots">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`admin-pagination__page-btn ${paginaActual === p ? "admin-pagination__page-btn--active" : ""
                  }`}
                onClick={() => onCambiarPagina(p)}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="admin-pagination__btn"
          onClick={() => onCambiarPagina(paginaActual + 1)}
          disabled={paginaActual === totalPaginas}
          title="Página siguiente"
        >
          <span>Siguiente</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {onCambiarItemsPorPagina && (
        <div className="admin-pagination__per-page">
          <span className="admin-pagination__label">Mostrar:</span>
          <select
            value={itemsPorPagina}
            onChange={(e) => onCambiarItemsPorPagina(Number(e.target.value))}
            className="admin-pagination__select"
          >
            {opcionesPorPagina.map((opt) => (
              <option key={opt} value={opt}>
                {opt} por pág.
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default Pagination;
