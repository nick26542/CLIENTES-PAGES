// Pruebas de extremo a extremo (Playwright) en celular y escritorio.
// Uso: node tests/e2e.mjs [url] [carpeta-capturas]
// Por defecto levanta un servidor estático local en el puerto 4173.
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CAPTURAS = process.argv[3] || join(RAIZ, "docs", "capturas");
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };

function servidor() {
  return new Promise((ok) => {
    const s = createServer(async (req, res) => {
      const ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
      const archivo = join(RAIZ, ruta.endsWith("/") ? ruta + "index.html" : ruta);
      try {
        const data = await readFile(archivo);
        res.writeHead(200, { "content-type": TIPOS[extname(archivo)] || "application/octet-stream" });
        res.end(data);
      } catch { res.writeHead(404); res.end("no encontrado"); }
    });
    s.listen(4173, () => ok(s));
  });
}

const resultados = [];
async function prueba(id, nombre, fn) {
  const t0 = Date.now();
  try { await fn(); resultados.push({ id, nombre, ok: true, ms: Date.now() - t0 }); console.log(`✓ ${id} ${nombre}`); }
  catch (e) { resultados.push({ id, nombre, ok: false, error: String(e.message).split("\n")[0] }); console.log(`✗ ${id} ${nombre}\n   ${e.message.split("\n")[0]}`); }
}
const esperar = (cond, msg) => { if (!cond) throw new Error(msg); };

async function responder(page, valores) {
  for (const v of valores) {
    const btn = page.locator(`.opcion[data-valor="${v}"]`).first();
    await btn.waitFor({ state: "visible", timeout: 3000 });
    await btn.click();
    await page.waitForTimeout(260);
  }
}

// Respuestas de una persona sin antecedentes (camino feliz, 23 preguntas)
const FELIZ = ["si", "18a59", "si", "si", "si", "nunca", ...Array(17).fill("no")];

