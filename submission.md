# SocraticGemma — Gemma 4 Good Hackathon Submission

---

## One-Line Description

> **An AI that asks instead of answers — a Socratic companion powered by Google Gemma 4 that trains critical thinking through structured philosophical dialogue, adapted from age 6 to adult.**

---

## Submission Checklist

| Asset | Status | Link / Notes |
|---|---|---|
| Kaggle Writeup | ✍️ Draft below | See section below |
| YouTube Video | ⏳ TODO | 3 min max — record demo |
| Public Code Repository | ✅ Ready | https://github.com/MrRobert91/SocraticGemma |
| Live Demo | ✅ Live | https://socraticgemma-js7p6v.sliplane.app |
| Cover Image | ⏳ TODO | Screenshot of wiki graph or dialogue UI |

---

## Kaggle Writeup (≤ 1,500 words)

**Title:** SocraticGemma — The AI That Asks Instead of Answers

**Subtitle:** Using Google Gemma 4 to train critical thinking through structured Socratic dialogue and philosophical inquiry

**Track:** AI for Education & Cognitive Resilience

---

### The Problem

Most AI assistants are optimized for one thing: giving you the right answer as fast as possible. This is wonderful for mechanical tasks, but it is silently eroding the most important skill humans have: **thinking for themselves**.

Recent studies (MIT 2025, Microsoft Research 2024) show that intensive LLM use reduces brain activation associated with independent reasoning — particularly in children and adolescents during critical cognitive development windows. When the model thinks for you, your brain stops doing it.

SocraticGemma inverts this pattern entirely.

---

### What It Does

SocraticGemma is a Socratic dialogue companion that **returns questions instead of answers**. It implements a structured Socratic facilitation method — grounding each session in the same principles Socrates himself described: exposing assumptions, testing beliefs, and keeping inquiry open rather than closed — using Google Gemma 4 as the facilitation engine.

It works for children from age 6, teenagers, and adults seeking to train rigorous philosophical thinking. Key capabilities at a glance:

- **Socratic dialogue** — Gemma 4 never answers, only asks the right question at the right moment
- **Per-session philosophical profile** — after each conversation, a second LLM analyses the full transcript and generates a structured report on your reasoning style, detected beliefs, blind spots, and related thinkers
- **Global evolving profile** — across all your conversations, a synthesised `_profile.md` tracks how your thinking evolves, which philosophical currents recur, and where contradictions emerge
- **Personal philosophy wiki** — every session auto-generates or updates connected Markdown pages per topic and school of thought, forming a living knowledge graph
- **Interactive graph view** — navigate your accumulated ideas visually; see which concepts are connected, isolated, or in tension with each other
- **Obsidian-compatible export** — download your entire wiki as a ZIP of Markdown files with YAML frontmatter and `[[wiki-style]]` backlinks, ready to open in Obsidian immediately
- **Smart stimulus suggestions** — the system analyses your knowledge graph to propose new conversation starters that target gaps, unexplored angles, or ideas in tension with each other
- **Continue past conversations** — resume any prior dialogue; the session history and your accumulated profile are injected back into the prompt so Gemma picks up exactly where you left off
- **Reading recommendations** — each session report suggests specific thinkers and texts that connect directly to the ideas you explored

---

### How Gemma 4 Is Used

The application uses **Google Gemma 4** via OpenRouter (`google/gemma-4-27b-it` for accuracy, `google/gemma-4-e2b-it` for speed). Gemma 4 drives three distinct functions:

1. **Socratic dialogue engine** — generates structured JSON responses `{question, question_type, thinking}` using an 8-layer prompt architecture.
2. **Batch evaluator** — a second Gemma 4 call analyzes the full conversation and scores each turn across 5 pedagogical dimensions.
3. **Report & wiki generator** — a third Gemma 4 call produces a personalized philosophical report in Markdown and extracts structured knowledge to build the user's personal wiki.

Gemma 4's thinking/reasoning capability is leveraged explicitly: the model's `thinking` trace is surfaced to users as a pedagogical transparency feature, showing *why* a question was chosen.

---

### Architecture

```
User → Next.js 16 Frontend → FastAPI Backend → Gemma 4 (via OpenRouter)
                                    │
                    ┌───────────────┼──────────────────┐
                    │               │                  │
             SocraticEngine   Evaluator          ReportService
             (8-layer prompt) (scoring LLM)      + WikiService
                    │
             PromptBuilder ← User philosophical profile
                    │
             SQLite DB + Markdown wiki files
```

**Backend:** Python 3.11 + FastAPI + async SQLite (aiosqlite). All streaming delivered via Server-Sent Events (SSE), enabling real-time token delivery without WebSockets.

