// Genera los documentos Word (.docx) y PDF de las semanas 1 a 4.
// Uso: node docs/construir.mjs [URL de la demo]
// Requiere: pandoc, ffmpeg y Playwright. Antes: npm test, npm run test:e2e, tests/accesibilidad.mjs
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { CASOS } from "../tests/casos-clinicos.mjs";
import { evaluar } from "../js/triaje.js";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const DOCS = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(DOCS, "..");
const SALIDA = join(DOCS, "entregables");
const GEN = join(DOCS, ".generado");
await mkdir(SALIDA, { recursive: true });
await mkdir(GEN, { recursive: true });

const URL_DEMO = process.argv[2] || "**[Completar con la URL de Vercel]**";
const fecha = new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
const ejecutar = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0 && !opts.permitirFallo) throw new Error(`${cmd} ${args.join(" ")}\n${r.stderr}`);
  return r;
};
const celda = (t) => String(t ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

// ---------- Datos de pruebas ----------
const tap = ejecutar("node", ["--test", "--test-reporter=tap", "tests/unit.test.mjs"], { cwd: RAIZ, permitirFallo: true }).stdout;
const unit = [...tap.matchAll(/^(not ok|ok) \d+ - (.+)$/gm)].map((m) => ({ ok: m[1] === "ok", nombre: m[2].replace(/\\#/g, "#") }));
const unitOk = unit.filter((u) => u.ok).length;
const unitClinicos = unit.filter((u) => /^CC-\d+/.test(u.nombre));
const unitOtros = unit.filter((u) => !/^CC-\d+/.test(u.nombre));

const e2e = JSON.parse(await readFile(join(RAIZ, "tests", "resultados-e2e.json"), "utf8"));
const e2eOk = e2e.resultados.filter((r) => r.ok).length;
const a11y = JSON.parse(await readFile(join(RAIZ, "tests", "resultados-accesibilidad.json"), "utf8"));
const a11yViol = a11y.salida.reduce((n, p) => n + p.violaciones.length, 0);

const tablaE2E = ["| ID | Prueba | Resultado | Tiempo |", "|---|---|---|---|",
  ...e2e.resultados.map((r) => `| ${r.id} | ${celda(r.nombre)} | ${r.ok ? "Aprobada" : "Fallida: " + celda(r.error)} | ${r.ms ? (r.ms / 1000).toFixed(1) + " s" : "—"} |`)].join("\n");

const tablaCasos = ["| ID | Persona (ficticia) | Categoría | Esperado | Obtenido | Resultado | Validado TSLB |", "|---|---|---|---|---|---|---|",
  ...CASOS.map((c) => {
    const obtenido = evaluar(c.respuestas).codigo;
    return `| ${c.id} | ${celda(c.persona)} | ${c.categoria} | ${c.esperado} | ${obtenido} | ${obtenido === c.esperado ? "Aprobado" : "Fallido"} | ☐ |`;
  })].join("\n");
const casosOk = CASOS.filter((c) => evaluar(c.respuestas).codigo === c.esperado).length;

const tablaUnit = ["| # | Prueba | Resultado |", "|---|---|---|",
  ...unitOtros.map((u, i) => `| ${i + 1} | ${celda(u.nombre)} | ${u.ok ? "Aprobada" : "Fallida"} |`)].join("\n")
  + `\n\nAdemás, los ${unitClinicos.length} casos clínicos de la sección 5 se ejecutan como pruebas unitarias (${unitClinicos.filter((u) => u.ok).length} aprobados).`;

// ---------- Láminas de capturas ----------
const cap = join(DOCS, "capturas");
const lamina = (archivos, salida) => ejecutar("ffmpeg", ["-loglevel", "error", "-y", ...archivos.flatMap((a) => ["-i", join(cap, a)]),
  "-filter_complex", `${archivos.map((_, i) => `[${i}]`).join("")}hstack=${archivos.length},scale=iw/2:-1`, join(cap, salida)]);
lamina(["movil-01-inicio.png", "movil-02-pregunta.png", "movil-05-resultado-apto.png", "movil-08-dia-hora.png"], "lamina-celular-1.png");
lamina(["movil-09-mi-hora.png", "movil-12-mitos.png", "movil-14-perfil.png", "movil-15-intervalo.png"], "lamina-celular-2.png");
lamina(["movil-03-pregunta-sensible.png", "movil-06-registro-errores.png", "movil-10-confirmar-donacion.png", "movil-11-proxima-fecha.png"], "lamina-celular-3.png");

// ---------- Markdown final ----------
const fuentes = (await readdir(join(DOCS, "fuente"))).filter((f) => f.endsWith(".md")).sort();
const reemplazos = {
  "{{UNIT_RESUMEN}}": `${unitOk} de ${unit.length} aprobadas`,
  "{{CASOS_RESUMEN}}": `${casosOk} de ${CASOS.length} coinciden con lo esperado`,
  "{{E2E_RESUMEN}}": `${e2eOk} de ${e2e.resultados.length} aprobadas`,
  "{{A11Y_RESUMEN}}": a11yViol === 0 ? "0 violaciones" : `${a11yViol} violaciones (ver anexo)`,
  "{{URL}}": URL_DEMO,
  "{{FECHA}}": new Date(e2e.fecha).toLocaleString("es-CL", { timeZone: "America/Santiago" }),
  "{{TABLA_E2E}}": tablaE2E,
  "{{TABLA_CASOS}}": tablaCasos,
  "{{TABLA_UNIT}}": tablaUnit,
};

const css = `
@page { size: Letter; margin: 18mm 16mm 20mm; }
body { font-family: "Figtree", Arial, sans-serif; color: #2b1214; font-size: 10.5pt; line-height: 1.5; max-width: 100%; }
h1 { font-family: "Bricolage", Arial, sans-serif; font-size: 22pt; line-height: 1.1; color: #2b1214; margin: 0 0 10pt; letter-spacing: -0.02em; }
h2 { font-family: "Bricolage", Arial, sans-serif; font-size: 15pt; margin: 20pt 0 6pt; color: #8f1d24; break-after: avoid; }
h3 { font-size: 12pt; margin: 14pt 0 4pt; break-after: avoid; }
p, li { orphans: 3; widows: 3; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0 12pt; font-size: 9pt; break-inside: auto; }
th { background: #f6ece8; text-align: left; }
th, td { border: 1px solid #e3d3cf; padding: 4pt 6pt; vertical-align: top; }
tr { break-inside: avoid; }
blockquote { margin: 10pt 0; padding: 8pt 12pt; background: #fbf4e6; border-radius: 6px; }
code { font-size: 8.5pt; background: #f6f1ec; padding: 0 3px; border-radius: 3px; }
pre { background: #f6f1ec; padding: 8pt; border-radius: 6px; font-size: 8pt; line-height: 1.35; white-space: pre-wrap; break-inside: avoid; }
pre code { background: none; padding: 0; }
img { max-width: 100%; max-height: 225mm; display: block; margin: 8pt auto; object-fit: contain; }
figure { margin: 0; break-inside: avoid; }
figcaption { font-size: 8.5pt; color: #6b4a4c; text-align: center; }
header#title-block-header { display: none; }
.portada { height: 230mm; display: flex; flex-direction: column; justify-content: center; break-after: page; }
.portada .proyecto { font-size: 11pt; color: #8f1d24; font-weight: 700; }
.portada h1 { font-size: 30pt; margin-top: 10pt; }
.portada .sub { font-size: 12pt; color: #6b4a4c; margin-top: 8pt; }
.portada dl { margin-top: 40pt; font-size: 10pt; display: grid; grid-template-columns: max-content 1fr; gap: 4pt 14pt; }
.portada dt { color: #6b4a4c; } .portada dd { margin: 0; }
`;
const fuentesCss = `@font-face{font-family:"Bricolage";src:url("${join(RAIZ, "fonts/bricolage.woff2")}") format("woff2-variations");font-weight:200 800}
@font-face{font-family:"Figtree";src:url("${join(RAIZ, "fonts/figtree.woff2")}") format("woff2-variations");font-weight:300 900}`;
await writeFile(join(GEN, "estilo.css"), fuentesCss + css);

const browser = await chromium.launch();
const htmls = [];
for (const f of fuentes) {
  let md = await readFile(join(DOCS, "fuente", f), "utf8");
  for (const [k, v] of Object.entries(reemplazos)) md = md.split(k).join(v);
  const base = f.replace(/\.md$/, "");
  const mdFinal = join(GEN, base + ".md");
  // Las rutas de imágenes son relativas a docs/fuente
  await writeFile(mdFinal, md.replace(/\]\(\.\.\//g, `](${DOCS}/`));
  const titulo = (md.match(/^title: "(.+)"$/m) || [])[1] || base;

  // Word
  ejecutar("pandoc", [mdFinal, "-o", join(SALIDA, base + ".docx"), "--toc", "--toc-depth=2", "-M", "toc-title=Contenido", "-M", `date=${fecha}`, "-M", "author=Equipo COIL · Ingeniería de Sistemas", "--resource-path", DOCS]);

  // HTML -> PDF
  const portada = `<section class="portada"><p class="proyecto">Proyecto COIL · Promoción de la Donación de Sangre</p><h1>${titulo}</h1>
    <p class="sub">Plataforma Digital de Fidelización y Agendamiento inteligente para la Donación Altruista de Sangre</p>
    <dl><dt>Equipo</dt><dd>Ingeniería de Sistemas · TSLB</dd><dt>Prototipo</dt><dd>Gota (nombre provisional)</dd><dt>Fecha</dt><dd>${fecha}</dd></dl></section>`;
  const htmlFile = join(GEN, base + ".html");
  ejecutar("pandoc", [mdFinal, "-s", "-o", htmlFile, "--css", join(GEN, "estilo.css"), "--metadata", `pagetitle=${titulo}`, "--resource-path", DOCS]);
  let html = await readFile(htmlFile, "utf8");
  html = html.replace(/<body>/, `<body>${portada}`);
  await writeFile(htmlFile, html);
  htmls.push(htmlFile);
  const page = await browser.newPage();
  await page.goto("file://" + htmlFile);
  await page.waitForTimeout(400);
  await page.pdf({ path: join(SALIDA, base + ".pdf"), format: "Letter", printBackground: true, displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="font-size:7pt;color:#8a6f70;width:100%;padding:0 16mm;display:flex;justify-content:space-between;font-family:Arial"><span>Proyecto COIL — Promoción de Donación de Sangre · ${titulo.replace(/"/g, "")}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
    margin: { top: "16mm", bottom: "18mm", left: "0", right: "0" } });
  await page.close();
  console.log("ok", base);
}
await browser.close();

// PDF consolidado
const pdfs = fuentes.map((f) => join(SALIDA, f.replace(/\.md$/, ".pdf")));
const py = `import sys\nfrom pypdf import PdfWriter\nw=PdfWriter()\nfor p in sys.argv[2:]: w.append(p)\nw.write(sys.argv[1])`;
const r = spawnSync("python3", ["-c", py, join(SALIDA, "COIL-Semanas-1-a-4-consolidado.pdf"), ...pdfs], { encoding: "utf8" });
console.log(r.status === 0 ? "ok consolidado" : "sin consolidado: " + r.stderr.split("\n").slice(-2).join(" "));
