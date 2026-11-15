// Gota — interfaz. Router por hash, vistas como funciones que devuelven HTML.
import { icon } from "./icons.js";
import {
  ETAPAS, PREGUNTAS, DECLARACION, REQUISITOS, RESULTADOS, AVISO_LEGAL, MITOS, GUIAS,
} from "./contenido.js";
import { siguientePregunta, evaluar, progreso, opcionElegida, proximaFechaPermitida, MESES_INTERVALO } from "./triaje.js";
import {
  CENTROS, centroPorId, diasDisponibles, bloquesDelDia, planRecordatorios, archivoICS,
  enlaceGoogleCalendar, enlaceWhatsApp, enlaceCorreo, codigoReserva, fechaLarga, inicioCita,
} from "./agenda.js";
import {
  cargar, guardar, estadoInicial, sumar, revisarInsignias, INSIGNIAS, nivel, citaActiva, citasPorConfirmar, hoyLocal,
} from "./estado.js";

// ---------------- Estado ----------------

let estado = cargar(localStorage);
const persistir = () => guardar(localStorage, estado);

// La sesión (respuestas del cuestionario) vive solo en esta pestaña.
const SESION = "gota.sesion";
function sesionNueva() {
  return { respuestas: {}, orden: [], previa: null, declaracion: false, resultado: null, desde: null, agendar: {}, direccion: "adelante" };
}
let sesion = (() => {
  try { return { ...sesionNueva(), ...JSON.parse(sessionStorage.getItem(SESION) || "{}") }; } catch { return sesionNueva(); }
})();
const guardarSesion = () => { try { sessionStorage.setItem(SESION, JSON.stringify(sesion)); } catch { /* sin almacenamiento */ } };

// ---------------- Utilidades ----------------

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function fechaCorta(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}
function diasHasta(fechaISO) {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d) - hoy) / 86400000);
}
function textoCuenta(fechaISO) {
  const n = diasHasta(fechaISO);
  if (n === 0) return "Es hoy";
  if (n === 1) return "Es mañana";
  return `Faltan ${n} días`;
}

let toastTimer;
let toastRestante = 0;
let toastDesde = 0;
const TOAST_MS = 3600;
function ocultarToast() { clearTimeout(toastTimer); $("#toast").hidden = true; }
function programarToast(ms) {
  clearTimeout(toastTimer);
  toastRestante = ms;
  toastDesde = Date.now();
  toastTimer = setTimeout(ocultarToast, ms);
}
function toast(titulo, detalle = "", ico = "check") {
  const t = $("#toast");
  t.innerHTML = `${icon(ico)}<div><b>${esc(titulo)}</b>${detalle ? `<span>${esc(detalle)}</span>` : ""}</div>`;
  t.hidden = false;
  programarToast(TOAST_MS);
}
// El aviso no se pierde si la persona cambia de app: el tiempo se pausa con la pestaña oculta.
document.addEventListener("visibilitychange", () => {
  if ($("#toast").hidden) return;
  if (document.hidden) { clearTimeout(toastTimer); toastRestante -= Date.now() - toastDesde; }
  else programarToast(Math.max(toastRestante, 1200));
});

function premiar(motivo, mensaje) {
  const antes = estado.progreso.puntos;
  const nuevas = sumar(estado, motivo, MITOS.length, GUIAS.length);
  persistir();
  const ganados = estado.progreso.puntos - antes;
  if (nuevas.length) {
    toast(`Insignia: ${nuevas[0].nombre}`, `${mensaje ? mensaje + " · " : ""}+${ganados} puntos`, nuevas[0].icono);
  } else if (ganados) {
    toast(mensaje || "¡Bien!", `+${ganados} puntos`, "sparkles");
  }
}

function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const gota = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3c4.5 6.2 10 11.6 10 17.2A10 10 0 0 1 6 20.2C6 14.6 11.5 9.2 16 3Z" fill="var(--rojo)"/></svg>`;

function barra({ titulo = "", atras = null, puntos = true } = {}) {
  return `<header class="barra">
    ${atras ? `<a class="icono-btn" href="${atras}" aria-label="Volver">${icon("arrow-left")}</a>` : titulo ? "" : `<a class="marca" href="#/">${gota}Gota</a>`}
    ${titulo ? `<h1>${esc(titulo)}</h1>` : ""}
    <span class="espacio"></span>
    ${puntos ? `<a class="puntos-chip" href="#/perfil" aria-label="${estado.progreso.puntos} puntos. Ver perfil">${icon("star")}${estado.progreso.puntos}</a>` : ""}
  </header>`;
}

function ultimaEvaluacion() {
  return estado.evaluaciones[estado.evaluaciones.length - 1] || null;
}

/** Cosas adicionales que la persona debe llevar el día de la cita (para los recordatorios). */
function extrasQueLlevar(cita) {
  return cita?.requisitos?.includes("autorizacionTutor") ? ["la autorización escrita de tu padre, madre o tutor"] : [];
}

function requisitosTexto(ids = []) {
  return ids.map((id) => REQUISITOS[id]).filter(Boolean);
}

// ---------------- Vistas ----------------

function vistaInicio() {
  const cita = citaActiva(estado);
  const pendientes = citasPorConfirmar(estado);
  const nombre = estado.usuario?.nombre?.split(" ")[0];
  const proxima = estado.usuario?.ultimaDonacion && estado.usuario?.sexo
    ? proximaFechaPermitida(estado.usuario.ultimaDonacion, estado.usuario.sexo) : null;

  let principal;
  if (cita) {
    principal = `<section aria-labelledby="t-cita">
        <h1 class="sr-only" id="t-cita">Tu próxima donación</h1>
        ${ticket(cita)}
        <div class="acciones"><a class="btn btn-secundario" href="#/agenda">Ver recordatorios y detalles</a></div>
      </section>`;
  } else if (pendientes.length) {
    principal = `<div class="portada"><h1>¿Pudiste <em>donar</em>?</h1>
      <p class="bajada">Tu hora del ${esc(fechaLarga(pendientes[0].fecha))} ya pasó. Cuéntanos cómo te fue.</p>
      <div class="acciones"><a class="btn btn-primario" href="#/agenda">Registrar mi donación</a></div></div>`;
  } else if (proxima && proxima > hoyLocal()) {
    principal = `<div class="portada"><h1>Gracias por <em>donar</em>${nombre ? `, ${esc(nombre)}` : ""}.</h1>
      <p class="bajada">Podrás volver a donar desde el ${esc(fechaLarga(proxima))}. Te esperamos.</p>
      <div class="acciones"><a class="btn btn-primario" href="#/agenda">Ver mi próxima fecha</a></div></div>`;
  } else {
    principal = `<div class="portada">
      <h1>${nombre ? `Hola, ${esc(nombre)}.<br>` : ""}Dona sangre <em>sin vueltas.</em></h1>
      <p class="bajada">Revisa en un minuto si puedes donar y agenda tu hora aquí mismo.</p>
      <div class="acciones">
        <a class="btn btn-primario btn-ancho" href="#/evaluacion" data-accion="empezar">Hacer la autoevaluación ${icon("arrow-right")}</a>
      </div>
      <p class="nota-legal">${icon("info")}<span>${esc(AVISO_LEGAL)}</span></p>
    </div>`;
  }

  const preparate = cita ? `<section class="seccion" aria-labelledby="t-prep">
      <h2 id="t-prep">Antes de tu cita</h2>
      <ol class="pasos-inicio">
        <li>${icon("clock")}<div><strong>Duerme al menos 5 horas</strong><span>La noche anterior. Te lo recordamos a las 20:00.</span></div></li>
        <li>${icon("check")}<div><strong>Come algo liviano</strong><span>En las 5 horas previas. No se dona en ayunas.</span></div></li>
        <li>${icon("shield-check")}<div><strong>Lleva tu documento</strong><span>Con RUN y fotografía${cita.requisitos?.includes("autorizacionTutor") ? ", y la autorización escrita de tu tutor" : ""}.</span></div></li>
      </ol>
      <div class="acciones"><a class="btn btn-suave" href="#/aprende/despues">Qué hacer después de donar</a></div>
    </section>` : "";

  return `${barra()}
    ${principal}
    ${preparate}
    ${cita ? "" : `<section class="seccion" aria-labelledby="t-como">
      <h2 id="t-como">Así funciona</h2>
      <ol class="pasos-inicio">
        <li>${icon("shield-check")}<div><strong>Autoevaluación de 1 minuto</strong><span>Preguntas de sí o no, basadas en los requisitos para donar en Chile.</span></div></li>
        <li>${icon("calendar-check")}<div><strong>Agenda tu hora</strong><span>Elige lugar, día y hora. Sin llamadas.</span></div></li>
        <li>${icon("bell")}<div><strong>Te lo recordamos</strong><span>En tu calendario, por WhatsApp o correo, con lo que debes llevar.</span></div></li>
        <li>${icon("droplet")}<div><strong>Vuelve a donar</strong><span>Te avisamos cuando se cumpla tu intervalo y sumas puntos.</span></div></li>
      </ol>
    </section>`}
    <section class="seccion" aria-labelledby="t-mitos">
      <h2 id="t-mitos">¿Mito o realidad?</h2>
      <p>“Hay que ir en ayunas a donar.”</p>
      <div class="acciones"><a class="btn btn-suave" href="#/aprende/mitos">Ponte a prueba con 8 mitos</a></div>
    </section>`;
}

