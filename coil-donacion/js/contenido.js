// Contenido del cuestionario y contenidos educativos.
// Fuente de las preguntas: "Autoevaluación previa a la donación de sangre" (equipo TSLB).
// La clasificación de cada pregunta en el árbol (exclusión M / revisión O) es una
// propuesta de Ingeniería de Sistemas y debe ser validada por TSLB.

/**
 * Tipos de efecto de una respuesta:
 *  ok         -> continúa
 *  stop       -> termina la autoevaluación en el nodo indicado (resultado)
 *  exclusion  -> marca un criterio de exclusión (nodo M del árbol)
 *  revision   -> marca un antecedente que requiere revisión profesional (nodo O)
 *  requisito  -> continúa, pero agrega algo que la persona debe llevar o cumplir
 */

export const ETAPAS = {
  1: "Requisitos generales",
  2: "Antecedentes de salud",
  3: "Procedimientos y antecedentes personales",
  4: "Antecedentes sexuales",
  5: "Confirmación",
};

const SI_NO = (si, no) => [
  { valor: "si", label: "Sí", ...si },
  { valor: "no", label: "No", ...no },
];

export const PREGUNTAS = [
  // ---------- Etapa 1. Requisitos generales (nodos B, C, E, G, I, K) ----------
  {
    id: "documento", etapa: 1, nodo: "B",
    texto: "¿Tienes un documento de identificación vigente o un documento con RUN y fotografía?",
    ayuda: "Te lo pedirán al llegar al centro de donación.",
    opciones: SI_NO({ efecto: "ok" }, { efecto: "stop", resultado: "X" }),
  },
  {
    id: "edad", etapa: 1, nodo: "C",
    texto: "¿Qué edad tienes?",
    ayuda: "Se puede donar entre los 17 y los 70 años.",
    opciones: [
      { valor: "menor17", label: "Menos de 17", efecto: "stop", resultado: "D" },
      { valor: "17", label: "17 años", efecto: "ok" },
      { valor: "18a59", label: "Entre 18 y 59", efecto: "ok" },
      { valor: "60a70", label: "Entre 60 y 70", efecto: "requisito", requisito: "autorizacionMedica" },
      { valor: "mayor70", label: "Más de 70", efecto: "stop", resultado: "D" },
    ],
  },
  {
    id: "autorizacion", etapa: 1, nodo: "E",
    soloSi: (r) => r.edad === "17",
    texto: "¿Tienes autorización escrita de tu padre, madre o tutor?",
    ayuda: "Si tienes 17 años la necesitas para donar. Llévala el día de tu cita.",
    opciones: SI_NO(
      { efecto: "requisito", requisito: "autorizacionTutor" },
      { efecto: "stop", resultado: "F" },
    ),
  },
  {
    id: "peso", etapa: 1, nodo: "G",
    texto: "¿Pesas más de 50 kg?",
    opciones: SI_NO({ efecto: "ok" }, { efecto: "stop", resultado: "H" }),
  },
  {
    id: "sueno", etapa: 1, nodo: "I",
    texto: "¿Dormiste al menos 5 horas la noche anterior?",
    ayuda: "Si vas a donar otro día, piensa en la noche antes de tu cita.",
    opciones: SI_NO({ efecto: "ok" }, { efecto: "stop", resultado: "J" }),
  },
  {
    id: "comida", etapa: 1, nodo: "I",
    texto: "¿Has comido durante las últimas 5 horas?",
    ayuda: "No se dona en ayunas. Lo ideal es algo liviano y bajo en grasa.",
    opciones: SI_NO({ efecto: "ok" }, { efecto: "stop", resultado: "J" }),
  },
  {
    id: "intervalo", etapa: 1, nodo: "K",
    texto: "¿Has respetado el intervalo mínimo desde tu última donación?",
    ayuda: "Más de 3 meses si eres hombre y más de 4 meses si eres mujer.",
    opciones: [
      { valor: "nunca", label: "Nunca he donado", efecto: "ok" },
      { valor: "si", label: "Sí", efecto: "ok" },
      { valor: "no", label: "No, o no estoy seguro/a", efecto: "stop", resultado: "L" },
    ],
  },

  // ---------- Etapa 2. Antecedentes de salud ----------
  {
    id: "enfermo", etapa: 2, nodo: "M",
    texto: "¿Actualmente te encuentras enfermo/a o presentas algún síntoma que afecte tu estado general?",
    motivo: "Estás con síntomas o te sientes enfermo/a",
    opciones: SI_NO({ efecto: "exclusion" }, { efecto: "ok" }),
  },
  {
    id: "fiebre", etapa: 2, nodo: "M",
    texto: "¿Has tenido fiebre o diarrea durante los últimos 14 días?",
    motivo: "Fiebre o diarrea en los últimos 14 días",
    opciones: SI_NO({ efecto: "exclusion" }, { efecto: "ok" }),
  },
  {
    id: "antibioticos", etapa: 2, nodo: "M",
    texto: "¿Has tomado antibióticos durante los últimos 7 días?",
    motivo: "Antibióticos en los últimos 7 días",
    opciones: SI_NO({ efecto: "exclusion" }, { efecto: "ok" }),
  },
  {
    id: "medicamentos", etapa: 2, nodo: "O",
    texto: "¿Consumes medicamentos actualmente?",
    ayuda: "Muchos medicamentos no impiden donar; el profesional lo revisa contigo.",
    motivo: "Consumo actual de medicamentos",
    opciones: SI_NO({ efecto: "revision" }, { efecto: "ok" }),
  },
  {
    id: "cronica", etapa: 2, nodo: "O",
    texto: "¿Tienes alguna enfermedad crónica?",
    motivo: "Enfermedad crónica",
    opciones: SI_NO({ efecto: "revision" }, { efecto: "ok" }),
  },
  {
    id: "operacion", etapa: 2, nodo: "O",
    texto: "¿Has sido operado/a durante los últimos meses?",
    motivo: "Cirugía en los últimos meses",
    opciones: SI_NO({ efecto: "revision" }, { efecto: "ok" }),
  },
  {
    id: "dental", etapa: 2, nodo: "M",
    texto: "¿Has recibido algún tratamiento dental durante los últimos 7 días?",
    motivo: "Tratamiento dental en los últimos 7 días",
    opciones: SI_NO({ efecto: "exclusion" }, { efecto: "ok" }),
  },
  {
    id: "endoscopia", etapa: 2, nodo: "M",
    texto: "¿Te han realizado una endoscopía o colonoscopía durante los últimos 6 meses?",
    motivo: "Endoscopía o colonoscopía en los últimos 6 meses",
    opciones: SI_NO({ efecto: "exclusion" }, { efecto: "ok" }),
  },
  {
    id: "embarazo", etapa: 2, nodo: "M",
    texto: "¿Estás embarazada o has tenido un parto o aborto durante los últimos 6 meses?",
    motivo: "Embarazo, parto o aborto en los últimos 6 meses",
    opciones: [
      { valor: "si", label: "Sí", efecto: "exclusion" },
      { valor: "no", label: "No / no aplica", efecto: "ok" },
    ],
  },

  // ---------- Etapa 3. Procedimientos y antecedentes personales ----------
  {
    id: "tatuajes", etapa: 3, nodo: "M",
    texto: "¿Te has realizado tatuajes, piercings o sesiones de acupuntura durante los últimos 6 meses?",
    motivo: "Tatuaje, piercing o acupuntura en los últimos 6 meses",
    opciones: SI_NO({ efecto: "exclusion" }, { efecto: "ok" }),
  },
  {
    id: "drogas", etapa: 3, nodo: "M",
    texto: "¿Has consumido o te has inyectado drogas ilegales?",
    ayuda: "Responde con tranquilidad: nadie te juzga y tu respuesta no sale de este dispositivo.",
    motivo: "Consumo o inyección de drogas ilegales",
    opciones: SI_NO({ efecto: "exclusion" }, { efecto: "ok" }),
  },
  {
    id: "viaje", etapa: 3, nodo: "O",
    texto: "¿Has viajado fuera de Chile durante los últimos meses?",
    motivo: "Viaje fuera de Chile en los últimos meses",
    opciones: SI_NO({ efecto: "revision" }, { efecto: "ok" }),
  },
  {
    id: "malaria", etapa: 3, nodo: "O",
    texto: "¿Has vivido en zonas donde existe riesgo de malaria?",
    motivo: "Residencia en zona con riesgo de malaria",
    opciones: SI_NO({ efecto: "revision" }, { efecto: "ok" }),
  },
  {
    id: "agujas", etapa: 3, nodo: "M",
    texto: "¿Has tenido alguna exposición a sangre de otra persona o accidentes con agujas?",
    motivo: "Exposición a sangre o accidente con agujas",
    opciones: SI_NO({ efecto: "exclusion" }, { efecto: "ok" }),
  },

  // ---------- Etapa 4. Antecedentes sexuales ----------
  {
    id: "parejaNueva", etapa: 4, nodo: "M",
    texto: "Durante los últimos 6 meses, ¿has tenido relaciones sexuales con una persona nueva, independiente del uso de preservativo?",
    ayuda: "Estas preguntas se hacen a todas las personas por igual, para proteger a quien recibe la sangre.",
    motivo: "Pareja sexual nueva en los últimos 6 meses",
    opciones: SI_NO({ efecto: "exclusion" }, { efecto: "ok" }),
  },
  {
    id: "variasParejas", etapa: 4, nodo: "M",
    texto: "Durante los últimos 6 meses, ¿has tenido relaciones sexuales con más de una persona, independiente del uso de preservativo?",
    motivo: "Más de una pareja sexual en los últimos 6 meses",
    opciones: SI_NO({ efecto: "exclusion" }, { efecto: "ok" }),
  },
  {
    id: "comercioSexual", etapa: 4, nodo: "M",
    texto: "Durante los últimos 12 meses, ¿has tenido relaciones sexuales con personas que ejercen el comercio sexual?",
    motivo: "Relaciones con personas que ejercen comercio sexual (últimos 12 meses)",
    opciones: SI_NO({ efecto: "exclusion" }, { efecto: "ok" }),
  },
];

