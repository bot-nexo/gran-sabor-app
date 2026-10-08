import { useState } from "react";
import { X, Lock, KeyRound, Loader2, Mail, ShieldAlert, CheckCircle2 } from "lucide-react";
import Swal from "sweetalert2";
import { supabase } from "../services/supabaseClient";

const PasswordModal = ({ isOpen, onClose, email, canChange }) => {
  const [passwords, setPasswords] = useState({ oldPass: "", newPass: "", confirmPass: "" });
  const [actualizando, setActualizando] = useState(false);
  const [enviandoRecovery, setEnviandoRecovery] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwords.newPass.length < 6) {
      return Swal.fire({
        icon: "warning",
        text: "La nueva contraseña debe tener al menos 6 caracteres",
        confirmButtonColor: "#d69e4a",
      });
    }
    if (passwords.newPass !== passwords.confirmPass) {
      return Swal.fire({
        icon: "warning",
        text: "Las contraseñas nuevas no coinciden",
        confirmButtonColor: "#d69e4a",
      });
    }

    setActualizando(true);
    try {
      // 1. Re-autenticar con la contraseña antigua
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: passwords.oldPass,
      });

      if (signInError) {
        throw new Error("La contraseña actual es incorrecta.");
      }

      // 2. Si pasa, actualizar
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwords.newPass,
      });

      if (updateError) throw updateError;

      Swal.fire({
        icon: "success",
        title: "Contraseña actualizada",
        text: "Tu contraseña ha sido cambiada de forma segura.",
        confirmButtonColor: "#d69e4a",
      });
      onClose();
      setPasswords({ oldPass: "", newPass: "", confirmPass: "" });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message,
        confirmButtonColor: "#d69e4a",
      });
    } finally {
      setActualizando(false);
    }
  };

  const handleRecuperacion = async () => {
    setEnviandoRecovery(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/admin",
      });
      if (error) throw error;
      Swal.fire({
        icon: "success",
        title: "Correo enviado",
        text: "Revisa tu bandeja de entrada o spam con el link de recuperación.",
        confirmButtonColor: "#d69e4a",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error al enviar correo",
        text: err.message,
        confirmButtonColor: "#d69e4a",
      });
    } finally {
      setEnviandoRecovery(false);
    }
  };

  return (
    <div className="adm-modal__overlay" onClick={onClose}>
      <form
        className="adm-modal adm-modal--compacto"
        style={{ maxWidth: "440px" }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="adm-modal__header">
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <KeyRound size={20} /> Cambiar Contraseña
          </h2>
          <button
            type="button"
            className="adm-icono-btn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </header>

        <div className="adm-modal__cuerpo adm-modal__cuerpo--solo-campos">
          {/* Badge del correo actual */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              backgroundColor: "var(--abg-elev)",
              border: "1px solid var(--aborde)",
              borderRadius: "10px",
              fontSize: "13.5px",
              color: "var(--crema)",
            }}
          >
            <Mail size={16} style={{ color: "var(--acento)", flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {email}
            </span>
          </div>

          {/* Bloqueo si el superadmin lo deshabilitó */}
          {!canChange && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                backgroundColor: "rgba(211, 47, 47, 0.1)",
                border: "1px solid rgba(211, 47, 47, 0.3)",
                padding: "14px",
                borderRadius: "10px",
                color: "#ff8a80",
                fontSize: "13px",
                lineHeight: "1.4",
              }}
            >
              <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong style={{ display: "block", color: "#ff5252", marginBottom: "3px" }}>
                  Cambio deshabilitado
                </strong>
                El superadministrador ha bloqueado temporalmente el cambio de contraseña para este inquilino.
              </div>
            </div>
          )}

          {/* Campos del formulario */}
          <div className="adm-modal__campos" style={{ width: "100%" }}>
            <label className="admin-field">
              <span className="admin-field__label">Contraseña Actual *</span>
              <div className="admin-field__input">
                <Lock size={16} className="admin-field__icon" />
                <input
                  type="password"
                  value={passwords.oldPass}
                  onChange={(e) =>
                    setPasswords({ ...passwords, oldPass: e.target.value })
                  }
                  required
                  placeholder="Tu contraseña actual"
                  disabled={!canChange}
                />
              </div>
            </label>

            <label className="admin-field">
              <span className="admin-field__label">Nueva Contraseña *</span>
              <div className="admin-field__input">
                <KeyRound size={16} className="admin-field__icon" />
                <input
                  type="password"
                  value={passwords.newPass}
                  onChange={(e) =>
                    setPasswords({ ...passwords, newPass: e.target.value })
                  }
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  disabled={!canChange}
                />
              </div>
            </label>

            <label className="admin-field">
              <span className="admin-field__label">Confirmar Nueva Contraseña *</span>
              <div className="admin-field__input">
                <CheckCircle2 size={16} className="admin-field__icon" />
                <input
                  type="password"
                  value={passwords.confirmPass}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirmPass: e.target.value })
                  }
                  required
                  minLength={6}
                  placeholder="Repite la nueva contraseña"
                  disabled={!canChange}
                />
              </div>
            </label>
          </div>

          {/* Link para recuperar por correo */}
          <div
            style={{
              paddingTop: "6px",
              textAlign: "center",
              fontSize: "12.5px",
              color: "var(--texto-dim)",
            }}
          >
            ¿Olvidaste tu contraseña actual?{" "}
            <button
              type="button"
              onClick={handleRecuperacion}
              disabled={enviandoRecovery || !canChange}
              style={{
                background: "none",
                border: "none",
                color: canChange ? "var(--acento)" : "var(--texto-dim)",
                cursor: canChange ? "pointer" : "not-allowed",
                fontWeight: 600,
                textDecoration: "underline",
                padding: "2px 4px",
              }}
            >
              {enviandoRecovery ? "Enviando enlace..." : "Recuperar por correo"}
            </button>
          </div>
        </div>

        <footer className="adm-modal__pie">
          <button
            type="button"
            className="admin-btn-ghost"
            onClick={onClose}
            disabled={actualizando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="admin-btn-primary"
            disabled={actualizando || !canChange}
          >
            {actualizando ? (
              <Loader2 size={16} className="adm-spin" />
            ) : (
              <KeyRound size={16} />
            )}
            {actualizando ? "Actualizando…" : "Actualizar Contraseña"}
          </button>
        </footer>
      </form>
    </div>
  );
};

export default PasswordModal;
