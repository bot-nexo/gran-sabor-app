import { Building, Loader2, Save, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { getSettings, updateSettings } from "../../data/dataSource";
import { useAdminSession } from "../useAdminSession";

const ACCESS_CONTROLS = [
  {
    key: "isActive",
    label: "Estado de la cuenta",
    description: "Controla el acceso al panel y la recepción de pedidos.",
    enabledLabel: "Activa",
    disabledLabel: "Suspendida",
  },
  {
    key: "canChangePassword",
    label: "Cambio de contraseña",
    description: "Permite al administrador actualizar su contraseña.",
    enabledLabel: "Permitido",
    disabledLabel: "Bloqueado",
  },
];

const MODULE_CONTROLS = [
  { key: "plan_adiciones", label: "Adiciones y salsas", description: "Opciones extra para productos." },
  { key: "plan_promociones", label: "Promociones y combos", description: "Ofertas y paquetes especiales." },
  { key: "plan_diseno", label: "Diseño del menú", description: "Personalización visual del catálogo." },
  { key: "plan_reportes", label: "Reportes e informes", description: "Analítica de ventas y exportaciones." },
  { key: "plan_fidelizacion", label: "Fidelización", description: "Módulo de recompensas e insignias." },
  { key: "plan_configuracion", label: "Configuración básica", description: "Acceso a parámetros de envío y negocio." },
  { key: "plan_domicilio_dinamico", label: "Domicilio dinámico", description: "Cálculo de envíos por km con Mapbox." },
  { key: "plan_emails", label: "Correos automáticos", description: "Email al cliente cuando cambia el estado de su pedido." },
    { key: "plan_colaboradores", label: "Colaboradores (punto de venta)", description: "Permite al admin crear usuarios que toman pedidos en el local." },
    { key: "plan_mesas", label: "Mesas con QR", description: "Permite al admin crear mesas y códigos QR para pedir desde la mesa." },
  ];

const AdminSuper = () => {
  const { role } = useAdminSession();
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getSettings();
        setForm({
          isActive: data.isActive,
          canChangePassword: data.canChangePassword,
          plan_adiciones: data.plan_adiciones !== false, // Por defecto true para no romper lo actual
          plan_promociones: data.plan_promociones !== false,
          plan_reportes: data.plan_reportes !== false,
          plan_diseno: data.plan_diseno !== false,
          plan_fidelizacion: data.plan_fidelizacion !== false,
          plan_configuracion: data.plan_configuracion !== false,
          plan_domicilio_dinamico: data.plan_domicilio_dinamico !== false,
          plan_emails: data.plan_emails !== false,
          plan_colaboradores: data.plan_colaboradores === true,
          plan_mesas: data.plan_mesas === true,
        });
      } catch (err) {
        console.error("Error cargando super admin:", err);
      } finally {
        setCargando(false);
      }
    };
    loadData();
  }, []);

  const handleChange = (field) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await updateSettings(form);
      Swal.fire({
        icon: "success",
        title: "Guardado",
        text: "Configuración de superadmin actualizada.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    } finally {
      setGuardando(false);
    }
  };

  if (role !== "superadmin") {
    return (
      <div className="admin-card admin-super__denied">
        <ShieldAlert size={36} />
        <h2>Acceso denegado</h2>
        <p>Esta sección es exclusiva para el superadministrador.</p>
      </div>
    );
  }

  if (cargando || !form) {
    return <LoadingOverlay fullScreen text="Cargando controles maestros" />;
  }

  return (
    <div className="admin-super">
      <header className="admin-super__header">
        <span className="admin-super__mark"><ShieldCheck size={20} /></span>
        <div>
          <span className="admin-super__eyebrow">Administración del sistema</span>
          <h1>Controles del negocio</h1>
          <p>Disponibilidad, seguridad y módulos incluidos en el plan.</p>
        </div>
      </header>

      <form className="admin-card admin-super__form" onSubmit={handleSubmit}>
        <section className="admin-super__section" aria-labelledby="admin-super-access-title">
          <div className="admin-super__section-heading">
            <Building size={17} />
            <div>
              <h2 id="admin-super-access-title">Acceso y seguridad</h2>
              <p>Controles generales de operación para este negocio.</p>
            </div>
          </div>
          <div className="admin-super__rows">
            {ACCESS_CONTROLS.map((control) => (
              <button
                key={control.key}
                type="button"
                className="admin-super__row"
                onClick={() => handleChange(control.key)}
                aria-pressed={Boolean(form[control.key])}
              >
                <span className="admin-super__row-copy">
                  <strong>{control.label}</strong>
                  <span>{control.description}</span>
                </span>
                <span className="admin-super__row-state">
                  <span className={`admin-super__status${form[control.key] ? " is-on" : " is-off"}`}>
                    {form[control.key] ? control.enabledLabel : control.disabledLabel}
                  </span>
                  <span className={`admin-super__switch${form[control.key] ? " is-on" : ""}`} aria-hidden="true">
                    <span />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-super__section" aria-labelledby="admin-super-modules-title">
          <div className="admin-super__section-heading">
            <ShieldCheck size={17} />
            <div>
              <h2 id="admin-super-modules-title">Módulos del plan</h2>
              <p>Define las herramientas disponibles en el panel administrativo.</p>
            </div>
          </div>
          <div className="admin-super__rows admin-super__rows--modules">
            {MODULE_CONTROLS.map((control) => (
              <button
                key={control.key}
                type="button"
                className="admin-super__row"
                onClick={() => handleChange(control.key)}
                aria-pressed={Boolean(form[control.key])}
              >
                <span className="admin-super__row-copy">
                  <strong>{control.label}</strong>
                  <span>{control.description}</span>
                </span>
                <span className="admin-super__row-state">
                  <span className={`admin-super__status${form[control.key] ? " is-on" : " is-off"}`}>
                    {form[control.key] ? "Incluido" : "Restringido"}
                  </span>
                  <span className={`admin-super__switch${form[control.key] ? " is-on" : ""}`} aria-hidden="true">
                    <span />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <footer className="admin-super__footer">
          <button type="submit" className="admin-btn-primary admin-btn-primary--compacto" disabled={guardando}>
            {guardando ? <Loader2 size={15} className="adm-spin" /> : <Save size={15} />}
            {guardando ? "Guardando…" : "Guardar controles"}
          </button>
        </footer>
      </form>
    </div>
  );
};

export default AdminSuper;
