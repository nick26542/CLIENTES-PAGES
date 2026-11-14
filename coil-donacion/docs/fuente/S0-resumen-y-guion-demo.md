---
title: "Resumen del avance y guion de demostración"
subtitle: "Plataforma Digital de Fidelización y Agendamiento para la Donación Altruista de Sangre — Proyecto COIL"
---

# Resumen del avance y guion de demostración

Este documento resume lo construido hasta la Semana 4. También incluye el guion paso a paso para mostrar el prototipo en clase o ante los docentes y la lista de lo que falta validar.

## 1. El prototipo en una frase

**Gota** lleva a una persona joven del "¿podré donar?" a tener una hora agendada en una sola visita. Primero responde una autoevaluación de un minuto, basada en el cuestionario y el árbol de decisión de TSLB. Después agenda su hora con cupos y recibe recordatorios. Finalmente, la app le avisa cuándo puede volver a donar.

| | |
|---|---|
| **Demo en línea** | {{URL}} |
| **Cómo abrirla** | En el celular, con el enlace o escaneando el código QR que aparece en la versión de escritorio. No requiere instalar nada. |
| **Nombre** | "Gota" es provisional; el equipo puede cambiarlo. |
| **Datos** | Los lugares y horarios son de demostración. Los datos quedan solo en el celular de quien la usa. |

## 2. Avance por semana

| Semana | Entregable de Sistemas | Estado | Entregable conjunto | Estado |
|---|---|---|---|---|
| 1 | Arquitectura y Product Backlog | Hecho | Equipos, acuerdos, Padlet y glosario | Propuesta lista; completar nombres |
| 2 | Mockups y modelo de datos | Hecho | Diseño preliminar y validación interdisciplinaria | Falta firma de validación TSLB |
| 3 | Prototipo web con agendamiento y recordatorios | Hecho | Plataforma con contenidos, motivación y agenda | Hecho; contenidos en revisión TSLB |
| 4 | Versión corregida en demo y registro de pruebas | Hecho ({{E2E_RESUMEN}}) | Informe de pruebas y mejoras | Hecho; falta prueba con usuarios reales |

## 3. Cifras del avance

| Indicador | Valor |
|---|---|
| Preguntas del cuestionario TSLB integradas | 23 + 1 condicional (autorización a los 17 años) |
| Resultados posibles del árbol de decisión | 9 (X, D, F, H, J, L, N, P, Q) |
| Historias de usuario implementadas | 12 de 12 comprometidas |
| Pruebas unitarias | {{UNIT_RESUMEN}} |
| Casos clínicos automatizados | {{CASOS_RESUMEN}} |
| Pruebas de extremo a extremo (celular y escritorio) | {{E2E_RESUMEN}} |
| Accesibilidad WCAG 2.1 AA | {{A11Y_RESUMEN}} |

## 4. Guion de demostración (5 minutos)

Antes de empezar: abrir la demo en el celular conectado al proyector, o en el computador. En **Perfil → Borrar mis datos**, partir desde cero.

| Paso | Qué hacer | Qué decir |
|---|---|---|
| 1 | Mostrar la portada. | "La idea es que un joven pase de la duda a tener hora en una sola visita." |
| 2 | Tocar **Hacer la autoevaluación** y responder: Sí, 18–59, Sí, Sí, Sí, Nunca he donado. | "Son las preguntas del cuestionario de TSLB, una por pantalla. Si falla un requisito general, la app se detiene como en el árbol de decisión." |
| 3 | En la Etapa 3, mostrar el aviso de privacidad. | "Las preguntas sensibles explican por qué se hacen. Las respuestas no se guardan." |
| 4 | Responder todo "No", aceptar la declaración y ver el resultado verde. | "El resultado siempre dice que la decisión final la toma un profesional." |
| 5 | **Agendar mi hora** → datos mínimos → lugar → día y hora → confirmar. | "Solo se pide lo necesario. Los cupos se respetan y no se pueden tener dos horas a la vez." |
| 6 | En **Mi hora**, mostrar el ticket y tocar **Agregar a mi calendario**. | "El calendario del celular avisa el día antes y 2 horas antes, aunque la app esté cerrada. También se puede enviar por WhatsApp o correo." |
| 7 | **Perfil → Herramientas de demostración → Simular que mi hora ya pasó** → **Sí, doné**. | "Después de donar, calcula cuándo puede volver: más de 3 meses hombres, más de 4 meses mujeres. Esto es la fidelización." |
| 8 | Mostrar **Perfil**: puntos e insignias. | "La gamificación premia acciones que llevan a donar." |
| 9 | **Aprende → Mito o realidad**: responder "Hay que ir en ayunas". | "Los contenidos los valida TSLB." |
| 10 | (Opcional) Repetir la autoevaluación respondiendo "Sí" a tatuaje reciente. | "Así se ve un diferimiento: explica el motivo, sin juicio." |

**Respuestas a preguntas frecuentes del jurado**

- *¿Por qué no hay base de datos?* El prototipo guarda los datos en el celular para no manejar datos de salud en servidores durante el piloto. La arquitectura con servidor (base de datos, panel del centro, envío automático) está diseñada en la Semana 1 y el modelo de datos en la Semana 2.
- *¿La app decide si alguien puede donar?* No. Orienta. La decisión la toma un profesional en la entrevista presencial, y la app lo dice en cada resultado.
- *¿Cómo se cambian las reglas sanitarias?* Están separadas en un solo archivo de contenido. Cambiar un criterio es editar una línea, sin tocar la lógica.

## 5. Lo que falta para cerrar (antes de la Semana 5)

| # | Tarea | Responsable | Dónde |
|---|---|---|---|
| 1 | Confirmar la clasificación de cada pregunta (esperar vs. revisión profesional) | TSLB | Semana 2, sección 4.2 |
| 2 | Marcar como validados los 25 casos clínicos | TSLB | Semana 4, sección 5 |
| 3 | Revisar o reemplazar mitos y guías por el banco de contenidos TSLB | TSLB | App → Aprende |
| 4 | Agregar la cita de la norma MINSAL de cada requisito | TSLB | Semana 1, sección 9 |
| 5 | Completar integrantes y roles | Ambos | Semana 1, sección 8.1 |
| 6 | Aplicar la prueba con 5 a 8 usuarios reales (con autorizaciones) | Ambos | Semana 4, sección 7 |
| 7 | Confirmar el nombre del producto | Ambos | — |
