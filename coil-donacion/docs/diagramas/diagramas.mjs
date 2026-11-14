// Fuente de los diagramas (Mermaid). Se renderizan a PNG con docs/construir.mjs.
export const DIAGRAMAS = {
  "arquitectura-prototipo": `flowchart LR
  U(["Joven donante<br/>celular / navegador"]) --> APP
  subgraph APP["Prototipo Gota · sitio estático en Vercel"]
    direction TB
    UI["Interfaz<br/>app.js · router por hash"]
    T["Motor de triaje<br/>triaje.js"]
    C["Contenido TSLB<br/>contenido.js"]
    A["Agenda y recordatorios<br/>agenda.js"]
    E["Estado y gamificación<br/>estado.js"]
    UI --> T --> C
    UI --> A
    UI --> E
  end
  E <--> LS[("localStorage<br/>del dispositivo")]
  A -- "archivo .ics" --> CAL["Calendario del<br/>celular"]
  A -- "enlace wa.me" --> WA["WhatsApp"]
  A -- "mailto / Google Calendar" --> MAIL["Correo / Google"]
  UI -- "Web Notifications" --> N["Avisos del<br/>navegador"]`,

  "arquitectura-objetivo": `flowchart LR
  U(["Donante"]) --> FE["Frontend web / PWA<br/>(el mismo prototipo)"]
  CS(["Personal del centro"]) --> ADM["Panel del centro<br/>(cupos, asistencia)"]
  FE --> API["API REST<br/>Supabase / Edge Functions"]
  ADM --> API
  API --> DB[("PostgreSQL<br/>usuarios, citas, cupos,<br/>evaluaciones, puntos")]
  API --> AUTH["Autenticación<br/>correo / OTP"]
  CRON["Tarea programada<br/>cada hora"] --> API
  CRON --> MAILS["Servicio de correo"]
  CRON --> WAB["WhatsApp Business API"]
  API -. "reglas de elegibilidad<br/>parametrizadas por TSLB" .-> REG["Tabla de reglas"]`,

  "navegacion": `flowchart TD
  I["Inicio"] --> EV["Autoevaluación<br/>1 pregunta por pantalla"]
  EV --> DEC["Etapa 5: declaración"]
  EV -- "puerta de la Etapa 1" --> RES
  DEC --> RES["Resultado"]
  RES -- "Q, P, J" --> REG["Registro<br/>(si no tiene perfil)"]
  RES -- "L" --> CALC["Calcular fecha<br/>de intervalo"] --> REG
  RES -- "X, D, F, H, N" --> APR
  REG --> LUG["Elegir lugar"] --> DH["Elegir día y hora"] --> CONF["Confirmar"]
  CONF --> MH["Mi hora<br/>ticket + recordatorios"]
  MH -- "después de la fecha" --> DON["¿Pudiste donar?"]
  DON --> PROX["Próxima fecha<br/>para volver"]
  I --> APR["Aprende<br/>mitos + guías"]
  I --> PER["Perfil<br/>puntos + insignias"]`,

  "arbol-decision": `flowchart LR
  A(["Inicio: autoevaluación"]) --> B{"¿Tiene documento<br/>de identificación?"}
  B -- No --> X["X · No continuar hasta<br/>contar con identificación"]
  B -- Sí --> C{"¿Tiene entre<br/>17 y 70 años?"}
  C -- No --> D["D · Fuera del<br/>rango de edad"]
  C -- Sí --> E{"¿Tiene autorización<br/>si corresponde?"}
  E -- No --> F["F · Completar autorización<br/>o evaluación médica"]
  E -- Sí --> G{"¿Pesa más<br/>de 50 kg?"}
  G -- No --> H["H · Diferimiento"]
  G -- Sí --> I{"¿Durmió 5 h y comió<br/>en las últimas 5 h?"}
  I -- No --> J["J · Posponer y<br/>cumplir requisitos"]
  I -- Sí --> K{"¿Cumple intervalo desde<br/>última donación?"}
  K -- No --> L["L · Diferimiento<br/>temporal"]
  K -- Sí --> M{"¿Presenta algún<br/>criterio de exclusión?<br/>(Etapas 2–4)"}
  M -- Sí --> N["N · Diferimiento<br/>según criterio"]
  M -- No --> O{"¿Antecedentes que<br/>requieren revisión?"}
  O -- Sí --> P["P · Evaluación por<br/>profesional de salud"]
  O -- No --> Q["Q · Continuar a<br/>entrevista predonación"]
  P -.-> R{"¿Profesional autoriza?<br/>(presencial)"}
  R -.-> Q
  Q -.-> T["T · Examen físico y<br/>controles predonación<br/>(presencial)"]
  classDef stop fill:#fde8e8,stroke:#b9262f,color:#3b0d10
  classDef ok fill:#e3f4ea,stroke:#1f7a4a,color:#0f3d24
  classDef rev fill:#e6eefb,stroke:#2f5aa8,color:#13284d
  classDef pausa fill:#fdf3dc,stroke:#a8741c,color:#4a3208
  class X,D,H stop
  class F,J,L,N pausa
  class P rev
  class Q ok`,

  "modelo-datos": `erDiagram
  USUARIO ||--o{ EVALUACION : realiza
  USUARIO ||--o{ CITA : agenda
  USUARIO ||--o{ DONACION : registra
  USUARIO ||--|| PROGRESO : tiene
  PROGRESO ||--o{ INSIGNIA_OBTENIDA : desbloquea
  INSIGNIA ||--o{ INSIGNIA_OBTENIDA : "se otorga en"
  CENTRO ||--o{ BLOQUE_HORARIO : ofrece
  BLOQUE_HORARIO ||--o{ CITA : reserva
  CITA ||--o{ RECORDATORIO : genera
  CITA |o--o| DONACION : "termina en"
  USUARIO {
    uuid id PK
    text nombre
    text correo
    text telefono
    text sexo "hombre|mujer"
    date ultima_donacion
    timestamptz creado
    bool consentimiento
  }
  EVALUACION {
    uuid id PK
    uuid usuario_id FK
    timestamptz fecha
    char codigo "X D F H J L N P Q"
    text[] requisitos
  }
  CENTRO {
    text id PK
    text nombre
    text direccion
    int[] dias_atencion
    int cupo_por_bloque
  }
  BLOQUE_HORARIO {
    uuid id PK
    text centro_id FK
    date fecha
    time hora
    int cupos_totales
  }
  CITA {
    uuid id PK
    char codigo "6 caracteres"
    uuid usuario_id FK
    uuid bloque_id FK
    text estado "agendada|cancelada|donada|no_asistio"
    bool requiere_revision
    timestamptz creada
  }
  RECORDATORIO {
    uuid id PK
    uuid cita_id FK
    text tipo "d2|d1|d0|post"
    text canal "email|whatsapp|push"
    timestamptz programado
    timestamptz enviado
  }
  DONACION {
    uuid id PK
    uuid usuario_id FK
    uuid cita_id FK
    date fecha
  }
  PROGRESO {
    uuid usuario_id PK
    int puntos
  }
  INSIGNIA {
    text id PK
    text nombre
    text criterio
  }
  INSIGNIA_OBTENIDA {
    uuid usuario_id FK
    text insignia_id FK
    timestamptz fecha
  }`,

  "secuencia-agendamiento": `sequenceDiagram
  actor J as Joven
  participant UI as Interfaz
  participant T as Motor de triaje
  participant AG as Agenda
  participant LS as localStorage
  J->>UI: Responde preguntas (Sí/No)
  UI->>T: siguientePregunta(respuestas)
  T-->>UI: próxima pregunta o fin
  J->>UI: Acepta declaración (Etapa 5)
  UI->>T: evaluar(respuestas)
  T-->>UI: código Q / P / J ... + motivos
  UI->>LS: guarda {fecha, código} (sin respuestas)
  J->>UI: Agendar mi hora
  UI->>AG: diasDisponibles / bloquesDelDia
  AG-->>UI: días y cupos libres
  J->>UI: Elige lugar, día y hora
  UI->>AG: confirmar (revalida cupo)
  UI->>LS: guarda cita + puntos
  UI->>AG: planRecordatorios / archivoICS
  AG-->>J: .ics, WhatsApp, correo, avisos`,
};
