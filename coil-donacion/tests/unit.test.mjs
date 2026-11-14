// Pruebas unitarias: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluar, siguientePregunta, progreso, proximaFechaPermitida } from "../js/triaje.js";
import { PREGUNTAS, RESULTADOS } from "../js/contenido.js";
import { CENTROS, diasDisponibles, bloquesDelDia, planRecordatorios, archivoICS, enlaceWhatsApp, codigoReserva } from "../js/agenda.js";
import { estadoInicial, sumar, nivel, cargar, guardar, CLAVE } from "../js/estado.js";
import { CASOS } from "./casos-clinicos.mjs";

// ---------- Árbol de decisión: casos clínicos ----------
for (const c of CASOS) {
  test(`${c.id} · ${c.persona} → ${c.esperado}`, () => {
    const r = evaluar(c.respuestas);
    assert.equal(r.completo, true);
    assert.equal(r.codigo, c.esperado);
    if (c.requisitos) assert.deepEqual(r.requisitos, c.requisitos);
  });
}

test("Todos los resultados posibles tienen texto definido", () => {
  for (const c of ["X", "D", "F", "H", "J", "L", "N", "P", "Q"]) assert.ok(RESULTADOS[c]?.titulo, c);
});

test("Todas las preguntas del cuestionario TSLB están incluidas (23 + autorización)", () => {
  assert.equal(PREGUNTAS.length, 24);
  const etapas = PREGUNTAS.reduce((a, p) => ({ ...a, [p.etapa]: (a[p.etapa] || 0) + 1 }), {});
  assert.deepEqual(etapas, { 1: 7, 2: 9, 3: 5, 4: 3 });
});

test("Respuestas incompletas no producen resultado", () => {
  const r = evaluar({ documento: "si" });
  assert.equal(r.completo, false);
  assert.equal(r.codigo, null);
});

test("La pregunta de autorización solo aparece con 17 años", () => {
  assert.equal(siguientePregunta({ documento: "si", edad: "17" }).id, "autorizacion");
  assert.equal(siguientePregunta({ documento: "si", edad: "18a59" }).id, "peso");
});

test("Una puerta de la Etapa 1 detiene el cuestionario", () => {
  assert.equal(siguientePregunta({ documento: "no" }), null);
  assert.equal(siguientePregunta({ documento: "si", edad: "18a59", peso: "no" }), null);
});

test("Progreso avanza de 0 a 1", () => {
  assert.equal(progreso({}), 0);
  assert.equal(progreso(CASOS[0].respuestas), 1);
  assert.ok(progreso({ documento: "si" }) > 0);
});

test("Respuesta inválida lanza error", () => {
  assert.throws(() => evaluar({ documento: "talvez" }));
});

// ---------- Intervalo entre donaciones ----------
test("Intervalo hombre: más de 3 meses", () => {
  assert.equal(proximaFechaPermitida("2026-01-10", "hombre"), "2026-04-11");
});
test("Intervalo mujer: más de 4 meses", () => {
  assert.equal(proximaFechaPermitida("2026-01-10", "mujer"), "2026-05-11");
});
test("Intervalo con fin de mes (31 ene + 3 meses → 30 abr → 1 may)", () => {
  assert.equal(proximaFechaPermitida("2026-01-31", "hombre"), "2026-05-01");
});
test("Intervalo cruzando año", () => {
  assert.equal(proximaFechaPermitida("2026-11-20", "mujer"), "2027-03-21");
});
test("Intervalo sin datos devuelve null", () => {
  assert.equal(proximaFechaPermitida("", "hombre"), null);
  assert.equal(proximaFechaPermitida("2026-01-01", undefined), null);
});

// ---------- Agenda ----------
const hoy = new Date(2026, 10, 14); // sábado 14 nov 2026

test("Días disponibles respetan los días de atención del centro", () => {
  const campus = CENTROS.find((c) => c.id === "campus");
  for (const d of diasDisponibles(campus, hoy)) {
    const [y, m, dd] = d.split("-").map(Number);
    const dia = new Date(y, m - 1, dd).getDay();
    assert.ok(dia >= 1 && dia <= 5, `${d} no es día hábil`);
  }
});

