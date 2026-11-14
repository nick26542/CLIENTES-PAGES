// Agendamiento: centros, cupos, recordatorios y archivo de calendario.
// Funciones puras (sin DOM) para poder probarlas en Node.
import { aISO } from "./triaje.js";

// DATOS DE DEMOSTRACIÓN: no son centros reales. Reemplazar por los centros validados por TSLB.
export const CENTROS = [
  {
    id: "campus",
    nombre: "Punto móvil Campus",
    direccion: "Explanada central del campus (demo)",
    detalle: "Bus de donación, lunes a viernes",
    dias: [1, 2, 3, 4, 5],
    bloques: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "14:00", "14:30", "15:00"],
    cupoPorBloque: 3,
  },
  {
    id: "centro",
    nombre: "Centro de Sangre Demo",
    direccion: "Av. Ejemplo 1234, Santiago (demo)",
    detalle: "Lunes a sábado",
    dias: [1, 2, 3, 4, 5, 6],
    bloques: ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30"],
    cupoPorBloque: 4,
  },
  {
    id: "hospital",
    nombre: "Banco de Sangre Hospital Demo",
    direccion: "Calle Modelo 567, Santiago (demo)",
    detalle: "Lunes a viernes",
    dias: [1, 2, 3, 4, 5],
    bloques: ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00"],
    cupoPorBloque: 2,
  },
];

export const DIAS_VISIBLES = 21;
export const DURACION_MIN = 60; // reserva una hora en el calendario (entrevista + donación + descanso)

export function centroPorId(id) {
  return CENTROS.find((c) => c.id === id);
}

