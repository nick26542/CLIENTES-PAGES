// Auditoría automática de accesibilidad (axe-core, WCAG 2.1 A/AA) en las pantallas principales.
// Uso: node tests/accesibilidad.mjs <ruta a axe.min.js> [url]
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const axe = await readFile(process.argv[2], "utf8");
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };

const srv = process.argv[3] ? null : createServer(async (req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try { const f = join(RAIZ, ruta.endsWith("/") ? ruta + "index.html" : ruta); res.writeHead(200, { "content-type": TIPOS[extname(f)] || "application/octet-stream" }); res.end(await readFile(f)); }
  catch { res.writeHead(404); res.end(); }
}).listen(4174);
const BASE = process.argv[3] || "http://localhost:4174/";

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "es-CL" });
const page = await ctx.newPage();

// Preparar un estado con cita para auditar todas las pantallas
await page.goto(BASE);
await page.evaluate(() => {
  const f = new Date(); f.setDate(f.getDate() + 5);
  const iso = f.toISOString().slice(0, 10);
  localStorage.setItem("gota.v1", JSON.stringify({
    version: 1, usuario: { nombre: "Camila", correo: "c@ejemplo.cl", telefono: "+56912345678", sexo: "mujer", ultimaDonacion: "" },
    evaluaciones: [{ fecha: new Date().toISOString(), codigo: "Q", requisitos: [] }],
    citas: [{ codigo: "ABC234", centroId: "centro", fecha: iso, hora: "09:30", estado: "agendada", creada: new Date().toISOString(), requisitos: [] }],
    donaciones: [], progreso: { puntos: 170, insignias: ["primerPaso", "conHora"], leidos: [], mitos: {}, compartido: 0 }, avisos: { notificaciones: false, enviados: [] },
  }));
});

const pantallas = ["#/", "#/evaluacion", "#/agenda", "#/aprende", "#/aprende/mitos", "#/aprende/antes", "#/perfil", "#/perfil/editar"];
const salida = [];
for (const p of pantallas) {
  await page.goto(BASE + p);
  await page.waitForTimeout(500);
  await page.addScriptTag({ content: axe });
  const r = await page.evaluate(async () => {
    const res = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return res.violations.map((v) => ({ id: v.id, impacto: v.impact, descripcion: v.help, nodos: v.nodes.length, ejemplo: v.nodes[0]?.target?.join(" ") }));
  });
  salida.push({ pantalla: p, violaciones: r });
  console.log(p, r.length ? r.map((v) => `${v.id}(${v.nodos}) ${v.ejemplo}`).join(" | ") : "sin violaciones");
}
await writeFile(join(RAIZ, "tests", "resultados-accesibilidad.json"), JSON.stringify({ fecha: new Date().toISOString(), salida }, null, 2));
await browser.close();
srv?.close();