function ticket(cita) {
  const c = centroPorId(cita.centroId);
  return `<article class="ticket">
    <h2>Donas el ${esc(fechaLarga(cita.fecha))}</h2>
    <p class="cuando">a las ${esc(cita.hora)} · <span class="cuenta">${textoCuenta(cita.fecha)}</span></p>
    <p class="donde">${icon("map-pin")}<span>${esc(c?.nombre)}<br>${esc(c?.direccion)}</span></p>
    <p class="codigo"><span>Código de reserva</span><b>${esc(cita.codigo)}</b></p>
  </article>`;
}

// ---- Autoevaluación ----

function vistaEvaluacion() {
  const r = sesion.respuestas;
  const p = siguientePregunta(r);

  if (!p) {
    const res = evaluar(r);
    if (["X", "D", "F", "H", "J", "L"].includes(res.codigo)) {
      // Terminó en una puerta de la Etapa 1: resultado directo.
      setTimeout(() => irA("#/resultado"), 0);
      return "";
    }
    return vistaDeclaracion();
  }

  const pct = Math.round(progreso(r) * 100);
  const pctAnterior = sesion.pctAnterior ?? pct;
  sesion.pctAnterior = pct;
  const previa = sesion.previa?.id === p.id ? sesion.previa.valor : null;
  const anim = sesion.direccion === "atras" ? "pregunta-vuelve" : "pregunta-entra";
  const sensible = p.etapa >= 3;

  return `${barra({ atras: sesion.orden.length ? "#/evaluacion/atras" : "#/", puntos: false })}
    <p class="etapa">Etapa ${p.etapa} de 4 · ${esc(ETAPAS[p.etapa])}</p>
    <div class="progreso" role="progressbar" aria-label="Avance de la autoevaluación" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="transform: scaleX(${Math.max(pctAnterior, 3) / 100})" data-hasta="${Math.max(pct, 3) / 100}"></span></div>
    <section class="pregunta ${anim}" aria-labelledby="q-${p.id}">
      <h2 id="q-${p.id}" tabindex="-1">${esc(p.texto)}</h2>
      ${p.ayuda ? `<p class="ayuda">${esc(p.ayuda)}</p>` : ""}
      <div class="opciones" role="group" aria-labelledby="q-${p.id}">
        ${p.opciones.map((o) => `<button type="button" class="opcion" data-responder="${p.id}" data-valor="${o.valor}" aria-pressed="${previa === o.valor}">${esc(o.label)}${icon("check")}</button>`).join("")}
      </div>
      ${sensible ? `<p class="privacidad">${icon("lock")}<span>Tus respuestas no se guardan ni se envían: solo se usan en este momento para orientarte.</span></p>` : ""}
    </section>`;
}

function vistaDeclaracion() {
  return `${barra({ atras: "#/evaluacion/atras", puntos: false })}
    <p class="etapa">Etapa 5 · ${ETAPAS[5]}</p>
    <div class="progreso" aria-hidden="true"><span style="transform: scaleX(1)"></span></div>
    <section class="pregunta pregunta-entra" aria-labelledby="t-decl">
      <h2 id="t-decl" tabindex="-1">Última cosa antes de ver tu resultado</h2>
      <label class="declaracion">
        <input type="checkbox" id="declaro" ${sesion.declaracion ? "checked" : ""}>
        <span>${esc(DECLARACION)}</span>
      </label>
      <div class="acciones">
        <button class="btn btn-primario btn-ancho" type="button" data-accion="ver-resultado" ${sesion.declaracion ? "" : "disabled"}>Ver mi resultado</button>
      </div>
    </section>`;
}

function responder(id, valor) {
  const p = PREGUNTAS.find((q) => q.id === id);
  if (!p || !opcionElegida(p, valor)) return;
  sesion.respuestas[id] = valor;
  if (!sesion.orden.includes(id)) sesion.orden.push(id);
  sesion.previa = null;
  sesion.direccion = "adelante";
  guardarSesion();
  // Pausa breve para que se vea la opción marcada antes de avanzar.
  const ms = reduceMotion() ? 0 : 140;
  setTimeout(() => render(), ms);
}

function retroceder() {
  const id = sesion.orden.pop();
  if (id) {
    sesion.previa = { id, valor: sesion.respuestas[id] };
    delete sesion.respuestas[id];
    // Si se cambia la edad, se borra la respuesta condicional de autorización.
    if (id === "edad") delete sesion.respuestas.autorizacion;
  }
  sesion.declaracion = false;
  sesion.direccion = "atras";
  guardarSesion();
}

function finalizarEvaluacion() {
  const res = evaluar(sesion.respuestas);
  if (!res.completo) return irA("#/evaluacion");
  sesion.resultado = res;
  // Privacidad: al historial solo va el resultado y la fecha, nunca las respuestas.
  estado.evaluaciones.push({ fecha: new Date().toISOString(), codigo: res.codigo, requisitos: res.requisitos });
  persistir();
  guardarSesion();
  premiar("evaluacion", "Autoevaluación lista");
  irA("#/resultado");
}

// ---- Resultado ----