**Frontend:** Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS. The wiki graph uses `@xyflow/react` (React Flow). Full i18n in Spanish and English.

**Deployment:** Docker Compose orchestrating both services, currently live on Sliplane.

---

### The 8-Layer Prompt Architecture

Each dialogue turn builds a structured prompt across 8 layers — this is the core engineering challenge:

| Layer | Content |
|---|---|
| 1 | System identity + session progress instruction (phase-aware) |
| 2 | Age-specific communication guidelines (6-8 / 9-12 / 13-16 / adult) |
| 3 | Forbidden behavior rules with explicit MAL/BIEN examples |
| 4 | Intelligent rotation across 7 Socratic question types |
| 5 | Resumed session context — prior conversation injected when continuing a past dialogue |
| 6 | Full dialogue history + initial stimulus |
| 7 | Structured JSON output format |
| 8 | User's global philosophical profile from the wiki — personalises questions based on accumulated thinking |

This architecture guarantees pedagogical coherence without the model improvising. The session also progresses through 5 phases (`stimulus → questions → agenda → inquiry → synthesis`), with different instructions per phase based on % of session remaining.

---

### The 7 Socratic Question Types

The engine rotates automatically through:

| Type | Function |
|---|---|
| Conceptual | Clarify meaning — *"What do you mean by 'justice'?"* |
| Assumption | Surface presuppositions — *"What are you assuming when you say that?"* |
| Evidence | Evaluate reasons — *"What makes you think so?"* |
| Perspective | Other viewpoints — *"How would someone who disagrees see this?"* |
| Implication | Explore consequences — *"What would happen if everyone thought this way?"* |
| Metacognitive | Think about thinking — *"What kind of question is that?"* |
| Opening | New possibilities — *"What else does this make you think about?"* |

---

### Forbidden Behavior Guardrails

The model is explicitly trained to avoid five anti-patterns that undermine genuine inquiry, identified through research in Socratic facilitation and educational dialogue:

| Behavior | Why it matters |
|---|---|
| **Overhelp** | "Exactly right!" → closes down thinking |
| **Lecture** | Explaining concepts unprompted → teacher mode |
| **Correct** | "Actually that's not right" → kills curiosity |
| **Leading** | Questions that point to a predetermined answer |
| **Close** | Quick answers that shut down inquiry |

A separate evaluator LLM detects and flags these behaviors in the session report — providing measurable proof that the model is facilitating thinking rather than replacing it.

---

### The Personalized Philosophical Report

At the end of every session, a second Gemma 4 call analyzes the full conversation and generates a Markdown report with 7 sections:

1. **Philosophical map** — summary and arc of the conversation
2. **Detected beliefs and positions** — what intuitions the user expressed
3. **Related currents** — empiricism, stoicism, existentialism, etc.
4. **Reasoning style** — concrete vs abstract, intuitive vs analytical
5. **Thinkers to explore** — recommended readings with justification
6. **Blind spots** — perspectives not explored
7. **Paths to continue** — new questions and thought experiments

---

### The Personal Philosophy Wiki

The standout feature — and the one that makes SocraticGemma genuinely different from any other AI dialogue tool. Each session automatically feeds a **living knowledge graph** that grows with the user's thinking.

**Connected notes, auto-generated**
Every conversation produces or updates Markdown pages per philosophical topic (free will, justice, identity, consciousness…) and per school of thought (stoicism, Kantianism, pragmatism…). Pages link to each other with `[[wiki-style]]` backlinks. After ten conversations, you have an interconnected map of your own mind.

**Interactive graph view**
The full wiki is rendered as a navigable force graph using React Flow. You can explore which ideas cluster together, which are isolated islands, and which are in visible tension with each other — all at a glance.

**Per-session philosophical profile**
After every conversation, Gemma 4 generates a structured report on that specific dialogue: what positions you held, what assumptions surfaced, what reasoning style you used, which thinkers and texts connect to the ideas you explored, and what blind spots you didn't address.

**Global evolving profile**
Across all sessions, a synthesised `_profile.md` accumulates: your dominant philosophical currents, recurring themes, detected contradictions between conversations, and how your thinking has shifted over time. This profile is injected into every new session prompt so Gemma can ask increasingly personal and challenging questions.

**Smart stimulus suggestions**
The system reads your knowledge graph and proposes new conversation starters targeted at:
- Topics you've raised but never gone deep on
- Ideas that appear in tension with each other across different sessions
- Unexplored angles adjacent to your strongest interests

This turns the wiki from a passive archive into an active thinking partner.

**Continue past conversations**
Any prior dialogue can be resumed. The full history and your accumulated profile are re-injected into the prompt, so Gemma picks up exactly where you left off — no repetition, no reset.

