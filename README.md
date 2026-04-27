# SocraticGemma

![P4C Hackathon 2024](https://img.shields.io/badge/Hackathon-P4C%202024-amber)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![License](https://img.shields.io/badge/License-MIT-purple)

> **La IA que pregunta en lugar de responder.**

SocraticGemma es una API que utiliza los modelos Gemma de Google para facilitar diálogos socráticos con niños. Implementa la metodología de Filosofía para Niños (P4C), guiando a los niños a través de la inquiry filosófica mediante preguntas en lugar de respuestas directas.

## Características Principales

- **Diálogo Socrático**: Facilita la inquiry filosófica sin dar respuestas directas
- **Adaptado por Edad**: Adapta el lenguaje y conceptos para diferentes grupos de edad (6-8, 9-12, 13-16)
- **Evaluación Automática**: Puntuación en socratismo, adecuación a la edad, construcción sobre respuestas, apertura y avance
- **Detección de Comportamientos Prohibidos**: Identifica sobre-ayuda, lectura, corrección, inducción y preguntas cerradas
- **Mejora RAG**: Generación aumentada por recuperación para contexto opcional
- **Comparación de Enfoques**: Compara el enfoque P4C vs asistente helpful baseline

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        SocraticGemma                             │
│                                                                   │
│  ┌──────────────┐     ┌─────────────────────────────────────┐  │
│  │   Frontend    │     │              Backend                  │  │
│  │   (Next.js)   │     │         (FastAPI + Gemma)           │  │
│  │               │     │                                      │  │
│  │  /            │     │  ┌─────────┐  ┌─────────────────┐  │  │
│  │  /session/[id]│────▶│  │ Routers │─▶│ SocraticEngine  │  │  │
│  │  /eval/[id]   │     │  └─────────┘  └─────────────────┘  │  │
│  │  /compare     │     │       │               │            │  │
│  │               │     │  ┌────┴────┐    ┌────▼────┐       │  │
│  │  Port: 3000   │     │  │ Gemma   │    │Prompt   │       │  │
│  │               │     │  │ Client  │    │Builder  │       │  │
│  └──────────────┘     │  └─────────┘    └─────────┘       │  │
│         ▲             │       │               │            │  │
│         │             │  ┌────▼────┐    ┌────▼────┐       │  │
│         │             │  │Evaluator│    │  RAG    │       │  │
│         │             │  └─────────┘    │ Service │       │  │
│         │             │                  └─────────┘       │  │
│         │             │         Port: 8000                │  │
└─────────┼─────────────┘─────────────────────────────────────┘  │
          │                                                       │
          ▼                                                       │
  ┌───────────────┐                                               │
  │  OpenRouter   │                                               │
  │    (Gemma)    │                                               │
  └───────────────┘                                               │
```

## Inicio Rápido

### Usando Docker Compose (Recomendado)

```bash
# Clonar el repositorio
git clone https://github.com/MrRobert91/SocraticGemma.git
cd SocraticGemma

# Copiar archivo de configuración
cp .env.example .env

# Editar .env y agregar tu OpenRouter API Key
# OPENROUTER_API_KEY=tu_api_key_aqui

# Iniciar todos los servicios
docker-compose up -d

# La aplicación estará disponible en:
# - Frontend: http://localhost:3000
# - API: http://localhost:8000
# - Docs: http://localhost:8000/docs
```

### Desarrollo Local

#### Requisitos Previos

- Python 3.11+
- Node.js 20+
- OpenRouter API Key

#### Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
export OPENROUTER_API_KEY=tu_api_key
export GEMMA_MODEL_FAST=google/gemma-4-e2b-it

# Ejecutar servidor de desarrollo
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev
```

## Endpoints de la API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Verificación de salud del servicio |
| POST | `/sessions` | Crear nueva sesión de diálogo |
| GET | `/sessions` | Listar todas las sesiones activas |
| GET | `/sessions/{id}` | Obtener sesión por ID |
| POST | `/sessions/{id}/turns` | Procesar turno con streaming SSE |
| GET | `/sessions/{id}/eval` | Obtener resumen de evaluación |
| POST | `/compare` | Comparar respuestas baseline vs P4C |
| GET | `/prompts` | Listar todas las plantillas de prompts |
| GET | `/prompts/{name}` | Obtener prompt específico |
| POST | `/rag/search` | Buscar movimientos P4C |
| POST | `/rag/index` | Construir índice RAG |
| GET | `/rag/status` | Estado del servicio RAG |

### Documentación Completa

Visita `/docs` (Swagger UI) o `/redoc` para ver la documentación interactiva de la API.

## Páginas del Frontend

| Ruta | Descripción |
|------|-------------|
| `/` | Página principal con selector de edad, presets y formulario de estímulo |
| `/session/[id]` | Interfaz de diálogo con streaming en tiempo real |
| `/eval/[id]` | Visualización de evaluación con gráficos y métricas |
| `/compare` | Comparación lado a lado de prompts baseline vs P4C |

## Presets de Demostración

| ID | Grupo de Edad | Título | Estímulo |
|----|---------------|--------|----------|
| 1 | 6-8 | ¿Por qué los animales no hablan como nosotros? | ¿Por qué los animales no hablan como nosotros? |
| 2 | 6-8 | ¿Es injusto que algunos niños tengan más juguetes? | ¿Es injusto que algunos niños tengan más juguetes que otros? |
| 3 | 9-12 | ¿Por qué está mal mentir aunque nadie se entere? | ¿Por qué está mal mentir aunque nadie se entere? |
| 4 | 9-12 | ¿Pueden las reglas ser injustas? | ¿Pueden las reglas ser injustas? ¿Deberíamos siempre seguirlas? |
| 5 | 13-16 | ¿Tiene la IA conciencia? | ¿Tiene la inteligencia artificial conciencia? ¿Cómo podríamos saberlo? |

## Tipos de Preguntas P4C

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| **Conceptual** | Clarificar conceptos y significados | "¿Qué quieres decir con 'justicia'?" |
| **Supuestos** | Examinar suposiciones | "¿Qué estás asumiendo cuando dices eso?" |
| **Evidencia** | Evaluar evidencia y razones | "¿Qué te hace pensar eso?" |
| **Perspectiva** | Considerar otras perspectivas | "¿Qué pensaría otra persona sobre esto?" |
| **Implicación** | Explorar consecuencias | "¿Qué pasaría si todos pensaran eso?" |
| **Metacognitivo** | Reflexionar sobre el pensamiento | "¿Cómo llegaste a esa conclusión?" |
| **Apertura** | Abrir nuevas posibilidades | "¿Te has preguntado alguna vez por qué...?" |

## Criterios de Evaluación

Cada respuesta del modelo es evaluada en 5 dimensiones:

| Criterio | Peso | Descripción |
|----------|------|-------------|
| **Socratismo** | 30% | Qué tan bien sigue el método socrático (preguntas, no respuestas) |
| **Adecuación a la Edad** | 20% | Qué tan apropiado es el lenguaje para la edad del niño |
| **Construcción** | 20% | Qué tan bien construye sobre la respuesta anterior del niño |
| **Apertura** | 15% | Qué tan abierta es la pregunta (no cerrada, no诱导) |
| **Avance** | 15% | Qué tanto avanza la inquiry filosófica |

**Comportamientos Prohibidos** (detectados y penalizados):
- **Sobre-ayuda**: Dar demasiado contexto o pistas
- **Lectura**: Dar una "lectura" o explicación extensa
- **Corrección**: Corregir directamente al niño
- **Inducción**: Hacer preguntas que guían hacia una respuesta específica
- **Cerrada**: Hacer preguntas sí/no que limitan la exploración

## Cómo Funciona

### Sistema de 7 Capas de Prompt

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INPUT                              │
│           ( child's response to dialogue )                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: Age-Adapted Communication Guidelines              │
│  - Adjusts vocabulary, complexity, and examples by age      │
│  - Ages 6-8: Simple concepts, concrete examples             │
│  - Ages 9-12: Moderate complexity, some abstraction        │
│  - Ages 13-16: Full philosophical complexity               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: P4C Question Type Strategy                       │
│  - Routes response to appropriate question type            │
│  - Tracks question type history to ensure diversity        │
│  - Balances: conceptual, assumption, evidence, etc.        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: RAG-Augmented Context (optional)                  │
│  - Semantic search over 18 P4C question moves              │
│  - Retrieves relevant examples from philosophy literature  │
│  - Provides age-appropriate move suggestions               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4: Forbidden Behavior Rules                         │
│  - Explicitly prohibits: overhelp, lecture, correct,       │
│    leading, closed questions                               │
│  - Detects and flags violations in model output            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 5: Socratic Core Principles                        │
│  - Never give direct answers                               │
│  - Always respond with a question                          │
│  - Embrace puzzlement and uncertainty                      │
│  - Build on child's natural curiosity                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 6: Dialogue History & Context                       │
│  - Maintains full conversation history                     │
│  - Tracks previous question types used                     │
│  - Builds on child's previous responses                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 7: Output Format Enforcement                       │
│  - Structured JSON output with question_type              │
│  - Includes thinking_trace for transparency               │
│  - Enables automatic evaluation                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   MODEL OUTPUT                               │
│  - Socratic question + thinking trace                      │
│  - Question type tag                                       │
│  - Ready for evaluation                                    │
└─────────────────────────────────────────────────────────────┘
```

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

**P4C Hackathon 2024** - Construido con FastAPI, Next.js, y Google Gemma