/** Ocupación simulada y estable por fecha+bloque, para que la demo parezca real. */
function ocupacionSimulada(centroId, fechaISO, bloque, cupo) {
  let h = 2166136261;
  for (const ch of `${centroId}|${fechaISO}|${bloque}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % (cupo + 1); // 0..cupo
}

/**
 * Días disponibles para un centro.
 * @param {Date} hoy
 * @param {string|null} desdeISO fecha mínima (p. ej. fin del intervalo entre donaciones)
 */
export function diasDisponibles(centro, hoy, desdeISO = null) {
  const out = [];
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1); // desde mañana
  if (desdeISO) {
    const [y, m, d] = desdeISO.split("-").map(Number);
    const desde = new Date(y, m - 1, d);
    if (desde > inicio) inicio.setTime(desde.getTime());
  }
  for (let i = 0; i < DIAS_VISIBLES; i++) {
    const f = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    if (centro.dias.includes(f.getDay())) out.push(aISO(f));
  }
  return out;
}

/** Bloques de un día con cupos libres, considerando las citas ya tomadas. */
export function bloquesDelDia(centro, fechaISO, citas = []) {
  return centro.bloques.map((hora) => {
    const propias = citas.filter(
      (c) => c.estado === "agendada" && c.centroId === centro.id && c.fecha === fechaISO && c.hora === hora,
    ).length;
    const ocupados = Math.min(centro.cupoPorBloque, ocupacionSimulada(centro.id, fechaISO, hora, centro.cupoPorBloque) + propias);
    return { hora, libres: centro.cupoPorBloque - ocupados };
  });
}

export function inicioCita(cita) {
  const [y, m, d] = cita.fecha.split("-").map(Number);
  const [hh, mm] = cita.hora.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

/**
 * Plan de recordatorios de una cita.
 * Mensajes alineados con los requisitos del cuestionario (dormir 5 h, comer, documento).
 */
export function planRecordatorios(cita, extras = []) {
  const inicio = inicioCita(cita);
  const centro = centroPorId(cita.centroId);
  const lleva = ["tu documento con RUN y fotografía", ...extras].join(" y ");
  const a = (dias, hora, minuto = 0) => {
    const f = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + dias, hora, minuto);
    return f;
  };
  const lista = [
    {
      id: "d2",
      cuando: a(-2, 19),
      titulo: "Tu donación es en 2 días",
      texto: "Toma agua estos días y deja listo " + lleva + ".",
    },
    {
      id: "d1",
      cuando: a(-1, 20),
      titulo: "Mañana donas sangre",
      texto: `Duerme al menos 5 horas esta noche. Tu hora: ${cita.hora} en ${centro?.nombre ?? "el centro"}.`,
    },
    {
      id: "d0",
      cuando: new Date(inicio.getTime() - 2 * 60 * 60 * 1000),
      titulo: "Hoy donas: come algo liviano",
      texto: `Debes haber comido en las últimas 5 horas. Lleva ${lleva}.`,
    },
    {
      id: "post",
      cuando: a(1, 10),
      titulo: "¿Cómo te sientes?",
      texto: "Sigue tomando líquidos y evita el esfuerzo intenso hoy. Si ya donaste, regístralo en tu perfil.",
    },
  ];
  return lista.map((r) => ({ ...r, cuando: r.cuando.toISOString() }));
}

// ---------------- Calendario (.ics), Google Calendar, WhatsApp y correo ----------------

function fechaICS(d) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escaparICS(t) {
  return String(t).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function textoCita(cita) {
  const c = centroPorId(cita.centroId);
  return {
    titulo: "Donación de sangre",
    lugar: c ? `${c.nombre}, ${c.direccion}` : "",
    descripcion:
      "Lleva tu documento con RUN y fotografía. Duerme al menos 5 horas la noche anterior y come algo liviano en las 5 horas previas. " +
      "Código de reserva: " + cita.codigo,
  };
}

export function archivoICS(cita, ahora = new Date()) {
  const ini = inicioCita(cita);
  const fin = new Date(ini.getTime() + DURACION_MIN * 60000);
  const t = textoCita(cita);
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//COIL Gota//Donacion de sangre//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${cita.codigo}@gota-coil`,
    `DTSTAMP:${fechaICS(ahora)}`,
    `DTSTART:${fechaICS(ini)}`,
    `DTEND:${fechaICS(fin)}`,
    `SUMMARY:${escaparICS(t.titulo)}`,
    `LOCATION:${escaparICS(t.lugar)}`,
    `DESCRIPTION:${escaparICS(t.descripcion)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Mañana donas sangre: duerme al menos 5 horas",
    "TRIGGER:-P1D",
    "END:VALARM",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Hoy donas: come algo liviano y lleva tu documento",
    "TRIGGER:-PT2H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lineas.join("\r\n") + "\r\n";
}

export function enlaceGoogleCalendar(cita) {
  const ini = inicioCita(cita);
  const fin = new Date(ini.getTime() + DURACION_MIN * 60000);
  const t = textoCita(cita);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: t.titulo,
    dates: `${fechaICS(ini)}/${fechaICS(fin)}`,
    details: t.descripcion,
    location: t.lugar,
  });
  return "https://calendar.google.com/calendar/render?" + p.toString();
}

export function fechaLarga(fechaISO) {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

export function enlaceWhatsApp(cita, telefono = "") {
  const c = centroPorId(cita.centroId);
  const msg =
    `Recordatorio: dono sangre el ${fechaLarga(cita.fecha)} a las ${cita.hora} en ${c?.nombre}. ` +
    `Llevar documento con RUN, dormir 5 h y comer antes. Código ${cita.codigo}.`;
  const num = String(telefono).replace(/\D/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

export function enlaceCorreo(cita, correo = "") {
  const t = textoCita(cita);
  const asunto = `${t.titulo}: ${fechaLarga(cita.fecha)}, ${cita.hora}`;
  const cuerpo = `${t.titulo}\n${fechaLarga(cita.fecha)} a las ${cita.hora}\n${t.lugar}\n\n${t.descripcion}`;
  return `mailto:${encodeURIComponent(correo)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}

export function codigoReserva(rand = Math.random) {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[Math.floor(rand() * abc.length)];
  return s;
}
