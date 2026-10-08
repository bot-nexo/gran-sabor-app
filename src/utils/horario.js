// ── Horario del negocio: parseo y estado abierto/cerrado ──────────────────
// Soporta formatos tipo "12:00 M - 08:00 PM" (M = mediodía = 12 PM),
// "7:00 AM - 10:00 PM", "13:00 - 21:00" y "24 horas" (siempre abierto).

const parseHora = (txt) => {
  const m = String(txt).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|M)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const suf = (m[3] || "").toUpperCase();
  if (h > 23 || min > 59) return null;
  if (suf === "PM" || suf === "M") {
    if (h < 12) h += 12;
  }
  if (suf === "AM" && h === 12) h = 0;
  return h * 60 + min;
};

export const parseHorario = (horarioStr) => {
  const texto = (horarioStr || "").trim();
  if (!texto) return { ok: false };
  if (/24\s*(h|horas)?/i.test(texto)) return { ok: true, siempreAbierto: true };

  const partes = texto.split(/\s*[–-]\s*/);
  if (partes.length !== 2) return { ok: false };
  const apertura = parseHora(partes[0]);
  const cierre = parseHora(partes[1]);
  if (apertura == null || cierre == null) return { ok: false };
  return { ok: true, apertura, cierre, cruzaMedianoche: cierre <= apertura };
};


// Convierte minutos totales (ej: 840) a formato hh:mm AM/PM o 24h
const formatMinutosAHora = (minutosTotales, format24 = true) => {
  if (minutosTotales == null) return "";

  const horas = Math.floor(minutosTotales / 60);
  const minutos = minutosTotales % 60;
  const minsPadded = minutos.toString().padStart(2, "0");

  if (format24) {
    return `${horas.toString().padStart(2, "0")}:${minsPadded}`;
  }

  const period = horas >= 12 ? "PM" : "AM";
  const horas12 = horas % 12 || 12;
  return `${horas12}:${minsPadded} ${period}`;
};

const DAY_MAP = {
  "domingo": 0, "dom": 0, "0": 0, 0: 0,
  "lunes": 1, "lun": 1, "1": 1, 1: 1,
  "martes": 2, "mar": 2, "2": 2, 2: 2,
  "miércoles": 3, "miercoles": 3, "mié": 3, "mie": 3, "3": 3, 3: 3,
  "jueves": 4, "jue": 4, "4": 4, 4: 4,
  "viernes": 5, "vie": 5, "5": 5, 5: 5,
  "sábado": 6, "sabado": 6, "sáb": 6, "sab": 6, "6": 6, 6: 6
};

const normalizeDaysArray = (days) => {
  if (!days) return [1, 2, 3, 4, 5, 6, 0];
  let parsed = days;
  if (typeof days === "string") {
    try {
      if (days.trim().startsWith("[")) {
        parsed = JSON.parse(days);
      } else {
        parsed = [1, 2, 3, 4, 5, 6, 0];
      }
    } catch {
      parsed = [1, 2, 3, 4, 5, 6, 0];
    }
  }
  if (!Array.isArray(parsed)) return [1, 2, 3, 4, 5, 6, 0];
  const numArr = parsed
    .map((d) => DAY_MAP[String(d).toLowerCase().trim()])
    .filter((v) => v !== undefined);
  return Array.from(new Set(numArr));
};

/**
 * Parsea el día/array de días en un texto legible
 */
export const formatearDias = (days) => {
  if (!days) return "";
  const arr = normalizeDaysArray(days);
  if (arr.length === 7) return "Todos los días";

  const includesDom = arr.includes(0);
  const includesSab = arr.includes(6);

  if (arr.length === 5 && !includesDom && !includesSab) return "Lun - Vie";
  if (arr.length === 6 && !includesDom) return "Lun - Sáb";

  const map = { 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb", 0: "Dom" };
  const displayOrder = [1, 2, 3, 4, 5, 6, 0];
  const ordered = displayOrder.filter((d) => arr.includes(d));

  return ordered.map((d) => map[d] || d).join(", ");
};

/**
 * Estado del negocio para la tienda y el checkout.
 * @returns {{abierto:boolean, fuerzaCierre:boolean, dentroHorario:boolean, horarioTexto:string, siempreAbierto:boolean}}
 */
export const estaAbiertoSegunHorario = (settings = {}) => {
  const fuerzaCierre = settings.forceClosed === true;
  const daysText = formatearDias(settings.day1);
  const horarioTexto = [daysText, settings.hours1].filter(Boolean).join(" · ");
  const p = parseHorario(settings.hours1);

  const ahora = new Date();
  const todayDay = ahora.getDay(); // 0 is Sunday, 1 is Monday, etc.

  const activeDays = normalizeDaysArray(settings.day1);
  const esDiaAbierto = activeDays.includes(todayDay);

  if (!p.ok) {
    // Sin horario legible → se asume abierto en ese día, salvo cierre manual
    const abierto = esDiaAbierto && !fuerzaCierre;
    return { abierto, fuerzaCierre, dentroHorario: esDiaAbierto, horarioTexto, siempreAbierto: false, openHour: "", closeHour: "", esDiaAbierto };
  }
  if (p.siempreAbierto) {
    const abierto = esDiaAbierto && !fuerzaCierre;
    return {
      abierto,
      fuerzaCierre,
      dentroHorario: esDiaAbierto,
      horarioTexto: horarioTexto || "24 horas",
      siempreAbierto: true,
      openHour: "8:00 AM",
      closeHour: "10:00 PM",
      esDiaAbierto
    };
  }

  const mins = ahora.getHours() * 60 + ahora.getMinutes();
  const dentro = p.cruzaMedianoche
    ? (mins >= p.apertura || mins < p.cierre)
    : (mins >= p.apertura && mins < p.cierre);
    
  const abiertoReal = esDiaAbierto && dentro && !fuerzaCierre;

  const openHourStr = formatMinutosAHora(p.apertura, true);
  const closeHourStr = formatMinutosAHora(p.cierre, true);
  
  return {
    abierto: abiertoReal,
    fuerzaCierre,
    dentroHorario: esDiaAbierto && dentro,
    horarioTexto,
    openHour: openHourStr,
    closeHour: closeHourStr,
    siempreAbierto: false,
    esDiaAbierto
  };
};
