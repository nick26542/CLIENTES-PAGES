---
title: "Semana 4 · Pruebas Piloto y Validación Interdisciplinaria"
subtitle: "Plataforma Digital de Fidelización y Agendamiento para la Donación Altruista de Sangre — Proyecto COIL"
---

# Semana 4 · Pruebas Piloto y Validación Interdisciplinaria

**Periodo:** 9 al 14 de noviembre · **Equipo:** Ingeniería de Sistemas, con TSLB

**Entregable Sistemas:** versión corregida del prototipo en entorno demo y registro de pruebas funcionales.
**Entregable conjunto:** informe de pruebas interdisciplinarias y listado de mejoras implementadas.
**Criterio de aceptación:** pruebas ejecutadas sin errores críticos abiertos; autorizaciones listas para usuarios externos.

## 1. Resumen ejecutivo

| Indicador | Resultado |
|---|---|
| Pruebas unitarias (motor de triaje, agenda, estado) | {{UNIT_RESUMEN}} |
| Casos clínicos automatizados (aptos / diferidos / no aptos) | {{CASOS_RESUMEN}} |
| Pruebas funcionales de extremo a extremo (celular + escritorio) | {{E2E_RESUMEN}} |
| Auditoría de accesibilidad WCAG 2.1 AA (8 pantallas) | {{A11Y_RESUMEN}} |
| Errores críticos abiertos | 0 |
| Entorno demo | {{URL}} |

## 2. Entorno de pruebas (staging / demo)

| Elemento | Detalle |
|---|---|
| URL de la demo | {{URL}} |
| Hospedaje | Vercel (sitio estático, HTTPS) |
| Repositorio | GitHub, carpeta `coil-donacion/` |
| Dispositivos emulados | iPhone 13 emulado (390 × 844) en Chromium y escritorio 1440 × 900 |
| Zona horaria y regional | America/Santiago, es-CL |
| Fecha de ejecución | {{FECHA}} |
| Datos | Ficticios. Centros y horarios de demostración. |

## 3. Plan de pruebas

| Tipo | Qué verifica | Herramienta | Responsable |
|---|---|---|---|
| Unitarias | Árbol de decisión, intervalo, cupos, recordatorios, .ics, puntos, almacenamiento | `node --test` | Sistemas |
| Casos clínicos | Que cada perfil de persona llegue al resultado sanitario correcto | `node --test` + revisión manual TSLB | TSLB + Sistemas |
| Funcionales E2E | Flujos completos en celular y escritorio, como lo haría una persona | Playwright | Sistemas |
| Accesibilidad | Contraste, etiquetas, roles, foco (WCAG 2.1 A/AA) | axe-core | Sistemas |
| UAT (aceptación de usuario) | Comprensión de contenidos, tono, facilidad de uso | Guion con usuarios reales (sección 7) | TSLB + Sistemas |

## 4. Registro de pruebas funcionales (extremo a extremo)

Ejecutadas automáticamente sobre el prototipo, en celular (M) y escritorio (E).

{{TABLA_E2E}}

## 5. Casos de prueba clínicos (aptos / diferidos / no aptos) **[Validar TSLB]**

Cada caso es una persona ficticia con un conjunto de respuestas. La columna "Esperado" es el resultado según el árbol de TSLB tal como lo interpretó Sistemas; **TSLB debe confirmar cada fila** (columna "Validado TSLB") y ejecutarlos también a mano en la demo.

{{TABLA_CASOS}}

Códigos: X sin identificación · D fuera de edad · F falta autorización · H peso · J posponer · L intervalo · N diferimiento según criterio · P evaluación profesional · Q continuar a entrevista.

## 6. Pruebas unitarias

{{TABLA_UNIT}}

## 7. Guion de pruebas de aceptación con usuarios (UAT) **[Completar]**

Aplicar con 5 a 8 jóvenes de 17 a 25 años, cada uno con su propio celular, abriendo la URL de la demo. Duración: 10 minutos por persona. **Antes de aplicarlo con personas externas**, confirmar con los docentes las autorizaciones requeridas (consentimiento informado de participación; en menores de 18, autorización de su madre, padre o tutor). Usar solo datos ficticios en la app.

**Tareas (sin ayuda del facilitador):**

1. "Averigua si puedes donar sangre." (Medir: ¿completa la autoevaluación? tiempo.)
2. "Agenda una hora para la próxima semana." (¿Completa el agendamiento? tiempo.)
3. "Haz que tu celular te recuerde la cita." (¿Encuentra un canal de recordatorio?)
4. "Responde 3 mitos." (¿Entiende las explicaciones?)
5. "Cambia tu hora para otro día."

**Preguntas al final (escala 1 a 5):**

