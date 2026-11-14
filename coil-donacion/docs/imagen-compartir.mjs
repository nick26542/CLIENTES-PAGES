// Genera img/og.png (vista previa al compartir el enlace por WhatsApp/redes). Uso: node docs/imagen-compartir.mjs
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

const html = `<!doctype html><html><head><style>
@font-face{font-family:B;src:url("file://${RAIZ}/fonts/bricolage.woff2") format("woff2-variations");font-weight:200 800}
@font-face{font-family:F;src:url("file://${RAIZ}/fonts/figtree.woff2") format("woff2-variations");font-weight:300 900}
body{margin:0;width:1200px;height:630px;background:#fbf5f5;font-family:F;color:#2b1214;display:flex;overflow:hidden}
.izq{padding:72px 0 64px 80px;flex:1;display:flex;flex-direction:column}
.marca{display:flex;align-items:center;gap:12px;font-family:B;font-weight:800;font-size:40px;letter-spacing:-.03em}
h1{font-family:B;font-weight:800;font-size:104px;line-height:.95;letter-spacing:-.04em;margin:56px 0 0}
h1 em{font-style:normal;color:#b9262f}
p{font-size:30px;color:#6b4a4c;margin:28px 0 0;max-width:26ch}
.pie{margin-top:auto;font-size:22px;color:#6b4a4c}
.der{width:380px;background:#4a1418;display:flex;align-items:center;justify-content:center}
.der svg{width:220px;height:220px}
</style></head><body>
<div class="izq"><div class="marca"><svg width="44" height="44" viewBox="0 0 32 32"><path d="M16 3c4.5 6.2 10 11.6 10 17.2A10 10 0 0 1 6 20.2C6 14.6 11.5 9.2 16 3Z" fill="#b9262f"/></svg>Gota</div>
<h1>Dona sangre<br><em>sin vueltas.</em></h1>
<p>Revisa en un minuto si puedes donar y agenda tu hora.</p>
<div class="pie">Proyecto COIL · Promoción de la donación de sangre</div></div>
<div class="der"><svg viewBox="0 0 32 32"><path d="M16 3c4.5 6.2 10 11.6 10 17.2A10 10 0 0 1 6 20.2C6 14.6 11.5 9.2 16 3Z" fill="#e5484d"/></svg></div>
</body></html>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
const tmp = join(RAIZ, "docs", ".generado", "og.html");
const { writeFile, mkdir } = await import("node:fs/promises");
await mkdir(dirname(tmp), { recursive: true });
await writeFile(tmp, html);
await p.goto("file://" + tmp);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
await p.screenshot({ path: join(RAIZ, "img", "og.png") });
await b.close();
console.log("ok og.png");