function vistaResultado() {
  if (!sesion.resultado) {
    const res = evaluar(sesion.respuestas);
    if (res.completo && ["X", "D", "F", "H", "J", "L"].includes(res.codigo)) {
      sesion.resultado = res;
      estado.evaluaciones.push({ fecha: new Date().toISOString(), codigo: res.codigo, requisitos: res.requisitos });
      persistir(); guardarSesion();
      setTimeout(() => premiar("evaluacion", "Autoevaluación lista"), 300);
    } else {
      return `${barra()}<div class="vacio"><p>Aún no tienes un resultado.</p><div class="acciones"><a class="btn btn-primario" href="#/evaluacion">Hacer la autoevaluación</a></div></div>`;
    }
  }
  const res = sesion.resultado;
  const info = RESULTADOS[res.codigo];
  const ico = { ok: "circle-check-big", revision: "info", pausa: "clock", alto: "circle-alert" }[info.tono];
  const reqs = requisitosTexto(res.requisitos);

  let acciones = "";
  if (info.agendar === "si") {
    acciones = `<a class="btn btn-primario btn-ancho" href="#/agendar">Agendar mi hora ${icon("arrow-right")}</a>`;
  } else if (info.agendar === "despues") {
    acciones = calculadoraIntervalo();
  } else {
    acciones = `<a class="btn btn-suave btn-ancho" href="#/aprende">Aprender más sobre la donación</a>
      <button type="button" class="btn btn-secundario btn-ancho" data-accion="compartir">${icon("heart-handshake")}Invitar a alguien a donar</button>`;
  }

  return `${barra()}
    <section class="resultado tono-${info.tono} resultado-revela" aria-labelledby="t-res">
      <span class="sello">${icon(ico)}</span>
      <h1 id="t-res" tabindex="-1">${esc(info.titulo)}</h1>
      <p>${esc(info.texto)}</p>
      ${res.motivos.length ? `<p class="lista-titulo">Lo que conviene revisar</p><ul class="lista-simple">${res.motivos.map((m) => `<li>${icon("clock")}<span>${esc(m)}</span></li>`).join("")}</ul>` : ""}
      ${res.codigo !== "N" && res.revisiones.length ? `<p class="lista-titulo">El profesional revisará contigo</p><ul class="lista-simple">${res.revisiones.map((m) => `<li>${icon("info")}<span>${esc(m)}</span></li>`).join("")}</ul>` : ""}
      ${reqs.length ? `<p class="lista-titulo">No olvides</p><ul class="lista-simple">${reqs.map((m) => `<li>${icon("check")}<span>${esc(m)}</span></li>`).join("")}</ul>` : ""}
    </section>
    <div class="acciones">${acciones}
      <button type="button" class="enlace-btn" data-accion="repetir">Volver a responder</button>
    </div>
    <p class="nota-legal">${icon("info")}<span>${esc(AVISO_LEGAL)}</span></p>`;
}

function calculadoraIntervalo() {
  const u = estado.usuario || {};
  return `<form class="calc" data-form="intervalo" novalidate>
      <div class="campo">
        <label for="f-ultima">¿Cuándo fue tu última donación?</label>
        <input type="date" id="f-ultima" name="ultima" max="${hoyLocal()}" value="${esc(u.ultimaDonacion || "")}" required>
      </div>
      <fieldset class="campo">
        <legend>Tu intervalo</legend>
        <div class="segmentado">
          <label><input type="radio" name="sexo" value="hombre" ${u.sexo === "hombre" ? "checked" : ""}><span>Hombre · 3 meses</span></label>
          <label><input type="radio" name="sexo" value="mujer" ${u.sexo === "mujer" ? "checked" : ""}><span>Mujer · 4 meses</span></label>
        </div>
      </fieldset>
      <p class="error" id="calc-error" role="alert"></p>
      <button class="btn btn-primario btn-ancho" type="submit">Calcular y agendar</button>
    </form>`;
}

// ---- Agendar ----

function puedeAgendar() {
  const ev = ultimaEvaluacion();
  if (!ev) return { ok: false, motivo: "sin-evaluacion" };
  const info = RESULTADOS[ev.codigo];
  const dias = (Date.now() - new Date(ev.fecha).getTime()) / 86400000;
  if (dias > 30) return { ok: false, motivo: "vencida" };
  if (info.agendar === "no") return { ok: false, motivo: "no-apto", codigo: ev.codigo };
  if (info.agendar === "despues" && !sesion.desde) return { ok: false, motivo: "intervalo" };
  return { ok: true, ev };
}

function vistaAgendar() {
  const chequeo = puedeAgendar();
  if (!chequeo.ok) {
    const textos = {
      "sin-evaluacion": ["Antes, tu autoevaluación", "Son preguntas de sí o no y toma un minuto. Así sabes si te conviene agendar."],
      vencida: ["Actualiza tu autoevaluación", "Tu última autoevaluación tiene más de 30 días. Hazla de nuevo para agendar."],
      "no-apto": ["Por ahora no corresponde agendar", "Según tu última autoevaluación es mejor esperar. Puedes volver a responderla si algo cambió."],
      intervalo: ["Primero calcula tu fecha", "Necesitamos saber desde cuándo puedes volver a donar."],
    }[chequeo.motivo];
    return `${barra({ titulo: "Agendar" })}
      <div class="vacio"><p><b>${textos[0]}</b></p><p>${textos[1]}</p>
      <div class="acciones"><a class="btn btn-primario" href="#/evaluacion" data-accion="empezar">Hacer la autoevaluación</a></div></div>`;
  }
  if (citaActiva(estado)) {
    return `${barra({ titulo: "Agendar" })}
      <div class="vacio"><p><b>Ya tienes una hora agendada.</b></p><p>Si necesitas otro día, reprográmala desde Mi hora.</p>
      <div class="acciones"><a class="btn btn-primario" href="#/agenda">Ir a Mi hora</a></div></div>`;
  }
  if (!estado.usuario) return vistaRegistro({ siguiente: "#/agendar", paso: 1 });

  const a = sesion.agendar;
  const centro = a.centroId ? centroPorId(a.centroId) : null;

  // Paso 2: elegir lugar
  if (!centro) {
    return `${barra({ titulo: "¿Dónde quieres donar?", atras: "#/resultado" })}
      ${pasosAgenda(2)}
      <div class="centros">
        ${CENTROS.map((c) => `<button type="button" class="centro" data-centro="${c.id}">
          <strong>${esc(c.nombre)}</strong><span>${esc(c.direccion)}</span><span>${esc(c.detalle)}</span>${icon("chevron-right")}
        </button>`).join("")}
      </div>
      <p class="nota-legal">${icon("info")}<span>Lugares y horarios de demostración. En la versión final se usarán los centros validados por el equipo de salud.</span></p>`;
  }

  // Paso 3: día y hora
  const dias = diasDisponibles(centro, new Date(), sesion.desde);
  if (!a.fecha || !dias.includes(a.fecha)) a.fecha = dias.find((d) => bloquesDelDia(centro, d, estado.citas).some((b) => b.libres > 0)) || dias[0];
  const bloques = a.fecha ? bloquesDelDia(centro, a.fecha, estado.citas) : [];
  const elegido = a.hora && bloques.find((b) => b.hora === a.hora && b.libres > 0);
  const reqs = requisitosTexto(ultimaEvaluacion()?.requisitos);

  return `${barra({ titulo: "Elige día y hora", atras: "#/agendar/lugar" })}
    ${pasosAgenda(3)}
    <p><b>${esc(centro.nombre)}</b><br><span class="pista">${esc(centro.direccion)}</span></p>
    ${sesion.desde ? `<p class="nota-legal">${icon("calendar-check")}<span>Mostramos días desde el ${esc(fechaLarga(sesion.desde))}, cuando se cumple tu intervalo.</span></p>` : ""}
    <div class="dias" role="group" aria-label="Día">
      ${dias.map((d) => {
        const [y, m, dd] = d.split("-").map(Number);
        const f = new Date(y, m - 1, dd);
        return `<button type="button" class="dia" data-fecha="${d}" aria-pressed="${d === a.fecha}" aria-label="${esc(fechaLarga(d))}">
          <small>${f.toLocaleDateString("es-CL", { weekday: "short" }).replace(".", "")}</small><b>${dd}</b><small>${f.toLocaleDateString("es-CL", { month: "short" }).replace(".", "")}</small></button>`;
      }).join("")}
    </div>
    <h2 class="lista-titulo" id="t-horas">Horas para el ${esc(fechaLarga(a.fecha))}</h2>
    <div class="horas" role="group" aria-labelledby="t-horas">
      ${bloques.map((b) => `<button type="button" class="hora" data-hora="${b.hora}" aria-pressed="${a.hora === b.hora}" ${b.libres ? "" : "disabled"} aria-label="${b.hora}, ${b.libres ? `${b.libres} ${b.libres === 1 ? "cupo" : "cupos"}` : "sin cupos"}">
        <span class="h">${b.hora}</span><small>${b.libres ? `${b.libres} ${b.libres === 1 ? "cupo" : "cupos"}` : "Lleno"}</small></button>`).join("")}
    </div>
    ${bloques.every((b) => !b.libres) ? `<p class="vacio">Este día no quedan horas. Prueba con otro.</p>` : ""}
    ${elegido ? `<div class="resumen" aria-live="polite">
        <div class="fila">${icon("calendar-days")}<span>${esc(fechaLarga(a.fecha))}, ${esc(a.hora)}</span></div>
        <div class="fila">${icon("map-pin")}<span>${esc(centro.nombre)}</span></div>
        <div class="fila">${icon("check")}<span>Lleva tu documento con RUN y fotografía</span></div>
        ${reqs.map((t) => `<div class="fila">${icon("check")}<span>${esc(t)}</span></div>`).join("")}
      </div>` : ""}
    <div class="acciones">
      <button type="button" class="btn btn-primario btn-ancho" data-accion="confirmar-cita" ${elegido ? "" : "disabled"}>Confirmar mi hora</button>
    </div>`;
}

