// Estado de la aplicación y gamificación. Persistencia en localStorage (prototipo).
// Privacidad: las respuestas del cuestionario NO se guardan; solo el resultado y la fecha.

export const CLAVE = "gota.v1";
export const VERSION = 1;

export function estadoInicial() {
  return {
    version: VERSION,
    usuario: null, // {nombre, correo, telefono, sexo, ultimaDonacion, creado}
    evaluaciones: [], // {fecha, codigo}
    citas: [], // {codigo, centroId, fecha, hora, estado, creada, requisitos[]}
    donaciones: [], // {fecha, citaCodigo|null}
    progreso: { puntos: 0, insignias: [], leidos: [], mitos: {}, compartido: 0 },
    avisos: { notificaciones: false, enviados: [] },
  };
}

export function cargar(storage) {
  try {
    const raw = storage.getItem(CLAVE);
    if (!raw) return estadoInicial();
    const data = JSON.parse(raw);
    if (!data || data.version !== VERSION) return estadoInicial();
    // Mezcla con los valores por defecto por si faltan campos.
    const base = estadoInicial();
    return { ...base, ...data, progreso: { ...base.progreso, ...data.progreso }, avisos: { ...base.avisos, ...data.avisos } };
  } catch {
    return estadoInicial();
  }
}

export function guardar(storage, estado) {
  try {
    storage.setItem(CLAVE, JSON.stringify(estado));
    return true;
  } catch {
    return false; // modo incógnito o almacenamiento lleno: la app sigue funcionando en memoria
  }
}

// ---------------- Gamificación ----------------

export const PUNTOS = {
  evaluacion: 50,
  perfil: 20,
  cita: 100,
  recordatorio: 20,
  leer: 10,
  mitoAcierto: 10,
  compartir: 30,
  donacion: 300,
};

export const INSIGNIAS = [
  { id: "primerPaso", nombre: "Primer paso", detalle: "Hiciste tu autoevaluación", icono: "sparkles" },
  { id: "conHora", nombre: "Con hora", detalle: "Agendaste una donación", icono: "calendar-check" },
  { id: "alDia", nombre: "Sin olvidos", detalle: "Guardaste un recordatorio", icono: "bell" },
  { id: "informado", nombre: "Bien informado/a", detalle: "Leíste las 3 guías", icono: "book-open" },
  { id: "rompemitos", nombre: "Rompemitos", detalle: "Respondiste todos los mitos", icono: "award" },
  { id: "embajador", nombre: "Embajador/a", detalle: "Compartiste la campaña", icono: "heart-handshake" },
  { id: "donante", nombre: "Donante", detalle: "Registraste tu primera donación", icono: "droplet" },
  { id: "constante", nombre: "Constante", detalle: "Donaste 2 veces o más", icono: "flame" },
];

export const NIVELES = [
  { min: 0, nombre: "Curioso/a" },
  { min: 150, nombre: "Comprometido/a" },
  { min: 400, nombre: "Donante" },
  { min: 800, nombre: "Donante frecuente" },
];

export function nivel(puntos) {
  let actual = NIVELES[0];
  let siguiente = null;
  for (let i = 0; i < NIVELES.length; i++) {
    if (puntos >= NIVELES[i].min) {
      actual = NIVELES[i];
      siguiente = NIVELES[i + 1] || null;
    }
  }
  return { actual, siguiente };
}

/** Suma puntos y devuelve las insignias nuevas desbloqueadas. Muta el estado. */
export function sumar(estado, motivo, totalMitos = 0, totalGuias = 0) {
  estado.progreso.puntos += PUNTOS[motivo] || 0;
  return revisarInsignias(estado, totalMitos, totalGuias);
}

export function revisarInsignias(estado, totalMitos = 0, totalGuias = 0) {
  const p = estado.progreso;
  const tiene = new Set(p.insignias);
  const nuevas = [];
  const dar = (id, cond) => {
    if (cond && !tiene.has(id)) {
      p.insignias.push(id);
      nuevas.push(INSIGNIAS.find((i) => i.id === id));
    }
  };
  dar("primerPaso", estado.evaluaciones.length > 0);
  dar("conHora", estado.citas.length > 0);
  dar("alDia", estado.avisos.enviados.includes("guardado"));
  dar("informado", totalGuias > 0 && p.leidos.length >= totalGuias);
  dar("rompemitos", totalMitos > 0 && Object.keys(p.mitos).length >= totalMitos);
  dar("embajador", p.compartido > 0);
  dar("donante", estado.donaciones.length >= 1);
  dar("constante", estado.donaciones.length >= 2);
  return nuevas;
}

export function citaActiva(estado, ahora = new Date()) {
  return (
    estado.citas
      .filter((c) => c.estado === "agendada" && c.fecha >= hoyLocal(ahora))
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0] || null
  );
}

/** Citas agendadas cuya fecha ya pasó: se pregunta si la persona donó. */
export function citasPorConfirmar(estado, ahora = new Date()) {
  return estado.citas.filter((c) => c.estado === "agendada" && c.fecha < hoyLocal(ahora));
}

export function hoyLocal(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
