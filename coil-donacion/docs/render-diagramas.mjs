// Renderiza los diagramas Mermaid a PNG. Uso: node docs/render-diagramas.mjs <ruta a mermaid.min.js>
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { DIAGRAMAS } from "./diagramas/diagramas.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const AQUI = dirname(fileURLToPath(import.meta.url));
const mermaidJs = await readFile(process.argv[2], "utf8");

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1400, height: 1000 } });
await page.setContent(`<html><body style="margin:0;background:#fff;font-family:Arial,sans-serif"><div id="d"></div></body></html>`);
await page.addScriptTag({ content: mermaidJs });
await page.evaluate(() => window.mermaid.initialize({
  startOnLoad: false, theme: "base", fontFamily: "Arial, sans-serif",
  themeVariables: { primaryColor: "#fbeeee", primaryBorderColor: "#b9262f", primaryTextColor: "#2b1214", lineColor: "#6b4a4c", fontSize: "15px", secondaryColor: "#f6f1ec", tertiaryColor: "#ffffff" },
  flowchart: { htmlLabels: true, curve: "basis" },
}));
for (const [nombre, codigo] of Object.entries(DIAGRAMAS)) {
  await page.evaluate(async ({ nombre, codigo }) => {
    const { svg } = await window.mermaid.render("m" + nombre.replace(/\W/g, ""), codigo);
    const d = document.getElementById("d");
    d.innerHTML = svg;
    d.style.cssText = "display:inline-block;padding:16px;background:#fff";
    const s = d.querySelector("svg");
    s.style.maxWidth = "none";
    const vb = s.viewBox.baseVal;
    s.setAttribute("width", vb.width);
    s.setAttribute("height", vb.height);
  }, { nombre, codigo });
  await page.locator("#d").screenshot({ path: join(AQUI, "diagramas", nombre + ".png") });
  console.log("ok", nombre);
}
await browser.close();