function pasosAgenda(n) {
  return `<div class="pasos-agenda" aria-label="Paso ${n} de 3">${[1, 2, 3].map((i) => `<span class="${i <= n ? "hecho" : ""}"></span>`).join("")}</div>`;
}

function confirmarCita() {
  const a = sesion.agendar;
  const centro = centroPorId(a.centroId);
  const libre = bloquesDelDia(centro, a.fecha, estado.citas).find((b) => b.hora === a.hora && b.libres > 0);
  if (!libre) { toast("Esa hora se acaba de llenar", "Elige otra, por favor.", "circle-alert"); return render(); }
  const ev = ultimaEvaluacion();
  const cita = {
    codigo: codigoReserva(),
    centroId: a.centroId,
    fecha: a.fecha,
    hora: a.hora,
    estado: "agendada",
    creada: new Date().toISOString(),
    requisitos: ev?.requisitos || [],
    revision: ev?.codigo === "P",
  };
  estado.citas.push(cita);
  sesion.agendar = {};
  sesion.desde = null;
  guardarSesion();
  persistir();
  premiar("cita", "Hora agendada");
  irA("#/agenda");
}

// ---- Registro / perfil ----

function vistaRegistro({ siguiente = "#/perfil", paso = null, editar = false } = {}) {
  const u = estado.usuario || sesion.perfilPrevio || {};
  return `${barra({ titulo: editar ? "Editar mis datos" : "Tus datos", atras: editar ? "#/perfil" : (paso ? "#/resultado" : "#/perfil") })}
    ${paso ? pasosAgenda(1) : ""}
    ${editar ? "" : `<p>Para reservar tu hora y enviarte recordatorios. Se guardan solo en este dispositivo.</p>`}
    <form data-form="registro" data-siguiente="${siguiente}" novalidate>
      <div class="campo">
        <label for="f-nombre">Nombre</label>
        <input type="text" id="f-nombre" name="nombre" autocomplete="name" required maxlength="60" value="${esc(u.nombre || "")}" aria-describedby="e-nombre">
        <p class="error" id="e-nombre"></p>
      </div>
      <div class="campo">
        <label for="f-correo">Correo <span class="pista">(opcional)</span></label>
        <input type="email" id="f-correo" name="correo" autocomplete="email" inputmode="email" maxlength="80" value="${esc(u.correo || "")}" aria-describedby="e-correo">
        <p class="error" id="e-correo"></p>
      </div>
      <div class="campo">
        <label for="f-tel">WhatsApp <span class="pista">(opcional)</span></label>
        <input type="tel" id="f-tel" name="telefono" autocomplete="tel" inputmode="tel" placeholder="+56 9 1234 5678" maxlength="20" value="${esc(u.telefono || "")}" aria-describedby="e-tel">
        <p class="error" id="e-tel"></p>
      </div>
      <fieldset class="campo" aria-describedby="p-sexo">
        <legend>Sexo</legend>
        <p class="pista" id="p-sexo">Solo para calcular cuándo puedes volver a donar: 3 meses (hombres) o 4 meses (mujeres).</p>
        <div class="segmentado">
          <label><input type="radio" name="sexo" value="hombre" ${u.sexo === "hombre" ? "checked" : ""}><span>Hombre</span></label>
          <label><input type="radio" name="sexo" value="mujer" ${u.sexo === "mujer" ? "checked" : ""}><span>Mujer</span></label>
        </div>
        <p class="error" id="e-sexo"></p>
      </fieldset>
      <div class="campo">
        <label for="f-ultima-r">Última donación <span class="pista">(si has donado antes)</span></label>
        <input type="date" id="f-ultima-r" name="ultimaDonacion" max="${hoyLocal()}" value="${esc(u.ultimaDonacion || "")}">
      </div>
      ${editar ? "" : `<label class="check"><input type="checkbox" name="consentimiento" required aria-describedby="e-consent"><span>Acepto que mis datos se guarden en este dispositivo para gestionar mi hora y mis recordatorios.</span></label>
      <p class="error" id="e-consent"></p>`}
      <div class="acciones"><button class="btn btn-primario btn-ancho" type="submit">${editar ? "Guardar cambios" : "Continuar"}</button></div>
    </form>`;
}

function validarRegistro(form) {
  const d = Object.fromEntries(new FormData(form));
  const errores = {};
  const nombre = (d.nombre || "").trim();
  if (nombre.length < 2) errores.nombre = "Escribe tu nombre.";
  const correo = (d.correo || "").trim();
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) errores.correo = "Revisa el correo: falta algo (ej. nombre@correo.cl).";
  const tel = (d.telefono || "").replace(/[\s()-]/g, "");
  if (tel && !/^\+?\d{8,15}$/.test(tel)) errores.tel = "Escribe solo números, con código de país (ej. +56912345678).";
  if (!d.sexo) errores.sexo = "Elige una opción para calcular tu intervalo.";
  const editar = !form.consentimiento;
  if (!editar && !form.consentimiento.checked) errores.consent = "Necesitamos tu autorización para guardar los datos.";
  return { errores, datos: { nombre, correo, telefono: tel, sexo: d.sexo, ultimaDonacion: d.ultimaDonacion || "" } };
}