async function main() {
  const url = process.argv[2];
  const srv = url ? null : await servidor();
  const BASE = url || "http://localhost:4173/";
  await mkdir(CAPTURAS, { recursive: true });
  const browser = await chromium.launch();

  const errores = [];
  const nuevo = async (perfil) => {
    const ctx = await browser.newContext(perfil === "movil" ? { ...devices["iPhone 13"], locale: "es-CL", timezoneId: "America/Santiago" } : { viewport: { width: 1440, height: 900 }, locale: "es-CL", timezoneId: "America/Santiago" });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errores.push(`${perfil}: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errores.push(`${perfil}: ${m.text()}`); });
    await page.goto(BASE);
    return { ctx, page };
  };
  const foto = async (page, nombre) => { await page.waitForTimeout(450); await page.evaluate(() => { const t = document.getElementById("toast"); if (t) { t.style.transition = "none"; t.hidden = true; } }); return page.screenshot({ path: join(CAPTURAS, nombre + ".png") }); };

  for (const perfil of ["movil", "escritorio"]) {
    const P = perfil === "movil" ? "M" : "E";
    const { ctx, page } = await nuevo(perfil);

    await prueba(`PF-${P}01`, `[${perfil}] Carga la portada sin errores`, async () => {
      await page.locator("h1").first().waitFor();
      esperar((await page.locator("h1").first().textContent()).includes("Dona sangre"), "título no encontrado");
      await foto(page, `${perfil}-01-inicio`);
    });

    await prueba(`PF-${P}02`, `[${perfil}] Autoevaluación completa → resultado apto (Q)`, async () => {
      await page.click('[data-accion="empezar"]');
      await page.locator(".opcion").first().waitFor();
      await foto(page, `${perfil}-02-pregunta`);
      await responder(page, FELIZ.slice(0, 18));
      await foto(page, `${perfil}-03-pregunta-sensible`);
      await responder(page, FELIZ.slice(18));
      await page.locator("#declaro").waitFor();
      esperar(await page.locator('[data-accion="ver-resultado"]').isDisabled(), "botón de resultado debía estar deshabilitado");
      await foto(page, `${perfil}-04-declaracion`);
      await page.check("#declaro");
      await page.click('[data-accion="ver-resultado"]');
      await page.locator(".resultado.tono-ok").waitFor();
      await page.waitForTimeout(600);
      await foto(page, `${perfil}-05-resultado-apto`);
    });

    await prueba(`PF-${P}03`, `[${perfil}] Registro valida campos obligatorios`, async () => {
      await page.click('a[href="#/agendar"]');
      await page.locator('form[data-form="registro"]').waitFor();
      await page.click('form[data-form="registro"] button[type="submit"]');
      esperar((await page.locator("#e-nombre").textContent()).length > 0, "sin error de nombre");
      esperar((await page.locator("#e-consent").textContent()).length > 0, "sin error de consentimiento");
      await page.fill("#f-correo", "correo-malo");
      await page.click('form[data-form="registro"] button[type="submit"]');
      esperar((await page.locator("#e-correo").textContent()).length > 0, "correo inválido aceptado");
      await foto(page, `${perfil}-06-registro-errores`);
      await page.fill("#f-nombre", "Camila Rojas");
      await page.fill("#f-correo", "camila@ejemplo.cl");
      await page.fill("#f-tel", "+56 9 1234 5678");
      await page.click('label:has(input[name="sexo"][value="mujer"])');
      await page.check('input[name="consentimiento"]');
      await page.click('form[data-form="registro"] button[type="submit"]');
      await page.locator(".centro").first().waitFor();
    });

    await prueba(`PF-${P}04`, `[${perfil}] Agendamiento: lugar, día, hora y confirmación`, async () => {
      await foto(page, `${perfil}-07-lugares`);
      await page.click('.centro[data-centro="centro"]');
      await page.locator(".dia").first().waitFor();
      const libre = page.locator(".hora:not([disabled])").first();
      await libre.click();
      await page.locator(".resumen").waitFor();
      await foto(page, `${perfil}-08-dia-hora`);
      await page.click('[data-accion="confirmar-cita"]');
      await page.locator(".ticket").waitFor();
      const est = await page.evaluate(() => window.__gota.estado);
      esperar(est.citas.length === 1 && est.citas[0].estado === "agendada", "cita no guardada");
      await page.waitForTimeout(400);
      await foto(page, `${perfil}-09-mi-hora`);
    });

    await prueba(`PF-${P}05`, `[${perfil}] Recordatorio: descarga de calendario (.ics)`, async () => {
      const [descarga] = await Promise.all([page.waitForEvent("download"), page.click('[data-accion="ics"]')]);
      esperar(descarga.suggestedFilename().endsWith(".ics"), "no es .ics");
      const est = await page.evaluate(() => window.__gota.estado);
      esperar(est.progreso.insignias.includes("alDia"), "sin insignia de recordatorio");
    });

    await prueba(`PF-${P}06`, `[${perfil}] Enlaces de WhatsApp, Google Calendar y correo bien formados`, async () => {
      const wa = await page.getAttribute('[data-canal="whatsapp"]', "href");
      esperar(wa.startsWith("https://wa.me/56912345678?text="), "WhatsApp: " + wa);
      const g = await page.getAttribute('[data-canal="google"]', "href");
      esperar(g.startsWith("https://calendar.google.com/calendar/render?action=TEMPLATE"), "Google: " + g);
      const m = await page.getAttribute('[data-canal="correo"]', "href");
      esperar(m.startsWith("mailto:camila%40ejemplo.cl?subject="), "correo: " + m);
    });

    await prueba(`PF-${P}07`, `[${perfil}] Impide agendar dos horas a la vez`, async () => {
      await page.goto(BASE + "#/agendar");
      await page.locator(".vacio").waitFor();
      esperar((await page.locator(".vacio").textContent()).includes("Ya tienes una hora"), "permitió doble agenda");
      await page.goto(BASE + "#/agenda");
    });

    await prueba(`PF-${P}08`, `[${perfil}] Reprogramar libera la hora anterior`, async () => {
      await page.click('[data-accion="reprogramar"]');
      await page.locator(".hora").first().waitFor();
      await page.locator(".dia").nth(2).click();
      await page.locator(".hora:not([disabled])").first().click();
      await page.click('[data-accion="confirmar-cita"]');
      await page.locator(".ticket").waitFor();
      const est = await page.evaluate(() => window.__gota.estado);
      esperar(est.citas.filter((c) => c.estado === "agendada").length === 1, "más de una cita activa");
      esperar(est.citas.filter((c) => c.estado === "cancelada").length === 1, "la anterior no quedó cancelada");
    });

    await prueba(`PF-${P}09`, `[${perfil}] Registrar donación y calcular próxima fecha (mujer: 4 meses)`, async () => {
      await page.goto(BASE + "#/perfil");
      await page.click("details summary");
      await page.click('[data-accion="demo-pasada"]');
      await page.locator('[data-accion="done"]').waitFor();
      await foto(page, `${perfil}-10-confirmar-donacion`);
      await page.click('[data-accion="done"]');
      await page.locator("#t-prox").waitFor();
      const est = await page.evaluate(() => window.__gota.estado);
      esperar(est.donaciones.length === 1, "donación no registrada");
      esperar(est.progreso.insignias.includes("donante"), "sin insignia donante");
      await foto(page, `${perfil}-11-proxima-fecha`);
    });

    await prueba(`PF-${P}10`, `[${perfil}] Mitos: responde, muestra explicación y suma puntos`, async () => {
      await page.goto(BASE + "#/aprende/mitos");
      const antes = (await page.evaluate(() => window.__gota.estado)).progreso.puntos;
      await page.click('[data-mito="ayunas"][data-dice="mito"]');
      await page.locator("#mito-ayunas .veredicto.acierto").waitFor();
      await page.click('[data-mito="peso"][data-dice="realidad"]');
      await page.locator("#mito-peso .veredicto.error-m").waitFor();
      const despues = (await page.evaluate(() => window.__gota.estado)).progreso.puntos;
      esperar(despues === antes + 10, `puntos ${antes} → ${despues}`);
      await foto(page, `${perfil}-12-mitos`);
    });

    await prueba(`PF-${P}11`, `[${perfil}] Guías educativas y perfil con insignias`, async () => {
      await page.goto(BASE + "#/aprende/despues");
      await page.locator(".pasos-guia li").first().waitFor();
      await foto(page, `${perfil}-13-guia`);
      await page.goto(BASE + "#/perfil");
      await page.locator(".insignia").first().waitFor();
      await page.waitForTimeout(400);
      await foto(page, `${perfil}-14-perfil`);
    });

    await prueba(`PF-${P}12`, `[${perfil}] Las respuestas del cuestionario no quedan guardadas`, async () => {
      const raw = await page.evaluate(() => localStorage.getItem("gota.v1"));
      esperar(!raw.includes("tatuajes") && !raw.includes("parejaNueva"), "se guardaron respuestas sensibles");
    });

    await prueba(`PF-${P}13`, `[${perfil}] Borrar mis datos (confirmación en dos toques)`, async () => {
      await page.click('[data-accion="borrar"]');
      esperar((await page.locator('[data-accion="borrar"]').textContent()).includes("otra vez"), "no pidió confirmación");
      await page.click('[data-accion="borrar"]');
      await page.waitForTimeout(300);
      esperar((await page.evaluate(() => localStorage.getItem("gota.v1"))) === null, "datos no borrados");
    });

    // Caminos de resultado (cuestionario corto en la Etapa 1)
    const caminos = [
      ["PF-" + P + "14", "Sin documento → X", ["no"], ".tono-alto"],
      ["PF-" + P + "15", "17 años sin autorización → F", ["si", "17", "no"], ".tono-pausa"],
      ["PF-" + P + "16", "Durmió poco → J (permite agendar)", ["si", "18a59", "si", "no"], 'a[href="#/agendar"]'],
    ];
    for (const [id, nombre, resp, selector] of caminos) {
      await prueba(id, `[${perfil}] ${nombre}`, async () => {
        await page.goto(BASE + "#/");
        await page.click('[data-accion="empezar"]');
        await responder(page, resp);
        await page.locator(selector).first().waitFor({ timeout: 3000 });
      });
    }

    await prueba(`PF-${P}17`, `[${perfil}] Intervalo no cumplido → calcula fecha y agenda desde esa fecha`, async () => {
      await page.goto(BASE + "#/");
      await page.click('[data-accion="empezar"]');
      await responder(page, ["si", "18a59", "si", "si", "si", "no"]);
      await page.locator('form[data-form="intervalo"]').waitFor();
      await foto(page, `${perfil}-15-intervalo`);
      const hace = new Date(); hace.setMonth(hace.getMonth() - 2);
      const iso = hace.toISOString().slice(0, 10);
      await page.fill("#f-ultima", iso);
      await page.click('form[data-form="intervalo"] label:has(input[value="hombre"])');
      await page.click('form[data-form="intervalo"] button[type="submit"]');
      await page.locator('form[data-form="registro"]').waitFor();
      await page.fill("#f-nombre", "Diego");
      await page.check('input[name="consentimiento"]');
      await page.click('form[data-form="registro"] button[type="submit"]');
      await page.click('.centro[data-centro="campus"]');
      await page.locator(".dia").first().waitFor();
      const primera = await page.getAttribute(".dia", "data-fecha");
      const sesion = await page.evaluate(() => window.__gota.sesion);
      esperar(primera >= sesion.desde, `primer día ${primera} antes de ${sesion.desde}`);
    });

    await prueba(`PF-${P}18`, `[${perfil}] Volver atrás en el cuestionario conserva la respuesta anterior`, async () => {
      await page.goto(BASE + "#/");
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      await page.reload();
      await page.click('[data-accion="empezar"]');
      await responder(page, ["si", "18a59"]);
      await page.click('a[aria-label="Volver"]');
      await page.locator('.opcion[data-valor="18a59"][aria-pressed="true"]').waitFor({ timeout: 2000 });
    });

    await prueba(`PF-${P}19`, `[${perfil}] Sin desborde horizontal en ninguna pantalla`, async () => {
      for (const r of ["#/", "#/aprende", "#/aprende/mitos", "#/aprende/proceso", "#/perfil", "#/agenda", "#/evaluacion"]) {
        await page.goto(BASE + r);
        await page.waitForTimeout(150);
        const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        esperar(desborde <= 0, `${r} desborda ${desborde}px`);
      }
    });

    await prueba(`PF-${P}20`, `[${perfil}] Objetivos táctiles de al menos 44 px`, async () => {
      await page.goto(BASE + "#/");
      await page.click('[data-accion="empezar"]');
      const chicos = await page.evaluate(() => [...document.querySelectorAll("button, a.btn, .nav a, .icono-btn")]
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({ t: el.textContent.trim().slice(0, 20) || el.getAttribute("aria-label"), h: el.getBoundingClientRect().height }))
        .filter((x) => x.h < 44));
      esperar(chicos.length === 0, JSON.stringify(chicos));
    });

    await ctx.close();
  }

  await prueba("PF-X01", "Sin errores de JavaScript en consola durante todas las pruebas", async () => {
    esperar(errores.length === 0, errores.join(" | "));
  });

  await browser.close();
  srv?.close();
  const ok = resultados.filter((r) => r.ok).length;
  console.log(`\n${ok}/${resultados.length} pruebas aprobadas`);
  const { writeFile } = await import("node:fs/promises");
  await writeFile(join(RAIZ, "tests", "resultados-e2e.json"), JSON.stringify({ fecha: new Date().toISOString(), base: BASE, resultados }, null, 2));
  process.exit(ok === resultados.length ? 0 : 1);
}

main();
