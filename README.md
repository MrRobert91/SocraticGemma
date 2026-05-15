<div align="center">

# SocraticGemma

### **La IA que pregunta en lugar de responder.**

*Un compañero socrático que entrena tu pensamiento crítico, no lo sustituye.*

![Hackathon](https://img.shields.io/badge/Hackathon-Gemma%204%20Good-FFB000?style=for-the-badge)
![Built with Gemma](https://img.shields.io/badge/Built%20with-Google%20Gemma%204-4285F4?style=for-the-badge&logo=google)
![License MIT](https://img.shields.io/badge/License-MIT-9333EA?style=for-the-badge)

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

[Demo en vivo](https://socraticgemma-js7p6v.sliplane.app) · [Documentación API](https://socraticgemma-js7p6v.sliplane.app/docs) · [Categoría: AI for Education & Cognitive Resilience](#-categoría-del-hackathon)

</div>

---

## El problema

La mayoría de asistentes de IA están optimizados para una sola cosa: **darte la respuesta lo más rápido posible**. Eso es maravilloso para tareas mecánicas, pero está erosionando silenciosamente la habilidad más importante que tenemos: **pensar por nosotros mismos**.

Estudios recientes (MIT, 2025; Microsoft Research, 2024) muestran que el uso intensivo de LLMs reduce la activación cerebral asociada al razonamiento independiente, especialmente en niños y adolescentes en edad de desarrollo cognitivo. Cuando el modelo piensa por ti, tu cerebro deja de hacerlo.

## Nuestra propuesta

**SocraticGemma invierte el patrón.** En lugar de darte respuestas, te devuelve preguntas — del tipo correcto, en el momento correcto, adaptadas a tu edad y a tu nivel de razonamiento. Implementa la metodología **Philosophy for Children (P4C)**, validada en pedagogía durante 40 años, usando **Google Gemma 4** como motor de facilitación socrática.

> No es un tutor que sabe la respuesta. Es un compañero que sabe **qué preguntar** para que tú descubras la tuya.

Funciona para niños desde 6 años, adolescentes, y adultos buscando entrenar pensamiento filosófico riguroso. Cada sesión termina con un **informe filosófico personalizado** y enriquece un **wiki personal** que mapea la evolución de tu pensamiento a lo largo del tiempo.

---

## Categoría del hackathon

Este proyecto compite en **Gemma 4 Good** dentro del eje de **Educación y Resiliencia Cognitiva**:

| Eje de impacto | Cómo lo abordamos |
|---|---|
| **Aprendizaje adaptativo** | Prompts diferenciados por franja de edad (6-8, 9-12, 13-16, adultos) con vocabulario y abstracción calibrados |
| **Bienestar mental y autonomía** | Diseñado para preservar la metacognición y prevenir la "atrofia cognitiva por IA" |
| **Accesibilidad democrática** | Soporte multi-idioma (ES/EN), open source MIT, desplegable en cualquier hardware con Docker |
| **Privacidad por diseño** | Datos persistidos localmente en SQLite; wikis exportables en Markdown (compatibles con Obsidian) |
| **Pedagogía basada en evidencia** | Implementa P4C, marco con 40 años de literatura académica y resultados medibles en razonamiento crítico |

---

## Demo en vivo

**[socraticgemma-js7p6v.sliplane.app](https://socraticgemma-js7p6v.sliplane.app)**

Puedes empezar sin registrarte: elige una edad, escribe una pregunta filosófica, y conversa. Si te registras, además guardamos tu historial y construimos tu **wiki filosófico personal**.

---

## Características

### Diálogo socrático adaptativo

- **Cuatro franjas de edad** con prompts dedicados: 6-8, 9-12, 13-16, adultos
- **Tres formatos de estímulo**: pregunta abierta, escenario / dilema ético, historia
- **Duración configurable**: de 5 a 50 turnos por sesión
- **Streaming en tiempo real** con SSE (Server-Sent Events)
- **Razonamiento visible**: muestra el "thinking trace" del modelo para transparencia pedagógica

### Motor socrático de 8 capas

Cada turno construye un prompt estructurado en capas, lo que garantiza coherencia, diversidad y rigor sin que el modelo "improvise":

```
LAYER 1   Identidad sistémica + instrucción de progreso de sesión
LAYER 2   Guías de comunicación específicas por edad
LAYER 3   Reglas de comportamientos prohibidos (con ejemplos MAL/BIEN)
LAYER 4   Rotación inteligente entre 7 tipos de pregunta P4C
LAYER 5   Movimientos RAG opcionales (literatura P4C indexada)
LAYER 6   Historia del diálogo + estímulo inicial
LAYER 7   Formato de salida JSON estructurado
LAYER 8   Perfil filosófico del usuario (sesiones anteriores) ← personalización
```

### Los 7 tipos de pregunta P4C

| Tipo | Función | Ejemplo |
|---|---|---|
| **Conceptual** | Clarificar significado | *"¿Qué quieres decir con 'justicia'?"* |
| **Supuesto** | Examinar presupuestos | *"¿Qué estás asumiendo cuando dices eso?"* |
| **Evidencia** | Evaluar razones | *"¿Qué te hace pensar eso?"* |
| **Perspectiva** | Otras miradas | *"¿Cómo lo vería alguien que no está de acuerdo?"* |
| **Implicación** | Explorar consecuencias | *"¿Qué pasaría si todos pensaran así?"* |
| **Metacognitivo** | Pensar sobre pensar | *"¿Qué tipo de pregunta es esa?"* |
| **Apertura** | Nuevas posibilidades | *"¿Qué más te hace pensar esto?"* |

El motor **rota automáticamente** los tipos, evitando que el modelo se quede atrapado pidiendo siempre "evidencia" o "supuestos".

### Comportamientos prohibidos — el guardarraíl ético

El modelo es entrenado explícitamente para evitar cinco antipatrones documentados en la literatura P4C:

| Comportamiento | Por qué importa |
|---|---|
| **Overhelp** | "Exactamente, lo entendiste perfectamente" → cierra el pensamiento |
| **Lecture** | Explicar conceptos que el participante no pidió → modo "profesor" |
| **Correct** | "En realidad eso no es así" → mata la curiosidad |
| **Leading** | Preguntas que dirigen a una respuesta predeterminada |
| **Close** | Respuestas rápidas que cierran la indagación |

Un evaluador automático separado **detecta y puntúa** estos comportamientos al final de cada sesión.

### Informe filosófico personalizado

Al terminar una sesión, un segundo LLM analiza toda la conversación y genera un **informe en markdown** con 7 secciones:

1. **Mapa filosófico** — resumen y arco de la conversación
2. **Creencias y posiciones detectadas** — qué intuiciones expresaste
3. **Corrientes afines** — empirismo, estoicismo, existencialismo, etc.
4. **Tu estilo de razonamiento** — concreto vs abstracto, intuitivo vs analítico
5. **Pensadores que podrían interesarte** — lecturas recomendadas con justificación
6. **Puntos ciegos** — perspectivas que no exploraste
7. **Caminos para seguir explorando** — preguntas nuevas y experimentos mentales

Es como salir de una sesión con un terapeuta filosófico que tomó notas.

### Wiki filosófico personal

> *La función estrella, y única en su categoría.*

Cada sesión alimenta automáticamente un **wiki personal** que evoluciona con tu pensamiento:

- **Páginas auto-generadas** por tema filosófico tratado (libre albedrío, justicia, identidad…)
- **Páginas de corrientes** (estoicismo, kantianismo, pragmatismo…) enlazadas a tus temas
- **Grafo de conocimiento navegable** con React Flow — visualiza las conexiones entre tus ideas
- **Perfil filosófico evolutivo** (`_profile.md`) que sintetiza tu estilo, corrientes predominantes, contradicciones detectadas
- **Inyección en futuros prompts**: las próximas sesiones consultan tu wiki para personalizar las preguntas
- **Export Obsidian-compatible** en ZIP con frontmatter YAML y enlaces `[[wiki-style]]`

Tus datos te pertenecen — puedes llevártelos en cualquier momento.

### Modo comparación

¿Cómo cambia la conversación si en lugar del enfoque socrático usaras un asistente helpful estándar? El endpoint `/compare` ejecuta el mismo input por ambos prompts y devuelve las puntuaciones lado a lado. Es la mejor herramienta de demostración pedagógica que existe.

### Multi-idioma y autenticación

- **i18n** en español e inglés (la mayoría de prompts y la UI completa)
- **Auth con JWT + cookies httpOnly**, contraseñas con bcrypt
- **Preferencias persistidas** por usuario (idioma, historial completo de sesiones)
- **Modo invitado** funcional para demo rápida sin registrarse

---

## Cómo funciona

```
┌────────────────────────────────────────────────────────────────────────┐
│                          USUARIO (niño/adulto)                          │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ pregunta filosófica
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     FRONTEND  (Next.js 16 · React Flow)                 │
│           setup → diálogo SSE → informe → wiki + grafo                  │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ HTTP / SSE
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND  (FastAPI · async)                       │
│                                                                          │
│   ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│   │ SocraticEngine  │───▶│  PromptBuilder   │───▶│  GemmaClient     │  │
│   │ (orquestador)   │    │  (8 capas)       │    │  (OpenRouter)    │  │
│   └────────┬────────┘    └──────────────────┘    └────────┬─────────┘  │
│            │                                                │            │
│            │             ┌──────────────────┐               │            │
│            ├────────────▶│   Evaluator      │◀──────────────┤            │
│            │             │  (scoring LLM)   │               │            │
│            │             └──────────────────┘               │            │
│            │                                                │            │
│            │             ┌──────────────────┐               │            │
│            ├────────────▶│   RAG (Chroma)   │ optional      │            │
│            │             └──────────────────┘               │            │
│            │                                                │            │
│            │             ┌──────────────────┐               │            │
│            └────────────▶│   ReportService  │───────────────┤            │
│                          │   + WikiService  │               │            │
│                          └────────┬─────────┘               │            │
│                                   │                          │            │
│                          ┌────────▼─────────┐    ┌──────────▼─────────┐ │
│                          │   SQLite (DB)    │    │  Markdown (wiki)   │ │
│                          │  users/sessions  │    │  _profile.md +     │ │
│                          │  turns/reports   │    │  topics/streams    │ │
│                          └──────────────────┘    └────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │
                          ┌───────┴────────┐
                          │  Google Gemma  │
                          │   (vía OpenR.) │
                          └────────────────┘
```

### El ciclo de una sesión

1. **Setup** — el usuario elige edad, estímulo (pregunta/escenario/historia), duración y opciones avanzadas (RAG, modo razonamiento visible).
2. **Diálogo** — cada turno construye el prompt de 8 capas, lo envía a Gemma con streaming, parsea la respuesta JSON `{question, question_type, thinking}` y la entrega al frontend vía SSE.
3. **Progresión por fases** — el motor reconoce 5 fases (`stimulus → questions → agenda → inquiry → synthesis`) y ajusta la instrucción según el % de sesión restante.
4. **Evaluación batch** — al final, un LLM evaluador puntúa cada turno en 5 dimensiones y detecta comportamientos prohibidos.
5. **Informe** — segundo LLM genera el informe filosófico personalizado en markdown vía streaming.
6. **Síntesis wiki** (usuarios registrados) — dos llamadas LLM en background:
   - **Extracción**: estructura los temas, corrientes, posiciones, contradicciones
   - **Síntesis**: genera/actualiza las páginas markdown del wiki y reconstruye el grafo

---

## Criterios de evaluación

Cada turno del modelo se puntúa en 5 dimensiones (1-5), con ponderación:

| Dimensión | Peso | Qué mide |
|---|:---:|---|
| **Socratismo** | 30% | ¿Pregunta en lugar de responder? ¿Profundiza? |
| **Adecuación a la edad** | 17.5% | ¿Vocabulario y abstracción apropiados? |
| **Construcción** | 17.5% | ¿Conecta con la respuesta previa del usuario? |
| **Apertura** | 17.5% | ¿Admite múltiples respuestas válidas? |
| **Avance** | 17.5% | ¿Mueve la indagación hacia adelante? |

---

## Stack técnico

### Backend

| Componente | Tecnología | Por qué |
|---|---|---|
| Runtime | Python 3.11+ async | Streaming SSE concurrente sin bloquear |
| API | FastAPI 0.109 | Type-safety + OpenAPI auto + WebSockets ready |
| LLM | Google Gemma 4 (vía OpenRouter) | Acceso flexible, modelo fast (`gemma-4-e2b-it`) + accurate (`gemma-4-27b-it`) |
| Persistencia | SQLite + aiosqlite | Cero-config, embebible, exportable |
| Auth | JWT + bcrypt + cookies httpOnly | Estándar industria, seguro por defecto |
| RAG (opcional) | ChromaDB | Búsqueda semántica sobre movimientos P4C |
| Streaming | sse-starlette | SSE nativo, sin WebSockets innecesarios |
| Wiki storage | Markdown + YAML frontmatter | Portable, Obsidian-compatible, human-readable |

### Frontend

| Componente | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Tipado | TypeScript 5 estricto |
| Estilos | Tailwind CSS + sistema neo-brutalist propio |
| Grafo wiki | `@xyflow/react` (React Flow) |
| Streaming hooks | `EventSource` nativo + hooks custom |
| i18n | Diccionarios tipados (ES/EN) |

### Despliegue

- **Docker Compose** orquesta backend + frontend en una sola red
- **Healthchecks** integrados
- **Volúmenes persistentes** para SQLite + wikis de usuario
- Actualmente en producción en **Sliplane**

---

## Inicio rápido

### Con Docker Compose (recomendado)

```bash
git clone https://github.com/MrRobert91/SocraticGemma.git
cd SocraticGemma

# Configurar variables
cp .env.example .env
# Edita .env:
#   OPENROUTER_API_KEY=sk-or-...
#   JWT_SECRET_KEY=<32+ caracteres aleatorios>

docker-compose up -d

# Aplicación:
#   Frontend  → http://localhost:3000
#   API       → http://localhost:8000
#   Docs API  → http://localhost:8000/docs
```

### Desarrollo local

**Requisitos**: Python 3.11+, Node 20+, una API key de [OpenRouter](https://openrouter.ai)

**Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Linux/Mac
# venv\Scripts\activate           # Windows

pip install -r requirements.txt

export OPENROUTER_API_KEY=sk-or-...
export JWT_SECRET_KEY=$(openssl rand -hex 32)

uvicorn app.main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

---

## Endpoints principales

| Método | Endpoint | Función |
|---|---|---|
| `POST` | `/auth/register` · `/auth/login` · `/auth/logout` | Gestión de usuarios |
| `GET`  | `/auth/me` | Usuario actual |
| `POST` | `/sessions` | Crear sesión socrática |
| `GET`  | `/sessions/{id}` | Detalle de sesión |
| `POST` | `/sessions/{id}/turns` | **Turno con streaming SSE** |
| `POST` | `/sessions/{id}/batch-evaluate` | Evaluación al final |
| `POST` | `/sessions/{id}/report` | **Informe filosófico (SSE)** |
| `GET`  | `/conversations` | Histórico paginado del usuario |
| `GET`  | `/wiki/graph` | Grafo de conocimiento (nodos + aristas) |
| `GET`  | `/wiki/pages/{slug}` | Página wiki individual |
| `GET`  | `/wiki/export` | **ZIP Obsidian-compatible** |
| `POST` | `/wiki/rebuild` | Re-sintetizar wiki completo |
| `POST` | `/compare` | Comparar baseline vs P4C |
| `POST` | `/rag/search` · `/rag/index` | Búsqueda RAG de movimientos P4C |
| `GET`  | `/health` | Healthcheck |

Documentación interactiva completa (Swagger UI): **`/docs`**

---

## Lo que hace a este proyecto único

| | Asistentes IA convencionales | **SocraticGemma** |
|---|---|---|
| Optimizado para | Velocidad de respuesta | **Profundidad del pensamiento del usuario** |
| Métrica de éxito | "Te di la respuesta correcta" | **"Te hice pensar"** |
| Comportamiento | Responder, explicar, corregir | **Preguntar, abrir, esperar** |
| Personalización | Memoria de hechos sobre ti | **Mapa filosófico que evoluciona** |
| Tras 100 sesiones | Has consumido información | **Tienes un wiki de tu propio pensamiento** |
| Privacidad de datos | Servidor del proveedor | **SQLite + markdown locales, exportable** |
| Edad mínima | 13+ (mayoría) | **Diseñado desde los 6 años** |
| Marco pedagógico | Ninguno | **P4C, validado durante 40 años** |

---

## Roadmap

- [ ] **Modo voz** con Gemma multimodal — diálogo socrático hablado para edades tempranas
- [ ] **Modo aula** — sesiones grupales con múltiples participantes
- [ ] **Métricas longitudinales** — dashboard de evolución del pensamiento crítico
- [ ] **Integración con plataformas educativas** (Google Classroom, Moodle)
- [ ] **Gemma on-device** — versión sin servidor para máxima privacidad
- [ ] **Más idiomas** — catalán, francés, portugués, mandarín

---

## Licencia

[MIT](LICENSE) — úsalo, modifícalo, despliégalo en tu colegio, hospital, biblioteca pública o donde haga falta sembrar pensamiento crítico.

---

<div align="center">

### *"No pretendo enseñar a nadie nada, sólo hacerles pensar."*
**— Sócrates**

Construido con FastAPI, Next.js, y mucho café — para **Gemma 4 Good**.

</div>
