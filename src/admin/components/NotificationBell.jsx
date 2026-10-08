import React, { useState, useEffect, useMemo } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getOrders, subscribeToOrders } from "../../data/dataSource";
import "./NotificationBell.css";

// Fecha (AAAA-MM-DD) de entrega programada, tomada del pedido o de sus ítems
const fechaAgendada = (pedido) => {
  const re = /AGENDADO PARA:\s*(\d{4}-\d{2}-\d{2})/;
  const textos = [pedido.observaciones, ...(pedido.items || []).map((i) => i.observaciones)];
  for (const texto of textos) {
    const m = texto && String(texto).match(re);
    if (m) return m[1];
  }
  return null;
};

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const esAgendadoPendiente = (pedido, hoy) => {
  if (pedido.estado === "entregado" || pedido.estado === "cancelado") return false;
  const fecha = fechaAgendada(pedido);
  return !!fecha && fecha >= hoy;
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [hoy, setHoy] = useState(hoyISO);

  const cargarPedidos = async () => {
    try {
      const data = await getOrders();
      setPedidos(data || []);
    } catch (e) {
      console.error("Error cargando pedidos para notificaciones", e);
    }
  };

  useEffect(() => {
    cargarPedidos();
    const unsubscribe = subscribeToOrders((evento, pedido) => {
      if (evento === "insert") {
        setPedidos((prev) => (prev ? [pedido, ...prev] : [pedido]));
        if (esAgendadoPendiente(pedido, hoyISO())) setHasAnimated(false);
      }
      if (evento === "update") {
        setPedidos((prev) => prev?.map((p) => (p.id === pedido.id ? pedido : p)));
      }
    });
    // Refresca el día de referencia y los datos sin recargar la página
    const timer = setInterval(() => {
      setHoy(hoyISO());
      cargarPedidos();
    }, 60000);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const pendientesAgendados = useMemo(
    () => pedidos.filter((p) => esAgendadoPendiente(p, hoy)),
    [pedidos, hoy],
  );
  const hasPending = pendientesAgendados.length > 0;

  useEffect(() => {
    if (hasPending && !hasAnimated) {
      setHasAnimated(true);
      // Play a short beep using Web Audio API
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
          osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
          
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        }
      } catch (e) {
        console.warn("No se pudo reproducir sonido de alerta", e);
      }
    }
  }, [hasPending, hasAnimated]);

  return (
    <button
      type="button"
      className={`admin-topbar__bell ${hasPending ? "ringing" : ""}`}
      onClick={() => navigate("/admin/pedidos")}
      title={hasPending ? `${pendientesAgendados.length} pedidos agendados pendientes` : "Sin pedidos agendados pendientes"}
    >
      <div className="bell-icon-wrapper">
        <Bell size={20} />
        {hasPending && (
          <span className="bell-badge">{pendientesAgendados.length}</span>
        )}
      </div>
    </button>
  );
};

export default NotificationBell;