function vistaPerfil() {
  if (!estado.usuario && !estado.evaluaciones.length) {
    return `${barra({ titulo: "Perfil" })}
      <div class="vacio"><p><b>Aún no tienes perfil</b></p><p>Empieza por la autoevaluación: tus puntos e insignias aparecerán aquí.</p>
        <div class="acciones"><a class="btn btn-primario" href="#/evaluacion" data-accion="empezar">Hacer la autoevaluación</a>
        <a class="btn btn-secundario" href="#/perfil/editar">Crear mi perfil</a></div></div>
      ${herramientasDemo()}`;
  }
  const u = estado.usuario;
  const pts = estado.progreso.puntos;
  const { actual, siguiente } = nivel(pts);
  const pct = siguiente ? Math.min(1, (pts - actual.min) / (siguiente.min - actual.min)) : 1;
  const tiene = new Set(estado.progreso.insignias);
  const proxima = u?.ultimaDonacion && u?.sexo ? proximaFechaPermitida(u.ultimaDonacion, u.sexo) : null;

  const historia = [
    ...estado.evaluaciones.map((e) => ({ f: e.fecha.slice(0, 10), t: "Autoevaluación", d: RESULTADOS[e.codigo]?.titulo })),
    ...estado.citas.map((c) => ({ f: c.creada.slice(0, 10), t: "Hora " + ({ agendada: "agendada", cancelada: "cancelada", donada: "asistida", no_asistio: "no asistida" })[c.estado], d: `${fechaCorta(c.fecha)}, ${c.hora}` })),
    ...estado.donaciones.map((d) => ({ f: d.fecha, t: "Donación registrada", d: fechaCorta(d.fecha) })),
  ].sort((a, b) => b.f.localeCompare(a.f)).slice(0, 8);

  return `${barra({ titulo: "Perfil", puntos: false })}
    <section class="nivel" aria-labelledby="t-nivel">
      <h1 id="t-nivel" tabindex="-1">${u ? esc(u.nombre) : "Tu progreso"}</h1>
      <p class="pts">${pts}<small>puntos · ${esc(actual.nombre)}</small></p>
      <div class="barra-nivel" role="progressbar" aria-label="Avance al siguiente nivel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct * 100)}"><span style="transform: scaleX(${pct})"></span></div>
      <p class="meta">${siguiente ? `Te faltan ${siguiente.min - pts} puntos para “${esc(siguiente.nombre)}”.` : "Llegaste al nivel más alto. Gracias por donar."}</p>
    </section>

    <section class="seccion" aria-labelledby="t-ins">
      <h2 id="t-ins">Insignias <span class="pista">${tiene.size} de ${INSIGNIAS.length}</span></h2>
      <ul class="insignias" role="list" style="list-style:none;margin:0;padding:0">
        ${INSIGNIAS.map((i) => `<li class="insignia ${tiene.has(i.id) ? "" : "bloqueada"}"><span class="disco">${icon(tiene.has(i.id) ? i.icono : "lock")}</span><strong>${esc(i.nombre)}</strong><span>${esc(i.detalle)}</span></li>`).join("")}
      </ul>
      <div class="acciones"><button type="button" class="btn btn-suave" data-accion="compartir">${icon("heart-handshake")}Invitar a alguien a donar</button></div>
    </section>

    ${u ? `<section class="seccion" aria-labelledby="t-datos">
      <h2 id="t-datos">Mis datos</h2>
      <dl class="datos">
        <div><dt>Correo</dt><dd>${esc(u.correo || "—")}</dd></div>
        <div><dt>WhatsApp</dt><dd>${esc(u.telefono || "—")}</dd></div>
        <div><dt>Intervalo</dt><dd>${u.sexo ? `${MESES_INTERVALO[u.sexo]} meses` : "—"}</dd></div>
        <div><dt>Última donación</dt><dd>${u.ultimaDonacion ? esc(fechaCorta(u.ultimaDonacion)) : "—"}</dd></div>
        ${proxima ? `<div><dt>Puedes volver desde</dt><dd>${esc(fechaCorta(proxima))}</dd></div>` : ""}
      </dl>
      <div class="acciones"><a class="btn btn-secundario" href="#/perfil/editar">${icon("pencil")}Editar mis datos</a></div>
    </section>` : `<div class="acciones"><a class="btn btn-secundario" href="#/perfil/editar">Crear mi perfil</a></div>`}

    ${historia.length ? `<section class="seccion" aria-labelledby="t-hist"><h2 id="t-hist">Historial</h2>
      <ul class="historial">${historia.map((h) => `<li><div><b>${esc(h.t)}</b><time datetime="${h.f}">${esc(fechaCorta(h.f))}</time></div><span>${esc(h.d || "")}</span></li>`).join("")}</ul></section>` : ""}

    <section class="seccion" aria-labelledby="t-priv">
      <h2 id="t-priv">Privacidad</h2>
      <p>Tus datos están solo en este dispositivo. Las respuestas del cuestionario no se guardan.</p>
      <div class="acciones"><button type="button" class="btn btn-secundario" data-accion="borrar" data-confirmar="0">${icon("trash-2")}Borrar mis datos</button></div>
    </section>
    ${herramientasDemo()}`;
}

function herramientasDemo() {
  return `<details class="seccion">
    <summary class="enlace-btn">Herramientas de demostración</summary>
    <p class="pista">Para presentar el prototipo: simulan situaciones sin esperar días reales.</p>
    <div class="acciones">
      <button type="button" class="btn btn-suave" data-accion="demo-pasada">Simular que mi hora ya pasó</button>
      <button type="button" class="btn btn-suave" data-accion="demo-recordatorio">Probar un recordatorio ahora</button>
    </div>
  </details>`;
}

// ---- Mi hora ----