export const DECLARACION =
  "Declaro que he respondido de manera voluntaria y veraz, y comprendo que este cuestionario no reemplaza la entrevista ni la evaluación profesional.";

export const REQUISITOS = {
  autorizacionTutor: "Llevar la autorización escrita de tu padre, madre o tutor.",
  autorizacionMedica: "Por tu edad (60 a 70 años) necesitas la autorización del médico del lugar de donación.",
};

/**
 * Resultados: letras = nodos del árbol de decisión de TSLB.
 * agendar: "si" permite agendar, "despues" permite agendar desde una fecha futura, "no" bloquea.
 */
export const RESULTADOS = {
  X: {
    tono: "alto",
    titulo: "Primero consigue tu identificación",
    texto: "Para donar necesitas un documento de identificación vigente o un documento con RUN y fotografía. Cuando lo tengas, vuelve a hacer la autoevaluación.",
    agendar: "no",
  },
  D: {
    tono: "alto",
    titulo: "Estás fuera del rango de edad para donar",
    texto: "En Chile se puede donar sangre entre los 17 y los 70 años. Igual puedes ayudar: comparte la campaña con alguien que sí pueda donar.",
    agendar: "no",
  },
  F: {
    tono: "pausa",
    titulo: "Te falta la autorización escrita",
    texto: "Con 17 años necesitas la autorización escrita de tu padre, madre o tutor. Consíguela y vuelve: el resto lo podemos dejar listo en un minuto.",
    agendar: "no",
  },
  H: {
    tono: "alto",
    titulo: "Por ahora no corresponde donar",
    texto: "Para donar se necesita pesar más de 50 kg, por tu propia seguridad. Igual puedes ayudar compartiendo la campaña.",
    agendar: "no",
  },
  J: {
    tono: "pausa",
    titulo: "Hoy no, pero puedes agendar otro día",
    texto: "El día que dones debes haber dormido al menos 5 horas y haber comido en las últimas 5 horas. Elige un día en que puedas cumplirlo: te lo recordaremos la noche anterior.",
    agendar: "si",
  },
  L: {
    tono: "pausa",
    titulo: "Aún no se cumple tu intervalo",
    texto: "Entre una donación y otra deben pasar más de 3 meses (hombres) o más de 4 meses (mujeres). Calcula desde cuándo puedes volver y agenda para esa fecha.",
    agendar: "despues",
  },
  N: {
    tono: "pausa",
    titulo: "Por ahora es mejor esperar",
    texto: "Alguna de tus respuestas indica una situación que requiere esperar antes de donar. El tiempo de espera depende de cada caso y lo define un profesional de salud. Puedes consultarlo directamente en el centro de donación.",
    agendar: "no",
  },
  P: {
    tono: "revision",
    titulo: "Puedes agendar: un profesional revisará tu caso",
    texto: "Tienes antecedentes que no impiden donar por sí solos, pero un profesional de salud los evaluará contigo antes de la donación.",
    agendar: "si",
  },
  Q: {
    tono: "ok",
    titulo: "Puedes continuar a la entrevista predonación",
    texto: "Según tus respuestas cumples los requisitos generales. Agenda tu hora: en el centro tendrás una entrevista confidencial y un examen físico breve antes de donar.",
    agendar: "si",
  },
};

