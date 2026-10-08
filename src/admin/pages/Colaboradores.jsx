import { KeyRound, Plus, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { getColaboradores, manageCollaborator } from "../../data/dataSource";
import "../admin.css";
import Switch from "../Switch";

const COLOR = "#3D2314";
const MIN_PASSWORD = 8;

const avisarError = (e, title = "No se pudo completar") =>
  Swal.fire({ title, text: e.message, icon: "error", confirmButtonColor: COLOR });

const pedirPassword = async (titulo) => {
  const res = await Swal.fire({
    title: titulo,
    input: "text",
    inputLabel: `Nueva contraseña (mínimo ${MIN_PASSWORD} caracteres)`,
    inputAttributes: { autocapitalize: "off", autocomplete: "off" },
    showCancelButton: true,
    confirmButtonText: "Guardar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: COLOR,
    inputValidator: (v) => (!v || v.length < MIN_PASSWORD ? `Mínimo ${MIN_PASSWORD} caracteres` : null),
  });
  return res.isConfirmed ? res.value : null;
};

const Colaboradores = () => {
  const [lista, setLista] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);

  const timeOut = 1200;
  const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [res] = await Promise.all([
        getColaboradores(),
        esperar(timeOut)
      ]);
      setLista(res);
    } catch (e) {
      avisarError(e, "Error al cargar");
      setLista([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crear = async () => {
    const res = await Swal.fire({
      title: "Nuevo colaborador",
      html:
        '<input id="col-nombre" class="swal2-input" placeholder="Nombre" maxlength="80" autocomplete="off">' +
        '<input id="col-usuario" class="swal2-input" placeholder="Usuario (ej. maria.lopez)" maxlength="30" autocapitalize="off" autocomplete="off">' +
        `<input id="col-pass" class="swal2-input" placeholder="Contraseña (mín. ${MIN_PASSWORD})" autocomplete="off">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Crear",
      cancelButtonText: "Cancelar",
      confirmButtonColor: COLOR,
      preConfirm: () => {
        const nombre = document.getElementById("col-nombre").value.trim();
        const usuario = document.getElementById("col-usuario").value.trim().toLowerCase();
        const password = document.getElementById("col-pass").value;
        if (!nombre) return Swal.showValidationMessage("El nombre es obligatorio");
        if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) {
          return Swal.showValidationMessage("Usuario: 3 a 30 letras minúsculas, números, punto, guion o guion bajo");
        }
        if (password.length < MIN_PASSWORD) {
          return Swal.showValidationMessage(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
        }
        return { nombre, usuario, password };
      },
    });
    if (!res.isConfirmed) return;

    setCargando(true);
    try {
      await Promise.all([
        manageCollaborator("create", res.value),
        esperar(timeOut)
      ]);
      await cargar();
      Swal.fire({
        icon: "success",
        title: "Colaborador creado",
        html: `Usuario: <b>${res.value.usuario}</b><br>Entrégale su usuario y contraseña. Ingresa desde la pantalla de acceso del panel.`,
        confirmButtonColor: COLOR,
      });
    } catch (e) {
      setCargando(false);
      avisarError(e, "No se pudo crear");
    }
  };

  const ejecutar = async (id, fn) => {
    setProcesandoId(id);
    setCargando(true);
    try {
      await Promise.all([
        fn(),
        esperar(timeOut)
      ]);
    } catch (e) {
      avisarError(e);
    } finally {
      setProcesandoId(null);
      setCargando(false);
    }
  };

  const toggleActivo = (c) =>
    ejecutar(c.id, async () => {
      await manageCollaborator("update", { id: c.id, activo: !c.activo });
      setLista((prev) => prev.map((x) => (x.id === c.id ? { ...x, activo: !c.activo } : x)));
    });

  const cambiarPassword = async (c) => {
    const password = await pedirPassword(`Nueva contraseña para ${c.nombre}`);
    if (!password) return;
    await ejecutar(c.id, async () => {
      await manageCollaborator("set_password", { id: c.id, password });
      setLista((prev) => prev.map((x) => (x.id === c.id ? { ...x, solicitud_password_at: null } : x)));
      Swal.fire({ icon: "success", title: "Contraseña actualizada", confirmButtonColor: COLOR });
    });
  };

  const eliminar = async (c) => {
    const res = await Swal.fire({
      title: `¿Eliminar a ${c.nombre}?`,
      text: "Ya no podrá ingresar. Sus pedidos anteriores se conservan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#E07A5F",
      cancelButtonColor: COLOR,
      reverseButtons: true,
    });
    if (!res.isConfirmed) return;
    await ejecutar(c.id, async () => {
      await manageCollaborator("delete", { id: c.id });
      setLista((prev) => prev.filter((x) => x.id !== c.id));
    });
  };

  if (lista === null) return <LoadingOverlay fullScreen text="Cargando colaboradores" minTime={timeOut} />;

  return (
    <div className="admin-page">
      {cargando && <LoadingOverlay text="Sincronizando colaboradores" minTime={timeOut} />}

      <header className="admin-page__header admin-page__header--row">
        <div>
          <h1 className="admin-page__titulo">Colaboradores</h1>
          <p className="admin-page__subtitulo">
            Usuarios que toman pedidos en el local desde su celular o tablet.
          </p>
        </div>
        <div className="admin-page__acciones">
          <button type="button" className="admin-btn-ghost" onClick={cargar} disabled={cargando}>
            <RefreshCw size={15} className={cargando ? "adm-spin" : ""} /> Recargar
          </button>
          <button type="button" className="admin-btn-primary admin-btn-primary--compacto" onClick={crear}>
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </header>

      <div className="admin-card admin-card--tabla admin-main-content">
        {lista.length === 0 ? (
          <p className="adm-prod__vacio">
            <UserPlus size={18} style={{ verticalAlign: "middle" }} /> Aún no hay colaboradores. Crea el primero.
          </p>
        ) : (
          <table className="adm-prod__tabla">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Usuario</th>
                <th>Activo</th>
                <th className="adm-prod__col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className={c.activo ? "" : "adm-prod__fila--agotada"}>
                  <td>
                    <strong>{c.nombre}</strong>
                    {c.solicitud_password_at && (
                      <small style={{ display: "block", color: "#c2410c", fontWeight: 600 }}>
                        🔑 Solicitó cambio de contraseña (
                        {new Date(c.solicitud_password_at).toLocaleString("es-CO")})
                      </small>
                    )}
                  </td>
                  <td>{c.usuario}</td>
                  <td>
                    <Switch
                      activo={c.activo}
                      disabled={procesandoId === c.id}
                      onChange={() => toggleActivo(c)}
                      etiqueta={c.activo ? "Desactivar acceso" : "Activar acceso"}
                    />
                  </td>
                  <td className="adm-prod__col-acciones">
                    <button
                      type="button"
                      className="adm-icono-btn"
                      title="Cambiar contraseña"
                      disabled={procesandoId === c.id}
                      onClick={() => cambiarPassword(c)}
                    >
                      <KeyRound size={15} />
                    </button>
                    <button
                      type="button"
                      className="adm-icono-btn adm-icono-btn--peligro"
                      title="Eliminar"
                      disabled={procesandoId === c.id}
                      onClick={() => eliminar(c)}
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
    </div>
  );
};

export default Colaboradores;