function vistaAgenda() {
  const cita = citaActiva(estado);
  const pendientes = citasPorConfirmar(estado);
  const u = estado.usuario;

  if (pendientes.length) {
    const c = pendientes[0];
    return `${barra({ titulo: "Mi hora" })}
      <section class="confirmar-donacion" aria-labelledby="t-conf">
        <h2 id="t-conf" tabindex="-1">¿Pudiste donar el ${esc(fechaLarga(c.fecha))}?</h2>
        <p>Si donaste, calculamos cuándo puedes volver y te lo recordamos.</p>
        <div class="acciones">
          <button type="button" class="btn btn-primario" data-accion="done" data-codigo="${c.codigo}">${icon("droplet")}Sí, doné</button>
          <button type="button" class="btn btn-secundario" data-accion="no-fui" data-codigo="${c.codigo}">No pude ir</button>
        </div>
      </section>`;
  }

  if (!cita) {
    const proxima = u?.ultimaDonacion && u?.sexo ? proximaFechaPermitida(u.ultimaDonacion, u.sexo) : null;
    if (proxima && proxima > hoyLocal()) {
      return `${barra({ titulo: "Mi hora" })}
        <section class="resultado tono-ok" aria-labelledby="t-prox">
          <span class="sello">${icon("calendar-check")}</span>
          <h1 id="t-prox" tabindex="-1">Puedes volver a donar desde el ${esc(fechaLarga(proxima))}</h1>
          <p>Faltan ${diasHasta(proxima)} días. Guárdalo en tu calendario y te avisamos.</p>
        </section>
        <div class="acciones"><button type="button" class="btn btn-primario" data-accion="ics-volver" data-fecha="${proxima}">${icon("download")}Agregar a mi calendario</button></div>`;
    }
    return `${barra({ titulo: "Mi hora" })}
      <div class="vacio"><p><b>No tienes horas agendadas</b></p><p>Haz la autoevaluación y agenda en el mismo paso.</p>
      <div class="acciones"><a class="btn btn-primario" href="${ultimaEvaluacion() && puedeAgendar().ok ? "#/agendar" : "#/evaluacion"}" data-accion="${ultimaEvaluacion() && puedeAgendar().ok ? "" : "empezar"}">Agendar una hora</a></div></div>`;
  }

  const recs = planRecordatorios(cita, extrasQueLlevar(cita));
  const ahora = Date.now();
  const futuros = recs.filter((r) => new Date(r.cuando).getTime() > ahora);
  const guardados = new Set(estado.avisos.enviados);
  const notifOk = "Notification" in window && Notification.permission === "granted";

  return `${barra({ titulo: "Mi hora" })}
    ${ticket(cita)}
    ${cita.revision ? `<p class="nota-legal">${icon("info")}<span>Un profesional revisará tus antecedentes antes de la donación.</span></p>` : ""}

    <section class="seccion" aria-labelledby="t-canales">
      <h2 id="t-canales">Que no se te olvide</h2>
      <div class="canales">
        <button type="button" class="canal ${guardados.has("ics") ? "hecho" : ""}" data-accion="ics">${icon(guardados.has("ics") ? "circle-check-big" : "calendar-days")}<div>Agregar a mi calendario<span>Archivo con alarma el día antes y 2 horas antes</span></div></button>
        <a class="canal ${guardados.has("google") ? "hecho" : ""}" href="${enlaceGoogleCalendar(cita)}" target="_blank" rel="noopener" data-canal="google">${icon(guardados.has("google") ? "circle-check-big" : "calendar-check")}<div>Google Calendar<span>Se abre en una pestaña nueva</span></div></a>
        <a class="canal ${guardados.has("whatsapp") ? "hecho" : ""}" href="${enlaceWhatsApp(cita, u?.telefono)}" target="_blank" rel="noopener" data-canal="whatsapp">${icon(guardados.has("whatsapp") ? "circle-check-big" : "message-circle")}<div>Enviarme por WhatsApp<span>${u?.telefono ? `A ${esc(u.telefono)}` : "Elige a quién enviarlo"}</span></div></a>
        <a class="canal ${guardados.has("correo") ? "hecho" : ""}" href="${enlaceCorreo(cita, u?.correo)}" data-canal="correo">${icon(guardados.has("correo") ? "circle-check-big" : "mail")}<div>Enviarme por correo<span>${u?.correo ? esc(u.correo) : "Se abre tu app de correo"}</span></div></a>
        ${"Notification" in window ? `<button type="button" class="canal ${notifOk ? "hecho" : ""}" data-accion="notificaciones" ${notifOk ? "aria-disabled=\"true\"" : ""}>${icon(notifOk ? "circle-check-big" : "bell")}<div>${notifOk ? "Avisos activados" : "Activar avisos en este navegador"}<span>Te avisamos al abrir la app cuando toque un recordatorio</span></div></button>` : ""}
      </div>
    </section>

    <section class="seccion" aria-labelledby="t-recs">
      <h2 id="t-recs">Tus recordatorios</h2>
      ${futuros.length ? `<ul class="recordatorios">
        ${futuros.map((r) => {
          const f = new Date(r.cuando);
          return `<li><time datetime="${r.cuando}">${f.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "")}<br>${f.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</time><div><strong>${esc(r.titulo)}</strong><span>${esc(r.texto)}</span></div></li>`;
        }).join("")}
      </ul>` : `<p class="pista">Ya pasaron todos los recordatorios previos a tu hora.</p>`}
    </section>

    <section class="seccion" aria-labelledby="t-cambios">
      <h2 id="t-cambios">¿Cambio de planes?</h2>
      <div class="acciones">
        <button type="button" class="btn btn-secundario" data-accion="reprogramar">${icon("rotate-ccw")}Cambiar día u hora</button>
        <button type="button" class="btn btn-secundario" data-accion="cancelar" data-confirmar="0">${icon("calendar-x")}Cancelar mi hora</button>
      </div>
    </section>`;
}

// ---- Aprende ----

function vistaAprende() {
  const leidos = new Set(estado.progreso.leidos);
  const resp = Object.keys(estado.progreso.mitos).length;
  return `${barra({ titulo: "Aprende" })}
    <section aria-labelledby="t-mitos2">
      <a class="guia" href="#/aprende/mitos">
        <strong id="t-mitos2">Mito o realidad</strong>
        <span>${resp ? `${resp} de ${MITOS.length} respondidos` : `${MITOS.length} ideas que escuchamos seguido. ¿Cuántas aciertas?`}</span>
        ${icon("chevron-right")}
      </a>
      ${GUIAS.map((g) => `<a class="guia" href="#/aprende/${g.id}">
        <strong>${esc(g.titulo)}</strong>
        <span>${esc(g.resumen)}${leidos.has(g.id) ? ` · <b class="leido">Leído</b>` : ""}</span>
        ${icon("chevron-right")}
      </a>`).join("")}
    </section>
    <p class="aviso-validacion">${icon("info")}<span>Contenido educativo en revisión por el equipo de salud (TSLB). No reemplaza la orientación de un profesional.</span></p>`;
}

function vistaMitos() {
  const r = estado.progreso.mitos;
  const aciertos = Object.values(r).filter(Boolean).length;
  const resp = Object.keys(r).length;
  return `${barra({ titulo: "Mito o realidad", atras: "#/aprende" })}
    <p class="pista" aria-live="polite">${resp ? `Llevas ${aciertos} de ${resp} correctas.` : "Toca Mito o Realidad en cada frase."}</p>
    <div class="mitos">
      ${MITOS.map((m) => {
        const respondido = m.id in r;
        return `<article class="mito" id="mito-${m.id}">
          <p class="afirmacion">“${esc(m.afirmacion)}”</p>
          ${respondido ? veredicto(m, r[m.id], false) : `<div class="botones">
            <button type="button" class="btn btn-secundario" data-mito="${m.id}" data-dice="mito">Mito</button>
            <button type="button" class="btn btn-secundario" data-mito="${m.id}" data-dice="realidad">Realidad</button>
          </div>`}
        </article>`;
      }).join("")}
    </div>
    <p class="aviso-validacion">${icon("info")}<span>Contenido en revisión por el equipo de salud (TSLB).</span></p>`;
}

function veredicto(m, acerto, animar) {
  return `<div class="veredicto ${acerto ? "acierto" : "error-m"} ${animar ? "veredicto-entra" : ""}">
    <b>${icon(acerto ? "circle-check-big" : "x")}${acerto ? "¡Correcto!" : "No exactamente:"} ${acerto ? "Es" : "es"} ${m.esMito ? "un mito" : "una realidad"}.</b>
    <p>${esc(m.explicacion)}</p></div>`;
}

function vistaGuia(id) {
  const g = GUIAS.find((x) => x.id === id);
  if (!g) return vistaNoEncontrada();
  if (!estado.progreso.leidos.includes(id)) {
    estado.progreso.leidos.push(id);
    setTimeout(() => premiar("leer", "Guía leída"), 400);
  }
  return `${barra({ titulo: "", atras: "#/aprende" })}
    <h1 tabindex="-1" style="font-size:2rem">${esc(g.titulo)}</h1>
    <p class="pista" style="margin-top:8px">${esc(g.resumen)}</p>
    <ol class="pasos-guia">${g.pasos.map(([t, d]) => `<li><strong>${esc(t)}</strong><span>${esc(d)}</span></li>`).join("")}</ol>
    <p class="aviso-validacion">${icon("info")}<span>Contenido en revisión por el equipo de salud (TSLB).</span></p>
    <div class="acciones"><a class="btn btn-primario" href="${citaActiva(estado) ? "#/agenda" : "#/evaluacion"}">${citaActiva(estado) ? "Ver mi hora" : "Hacer la autoevaluación"}</a></div>`;
}

