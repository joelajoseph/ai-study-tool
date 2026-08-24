# AGENTS.md — Study Planner App

## Project summary

A personal study-planning web app. The user uploads their study materials
(class notes, slides, textbook chapters, past quizzes) along with context
(exam date, days remaining, self-rated familiarity per topic), and the app:

1. Parses the materials into usable text/content.
2. Calls an LLM to generate a structured study plan — topics, priority order,
   estimated time per topic, and reasoning — tailored to the timeline and the
   user's stated knowledge gaps.
3. Lets the user chat with an LLM about the uploaded material for follow-up
   questions, with the material and plan as context (not a generic chatbot —
   answers should stay grounded in what was uploaded).
4. Lets the user track progress (mark topics/sessions as done) and regenerate
   the plan as the exam date approaches or new material is added.

This is a single-user personal project. No multi-user support, no auth
system needed beyond a simple password gate if any gate at all. Optimize for
simplicity over scalability.

## Tech stack (decided — do not substitute without asking)

- **Framework**: Next.js (App Router), TypeScript, `src/` directory
- **Styling**: Tailwind CSS
- **Linting**: ESLint
- **React Compiler**: enabled (`reactCompiler: true` in `next.config.ts`) —
  do not manually add `useMemo`/`useCallback` for performance; let the
  compiler handle memoization
- **Database**: Supabase (Postgres), free tier
- **File storage**: Supabase Storage if raw files are kept; otherwise store
  only extracted text (preferred — cheaper and simpler)
- **LLM provider**: Google Gemini API (free tier), called from server-side
  API routes only — **never expose the API key client-side**
  - Keep the "call the LLM" logic behind a single internal function/module
    (e.g. `src/lib/llm.ts`) so the provider can be swapped later (e.g. to
    Anthropic's Claude API) without touching UI or route code.
- **Deployment target**: Vercel (free tier), when ready to deploy — local
  dev via `npm run dev` is sufficient for now.
  - Deployment constraints to keep in mind now: Vercel serverless functions
    cap request bodies at ~4.5 MB, so upload limits must stay below that
    (see `src/lib/constants.ts`); the study-plan route sets
    `export const maxDuration = 60` because Gemini calls with large
    attachments run long.
  - Before deploying publicly, add a simple password gate — otherwise anyone
    who finds the URL can burn through the Gemini free-tier quota.

## Core features (build in this order)

### Phase 1 — Plan generator (no persistence)
- Simple form: paste text or upload files (PDF, images, plain text),
  exam/quiz date, free-text or structured input for "what I already know" /
  "what I've fallen behind on."
- On submit, extract text from uploads (PDFs via a parsing library; images
  passed directly to the LLM as multimodal input if needed) and send
  everything to the LLM with a prompt that requests a **structured JSON
  response**: list of topics, each with priority, estimated time, and short
  rationale, sequenced against the days remaining.
- Render the plan as a readable UI (not raw JSON).
- No database yet — state can reset on page refresh.

### Phase 2 — Persistence
- Add Supabase Postgres tables to store: uploaded material (as extracted
  text, plus metadata like filename/type), the generated plan, and revision
  history if the plan is regenerated.
- Materials and the latest plan should survive a page refresh / new
  session.

### Phase 3 — Chat / Q&A
- Chat interface scoped to the uploaded material: each message sends the
  relevant material (or a retrieved/relevant subset if material is large)
  plus conversation history to the LLM.
- Persist chat history per "study session" or per material set in the
  database.

### Phase 4 — Progress tracking & polish
- Allow marking topics/sessions as complete.
- Allow regenerating the plan mid-way through (e.g. "3 days left, here's
  what I've covered so far") — should account for progress already logged.
- General UI polish.

## Data model (rough starting point — adjust as needed)

- `materials`: id, title, source_type (pdf/image/text), extracted_text,
  created_at
- `plans`: id, exam_date, days_remaining_at_creation, plan_json, created_at
- `plan_topics`: id, plan_id, title, priority_order, estimated_minutes,
  rationale, completed (boolean)
- `chat_messages`: id, session_id (or plan_id), role (user/assistant),
  content, created_at

## Conventions

- TypeScript strict mode.
- Keep LLM prompt templates in a dedicated file/folder (e.g.
  `src/lib/prompts/`) rather than inline in route handlers, so they're easy
  to iterate on.
- LLM calls that expect structured output must explicitly instruct the
  model to return **only JSON, no prose, no markdown fences** — and the
  parsing code must handle malformed/non-JSON responses gracefully (try/
  catch, fallback message) rather than crashing.
- Prefer Server Components / API routes for anything touching the LLM
  API key or the database — no secrets in client-side code.
- Explain non-obvious code with brief comments, since the developer
  (project owner) is new to Next.js/TypeScript/React and is using this
  project to learn, not just to get a finished app.

## Explicitly out of scope for now

- Multi-user support / real auth system
- Payment or subscription anything
- Mobile app (web-only, responsive is enough)
- Anything beyond the Gemini free tier's rate limits — this is a
  single-user tool and should never need to scale past that
