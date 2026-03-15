# DeskPilot

AI-powered helpdesk agent with RAG pipeline, evaluation framework, and ticket escalation.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)
![Claude API](https://img.shields.io/badge/Claude-API-d4760e?style=flat-square)
![ChromaDB](https://img.shields.io/badge/ChromaDB-3-f97316?style=flat-square)
![Prisma](https://img.shields.io/badge/Prisma-7-2d3748?style=flat-square&logo=prisma)

---

## Architecture

```
                          ┌─────────────────────────────────────────────────────┐
                          │                   /api/chat                         │
                          │                                                     │
  User Question ──────────┼──► Intent Classifier (Claude)                      │
                          │         │                                           │
                          │    ┌────┴────────────────────┐                     │
                          │    │                         │                     │
                          │  [question]           [action_request]             │
                          │    │                         │                     │
                          │    ▼                         ▼                     │
                          │  Retrieval              Create Ticket ──────────── ┼──► Answer
                          │  (ChromaDB top-10)                                 │
                          │    │                   [unclear]                   │
                          │    ▼                         │                     │
                          │  Rerank (Claude)             ▼                     │
                          │  (score 0–10, filter ≥6)  Clarification ──────────┼──► Answer
                          │    │                                               │
                          │    ▼                                               │
                          │  Generate Answer (Claude, top-3 chunks)           │
                          │    │                                               │
                          │    ▼                                               │
                          │  Confidence Check (Claude groundedness 0.0–1.0)   │
                          │    │                                               │
                          │    ├── confidence ≥ 0.6 ──────────────────────────┼──► Answer
                          │    │                                               │
                          │    └── confidence < 0.6 ── Auto-escalate ─────────┼──► Answer + Ticket
                          │                                                     │
                          └─────────────────────────────────────────────────────┘
```

Every response includes the confidence score, source documents cited, end-to-end latency, and whether a ticket was created — all persisted to SQLite via Prisma for analytics and evaluation replay.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack TypeScript in one repo; API routes co-located with UI |
| Language | TypeScript 5 | End-to-end type safety across AI responses, DB models, and UI |
| LLM | Anthropic Claude (`claude-3-5-haiku`) | Used for intent classification, reranking, answer generation, and confidence assessment |
| Embeddings | OpenAI `text-embedding-3-small` | High-quality semantic embeddings at low cost |
| Vector Store | ChromaDB (local) | Zero-friction local setup; same interface as production-grade hosted Chroma |
| ORM / DB | Prisma 7 + SQLite (better-sqlite3) | Prisma abstracts the DB layer; same schema and migrations work against Postgres |
| UI Components | shadcn/ui + Tailwind CSS | Accessible, composable components; no design system lock-in |
| Testing | Jest + ts-jest | Unit tests on the chunker and metric computation logic |

---

## Quick Start

**Prerequisites:** Node.js 20+, an Anthropic API key, an OpenAI API key.

```bash
# 1. Clone the repository
git clone https://github.com/tommyong/deskpilot.git
cd deskpilot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local and fill in ANTHROPIC_API_KEY and OPENAI_API_KEY

# 4. Run database migration
npx prisma migrate dev

# 5. Start ChromaDB (local vector store)
npx chroma run --path ./chromadb-data

# 6. Ingest the sample knowledge base
npm run ingest

# 7. Start the development server
npm run dev

# 8. Open the app
open http://localhost:3000
```

The `npm run ingest` script reads all Markdown files from `./knowledge/`, chunks them, embeds them via OpenAI, and upserts them into ChromaDB while recording metadata in SQLite.

---

## Features

### Chat (`/`)
The primary interface. Users ask questions in natural language and receive answers grounded in the knowledge base. Each response displays the confidence score, cited source documents, and end-to-end latency. Conversations are persisted and accessible via a sidebar. Low-confidence answers automatically create escalation tickets.

### Knowledge Base (`/kb`)
View all ingested documents with their chunk counts and ingestion dates. Upload new `.md` or `.txt` files via drag-and-drop or file picker — documents are chunked, embedded, and searchable within seconds.

### Tickets (`/tickets`)
A lightweight queue for escalated questions. Tickets are created automatically when the confidence score drops below 0.6, or immediately when the user's intent is an action request (e.g., "I need access to Salesforce"). Agents can expand any ticket to view the original question, the AI's attempted answer, and add a resolution note.

### Evaluation Dashboard (`/eval`)
One-click benchmark runner. Runs all 30 golden dataset test cases through the live RAG pipeline, computes aggregate metrics, and persists results for historical comparison. Results are broken down by category (HR, IT, Onboarding) and difficulty (easy, medium, hard).

### Analytics (`/analytics`)
Operational overview: total questions, AI resolution rate, average confidence, average latency, ticket open/resolved ratio, and a confidence distribution chart of the last 60 responses.

---

## How the RAG Pipeline Works

When a question arrives, it first passes through an **intent classifier** — a lightweight Claude call that categorizes the message as a `question`, `action_request`, or `unclear`. Action requests bypass retrieval entirely and go straight to ticket creation. Unclear messages receive a clarification prompt. This routing step prevents the retrieval pipeline from being invoked for inputs it cannot meaningfully answer.

For questions, the pipeline performs **two-stage retrieval**. First, it runs a vector similarity search against ChromaDB using an OpenAI `text-embedding-3-small` embedding of the query, fetching the top 10 candidate chunks. Those candidates are then passed to Claude in a single batch call for **LLM reranking** — Claude scores each chunk 0–10 for relevance and returns a JSON array of scores. Chunks scoring below 6 are dropped, and the top 3 survivors become the context window for generation. This reranking step is the primary lever for precision: vector similarity catches broad semantic matches, but Claude's reranker removes chunks that are topically adjacent but not actually responsive to the question.

After generation, a separate Claude call performs **groundedness assessment** — it reads the question, the generated answer, and the source chunks, then returns a score from 0.0 to 1.0 with a brief rationale. Scores below 0.6 trigger automatic ticket creation, with priority set to `high` if the score is below 0.3. This confidence gate operationalizes the core insight of production RAG systems: an answer the model is not confident in is worse than no answer, because it erodes user trust. By surfacing these cases to a human queue rather than returning them silently, the system degrades gracefully.

---

## Evaluation Framework

### Golden Dataset

`lib/eval/golden-dataset.json` contains 30 handcrafted test cases across three topic categories (HR, IT, Onboarding) and three difficulty levels (easy, medium, hard). Each case specifies:

- `question` — the natural language query
- `expected_answer_contains` — a list of phrases that must appear in a correct answer
- `expected_source` — the knowledge base document the answer should be retrieved from
- `category` and `difficulty` — for sliced reporting

Hard cases include multi-part questions that require synthesizing information from separate sections of a document, or questions that combine policy details with edge cases (e.g., "I need a $6,000 software license — what approvals are required?").

### Metrics

| Metric | Definition |
|---|---|
| Retrieval Precision@3 | Fraction of cases where the expected source appears in the top-3 retrieved chunks |
| Retrieval Recall | Fraction of cases where the expected source appears anywhere in the retrieved results |
| Answer Correctness | Fraction of cases where the generated answer contains all expected phrases |
| Avg Confidence | Mean groundedness score across all cases |
| Confidence Calibration | Among high-confidence answers (≥0.6), fraction that are actually correct |
| Hallucination Rate | Among high-confidence answers, fraction that are incorrect |
| Escalation Accuracy | Fraction where the escalation decision aligned with answer correctness |
| Avg Latency | Mean end-to-end time per question in milliseconds |

### Why It Matters

Most demo RAG systems are evaluated by eye. This framework makes pipeline quality measurable and reproducible. The confidence calibration metric specifically tests whether the system's self-reported confidence is honest — a model that says 90% but is right only 60% of the time is worse than useless for automated escalation decisions. Historical eval runs are stored in the database, enabling regression testing: if a prompt change or chunking strategy change degrades retrieval recall, it shows up in the next eval run.

---

## Project Structure

```
deskpilot/
├── app/
│   ├── page.tsx                    # Chat interface (/)
│   ├── kb/page.tsx                 # Knowledge base manager (/kb)
│   ├── tickets/page.tsx            # Ticket queue (/tickets)
│   ├── eval/page.tsx               # Evaluation dashboard (/eval)
│   ├── analytics/page.tsx          # Analytics overview (/analytics)
│   └── api/
│       ├── chat/route.ts           # Main RAG pipeline endpoint
│       ├── ingest/route.ts         # Document upload and ingestion
│       ├── tickets/route.ts        # Ticket CRUD
│       ├── eval/route.ts           # Eval runner and history
│       ├── analytics/route.ts      # Aggregate stats
│       └── conversations/route.ts  # Conversation management
├── lib/
│   ├── ai/
│   │   ├── client.ts               # Anthropic SDK wrapper
│   │   ├── classifier.ts           # Intent classification
│   │   ├── reranker.ts             # LLM-based chunk reranking
│   │   ├── generator.ts            # Answer generation with citations
│   │   └── confidence.ts           # Groundedness assessment
│   ├── retrieval/
│   │   ├── chunker.ts              # Markdown-aware chunker with overlap
│   │   ├── chunker.test.ts         # Unit tests
│   │   ├── embedder.ts             # OpenAI embedding wrapper
│   │   ├── vectorStore.ts          # ChromaDB client
│   │   ├── ingest.ts               # End-to-end ingestion flow
│   │   └── pipeline.ts             # Retrieval + rerank orchestration
│   └── eval/
│       ├── golden-dataset.json     # 30 test cases across 3 categories
│       ├── metrics.ts              # Metric computation functions
│       └── runner.ts               # Eval orchestration and DB persistence
├── prisma/
│   └── schema.prisma               # Models: Document, Conversation, Message, Ticket, EvalRun, EvalResult
├── knowledge/
│   ├── pto-policy.md
│   ├── expense-reimbursement.md
│   ├── onboarding-checklist.md
│   ├── software-access.md
│   ├── equipment-request.md
│   └── vpn-setup.md
└── scripts/
    └── ingest-kb.ts                # CLI script to ingest ./knowledge/
```

---

## Design Decisions

**ChromaDB local over a hosted vector store.** For a portfolio project, zero-setup matters — ChromaDB runs in-process with a single CLI command and no account required. More importantly, the vector store is fully abstracted behind `lib/retrieval/vectorStore.ts`, so swapping in Pinecone or Weaviate is a one-file change.

**SQLite via Prisma instead of raw SQLite or an in-memory store.** The goal was to demonstrate the same ORM patterns used with production Postgres. Prisma's schema, migrations, and query API are identical regardless of the underlying database. The `DATABASE_URL=file:./dev.db` line in `.env` is the only SQLite-specific detail.

**Synchronous confidence check after generation.** Confidence is assessed as a second Claude call after the answer is generated, not speculatively during retrieval. This is intentional: retrieval scores are a proxy for relevance, but groundedness is a property of the final answer relative to the context actually used. A chunk can be highly relevant yet still produce a hallucinated answer if the question requires combining information across chunks. The post-generation check catches this.

**Single-turn Q&A rather than multi-turn conversation.** Each question is answered independently from the knowledge base, without carrying conversation history into the retrieval or generation prompts. This is a deliberate scope constraint that keeps the evaluation well-defined: multi-turn retrieval introduces question rewriting complexity that would obscure RAG pipeline quality in a portfolio context. The conversation history is stored in the database and displayed in the UI, but does not influence retrieval.

---

## Production Considerations

A production deployment of this system would involve the following changes:

- **Vector store:** Replace ChromaDB local with Pinecone, Weaviate, or Qdrant Cloud. The vector store interface in `lib/retrieval/vectorStore.ts` already abstracts `search()` and `upsert()` — swap the implementation, keep the interface.
- **Relational database:** Switch `DATABASE_URL` to a Postgres connection string. Prisma handles the migration without schema changes.
- **Streaming responses:** The current implementation returns the full answer in a single response. Production UX benefits from streaming generation tokens with a progressively rendered confidence score once generation completes.
- **Authentication and rate limiting:** No auth exists in the current build. Production would add session-based auth (e.g., NextAuth) and per-user rate limiting on the `/api/chat` endpoint.
- **Observability:** Instrument with OpenTelemetry for tracing across the classifier → retrieval → generation → confidence chain. Langfuse or Braintrust for LLM-specific observability: prompt versions, token costs, confidence drift over time.
- **Evaluation in CI/CD:** The eval runner is already callable via the API. A CI step that runs the golden dataset against a staging deployment and fails the build if answer correctness drops below a threshold would catch regressions before they reach production.
- **Multi-turn retrieval:** Production helpdesks benefit from question rewriting — using conversation history to disambiguate follow-up questions before retrieval. This would require a rewrite step before embedding, and makes evaluation more complex (conversation-level rather than question-level ground truth).

---

## Built By

Tommy Ong — [GitHub](https://github.com/tommyong)
