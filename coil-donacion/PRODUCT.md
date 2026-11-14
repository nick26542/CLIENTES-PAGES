# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS sin framework, publicado en Vercel (respuesta del usuario). Datos guardados en el navegador (localStorage) para el prototipo; el backend real (base de datos, envío automático de recordatorios) queda documentado como siguiente paso.

## Users

Jóvenes de 17 a 25 años en Chile (estudiantes de educación superior principalmente) que nunca han donado sangre o lo hicieron una vez. Usan el celular, en ratos libres, y llegan desde una campaña, un QR en el campus o un enlace compartido por WhatsApp. Su trabajo: saber en un minuto si pueden donar, agendar una hora sin llamar a nadie y no olvidar la cita.

Audiencia secundaria: docentes y evaluadores del proyecto COIL (TSLB + Ingeniería de Sistemas), que revisan el prototipo en una demo.

## Product Purpose

Plataforma digital de fidelización y agendamiento inteligente para la donación altruista de sangre. Convierte la intención de donar en una cita concreta: autoevaluación orientativa (triaje express de ~1 minuto) basada en el cuestionario y árbol de decisión del equipo TSLB, agendamiento, recordatorios y contenidos que derriban mitos. Éxito: que un joven pase de "no sé si puedo" a "tengo hora" en una sola visita, y vuelva a donar cuando cumpla el intervalo.

## Positioning

La autoevaluación no es un formulario genérico: replica el árbol de decisión sanitario validado por TSLB (requisitos generales, antecedentes de salud, procedimientos, antecedentes sexuales) y siempre deja claro que la decisión final la toma un profesional en la entrevista presencial. Después de donar, la plataforma calcula cuándo se puede volver (3 meses hombres, 4 meses mujeres) y lo recuerda.

## Operating Context

Proyecto académico COIL de 5 semanas entre estudiantes de TSLB (Chile) e Ingeniería de Sistemas (Colombia). Se presenta en demo en vivo; se trabaja con un tablero Padlet compartido. El contenido sanitario lo produce y valida TSLB; Sistemas construye la plataforma.

## Capabilities and Constraints

- Registro de perfil, autoevaluación paso a paso, resultado con explicación, agendamiento con cupos, recordatorios (archivo de calendario .ics, WhatsApp, notificación del navegador), gamificación (puntos e insignias), contenidos educativos (mitos y realidades, cuidados antes y después).
- Los centros de donación y horarios del prototipo son datos de demostración; no representan centros reales.
- El cuestionario no diagnostica ni reemplaza la entrevista y evaluación profesional. Esto debe decirse siempre.
- No se envían correos ni WhatsApp automáticos en el prototipo (requiere backend). Queda en la hoja de ruta.
- Nombre del producto "Gota": provisional, a confirmar por el equipo.

## Brand Commitments

Ninguna identidad previa. Idioma: español de Chile, tuteo, cercano y directo, sin infantilizar. Lenguaje inclusivo en formularios (operado/a, enfermo/a) como en el cuestionario de TSLB.

## Evidence on Hand

- Cuestionario de autoevaluación de TSLB (Etapas 1–5) y su árbol de decisión (flowchart A–W), entregados como imágenes por el usuario.
- Planificación COIL de 5 semanas (entregables por semana).
- No hay testimonios, cifras propias, logos de instituciones ni centros reales. No inventarlos.

## Product Principles

1. Honestidad sanitaria: orientar, nunca dictaminar; cada resultado dice qué hacer después.
2. Un minuto: una pregunta por pantalla, respuestas Sí/No grandes, sin jerga.
3. Del interés a la cita en una visita.
4. Privacidad visible: preguntas sensibles con contexto de por qué se hacen y confidencialidad.
5. Volver a donar es el objetivo final (fidelización).

## Accessibility & Inclusion

WCAG 2.1 AA: contraste, foco visible, objetivos táctiles de 44px, funciona con teclado y lector de pantalla, respeta reduced-motion. Preguntas sensibles (sexuales, drogas) redactadas sin juicio.