| Pregunta | P1 | P2 | P3 | P4 | P5 | Promedio |
|---|---|---|---|---|---|---|
| Las preguntas fueron fáciles de entender | | | | | | |
| Me sentí cómodo/a respondiendo las preguntas sensibles | | | | | | |
| Entendí qué hacer después de ver mi resultado | | | | | | |
| Agendar fue rápido | | | | | | |
| Usaría esta app para donar | | | | | | |

**Registro de tareas:**

| Participante | T1 ✓/✗ (tiempo) | T2 | T3 | T4 | T5 | Comentarios |
|---|---|---|---|---|---|---|
| P1 | | | | | | |
| P2 | | | | | | |
| P3 | | | | | | |

**Revisión TSLB del tono de mensajes y observaciones:**

| Pantalla / texto | Observación TSLB | Acción | Estado |
|---|---|---|---|
| | | | |

## 8. Registro de errores encontrados y corregidos (bug fixing)

| ID | Severidad | Descripción | Dónde | Corrección | Estado |
|---|---|---|---|---|---|
| BUG-01 | Alta | En celular, las opciones "Hombre/Mujer" del formulario no siempre respondían al toque: el control oculto se posicionaba fuera de su etiqueta. | Registro y cálculo de intervalo | Se posiciona el control dentro de su etiqueta (`position: relative`). Prueba PF-M03 y PF-M17. | Cerrado |
| BUG-02 | Media | En pantallas con título (Mi hora, Perfil, Aprende) el logo y el título quedaban pegados ("Gota Mi hora"). | Barra superior | Si la pantalla tiene título, se muestra solo el título. | Cerrado |
| BUG-03 | Media | La región principal anunciaba todo el contenido a lectores de pantalla en cada cambio. | Estructura | Se quitó `aria-live` de la región principal; el foco pasa al título de cada pantalla. | Cerrado |
| BUG-04 | Baja | El mensaje al fallar un mito decía "No exactamente Es un mito" (sin puntuación). | Mito o realidad | Texto corregido: "No exactamente: es un mito." | Cerrado |
| BUG-05 | Baja | El canal "Enviarme por correo" usaba un ícono de información. | Mi hora | Ícono de sobre. | Cerrado |
| BUG-06 | Baja | Prueba de progreso usaba una respuesta que activaba la pregunta condicional de autorización. | Pruebas | Se usa el caso clínico base. | Cerrado |

## 9. Listado de mejoras implementadas (Semana 4)

1. **Reprogramar y cancelar** la hora, liberando el cupo anterior, con confirmación en dos toques (sin ventanas emergentes).
2. **Optimización móvil:** objetivos táctiles de mínimo 44 px (verificado en PF-M20), campos de 16 px para evitar el zoom automático en iPhone, teclados adecuados (correo, teléfono), sin desbordes horizontales (PF-M19), respeto del área segura (notch).
3. **Formularios:** validación en línea con mensajes que explican cómo corregir; el foco va al primer campo con error.
4. **Accesibilidad:** 0 violaciones WCAG 2.1 AA; navegación por teclado; foco visible; respeta "reducir movimiento".
5. **Privacidad verificada:** prueba automática que confirma que las respuestas sensibles no quedan guardadas (PF-M12).
6. **Compartir la campaña** con el menú nativo del celular.
7. **Herramientas de demostración** para la presentación final.
8. **Publicación en entorno demo** (Vercel) con HTTPS.

## 10. Pendientes y riesgos para la Semana 5

| Pendiente | Responsable | Impacto si no se hace |
|---|---|---|
| Validar la clasificación M/O de cada pregunta (S2, sección 4.2) | TSLB | La app podría orientar distinto a lo que define el equipo de salud. |
| Validar los resultados esperados de los 25 casos clínicos | TSLB | No se puede afirmar validez sanitaria en el pitch. |
| Reemplazar mitos y guías por el banco de contenidos TSLB | TSLB + Sistemas | Contenido queda marcado "en revisión". |
| Citar la fuente normativa (MINSAL) de cada requisito | TSLB | Criterio de aceptación de S1 incompleto. |
| Ejecutar UAT con usuarios reales (sección 7) | Ambos | Falta evidencia de comprensión de contenidos. |
| Confirmar nombre del producto ("Gota" es provisional) | Ambos | — |

## 11. Conclusión

El prototipo cumple el flujo completo (registro, autoevaluación, agendamiento, recordatorio, volver a donar) en celular y escritorio, sin errores críticos abiertos, y está publicado en un entorno demo. La validación sanitaria de la lógica y los contenidos es el paso que queda para presentarlo en la Semana 5 con respaldo de ambos equipos.
