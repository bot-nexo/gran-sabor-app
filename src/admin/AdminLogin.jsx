import { useState } from "react";
import { Lock, Mail, Eye, EyeOff, CakeSlice, AlertCircle } from "lucide-react";
import { supabase } from "../services/supabaseClient";
import LoadingOverlay from "../components/common/LoadingOverlay";
import { useNavigate } from "react-router-dom";
import useCatalog from "../hooks/useCatalog";
import { loginEmailFromIdentifier, solicitarCambioPassword } from "../data/dataSource";
import { setAdminSession } from "./sessionStore";

// Mensajes de error de Supabase → texto claro para el dueño del negocio
const ERRORES = {
  "Invalid login credentials": "Usuario/correo o contraseña incorrectos.",
  "Email not confirmed": "El correo aún no está confirmado. Revisa tu bandeja.",
  "Too many requests": "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
};

const AdminLogin = () => {
  const navigate = useNavigate();
  const { settings } = useCatalog();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPass, setVerPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const timeOut = 1500;
  const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleOlvide = async () => {
    const identificador = email.trim();
    if (!identificador || identificador.includes("@")) {
      setError("Escribe tu usuario de colaborador para pedir el cambio de contraseña.");
      return;
    }
    try {
      await solicitarCambioPassword(identificador);
      Swal.fire({
        icon: "success",
        title: "Solicitud enviada",
        text: "El administrador recibirá tu solicitud y te asignará una nueva contraseña.",
      });
    } catch {
      setError("No se pudo enviar la solicitud. Intenta de nuevo.");
    }
  };
  //*********************** */
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setCargando(true);
    await setAdminSession({ user: { id: "demo-admin-id", email: "admin@demo.com" } });
    setTimeout(() => {
      navigate("/admin");
    }, 400);
  };

  //****************************** */
  return (
    <div className="admin-login" style={{ position: "relative" }}>
      {cargando && (
        <LoadingOverlay fullScreen text="Ingresando" minTime={timeOut} />
      )}

      <form className="admin-login__card" onSubmit={handleSubmit}>
        <div className="admin-login__logo">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "12px" }} />
          ) : (
            <CakeSlice size={34} strokeWidth={1.6} />
          )}
        </div>
        <h1 className="admin-login__titulo">Panel de Administración</h1>
        <p className="admin-login__subtitulo">Acceso exclusivo del negocio</p>

        {error && (
          <div className="admin-login__error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <label className="admin-field">
          <span className="admin-field__label">Correo o usuario</span>
          <div className="admin-field__input">
            <Mail size={16} className="admin-field__icon" />
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com o usuario"
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
            />
          </div>
        </label>

        <label className="admin-field">
          <span className="admin-field__label">Contraseña</span>
          <div className="admin-field__input">
            <Lock size={16} className="admin-field__icon" />
            <input
              type={verPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="admin-field__toggle"
              onClick={() => setVerPass((v) => !v)}
              aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <button type="submit" className="admin-btn-primary" disabled={cargando}>
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>

        <button
          type="button"
          onClick={handleOlvide}
          style={{ background: "none", border: 0, color: "inherit", opacity: 0.75, cursor: "pointer", fontSize: "0.8rem", textDecoration: "underline" }}
        >
          Soy colaborador y olvidé mi contraseña
        </button>

        <p className="admin-login__nota">
          Solo el equipo del negocio puede entrar a este panel.
        </p>
      </form>
    </div>
  );
};

export default AdminLogin;