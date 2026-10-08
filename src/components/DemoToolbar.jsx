import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, ShieldCheck, RotateCcw, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import Swal from "sweetalert2";
import { resetDemoData } from "../data/dataSource";

export default function DemoToolbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [minimized, setMinimized] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = location.pathname.startsWith("/admin");

  const handleReset = async () => {
    const result = await Swal.fire({
      title: "¿Restaurar datos demo?",
      text: "Esto reiniciará los productos, pedidos y configuraciones a los valores iniciales de prueba de SQLite.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ffcc00",
      cancelButtonColor: "#332219",
      confirmButtonText: "Sí, reiniciar demo",
      cancelButtonText: "Cancelar",
      background: "#160e0a",
      color: "#ffffff",
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        await resetDemoData();
        Swal.fire({
          title: "¡Demo Restaurada!",
          text: "Los datos de prueba están listos.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
          background: "#160e0a",
          color: "#ffffff",
        });
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } catch (err) {
        Swal.fire({
          title: "Error",
          text: "No se pudieron restaurar los datos: " + err.message,
          icon: "error",
          background: "#160e0a",
          color: "#ffffff",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <aside
      aria-label="Barra de control de demostración"
      style={{
        position: "fixed",
        top: minimized ? "-20px" : "60px",
        right: "16px",
        zIndex: 99999,
        background: "rgba(22, 14, 10, 0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 204, 0, 0.35)",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.6), 0 0 15px rgba(255,204,0,0.15)",
        padding: "8px 14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        fontFamily: "'Montserrat', sans-serif",
        color: "#fff",
      }}
    >
      {/* Indicador de Modo Demo */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)",
            color: "#120a06",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          <Sparkles size={14} />
        </span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", color: "#ffcc00", textTransform: "uppercase" }}>
            Modo Demo
          </span>
          <span style={{ fontSize: "10px", color: "#bda899" }}>
            {isAdmin ? "Panel Administrador" : "Tienda Cliente"}
          </span>
        </div>
      </div>

      <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.15)" }} />

      {/* Switch de Vistas */}
      <div style={{ display: "flex", gap: "6px" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 12px",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: "600",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s ease",
            background: !isAdmin ? "#ffcc00" : "rgba(255, 255, 255, 0.08)",
            color: !isAdmin ? "#120a06" : "#fdfbf7",
            boxShadow: !isAdmin ? "0 2px 8px rgba(255,204,0,0.3)" : "none",
          }}
          title="Ver catálogo como cliente"
        >
          <ShoppingBag size={14} />
          <span>Cliente</span>
        </button>

        <button
          onClick={() => navigate("/admin")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 12px",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: "600",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s ease",
            background: isAdmin ? "#ffcc00" : "rgba(255, 255, 255, 0.08)",
            color: isAdmin ? "#120a06" : "#fdfbf7",
            boxShadow: isAdmin ? "0 2px 8px rgba(255,204,0,0.3)" : "none",
          }}
          title="Ver panel de administración"
        >
          <ShieldCheck size={14} />
          <span>Admin</span>
        </button>
      </div>

      <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.15)" }} />

      {/* Botón Restaurar Demo */}
      <button
        onClick={handleReset}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "6px 10px",
          borderRadius: "10px",
          fontSize: "11px",
          fontWeight: "500",
          background: "rgba(239, 68, 68, 0.15)",
          color: "#f87171",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          cursor: loading ? "wait" : "pointer",
          transition: "all 0.2s ease",
        }}
        title="Reiniciar base de datos a los valores iniciales"
      >
        <RotateCcw size={13} className={loading ? "animate-spin" : ""} />
        <span>Reset</span>
      </button>

      {/* Toggle minimizar */}
      <button
        onClick={() => setMinimized(!minimized)}
        style={{
          background: "none",
          border: "none",
          color: "#bda899",
          cursor: "pointer",
          padding: "2px",
          display: "flex",
          alignItems: "center",
        }}
        title={minimized ? "Expandir barra demo" : "Minimizar barra demo"}
      >
        {minimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
    </aside>
  );
}