export const AVISO_LEGAL =
  "Este cuestionario es orientativo y no determina por sí solo si puedes donar. La decisión final la toma un profesional de salud en la entrevista y evaluación presencial.";

// ---------------- Contenidos educativos (borrador, pendiente de validación TSLB) ----------------

export const MITOS = [
  {
    id: "peso",
    afirmacion: "Donar sangre engorda o adelgaza.",
    esMito: true,
    explicacion: "Donar no cambia tu peso. Tu cuerpo repone el volumen de sangre por sí solo después de la donación.",
  },
  {
    id: "tatuaje",
    afirmacion: "Si tengo un tatuaje, nunca podré donar.",
    esMito: true,
    explicacion: "Lo que se pregunta es si te tatuaste o hiciste un piercing en los últimos 6 meses. Pasado ese tiempo, puedes ser evaluado/a para donar.",
  },
  {
    id: "ayunas",
    afirmacion: "Hay que ir en ayunas a donar.",
    esMito: true,
    explicacion: "Al revés: debes haber comido en las últimas 5 horas. Lo ideal es algo liviano y bajo en grasa.",
  },
  {
    id: "contagio",
    afirmacion: "Me puedo contagiar de algo al donar.",
    esMito: true,
    explicacion: "El material que se usa es estéril y de un solo uso. Donar no expone a quien dona a ninguna infección.",
  },
  {
    id: "componentes",
    afirmacion: "Una sola donación puede ayudar a más de una persona.",
    esMito: false,
    explicacion: "La sangre donada se separa en componentes (glóbulos rojos, plasma y plaquetas) que pueden ir a pacientes distintos.",
  },
  {
    id: "mujeres",
    afirmacion: "Las mujeres no pueden donar sangre.",
    esMito: true,
    explicacion: "Sí pueden. Lo único distinto es el intervalo: más de 4 meses entre donaciones para mujeres y más de 3 meses para hombres.",
  },
  {
    id: "diecisiete",
    afirmacion: "Con 17 años todavía no puedo donar.",
    esMito: true,
    explicacion: "Con 17 años puedes donar si llevas una autorización escrita de tu padre, madre o tutor.",
  },
  {
    id: "medicamentos",
    afirmacion: "Si tomo cualquier medicamento, no puedo donar.",
    esMito: true,
    explicacion: "Depende del medicamento, y lo revisa un profesional en la entrevista. Eso sí: si tomaste antibióticos en los últimos 7 días, debes esperar.",
  },
];