function vistaNoEncontrada() {
  return `${barra()}<div class="vacio"><p><b>No encontramos esta página.</b></p><div class="acciones"><a class="btn btn-primario" href="#/">Ir al inicio</a></div></div>`;
}

// ---------------- Router ----------------

function irA(hash) {
  if (location.hash === hash) render(); else location.hash = hash;
}

const RUTAS = {
  "": vistaInicio,
  evaluacion: vistaEvaluacion,
  resultado: vistaResultado,
  agendar: vistaAgendar,
  agenda: vistaAgenda,
  aprende: vistaAprende,
  "aprende/mitos": vistaMitos,
  perfil: vistaPerfil,
  "perfil/editar": () => vistaRegistro({ siguiente: "#/perfil", editar: !!estado.usuario }),
};

let rutaAnterior = null;

function render() {
  const ruta = location.hash.replace(/^#\/?/, "");

  // Rutas de acción
  if (ruta === "evaluacion/atras") { retroceder(); history.replaceState(null, "", "#/evaluacion"); return render(); }
  if (ruta === "agendar/lugar") { sesion.agendar = {}; guardarSesion(); history.replaceState(null, "", "#/agendar"); return render(); }

  let html;
  if (RUTAS[ruta]) html = RUTAS[ruta]();
  else if (ruta.startsWith("aprende/")) html = vistaGuia(ruta.split("/")[1]);
  else html = vistaNoEncontrada();
  if (html === "") return;

  const vista = $("#vista");
  const cambioDeRuta = rutaAnterior !== ruta;
  vista.innerHTML = html;
  vista.classList.remove("vista-entra");
  if (cambioDeRuta && ruta !== "evaluacion") { void vista.offsetWidth; vista.classList.add("vista-entra"); }

  $$("[data-icon]").forEach((el) => { el.outerHTML = icon(el.dataset.icon); });
  const barraAvance = vista.querySelector(".progreso span[data-hasta]");
  if (barraAvance) requestAnimationFrame(() => requestAnimationFrame(() => { barraAvance.style.transform = `scaleX(${barraAvance.dataset.hasta})`; }));

  // Navegación inferior: se oculta durante el cuestionario para no distraer.
  const enFlujo = ruta === "evaluacion";
  document.body.classList.toggle("nav-oculta", enFlujo);
  const seccion = ruta.startsWith("aprende") ? "aprende" : ruta.startsWith("agenda") ? "agenda" : ruta.startsWith("perfil") ? "perfil" : ruta === "" ? "inicio" : null;
  $$("[data-nav]").forEach((a) => { if (a.dataset.nav === seccion) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });

  // Foco: al cambiar de pantalla, el foco va al título (lectores de pantalla).
  if (cambioDeRuta || ruta === "evaluacion") {
    const titulo = vista.querySelector("h1[tabindex], h2[tabindex]");
    if (titulo && rutaAnterior !== null) titulo.focus({ preventScroll: true });
    if (cambioDeRuta) window.scrollTo(0, 0);
  }
  rutaAnterior = ruta;

  document.title = {
    "": "Gota · Dona sangre sin vueltas", evaluacion: "Autoevaluación · Gota", resultado: "Tu resultado · Gota",
    agendar: "Agendar · Gota", agenda: "Mi hora · Gota", aprende: "Aprende · Gota", perfil: "Perfil · Gota",
  }[ruta] || "Gota";
}

// ---------------- Eventos ----------------

$("#toast").addEventListener("click", ocultarToast);

document.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-responder],[data-accion],[data-centro],[data-fecha],[data-hora],[data-mito],[data-canal]");
  if (!t) return;

  if (t.dataset.responder) {
    $$(".opcion").forEach((b) => b.setAttribute("aria-pressed", String(b === t)));
    return responder(t.dataset.responder, t.dataset.valor);
  }
  if (t.dataset.centro) { sesion.agendar = { centroId: t.dataset.centro }; guardarSesion(); return render(); }
  if (t.classList.contains("dia")) { sesion.agendar.fecha = t.dataset.fecha; sesion.agendar.hora = null; guardarSesion(); const x = $(".dias").scrollLeft; render(); $(".dias").scrollLeft = x; return; }
  if (t.dataset.hora) {
    sesion.agendar.hora = t.dataset.hora; guardarSesion();
    const x = $(".dias").scrollLeft; render(); $(".dias").scrollLeft = x;
    $(`[data-hora="${t.dataset.hora}"]`)?.focus({ preventScroll: true });
    $(".resumen")?.scrollIntoView({ block: "nearest", behavior: reduceMotion() ? "auto" : "smooth" });
    return;
  }
  if (t.dataset.mito) {
    const m = MITOS.find((x) => x.id === t.dataset.mito);
    if (m.id in estado.progreso.mitos) return;
    const acerto = (t.dataset.dice === "mito") === m.esMito;
    estado.progreso.mitos[m.id] = acerto;
    persistir();
    const art = $(`#mito-${m.id}`);
    art.querySelector(".botones").outerHTML = veredicto(m, acerto, true);
    const resp = Object.keys(estado.progreso.mitos).length;
    const aciertos = Object.values(estado.progreso.mitos).filter(Boolean).length;
    $(".pista").textContent = `Llevas ${aciertos} de ${resp} correctas.`;
    if (acerto) premiar("mitoAcierto", "¡Correcto!");
    else { const n = revisarInsignias(estado, MITOS.length, GUIAS.length); persistir(); if (n.length) toast(`Insignia: ${n[0].nombre}`, n[0].detalle, n[0].icono); }
    return;
  }
  if (t.dataset.canal) {
    marcarCanal(t.dataset.canal);
    return; // el enlace sigue su curso
  }

  switch (t.dataset.accion) {
    case "empezar":
      sesion = sesionNueva(); guardarSesion();
      break;
    case "repetir":
      sesion = sesionNueva(); guardarSesion(); irA("#/evaluacion");
      break;
    case "ver-resultado":
      finalizarEvaluacion();
      break;
    case "confirmar-cita":
      confirmarCita();
      break;
    case "ics": {
      const cita = citaActiva(estado);
      if (!cita) return;
      descargar(`donacion-${cita.fecha}.ics`, archivoICS(cita), "text/calendar;charset=utf-8");
      marcarCanal("ics");
      break;
    }
    case "ics-volver": {
      const f = t.dataset.fecha;
      const evento = { codigo: "VOLVER" + f.replace(/-/g, ""), centroId: null, fecha: f, hora: "10:00" };
      descargar(`volver-a-donar-${f}.ics`, archivoICS(evento).replace("SUMMARY:Donación de sangre", "SUMMARY:Ya puedes volver a donar sangre"), "text/calendar;charset=utf-8");
      marcarCanal("ics");
      break;
    }
    case "notificaciones": {
      if (!("Notification" in window) || Notification.permission === "granted") return;
      const p = await Notification.requestPermission();
      if (p === "granted") { estado.avisos.notificaciones = true; marcarCanal("notificaciones"); }
      else toast("No se activaron los avisos", "Puedes usar el calendario o WhatsApp.", "info");
      render();
      break;
    }
    case "reprogramar": {
      const cita = citaActiva(estado);
      if (!cita) return;
      cita.estado = "cancelada";
      sesion.agendar = { centroId: cita.centroId };
      persistir(); guardarSesion();
      toast("Elige tu nueva hora", "Tu hora anterior quedó liberada.", "rotate-ccw");
      irA("#/agendar");
      break;
    }
    case "cancelar": case "borrar": {
      // Confirmación en dos toques, sin modal.
      if (t.dataset.confirmar === "0") {
        t.dataset.confirmar = "1";
        t.innerHTML = `${icon("circle-alert")}${t.dataset.accion === "cancelar" ? "Toca otra vez para cancelar" : "Toca otra vez para borrar todo"}`;
        t.classList.add("btn-primario"); t.classList.remove("btn-secundario");
        setTimeout(() => { if (t.isConnected && t.dataset.confirmar === "1") render(); }, 4000);
        return;
      }
      if (t.dataset.accion === "cancelar") {
        const cita = citaActiva(estado);
        if (cita) cita.estado = "cancelada";
        persistir(); toast("Cancelamos tu hora", "Puedes agendar otra cuando quieras.", "calendar-x"); render();
      } else {
        localStorage.removeItem("gota.v1"); sessionStorage.removeItem(SESION);
        estado = estadoInicial(); sesion = sesionNueva();
        toast("Borramos tus datos de este dispositivo", "", "trash-2"); irA("#/");
      }
      break;
    }
    case "done": {
      const cita = estado.citas.find((c) => c.codigo === t.dataset.codigo);
      if (!cita) return;
      cita.estado = "donada";
      estado.donaciones.push({ fecha: cita.fecha, citaCodigo: cita.codigo });
      if (estado.usuario) estado.usuario.ultimaDonacion = cita.fecha;
      persistir();
      premiar("donacion", "¡Gracias por donar!");
      render();
      break;
    }
    case "no-fui": {
      const cita = estado.citas.find((c) => c.codigo === t.dataset.codigo);
      if (cita) cita.estado = "no_asistio";
      persistir(); toast("Está bien, pasa", "Puedes agendar otra hora cuando quieras.", "info"); render();
      break;
    }
    case "compartir": {
      const datos = { title: "Gota · Dona sangre", text: "Revisa en un minuto si puedes donar sangre y agenda tu hora:", url: location.origin + location.pathname };
      try {
        if (navigator.share) await navigator.share(datos);
        else window.open(`https://wa.me/?text=${encodeURIComponent(datos.text + " " + datos.url)}`, "_blank", "noopener");
        estado.progreso.compartido += 1;
        premiar("compartir", "Gracias por compartir");
      } catch { /* la persona cerró el menú de compartir */ }
      break;
    }
    case "demo-pasada": {
      const cita = citaActiva(estado);
      if (!cita) { toast("Primero agenda una hora", "", "info"); return; }
      const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
      cita.fecha = hoyLocal(ayer);
      persistir(); irA("#/agenda");
      break;
    }
    case "demo-recordatorio": {
      const cita = citaActiva(estado);
      const r = cita ? planRecordatorios(cita, extrasQueLlevar(cita))[1] : { titulo: "Mañana donas sangre", texto: "Duerme al menos 5 horas esta noche." };
      mostrarRecordatorio(r);
      break;
    }
    default:
      break;
  }
});

