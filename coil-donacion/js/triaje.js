// Motor del triaje: traduce el árbol de decisión de TSLB (nodos A–W) a lógica.
// Funciones puras, sin DOM, para poder probarlas en Node (ver tests/).
import { PREGUNTAS } from "./contenido.js";

/** Preguntas visibles dadas las respuestas actuales (aplica condiciones soloSi). */
export function preguntasVisibles(respuestas) {
  return PREGUNTAS.filter((p) => !p.soloSi || p.soloSi(respuestas));
}

export function opcionElegida(pregunta, valor) {
  return pregunta.opciones.find((o) => o.valor === valor);
}

/**
 * Siguiente pregunta pendiente o null si ya se puede evaluar.
 * En la Etapa 1 la evaluación se detiene en la primera respuesta que termina el flujo
 * (igual que el árbol: B, C, E, G, I y K son puertas secuenciales).
 */
export function siguientePregunta(respuestas) {
  for (const p of preguntasVisibles(respuestas)) {
    const valor = respuestas[p.id];
    if (valor === undefined) return p;
    const op = opcionElegida(p, valor);
    if (op && op.efecto === "stop") return null;
  }
  return null;
}

/**
 * Evalúa las respuestas y devuelve el resultado.
 * @returns {{codigo:string, completo:boolean, motivos:string[], revisiones:string[], requisitos:string[]}}
 */
export function evaluar(respuestas) {
  const requisitos = [];
  const motivos = [];
  const revisiones = [];

  for (const p of preguntasVisibles(respuestas)) {
    const valor = respuestas[p.id];
    if (valor === undefined) {
      return { codigo: null, completo: false, motivos, revisiones, requisitos };
    }
    const op = opcionElegida(p, valor);
    if (!op) throw new Error(`Respuesta inválida para ${p.id}: ${valor}`);
    switch (op.efecto) {
      case "stop":
        // Puerta de la Etapa 1: termina en el nodo indicado (X, D, F, H, J, L).
        return { codigo: op.resultado, completo: true, motivos, revisiones, requisitos };
      case "requisito":
        requisitos.push(op.requisito);
        break;
      case "exclusion":
        motivos.push(p.motivo);
        break;
      case "revision":
        revisiones.push(p.motivo);
        break;
      default:
        break;
    }
  }

  // Nodo M: ¿presenta algún criterio de exclusión? -> N
  if (motivos.length) return { codigo: "N", completo: true, motivos, revisiones, requisitos };
  // Nodo O: ¿antecedentes que requieren revisión? -> P. La autorización médica (60–70) también.
  if (revisiones.length || requisitos.includes("autorizacionMedica")) {
    return { codigo: "P", completo: true, motivos, revisiones, requisitos };
  }
  // -> Q: continuar a entrevista predonación
  return { codigo: "Q", completo: true, motivos, revisiones, requisitos };
}

/** Progreso 0..1 para la barra (estimado sobre preguntas visibles). */
export function progreso(respuestas) {
  const visibles = preguntasVisibles(respuestas);
  const respondidas = visibles.filter((p) => respuestas[p.id] !== undefined).length;
  return visibles.length ? respondidas / visibles.length : 0;
}

// ---------------- Intervalo entre donaciones ----------------

export const MESES_INTERVALO = { hombre: 3, mujer: 4 };

/**
 * Primera fecha en que se puede volver a donar.
 * El requisito es "más de 3/4 meses", por eso se suma un día al cumplir los meses.
 * @param {string} ultimaISO fecha YYYY-MM-DD
 * @param {"hombre"|"mujer"} sexo
 */
export function proximaFechaPermitida(ultimaISO, sexo) {
  const meses = MESES_INTERVALO[sexo];
  if (!meses || !ultimaISO) return null;
  const [y, m, d] = ultimaISO.split("-").map(Number);
  // Sumar meses sin desbordar (31 de enero + 3 meses = 30 de abril, no 1 de mayo)
  const objetivoMes = m - 1 + meses;
  const ultimoDia = new Date(y, objetivoMes + 1, 0).getDate();
  const fecha = new Date(y, objetivoMes, Math.min(d, ultimoDia));
  fecha.setDate(fecha.getDate() + 1);
  return aISO(fecha);
}

export function aISO(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