test("Días disponibles empiezan mañana o en la fecha del intervalo", () => {
  const centro = CENTROS.find((c) => c.id === "centro");
  const dias = diasDisponibles(centro, hoy);
  assert.ok(dias[0] > "2026-11-14");
  const desde = diasDisponibles(centro, hoy, "2026-12-01");
  assert.ok(desde.every((d) => d >= "2026-12-01"));
});

test("Una cita propia ocupa un cupo", () => {
  const c = CENTROS[0];
  const fecha = diasDisponibles(c, hoy)[0];
  const antes = bloquesDelDia(c, fecha, []).find((b) => b.hora === c.bloques[0]).libres;
  if (antes === 0) return; // bloque lleno en la simulación
  const despues = bloquesDelDia(c, fecha, [{ estado: "agendada", centroId: c.id, fecha, hora: c.bloques[0] }]).find((b) => b.hora === c.bloques[0]).libres;
  assert.equal(despues, antes - 1);
});

test("Cupos nunca son negativos", () => {
  const c = CENTROS[2];
  const fecha = diasDisponibles(c, hoy)[0];
  const muchas = Array.from({ length: 10 }, () => ({ estado: "agendada", centroId: c.id, fecha, hora: c.bloques[0] }));
  assert.ok(bloquesDelDia(c, fecha, muchas).every((b) => b.libres >= 0));
});

const cita = { codigo: "ABC234", centroId: "centro", fecha: "2026-11-20", hora: "09:30" };

test("Plan de recordatorios: 4 avisos en orden cronológico", () => {
  const r = planRecordatorios(cita);
  assert.equal(r.length, 4);
  const t = r.map((x) => new Date(x.cuando).getTime());
  assert.deepEqual([...t].sort((a, b) => a - b), t);
  assert.match(r[1].texto, /5 horas/);
});

test("Archivo .ics válido con 2 alarmas", () => {
  const ics = archivoICS(cita, new Date(2026, 10, 14));
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 2);
  assert.match(ics, /UID:ABC234@gota-coil/);
});

test("Enlace de WhatsApp limpia el número", () => {
  assert.match(enlaceWhatsApp(cita, "+56 9 1234-5678"), /^https:\/\/wa\.me\/56912345678\?text=/);
});

test("Código de reserva: 6 caracteres sin ambiguos (0, O, 1, I)", () => {
  for (let i = 0; i < 200; i++) assert.match(codigoReserva(), /^[A-HJ-NP-Z2-9]{6}$/);
});

// ---------- Estado y gamificación ----------
test("Puntos e insignias", () => {
  const e = estadoInicial();
  e.evaluaciones.push({ fecha: "x", codigo: "Q" });
  const nuevas = sumar(e, "evaluacion");
  assert.equal(e.progreso.puntos, 50);
  assert.deepEqual(nuevas.map((n) => n.id), ["primerPaso"]);
  assert.deepEqual(sumar(e, "leer"), []);
});

test("Niveles", () => {
  assert.equal(nivel(0).actual.nombre, "Curioso/a");
  assert.equal(nivel(400).actual.nombre, "Donante");
  assert.equal(nivel(5000).siguiente, null);
});

test("Almacenamiento corrupto vuelve al estado inicial", () => {
  const mem = { getItem: () => "{no es json", setItem() {} };
  assert.deepEqual(cargar(mem), estadoInicial());
});

test("Guardar falla sin romper (almacenamiento lleno)", () => {
  const lleno = { setItem() { throw new Error("QuotaExceeded"); } };
  assert.equal(guardar(lleno, estadoInicial()), false);
});

test("Guardar y cargar conserva los datos", () => {
  const m = new Map();
  const st = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  const e = estadoInicial();
  e.usuario = { nombre: "Ana" };
  guardar(st, e);
  assert.equal(cargar(st).usuario.nombre, "Ana");
  assert.ok(m.has(CLAVE));
});
