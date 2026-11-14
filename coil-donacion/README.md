# Gota · Proyecto COIL de donación de sangre

Prototipo web de la **Plataforma Digital de Fidelización y Agendamiento inteligente para la Donación Altruista de Sangre** (TSLB + Ingeniería de Sistemas), con los entregables de las semanas 1 a 4.

## Qué hay aquí

| Carpeta / archivo | Contenido |
|---|---|
| `index.html`, `css/`, `js/`, `fonts/`, `img/` | El prototipo (sitio estático, sin compilación). |
| `js/contenido.js` | **Textos sanitarios:** preguntas, resultados, mitos y guías. Lo único que TSLB necesita revisar o editar. |
| `js/triaje.js` | Árbol de decisión de TSLB traducido a lógica. |
| `docs/entregables/` | **Documentos listos para entregar** (Word y PDF por semana + PDF consolidado). |
| `docs/fuente/` | Texto de los documentos (Markdown) por si hay que editarlos. |
| `docs/diagramas/` | Arquitectura, navegación, árbol de decisión, modelo de datos, secuencia. |
| `docs/capturas/` | Capturas del prototipo en celular y escritorio. |
| `tests/` | Pruebas unitarias, casos clínicos, pruebas E2E y de accesibilidad, y sus resultados. |

## Entregables por semana

| Semana | Documento | Incluye |
|---|---|---|
| 0 | `S0-resumen-y-guion-demo` | Resumen de avance, cifras, guion de demostración de 5 minutos, preguntas frecuentes y pendientes. |
| 1 | `S1-integracion-y-diagnostico` | Necesidades, perfiles, propuesta de valor, 12 historias de usuario con criterios, Product Backlog, arquitectura, acuerdos, estructura del Padlet, glosario Salud/Software. |
| 2 | `S2-experiencia-y-motivacion` | Navegación, mockups, árbol TSLB → lógica, clasificación de preguntas, modelo de datos + SQL, gamificación, tabla de validación. |
| 3 | `S3-desarrollo-solucion` | Prototipo funcional, trazabilidad con el backlog, recordatorios, parametrización, cómo ejecutarlo. |
| 4 | `S4-pruebas-y-validacion` | Entorno demo, registro de pruebas, 25 casos clínicos, guion UAT, bugs corregidos, mejoras, pendientes. |

Lo marcado **[Completar]** requiere datos del equipo (nombres, URL, resultados de UAT) y lo marcado **[Validar TSLB]** son propuestas que el equipo de salud debe aprobar.

## Demo publicada

https://gota-donacion.vercel.app (proyecto de Vercel `gota-donacion`, carpeta `coil-donacion`).

## Publicar en otro proyecto de Vercel

1. Entrar a vercel.com → **Add New… → Project** → importar el repositorio `CLIENTES-PAGES`.
2. En **Root Directory** elegir `coil-donacion`. Framework: **Other**. Sin comando de build.
3. **Deploy**. Copiar la URL y pegarla en el documento de la Semana 4 (o regenerar los documentos con `node docs/construir.mjs https://tu-url.vercel.app`).

## Ejecutar en local y probar

```bash
npx serve .            # abre el prototipo en http://localhost:3000
npm test               # 50 pruebas unitarias (incluye 25 casos clínicos)
npm run test:e2e       # 41 pruebas de extremo a extremo (requiere Playwright)
```

## Importante

- El cuestionario es **orientativo**: no reemplaza la entrevista ni la evaluación profesional (la app lo dice siempre).
- Los centros y horarios son **de demostración**.
- Las respuestas del cuestionario **no se guardan**; los demás datos quedan solo en el navegador del dispositivo.
- Iconos: Lucide (ISC). Tipografías: Bricolage Grotesque y Figtree (SIL Open Font License).
