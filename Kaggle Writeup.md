# SocraticGemma: The AI That Asks So Humans Keep Thinking

## Subtitle
*A Gemma 4-powered Socratic learning companion that turns AI conversations into a living personal wiki of thought.*

## One-line Pitch
Most AI systems are designed to answer for you. SocraticGemma is designed to think *with* you, by asking the right question at the right moment and helping your ideas grow over time.

## The Problem
We are entering a strange moment in the history of intelligence. AI is becoming more capable, more available, and more convenient every day. That is useful, but it creates a real risk: people can begin to outsource reflection itself. If every hard question is met with an instant answer, we may save time while losing the habit of reasoning.

Education does not only need better information delivery. It needs tools that strengthen judgment, curiosity, self-examination, and the ability to stay with uncertainty long enough to form an idea of your own.

## The Solution
SocraticGemma flips the default AI pattern. Instead of rushing to explain, correct, or conclude, it acts as a Socratic guide. It adapts to the learner's language, vocabulary, and conceptual level so that each conversation feels personal rather than generic. It helps people examine concepts like justice, truth, identity, freedom, beauty, or responsibility through structured philosophical dialogue.

The system is inspired by the **Philosophy for Children (P4C)** tradition and by the broader idea behind **Karpathy-style "LLM wiki" thinking**: AI should not just generate outputs and forget them. It should help build an evolving external memory that becomes more useful over time. In SocraticGemma, every meaningful conversation becomes part of a personal philosophical wiki that the user can revisit, inspect, export, and use as context for future sessions.

The result is not just a chatbot session. It is a growing map of how a person thinks.

## How Gemma 4 Is Used
SocraticGemma is a real working application built around **Gemma 4** models, not a mockup.

- It uses **Gemma 4** as the Socratic dialogue engine.
- It supports fast and accurate model modes using Gemma 4 variants.
- It uses Gemma again for evaluation and report generation.
- It uses Gemma to synthesize and update the user's philosophical wiki after each session.
- It uses Gemma to generate personalised future stimuli from prior conversations and the user's accumulated knowledge structure.

Gemma 4 is especially valuable here because the project depends on long-form reasoning, nuanced language, structured output, and multi-step orchestration. We use it not for a single answer, but across the full learning loop: dialogue, scoring, synthesis, memory construction, and customised topic generation.

## Architecture
SocraticGemma has a **Next.js frontend** and a **FastAPI backend**.

The dialogue engine builds each prompt in layered form:

1. Socratic system identity
2. Adaptive communication guidance based on the learner's language and style
3. Forbidden behaviors to avoid over-helping
4. Rotation across seven question types
5. Optional retrieval-augmented philosophical moves
6. Session history and current learner response
7. Structured JSON output
8. The user's prior philosophical profile from the wiki

This matters because the product goal is not "sound smart." The goal is to reliably produce questions that deepen inquiry without collapsing it.

The result is a reflective learning environment rather than an answer engine. It combines dialogue, evaluation, retrieval, reporting, and memory into one loop, and it supports educators or mentors by making the learner's thought process legible through the question progression, the post-session report, and the long-term wiki.

## Core Features
- **Adaptive Socratic dialogue** that responds to the learner's language and reasoning style.
- **Three session entry modes**: open question, ethical scenario, or story.
- **Batch evaluation** to score whether the model stayed genuinely Socratic.
- **Personal philosophical report** after each session.
- **Living personal wiki** with topic pages, schools of thought, backlinks, and graph visualization.
- **Personalised stimulus generation** based on past conversations, the philosophical profile, and connected themes in the user's wiki.
- **Obsidian-compatible export**, so the user owns their thinking.

## How Knowledge Gets Updated
This is one of the most important parts of the project.

After a session ends, SocraticGemma does more than save a transcript. It runs a background synthesis pipeline:

1. It extracts topics, beliefs, tensions, schools of thought, and recommended readings from the conversation.
2. It creates or updates markdown wiki pages for those ideas.
3. It rebuilds links and graph relationships between pages.
4. It regenerates a global `_profile.md` that summarizes how the user tends to think across sessions.
5. It uses that accumulated memory to propose custom future stimuli based on past conversations and the user's knowledge graph.
6. On the next session, that profile is injected back into the prompt so Gemma can ask more relevant, more personal, and more challenging questions.

That is the key "LLM wiki" insight in practice: memory is not just stored, it is **organized, compressed, linked, and re-used**.

## Why This Matters
SocraticGemma is useful because it protects a human capability that is becoming easy to neglect: reflection.

In a world where AI can produce polished answers instantly, we need systems that make room for hesitation, nuance, contradiction, and growth. Human beings do not become wise by consuming conclusions. We become wiser by testing our assumptions, discovering blind spots, and learning how our own ideas change over time.

This is why the project matters educationally and socially:

- It supports **critical thinking**, not passive answer consumption.
- It gives learners a **language-aware thinking partner**, not just a tutoring interface.
- It creates a **portable record of intellectual growth**.
- It makes AI feel less like a substitute for thought and more like a scaffold for it.

## Real-world Utility
SocraticGemma can be used in:

- classrooms and philosophy clubs,
- home learning environments,
- libraries and community programs,
- therapeutic or reflective settings where structured questioning matters,
- lifelong learning for adults who want a more thoughtful relationship with AI.

Because the system stores conversations in SQLite and exports the wiki as markdown, it is also privacy-conscious and portable by design.

It is not just education content delivery. It is infrastructure for metacognition: a system that helps people notice patterns in how they think, revisit unfinished questions, and receive new prompts tailored to the ideas they have already explored.

## Project Links
- **Public Code Repository:** https://github.com/MrRobert91/SocraticGemma
- **Live Demo:** https://socraticgemma-js7p6v.sliplane.app
- **Video:** Add public YouTube link in Kaggle before final submission

## Kaggle Submission Checklist
- **Writeup title:** included above
- **Writeup subtitle:** included above
- **Public video:** required, 3 minutes or less, public YouTube link
- **Public code repository:** included above
- **Live demo:** included above
- **Media gallery:** attach cover image and demo media in Kaggle

SocraticGemma is a simple argument made into software: if AI is going to shape how we learn, then it should help us become more thoughtful, not less.