**Obsidian-compatible export**
Download your entire wiki as a ZIP of Markdown files with YAML frontmatter and `[[wiki-style]]` backlinks. Open the folder in Obsidian and your philosophical knowledge graph is immediately navigable in your own tools, with zero reformatting.

Your data is stored locally in SQLite and plain Markdown — portable, human-readable, no vendor lock-in, no subscription required.

---

### Challenges Overcome

**1. Reliable JSON output from a generative model.** Gemma 4 must output `{question, question_type, thinking}` on every turn. We implemented retry logic, streaming JSON parsers, and the output format layer explicitly constrains the structure.

**2. Age-calibrated language without fine-tuning.** Getting the model to use vocabulary genuinely appropriate for a 7-year-old required dedicated prompt layers with concrete examples, not just abstract instructions.

**3. Preventing "overhelp" in a helpful model.** LLMs are RLHF-trained to be helpful and validating. Teaching Gemma 4 to *not* praise the user and *not* offer answers required the explicit forbidden-behavior layer with MAL/BIEN contrasts.

**4. Streaming three LLM calls per session.** The report generation, wiki synthesis, and evaluator all run as separate async Gemma 4 calls, streamed via SSE to the frontend without blocking the main dialogue flow.

**5. Wiki coherence and growth across sessions.** The wiki must grow consistently — new sessions must update existing pages without contradicting prior content, and the global profile must synthesise across potentially dozens of conversations. We solved this with a two-pass LLM synthesis: extract structured JSON first (topics, positions, tensions, recommended thinkers), then generate or patch Markdown from the structured data. The stimulus suggestion engine then queries the resulting graph to identify gaps and tensions rather than just repeating familiar ground.

---

### Why These Technical Choices Were Right

- **Gemma 4 over other models:** Open-weights, deployable on-device (future roadmap), and the thinking capability is genuinely useful for pedagogical transparency. `gemma-4-27b-it` achieves the quality bar needed for nuanced Socratic facilitation.
- **FastAPI + SSE over WebSockets:** Lower infrastructure overhead, simpler client code, and SSE is sufficient for the unidirectional streaming pattern (server → client).
- **SQLite over Postgres:** Zero-config, single-file, embeddable. Schools and libraries can run this on a Raspberry Pi. The target users are educational institutions with constrained infrastructure.
- **Markdown wiki over a graph database:** Human-readable, portable, Obsidian-compatible. Teachers can inspect and edit the wiki files directly. No database administration required. And critically, the export story is trivial: zip the folder and the user owns their entire intellectual history.

---

### Impact

SocraticGemma democratizes access to high-quality philosophical facilitation — a skill that currently requires trained human facilitators and is largely available only in well-resourced schools. With a Gemma 4 backend and Docker deployment, it can run on $5/month cloud compute or on-device hardware. Any school, library, or home can deploy it.

The target population is anyone from age 6 onward who deserves to have their thinking taken seriously rather than replaced.

---

## Project Links

| Resource | URL |
|---|---|
| **Live Demo** | https://socraticgemma-js7p6v.sliplane.app |
| **API Docs (Swagger)** | https://socraticgemma-js7p6v.sliplane.app/docs |
| **GitHub Repository** | https://github.com/MrRobert91/SocraticGemma |
| **YouTube Video** | ⏳ TODO — add link after recording |

---

## Media Gallery Assets Needed

- [ ] **Cover image** (required) — recommended: screenshot of the wiki knowledge graph with nodes connected, or the dialogue UI showing a Socratic question with thinking trace visible
- [ ] **Screenshot 1** — Setup screen (age selector + stimulus form)
- [ ] **Screenshot 2** — Dialogue view (chat + ThinkingPanel open)
- [ ] **Screenshot 3** — Philosophical report
- [ ] **Screenshot 4** — Wiki graph
- [ ] **Screenshot 5** — Compare mode (side-by-side scores)
- [ ] **YouTube video** (≤ 3 min) — story arc: problem → demo → impact

---

## Video Script Outline (3 min)

**0:00–0:20** — Hook: "What if AI made you smarter by refusing to answer your questions?"

**0:20–0:50** — Problem: show a standard AI giving a complete answer to "Is free will real?" vs SocraticGemma returning a Socratic question. The contrast is the demo.

**0:50–1:40** — Live demo: start a session as a 10-year-old, show 3-4 turns of dialogue, reveal the thinking trace, show the question type tags rotating.

**1:40–2:20** — Report + wiki: show the philosophical report generating, then the wiki graph with connected nodes, then the Obsidian export ZIP.

**2:20–2:45** — Compare mode: same input, baseline vs Socratic, side-by-side scores.

**2:45–3:00** — Closing: "Your data, your wiki, your thinking. Open source, runs anywhere. Built for Gemma 4 Good."
