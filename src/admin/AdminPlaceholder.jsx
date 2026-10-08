// Marcador temporal: cada fase (F4–F8) reemplaza su placeholder por el módulo real.
const AdminPlaceholder = ({ titulo, icono, fase }) => (
  <div className="admin-page">
    <header className="admin-page__header">
      <h1 className="admin-page__titulo">
        {icono} {titulo}
      </h1>
      <p className="admin-page__sub">Módulo en construcción — se entrega en la {fase}</p>
    </header>
    <div className="admin-card admin-card--empty">
      <p>
        Este módulo está definido en <code>docs/PANEL_ADMIN.md</code> y se implementa en la
        siguiente fase del plan.
      </p>
    </div>
  </div>
);

export default AdminPlaceholder;
