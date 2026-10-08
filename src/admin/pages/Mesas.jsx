import { Download, Plus, Printer, QrCode, RefreshCw, Trash2 } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import { createMesas, deleteMesa, getMesas, updateMesa } from "../../data/dataSource";
import "../admin.css";
import Switch from "../Switch";

const COLOR = "#3D2314";
const MAX_MESAS_LOTE = 100;

const urlMesa = (numero) => `${window.location.origin}/?mesa=${numero}`;
const qrDataUrl = (numero, width = 600) => QRCode.toDataURL(urlMesa(numero), { width, margin: 2 });

const Mesas = () => {
  const [mesas, setMesas] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);

  const timeOut = 1200;
  const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [data] = await Promise.all([
        getMesas(),
        esperar(timeOut)
      ]);
      setMesas(data);
    } catch (e) {
      Swal.fire({ title: "Error al cargar", text: e.message, icon: "error", confirmButtonColor: COLOR });
      setMesas([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crear = async () => {
    const siguiente = (mesas || []).reduce((m, x) => Math.max(m, x.numero), 0) + 1;
    const res = await Swal.fire({
      title: "Agregar mesas",
      html:
        `<p style="margin:0 0 8px">Indica cuántas mesas quieres agregar. Se numerarán desde la ${siguiente}.</p>` +
        `<input id="mesas-cant" type="number" min="1" max="${MAX_MESAS_LOTE}" value="1" class="swal2-input">`,
      showCancelButton: true,
      confirmButtonText: "Agregar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: COLOR,
      preConfirm: () => {
        const n = Number(document.getElementById("mesas-cant").value);
        if (!Number.isInteger(n) || n < 1 || n > MAX_MESAS_LOTE) {
          return Swal.showValidationMessage(`Ingresa un número entre 1 y ${MAX_MESAS_LOTE}`);
        }
        return n;
      },
    });
    if (!res.isConfirmed) return;

    setCargando(true);
    try {
      await Promise.all([
        createMesas(Array.from({ length: res.value }, (_, i) => siguiente + i)),
        esperar(timeOut)
      ]);
      await cargar();
    } catch (e) {
      setCargando(false);
      Swal.fire({ title: "No se pudo crear", text: e.message, icon: "error", confirmButtonColor: COLOR });
    }
  };

  const toggleActiva = async (m) => {
    setProcesandoId(m.id);
    setCargando(true);
    try {
      await Promise.all([
        updateMesa(m.id, { activa: !m.activa }),
        esperar(timeOut)
      ]);
      setMesas((prev) => prev.map((x) => (x.id === m.id ? { ...x, activa: !m.activa } : x)));
    } catch (e) {
      Swal.fire({ title: "No se pudo actualizar", text: e.message, icon: "error", confirmButtonColor: COLOR });
    } finally {
      setProcesandoId(null);
      setCargando(false);
    }
  };

  const eliminar = async (m) => {
    const res = await Swal.fire({
      title: `¿Eliminar la mesa ${m.numero}?`,
      text: "Su código QR dejará de funcionar.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#E07A5F",
      cancelButtonColor: COLOR,
      reverseButtons: true,
    });
    if (!res.isConfirmed) return;
    setProcesandoId(m.id);
    setCargando(true);
    try {
      await Promise.all([
        deleteMesa(m.id),
        esperar(timeOut)
      ]);
      setMesas((prev) => prev.filter((x) => x.id !== m.id));
    } catch (e) {
      Swal.fire({ title: "No se pudo eliminar", text: e.message, icon: "error", confirmButtonColor: COLOR });
    } finally {
      setProcesandoId(null);
      setCargando(false);
    }
  };

  const verQr = async (m) => {
    const src = await qrDataUrl(m.numero);
    const res = await Swal.fire({
      title: `Mesa ${m.numero}`,
      html: `<img src="${src}" alt="QR mesa ${m.numero}" style="width:260px;max-width:100%"><p style="font-size:.75rem;word-break:break-all;color:#64748b">${urlMesa(m.numero)}</p>`,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Imprimir",
      denyButtonText: "Descargar",
      cancelButtonText: "Cerrar",
      confirmButtonColor: COLOR,
    });
    if (res.isConfirmed) imprimir([m]);
    if (res.isDenied) {
      const a = document.createElement("a");
      a.href = src;
      a.download = `mesa-${m.numero}.png`;
      a.click();
    }
  };

  // Hoja imprimible con un QR por mesa
  const imprimir = async (lista) => {
    const razon = localStorage.getItem("store_razon_social") || "";
    const tarjetas = await Promise.all(
      lista.map(
        async (m) =>
          `<div class="t"><div class="n">Mesa ${m.numero}</div><img src="${await qrDataUrl(m.numero, 500)}"><div class="s">Escanea para pedir desde tu mesa</div></div>`,
      ),
    );
    const w = window.open("", "_blank");
    if (!w) {
      Swal.fire({ icon: "info", title: "Permite las ventanas emergentes para imprimir", confirmButtonColor: COLOR });
      return;
    }
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>QR mesas</title><style>
        body{font-family:sans-serif;margin:16px;display:flex;flex-wrap:wrap;gap:16px}
        .t{width:260px;border:2px dashed #999;padding:12px;text-align:center;page-break-inside:avoid}
        .t img{width:100%}.n{font-size:28px;font-weight:700}.r{font-size:14px}.s{font-size:12px;color:#555}
      </style></head><body>${tarjetas.map((t) => t.replace('<div class="n">', `<div class="r">${razon.replace(/[<>&]/g, "")}</div><div class="n">`)).join("")}</body></html>`,
    );
    w.document.close();
    w.onload = () => w.print();
  };

  if (mesas === null) return <LoadingOverlay fullScreen text="Cargando mesas" minTime={timeOut} />;

  return (
    <div className="admin-page">
      {cargando && <LoadingOverlay text="Sincronizando mesas" minTime={timeOut} />}

      <header className="admin-page__header admin-page__header--row">
        <div>
          <h1 className="admin-page__titulo">Mesas & QR</h1>
          <p className="admin-page__subtitulo">
            El cliente escanea el QR de su mesa y pide desde el menú; el pedido llega marcado con el número de mesa.
          </p>
        </div>
        <div className="admin-page__acciones">
          <button type="button" className="admin-btn-ghost" onClick={cargar} disabled={cargando}>
            <RefreshCw size={15} className={cargando ? "adm-spin" : ""} /> Recargar
          </button>
          {mesas.length > 0 && (
            <button type="button" className="admin-btn-ghost" onClick={() => imprimir(mesas.filter((m) => m.activa))}>
              <Printer size={15} /> Imprimir todos
            </button>
          )}
          <button type="button" className="admin-btn-primary admin-btn-primary--compacto" onClick={crear}>
            <Plus size={16} /> Agregar
          </button>
        </div>
      </header>

      <div className="admin-card admin-card--tabla admin-main-content">
        {mesas.length === 0 ? (
          <p className="adm-prod__vacio">Aún no hay mesas. Agrega la primera.</p>
        ) : (
          <table className="adm-prod__tabla">
            <thead>
              <tr>
                <th>Mesa</th>
                <th>Activa</th>
                <th className="adm-prod__col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {mesas.map((m) => (
                <tr key={m.id} className={m.activa ? "" : "adm-prod__fila--agotada"}>
                  <td>
                    <strong>Mesa {m.numero}</strong>
                  </td>
                  <td>
                    <Switch
                      activo={m.activa}
                      disabled={procesandoId === m.id}
                      onChange={() => toggleActiva(m)}
                      etiqueta={m.activa ? "Desactivar mesa" : "Activar mesa"}
                    />
                  </td>
                  <td className="adm-prod__col-acciones">
                    <button type="button" className="adm-icono-btn" title="Ver QR" onClick={() => verQr(m)}>
                      <QrCode size={15} />
                    </button>
                    <button
                      type="button"
                      className="adm-icono-btn"
                      title="Descargar QR"
                      onClick={async () => {
                        const a = document.createElement("a");
                        a.href = await qrDataUrl(m.numero);
                        a.download = `mesa-${m.numero}.png`;
                        a.click();
                      }}
                    >
                      <Download size={15} />
                    </button>
                    <button
                      type="button"
                      className="adm-icono-btn adm-icono-btn--peligro"
                      title="Eliminar"
                      disabled={procesandoId === m.id}
                      onClick={() => eliminar(m)}
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

export default Mesas;