export const GUIAS = [
  {
    id: "proceso",
    titulo: "Cómo es donar, paso a paso",
    resumen: "Lo que pasa desde que llegas hasta que te vas.",
    pasos: [
      ["Autoevaluación", "Este cuestionario de un minuto te orienta antes de ir."],
      ["Llegada y registro", "Muestras tu documento con RUN y fotografía."],
      ["Entrevista confidencial", "Un profesional de salud revisa tus antecedentes contigo."],
      ["Examen físico breve", "Controles predonación, como presión arterial y hemoglobina."],
      ["Donación", "La extracción en sí dura alrededor de 10 minutos."],
      ["Descanso y colación", "Te quedas unos minutos en reposo y comes algo antes de irte."],
      ["Volver a donar", "Después de 3 meses (hombres) o 4 meses (mujeres). Te avisamos."],
    ],
  },
  {
    id: "antes",
    titulo: "Antes de donar",
    resumen: "Cómo llegar en buenas condiciones a tu cita.",
    pasos: [
      ["Duerme al menos 5 horas", "La noche anterior a tu cita."],
      ["Come algo liviano", "En las 5 horas previas. Evita comidas muy grasosas."],
      ["Toma agua", "Llegar hidratado/a ayuda a que te sientas bien."],
      ["Lleva tu documento", "Documento de identificación vigente o con RUN y fotografía."],
      ["Si tienes 17 años", "Lleva la autorización escrita de tu padre, madre o tutor."],
    ],
  },
  {
    id: "despues",
    titulo: "Después de donar",
    resumen: "Cuidados para el resto del día.",
    pasos: [
      ["Cuida el brazo", "Mantén el parche y la presión el tiempo que te indiquen."],
      ["Toma líquidos", "Bebe más agua de lo habitual durante el día."],
      ["Evita el esfuerzo intenso", "Nada de deporte exigente ni cargar peso con ese brazo ese día."],
      ["Si te mareas", "Recuéstate, levanta las piernas y avisa al personal."],
      ["Si algo no anda bien", "Si el malestar sigue, contacta al centro donde donaste."],
    ],
  },
];
