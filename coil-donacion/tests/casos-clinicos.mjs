// Casos de prueba clínicos (aptos / diferidos / no aptos) para el motor de triaje.
// Cada caso describe a una persona ficticia, sus respuestas y el resultado esperado
// según el árbol de decisión de TSLB. Se usan en las pruebas automáticas y en el
// informe de pruebas de la Semana 4 (TSLB debe validar el "esperado").

const BASE = {
  documento: "si", edad: "18a59", peso: "si", sueno: "si", comida: "si", intervalo: "nunca",
  enfermo: "no", fiebre: "no", antibioticos: "no", medicamentos: "no", cronica: "no", operacion: "no",
  dental: "no", endoscopia: "no", embarazo: "no",
  tatuajes: "no", drogas: "no", viaje: "no", malaria: "no", agujas: "no",
  parejaNueva: "no", variasParejas: "no", comercioSexual: "no",
};

const con = (cambios) => ({ ...BASE, ...cambios });

export const CASOS = [
  { id: "CC-01", persona: "Estudiante de 20 años, primera vez, sin antecedentes", respuestas: con({}), esperado: "Q", categoria: "Apto para entrevista" },
  { id: "CC-02", persona: "Persona de 19 años sin documento de identidad", respuestas: con({ documento: "no" }), esperado: "X", categoria: "No continúa" },
  { id: "CC-03", persona: "Adolescente de 16 años", respuestas: con({ edad: "menor17" }), esperado: "D", categoria: "Fuera de rango" },
  { id: "CC-04", persona: "Persona de 72 años", respuestas: con({ edad: "mayor70" }), esperado: "D", categoria: "Fuera de rango" },
  { id: "CC-05", persona: "17 años con autorización escrita del tutor", respuestas: con({ edad: "17", autorizacion: "si" }), esperado: "Q", categoria: "Apto con requisito", requisitos: ["autorizacionTutor"] },
  { id: "CC-06", persona: "17 años sin autorización escrita", respuestas: con({ edad: "17", autorizacion: "no" }), esperado: "F", categoria: "Completar autorización" },
  { id: "CC-07", persona: "Persona de 65 años sana", respuestas: con({ edad: "60a70" }), esperado: "P", categoria: "Evaluación médica", requisitos: ["autorizacionMedica"] },
  { id: "CC-08", persona: "Estudiante de 48 kg", respuestas: con({ peso: "no" }), esperado: "H", categoria: "Diferimiento" },
  { id: "CC-09", persona: "Durmió 3 horas por estudiar", respuestas: con({ sueno: "no" }), esperado: "J", categoria: "Posponer" },
  { id: "CC-10", persona: "No ha comido en 7 horas", respuestas: con({ comida: "no" }), esperado: "J", categoria: "Posponer" },
  { id: "CC-11", persona: "Donó hace 2 meses", respuestas: con({ intervalo: "no" }), esperado: "L", categoria: "Diferimiento temporal" },
  { id: "CC-12", persona: "Donante habitual que respeta el intervalo", respuestas: con({ intervalo: "si" }), esperado: "Q", categoria: "Apto para entrevista" },
  { id: "CC-13", persona: "Con resfrío y malestar hoy", respuestas: con({ enfermo: "si" }), esperado: "N", categoria: "Diferimiento según criterio" },
  { id: "CC-14", persona: "Fiebre hace 10 días", respuestas: con({ fiebre: "si" }), esperado: "N", categoria: "Diferimiento según criterio" },
  { id: "CC-15", persona: "Terminó antibióticos hace 3 días", respuestas: con({ antibioticos: "si" }), esperado: "N", categoria: "Diferimiento según criterio" },
  { id: "CC-16", persona: "Toma anticonceptivos orales", respuestas: con({ medicamentos: "si" }), esperado: "P", categoria: "Evaluación por profesional" },
  { id: "CC-17", persona: "Hipotiroidismo controlado", respuestas: con({ cronica: "si", medicamentos: "si" }), esperado: "P", categoria: "Evaluación por profesional" },
  { id: "CC-18", persona: "Tatuaje hace 2 meses", respuestas: con({ tatuajes: "si" }), esperado: "N", categoria: "Diferimiento según criterio" },
  { id: "CC-19", persona: "Limpieza dental hace 4 días", respuestas: con({ dental: "si" }), esperado: "N", categoria: "Diferimiento según criterio" },
  { id: "CC-20", persona: "Viajó a Perú el mes pasado", respuestas: con({ viaje: "si" }), esperado: "P", categoria: "Evaluación por profesional" },
  { id: "CC-21", persona: "Pareja sexual nueva hace 3 meses", respuestas: con({ parejaNueva: "si" }), esperado: "N", categoria: "Diferimiento según criterio" },
  { id: "CC-22", persona: "Viaje + tatuaje reciente (exclusión prima sobre revisión)", respuestas: con({ viaje: "si", tatuajes: "si" }), esperado: "N", categoria: "Diferimiento según criterio" },
  { id: "CC-23", persona: "Parto hace 3 meses", respuestas: con({ embarazo: "si" }), esperado: "N", categoria: "Diferimiento según criterio" },
  { id: "CC-24", persona: "Sin documento y además con 16 años (se detiene en la primera puerta)", respuestas: con({ documento: "no", edad: "menor17" }), esperado: "X", categoria: "No continúa" },
  { id: "CC-25", persona: "Pinchazo accidental con aguja en práctica clínica", respuestas: con({ agujas: "si" }), esperado: "N", categoria: "Diferimiento según criterio" },
];