document.addEventListener("change", (e) => {
  if (e.target.id === "declaro") {
    sesion.declaracion = e.target.checked; guardarSesion();
    $('[data-accion="ver-resultado"]').disabled = !e.target.checked;
  }
});

document.addEventListener("submit", (e) => {
  const form = e.target;
  e.preventDefault();
  if (form.dataset.form === "registro") {
    const { errores, datos } = validarRegistro(form);
    const campos = { nombre: "f-nombre", correo: "f-correo", tel: "f-tel" };
    for (const k of ["nombre", "correo", "tel", "sexo", "consent"]) {
      const p = $(`#e-${k}`, form); if (p) p.textContent = errores[k] || "";
      if (campos[k]) $(`#${campos[k]}`, form).setAttribute("aria-invalid", String(!!errores[k]));
    }
    if (Object.keys(errores).length) {
      const primero = form.querySelector('[aria-invalid="true"]') || form.querySelector(`#e-${Object.keys(errores)[0]}`)?.closest(".campo")?.querySelector("input");
      primero?.focus();
      return;
    }
    const nuevo = !estado.usuario;
    estado.usuario = { ...(estado.usuario || {}), ...datos, creado: estado.usuario?.creado || new Date().toISOString() };
    persistir();
    if (nuevo) premiar("perfil", "Perfil creado"); else toast("Guardamos tus cambios");
    irA(form.dataset.siguiente || "#/perfil");
  }
  if (form.dataset.form === "intervalo") {
    const d = Object.fromEntries(new FormData(form));
    const err = $("#calc-error");
    if (!d.ultima || !d.sexo) { err.textContent = "Completa la fecha y elige tu intervalo."; return; }
    if (d.ultima > hoyLocal()) { err.textContent = "La fecha no puede ser futura."; return; }
    const desde = proximaFechaPermitida(d.ultima, d.sexo);
    sesion.desde = desde > hoyLocal() ? desde : null;
    if (estado.usuario) { estado.usuario.ultimaDonacion = d.ultima; estado.usuario.sexo = d.sexo; persistir(); }
    else sesion.perfilPrevio = { ultimaDonacion: d.ultima, sexo: d.sexo };
    guardarSesion();
    toast(sesion.desde ? `Puedes donar desde el ${fechaLarga(desde)}` : "Ya cumples el intervalo", "Elige tu hora.", "calendar-check");
    irA("#/agendar");
  }
});

function marcarCanal(canal) {
  const env = estado.avisos.enviados;
  if (!env.includes(canal)) env.push(canal);
  const primero = !env.includes("guardado");
  if (primero) env.push("guardado");
  persistir();
  if (primero) premiar("recordatorio", "Recordatorio guardado");
  setTimeout(render, 300);
}

// ---------------- Recordatorios dentro de la app ----------------

function mostrarRecordatorio(r) {
  toast(r.titulo, r.texto, "bell");
  if ("Notification" in window && Notification.permission === "granted") {
    try { new Notification(r.titulo, { body: r.texto, icon: "img/gota-180.png", tag: r.id }); } catch { /* algunos navegadores móviles exigen service worker */ }
  }
}

function revisarRecordatorios() {
  const cita = citaActiva(estado);
  if (!cita) return;
  const ahora = Date.now();
  const inicio = inicioCita(cita).getTime();
  const pendientes = planRecordatorios(cita).filter((r) => {
    const t = new Date(r.cuando).getTime();
    return t <= ahora && ahora < inicio + 86400000 && !estado.avisos.enviados.includes(`${cita.codigo}:${r.id}`);
  });
  const r = pendientes[pendientes.length - 1];
  if (!r) return;
  pendientes.forEach((p) => estado.avisos.enviados.push(`${cita.codigo}:${p.id}`));
  persistir();
  mostrarRecordatorio(r);
}

// ---------------- Inicio ----------------

window.addEventListener("hashchange", render);
render();
setTimeout(revisarRecordatorios, 1200);
document.addEventListener("visibilitychange", () => { if (!document.hidden) revisarRecordatorios(); });

// Exponer para pruebas automatizadas (solo lectura).
window.__gota = { get estado() { return structuredClone(estado); }, get sesion() { return structuredClone(sesion); } };
