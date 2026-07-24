# AIVOA — AI-Powered Customer Complaint Management System

An AI-assisted Customer Complaint Management module for pharmaceutical manufacturing QMS
(Quality Management System), built for the AIVOA Round 1 Full Stack Developer assessment.

Upload or paste a customer complaint (email, PDF, or text) → an AI agent extracts
structured fields, checks completeness, classifies risk, and summarizes it →
the form auto-populates for review and submission. A chat assistant lets you ask
follow-up questions about the complaint.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Redux Toolkit + Tailwind CSS (Google Inter font) |
| Backend | Python, FastAPI |
| AI Agent Orchestration | LangGraph |
| LLM | Groq — `gemma2-9b-it` (extraction/classification), `llama-3.3-70b-versatile` (chat) |
| Database | PostgreSQL (works with MySQL too, swap the connection string) |

## Architecture

```
┌─────────────────────┐        ┌──────────────────────┐        ┌─────────────────┐
│   React + Redux UI   │  REST  │      FastAPI          │        │   PostgreSQL     │
│  (Complaint Form +    │◄──────►│  /api/extract/*        │        │   complaints      │
│   AI Assistant Panel) │        │  /api/complaints        │◄──────►│   table            │
└─────────────────────┘        │  /api/chat              │        └─────────────────┘
                                 │        │
                                 ▼        │
                        ┌─────────────────────────┐
                        │   LangGraph pipeline      │
                        │  extract_fields            │
                        │      ↓                     │
                        │  completeness_check         │
                        │      ↓                     │
                        │  risk_classify               │
                        │      ↓                     │
                        │  summarize                    │
                        └─────────────────────────┘
                                 │
                                 ▼
                        Groq API (gemma2-9b-it / llama-3.3-70b)
```

### LangGraph pipeline (`backend/langgraph_agent.py`)
A 4-node linear graph runs on every uploaded/pasted complaint:
1. **extract_fields** — LLM extracts structured JSON matching the form schema
2. **completeness_check** — pure Python; computes a completeness % and lists missing fields
3. **risk_classify** — LLM labels the complaint Low / Medium / High / Critical
4. **summarize** — LLM produces a 2-sentence reviewer summary

A separate helper (`chat_with_complaint`) powers the "ask me anything about this
complaint" panel using the larger `llama-3.3-70b-versatile` model for better reasoning.

### Bonus AI features implemented
- **Complaint Completeness Checker** — flags which required fields are missing
- **AI Risk Classification** — Low/Medium/High/Critical severity suggestion
- **Complaint Summary** — auto-generated reviewer summary
- **Duplicate Complaint Detection** — flags complaints sharing the same product + batch number

## Setup

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env:
#   GROQ_API_KEY=<get a free key from https://console.groq.com>
#   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aivoa_complaints

# create the database first (Postgres):
#   createdb aivoa_complaints

uvicorn main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs` once running.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173` and proxies `/api` calls to the backend on port 8000.

### 3. Try it out
- Use the sample complaints in `sample_data/` — paste their contents into the
  "Paste Complaint Text / Email" box, or upload the `.txt` files directly.
- Watch the form auto-populate, note the completeness/risk badges, then use the
  chat box to ask e.g. *"Is this a critical complaint?"*

## Notes on assumptions
- Production-grade OCR/document parsing was explicitly not required — PDF text
  extraction uses `pypdf`, plain text/email content is read directly.
- Duplicate detection uses a simple product + batch-number match rather than
  semantic similarity, given the assessment's scope.
- CORS is wide open (`*`) for local development — restrict this before any real deployment.
