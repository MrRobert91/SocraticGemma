<div align="center">

# SocraticGemma

### **The AI that asks instead of answers.**

*A Socratic companion that trains your critical thinking — it doesn't replace it.*

![Hackathon](https://img.shields.io/badge/Hackathon-Gemma%204%20Good-FFB000?style=for-the-badge)
![Built with Gemma](https://img.shields.io/badge/Built%20with-Google%20Gemma%204-4285F4?style=for-the-badge&logo=google)
![License CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-9333EA?style=for-the-badge)

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

[Live Demo](https://socraticgemma-js7p6v.sliplane.app) · [API Docs](https://socraticgemma-js7p6v.sliplane.app/docs) · [Track: Future of Education](#hackathon-track)

</div>

---

## The Problem

Most AI assistants are optimized for one thing: **giving you the right answer as fast as possible**. That is great for mechanical tasks, but it is silently eroding the most important skill we have: **thinking for ourselves**.

Recent studies (MIT 2025; Microsoft Research 2024) show that intensive LLM use reduces brain activation associated with independent reasoning — especially in children and adolescents during critical cognitive development windows. When the model thinks for you, your brain stops doing it.

## Our Approach

**SocraticGemma inverts the pattern.** Instead of giving answers, it returns questions — the right kind, at the right moment, adapted to the user's age and reasoning level. It uses **Google Gemma 4** as a Socratic facilitation engine grounded in the same principles Socrates described: surface assumptions, test beliefs, keep inquiry open.

> It is not a tutor that knows the answer. It is a companion that knows **what to ask** so you discover it yourself.

It works for children from age 6, teenagers, and adults who want to develop rigorous philosophical thinking. Every session ends with a **personalised philosophical report** and feeds into a **personal wiki** that maps the evolution of your thinking over time.

---

## Hackathon Track

This project competes in **Gemma 4 Good** under the **Future of Education** track:

| Impact axis | How we address it |
|---|---|
| **Adaptive learning** | Age-specific prompts (6-8, 9-12, 13-16, adults) with calibrated vocabulary and abstraction |
| **Mental wellbeing and autonomy** | Designed to preserve metacognition and prevent AI-induced cognitive atrophy |
| **Democratic accessibility** | Multi-language (ES/EN), CC BY 4.0 open source, deployable on any hardware with Docker |
| **Privacy by design** | Data persisted locally in SQLite; wikis exportable as Markdown (Obsidian-compatible) |

---

## Live Demo

**[socraticgemma-js7p6v.sliplane.app](https://socraticgemma-js7p6v.sliplane.app)**

You can start without registering: choose an age, write a philosophical question, and start talking. If you register, your history is saved and your **personal philosophy wiki** is built automatically.

---

## Features

### Adaptive Socratic dialogue

- **Four age ranges** with dedicated prompts: 6-8, 9-12, 13-16, adults
- **Three stimulus formats**: open question, ethical scenario / dilemma, story
- **Configurable length**: 5 to 50 turns per session
- **Real-time streaming** via SSE (Server-Sent Events)
- **Visible reasoning**: the model's `thinking` trace is shown to the user for pedagogical transparency

### The 8-layer prompt engine

Each dialogue turn builds a structured prompt across 8 layers — this guarantees coherence, variety, and rigour without the model improvising:

```
LAYER 1   System identity + phase-aware session progress instruction
LAYER 2   Age-specific communication guidelines
LAYER 3   Forbidden behaviour rules with explicit BAD/GOOD examples
LAYER 4   Intelligent rotation across 7 Socratic question types
LAYER 5   Resumed session context — prior history injected when continuing a past dialogue
LAYER 6   Full dialogue history + initial stimulus
LAYER 7   Structured JSON output format
LAYER 8   User's global philosophical profile ← personalisation from accumulated thinking
```

The session also progresses through 5 phases (`stimulus → questions → agenda → inquiry → synthesis`), with different instructions per phase based on % of session remaining.

### The 7 Socratic question types

| Type | Function | Example |
|---|---|---|
| **Conceptual** | Clarify meaning | *"What do you mean by 'justice'?"* |
| **Assumption** | Surface presuppositions | *"What are you assuming when you say that?"* |
| **Evidence** | Evaluate reasons | *"What makes you think so?"* |
| **Perspective** | Other viewpoints | *"How would someone who disagrees see this?"* |
| **Implication** | Explore consequences | *"What would happen if everyone thought this way?"* |
| **Metacognitive** | Think about thinking | *"What kind of question is that?"* |
| **Opening** | New possibilities | *"What else does this make you think about?"* |

The engine **rotates automatically** through types, preventing the model from getting stuck asking only for "evidence" or "assumptions".

### Forbidden behaviour guardrails

The model is explicitly trained to avoid five anti-patterns that undermine genuine inquiry:

| Behaviour | Why it matters |
|---|---|
| **Overhelp** | "Exactly right, you got it!" → closes down thinking |
| **Lecture** | Explaining concepts the user didn't ask for → teacher mode |
| **Correct** | "Actually that's not quite right" → kills curiosity |
| **Leading** | Questions that point to a predetermined answer |
| **Close** | Quick answers that shut down inquiry |

A separate evaluator LLM **detects and scores** these behaviours at the end of each session — providing measurable proof that the model is facilitating thinking rather than replacing it.

### Per-session philosophical report

At the end of every session, a second Gemma 4 call analyses the full conversation and generates a Markdown report with 7 sections:

1. **Philosophical map** — summary and arc of the conversation
2. **Detected beliefs and positions** — what intuitions the user expressed
3. **Related currents** — empiricism, stoicism, existentialism, etc.
4. **Reasoning style** — concrete vs abstract, intuitive vs analytical
5. **Thinkers to explore** — recommended readings with justification
6. **Blind spots** — perspectives that were not explored
7. **Paths to continue** — new questions and thought experiments

### Personal philosophy wiki

> *The standout feature — and unique in its category.*

Each session automatically feeds a **living knowledge graph** that grows with the user's thinking.

**Connected notes, auto-generated**
Every conversation produces or updates Markdown pages per philosophical topic (free will, justice, identity, consciousness…) and per school of thought (stoicism, Kantianism, pragmatism…). Pages link to each other with `[[wiki-style]]` backlinks. After ten conversations, you have an interconnected map of your own mind.

**Interactive graph view**
The full wiki is rendered as a navigable force graph using React Flow. You can explore which ideas cluster together, which are isolated, and which are in visible tension with each other — all at a glance.

**Global evolving profile**
Across all sessions, a synthesised `_profile.md` accumulates: your dominant philosophical currents, recurring themes, detected contradictions between conversations, and how your thinking has shifted over time. This profile is injected into every new session prompt so Gemma can ask increasingly personal and challenging questions.

**Smart stimulus suggestions**
The system reads your knowledge graph and proposes new conversation starters targeted at:
- Topics you have raised but never gone deep on
- Ideas that appear in tension with each other across different sessions
- Unexplored angles adjacent to your strongest interests

This turns the wiki from a passive archive into an active thinking partner.

**Continue past conversations**
Any prior dialogue can be resumed. The full session history and your accumulated profile are re-injected into the prompt so Gemma picks up exactly where you left off — no repetition, no reset.

**Obsidian-compatible export**
Download your entire wiki as a ZIP of Markdown files with YAML frontmatter and `[[wiki-style]]` backlinks. Open the folder in Obsidian and your philosophical knowledge graph is immediately navigable in your own tools, with zero reformatting. Your data is stored locally — portable, human-readable, no vendor lock-in.

### Compare mode

How does the conversation change if you use a standard helpful assistant instead of the Socratic approach? The `/compare` endpoint runs the same input through both prompts and returns scores side by side — useful as a pedagogical demonstration tool.

### Multi-language and authentication

- **i18n** in Spanish and English (UI and most prompts)
- **JWT auth + httpOnly cookies**, passwords with bcrypt
- **Persisted preferences** per user (language, full session history)
- **Guest mode** for quick demos without registering

---

## How it works

```
┌────────────────────────────────────────────────────────────────────────┐
│                            USER (child / adult)                         │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ philosophical question
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND  (Next.js 16 · React Flow)                  │
│          setup → SSE dialogue → report → wiki + graph                   │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ HTTP / SSE
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       BACKEND  (FastAPI · async)                        │
│                                                                          │
│   ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│   │ SocraticEngine  │───▶│  PromptBuilder   │───▶│  GemmaClient     │  │
│   │ (orchestrator)  │    │  (8 layers)      │    │  (OpenRouter)    │  │
│   └────────┬────────┘    └──────────────────┘    └────────┬─────────┘  │
│            │                                                │            │
│            │             ┌──────────────────┐               │            │
│            ├────────────▶│   Evaluator      │◀──────────────┤            │
│            │             │  (scoring LLM)   │               │            │
│            │             └──────────────────┘               │            │
│            │                                                │            │
│            │             ┌──────────────────┐               │            │
│            └────────────▶│  ReportService   │───────────────┘            │
│                          │  + WikiService   │                            │
│                          └────────┬─────────┘                            │
│                                   │                                      │
│                          ┌────────▼─────────┐    ┌────────────────────┐ │
│                          │   SQLite (DB)    │    │  Markdown (wiki)   │ │
│                          │  users/sessions  │    │  _profile.md +     │ │
│                          │  turns/reports   │    │  topics/schools    │ │
│                          └──────────────────┘    └────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │
                          ┌───────┴────────┐
                          │  Google Gemma 4 │
                          │  (OpenRouter)  │
                          └────────────────┘
```

### Session lifecycle

1. **Setup** — user picks age range, stimulus type (question / scenario / story), session length, and whether to show the thinking trace.
2. **Dialogue** — each turn builds the 8-layer prompt, sends it to Gemma with streaming, parses the JSON response `{question, question_type, thinking}`, and delivers it to the frontend via SSE.
3. **Phase progression** — the engine recognises 5 phases (`stimulus → questions → agenda → inquiry → synthesis`) and adjusts instructions based on % of session remaining.
4. **Batch evaluation** — at the end, an evaluator LLM scores each turn across 5 dimensions and flags any forbidden behaviours.
5. **Report** — a second Gemma 4 call generates the personalised philosophical report in Markdown via streaming.
6. **Wiki synthesis** (registered users) — two background LLM calls:
   - **Extraction**: structures topics, schools of thought, positions, contradictions, and recommended thinkers into JSON
   - **Synthesis**: creates or patches Markdown wiki pages and rebuilds the knowledge graph

---

## Evaluation scoring

Each model turn is scored across 5 dimensions (1–5 scale) with weights:

| Dimension | Weight | What it measures |
|---|:---:|---|
| **Socratism** | 30% | Does it ask instead of answer? Does it deepen inquiry? |
| **Age-appropriateness** | 17.5% | Correct vocabulary and abstraction level? |
| **Construction** | 17.5% | Does it build on the user's previous response? |
| **Openness** | 17.5% | Does it admit multiple valid answers? |
| **Advancement** | 17.5% | Does it move the inquiry forward? |

---

## Tech stack

### Backend

| Component | Technology | Why |
|---|---|---|
| Runtime | Python 3.11+ async | Concurrent SSE streaming without blocking |
| API | FastAPI 0.109 | Type-safety + auto OpenAPI + async-native |
| LLM | Google Gemma 4 (via OpenRouter) | Fast variant (`gemma-4-e2b-it`) + accurate variant (`gemma-4-27b-it`) |
| Persistence | SQLite + aiosqlite | Zero-config, embeddable, exportable |
| Auth | JWT + bcrypt + httpOnly cookies | Industry standard, secure by default |
| Streaming | sse-starlette | Native SSE, no unnecessary WebSockets |
| Wiki storage | Markdown + YAML frontmatter | Portable, Obsidian-compatible, human-readable |

### Frontend

| Component | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Typing | TypeScript 5 strict |
| Styles | Tailwind CSS + custom neo-brutalist design system |
| Wiki graph | `@xyflow/react` (React Flow) |
| Streaming hooks | Native `EventSource` + custom hooks |
| i18n | Typed dictionaries (ES/EN) |

### Deployment

- **Docker Compose** orchestrates backend + frontend in a single network
- **Integrated healthchecks**
- **Persistent volumes** for SQLite + user wikis
- Currently in production on **Sliplane**

---

## Quick start

### With Docker Compose (recommended)

```bash
git clone https://github.com/MrRobert91/SocraticGemma.git
cd SocraticGemma

# Set environment variables
cp .env.example .env
# Edit .env:
#   OPENROUTER_API_KEY=sk-or-...
#   JWT_SECRET_KEY=<32+ random characters>

docker-compose up -d

# Application:
#   Frontend  → http://localhost:3000
#   API       → http://localhost:8000
#   API Docs  → http://localhost:8000/docs
```

### Local development

**Requirements**: Python 3.11+, Node 20+, an [OpenRouter](https://openrouter.ai) API key

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

## Main endpoints

| Method | Endpoint | Function |
|---|---|---|
| `POST` | `/auth/register` · `/auth/login` · `/auth/logout` | User management |
| `GET`  | `/auth/me` | Current user |
| `POST` | `/sessions` | Create a Socratic session |
| `GET`  | `/sessions/{id}` | Session detail |
| `POST` | `/sessions/{id}/turns` | **Dialogue turn with SSE streaming** |
| `POST` | `/sessions/{id}/batch-evaluate` | End-of-session evaluation |
| `POST` | `/sessions/{id}/report` | **Philosophical report (SSE streaming)** |
| `GET`  | `/conversations` | Paginated user history |
| `GET`  | `/wiki/graph` | Knowledge graph (nodes + edges) |
| `GET`  | `/wiki/pages/{slug}` | Individual wiki page |
| `GET`  | `/wiki/export` | **Obsidian-compatible ZIP export** |
| `POST` | `/wiki/rebuild` | Re-synthesise full wiki |
| `POST` | `/compare` | Compare Socratic vs baseline prompt |
| `GET`  | `/health` | Healthcheck |

Full interactive documentation (Swagger UI): **`/docs`**

---

## What makes this project unique

| | Conventional AI assistants | **SocraticGemma** |
|---|---|---|
| Optimised for | Speed of response | **Depth of the user's thinking** |
| Success metric | "I gave you the right answer" | **"I made you think"** |
| Behaviour | Answer, explain, correct | **Ask, open, wait** |
| Personalisation | Facts about you | **Evolving philosophical map** |
| After 100 sessions | You have consumed information | **You have a wiki of your own thought** |
| Data privacy | Provider's servers | **Local SQLite + Markdown, exportable** |
| Minimum age | 13+ (most tools) | **Designed from age 6** |

---

## Roadmap

- [ ] **Voice mode** with Gemma multimodal — spoken Socratic dialogue for younger ages
- [ ] **Classroom mode** — group sessions with multiple participants
- [ ] **Longitudinal metrics** — dashboard tracking critical thinking over time
- [ ] **Educational platform integrations** (Google Classroom, Moodle)
- [ ] **On-device Gemma** — server-free version for maximum privacy
- [ ] **More languages** — Catalan, French, Portuguese, Mandarin

---

## License

[Creative Commons Attribution 4.0 International](LICENSE) — use it, adapt it, and share it with attribution in your school, hospital, public library, or wherever critical thinking needs planting.

---

<div align="center">

### *"I claim to know nothing except the art of asking questions."*
**— Socrates**

Built with FastAPI, Next.js, and a lot of coffee — for **Gemma 4 Good**.

</div>
