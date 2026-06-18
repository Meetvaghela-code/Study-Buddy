# Production-Grade Multi-Agent AI System

Build a complete multi-agent AI system that runs entirely on your machine.
No API keys, no cloud dependencies, no ongoing cost.
---

## What this builds

A **Learning Accelerator**: a four-agent system that plans a study curriculum,
explains topics from your own notes, quizzes you, and adapts based on results.
The use case is the teaching vehicle. The architecture is the real subject.

```
Goal: "Learn Python closures and decorators"
  │
  ▼
Curriculum Planner  →  structured study roadmap
  │
  ▼ (you approve the plan)
Explainer           →  reads your notes via MCP, explains each topic
  │
  ▼
Quiz Generator      →  tests understanding, grades answers with LLM-as-judge
  │
  ▼
Progress Coach      →  adapts roadmap, calls CrewAI Study Buddy via A2A
  │
  └── loops back to Explainer for next topic
```

The same architecture pattern runs in production for sales enablement,
compliance training, customer support onboarding, and engineering ramp-up.

---

## Architecture

| Layer | Technology | What it does |
|---|---|---|
| Orchestration | LangGraph 1.1.0 | Stateful agent graph with checkpointing |
| Tool integration | MCP (mcp 1.26.0) | Standardised agent-to-tool protocol |
| Agent coordination | A2A (a2a-sdk 0.3.25) | Cross-framework agent-to-agent protocol |
| Backend API | FastAPI (port 8000) | HTTP endpoints for roadmap approval, quiz, and graph progression |
| Frontend UI | Next.js 14 / Tailwind CSS | Modern Claude-style dark theme UI (located in [frontendv3](file:///d:/Multi-Agent2/multi-agent-ai-system/frontendv3)) |
| Local inference | Ollama | LLM serving at localhost:11434 |
| Cross-framework | CrewAI 1.13.0 | Study Buddy agent (called via A2A) |
| Observability | Langfuse 4.0.1 | Full trace of every agent and LLM call |
| Evaluation | DeepEval 3.9.1 | LLM-as-judge quality metrics |

See [ARCHITECTURE.md](file:///d:/Multi-Agent2/multi-agent-ai-system/docs/ARCHITECTURE.md) for a full deep-dive.

---

## Requirements

- Python 3.11+
- Node.js 18+ (required for the Next.js frontend)
- [Ollama](https://ollama.com) installed and running
- Docker Desktop (for Langfuse observability, optional)
- 16 GB RAM minimum, 32 GB recommended
- 8 GB VRAM for `qwen2.5:7b` | 24 GB VRAM for `qwen2.5-coder:32b`

---

## Quick start

### 1. Set up Backend API
```bash
# Clone the repository
git clone https://github.com/sandeepmb/freecodecamp-multi-agent-ai-system
cd freecodecamp-multi-agent-ai-system

# Create and activate virtual environment
python -m venv .venv
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and verify/change your OLLAMA_MODEL (e.g. qwen2.5:7b or qwen2.5-coder:32b)
```

### 2. Pull local LLMs (via Ollama)
Ensure Ollama is running (`ollama serve` or run the Ollama app), then pull your chosen model:
```bash
ollama pull qwen2.5:7b          # 8 GB VRAM
# Or for higher quality (requires more VRAM):
ollama pull qwen2.5-coder:32b   # 24 GB VRAM
```

### 3. Run Backend API Server
```bash
python -m uvicorn src.server.api:app --reload --port 8000
```
*Note: This starts the HTTP API backend at `http://localhost:8000`.*

### 4. Set up & Run Frontend (Next.js)
In a new terminal window:
```bash
cd frontendv3
npm install
npm run dev
```
*Note: This starts the Claude-style user interface at `http://localhost:3000`.*

---

## Project structure

```
freecodecamp-multi-agent-ai-system/
├── frontendv3/                 # Next.js 14 frontend (Claude-style UI)
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # Reusable UI components
│   └── package.json            # Frontend dependencies
├── src/
│   ├── server/                 # FastAPI HTTP server (api.py)
│   ├── agents/                 # LangGraph agent nodes
│   │   ├── curriculum_planner.py
│   │   ├── explainer.py
│   │   ├── quiz_generator.py
│   │   ├── progress_coach.py
│   │   └── human_approval.py
│   ├── graph/
│   │   ├── state.py            # Shared AgentState TypedDict
│   │   └── workflow.py         # LangGraph graph definition
│   ├── mcp_servers/            # MCP tool servers
│   │   ├── filesystem_server.py
│   │   └── memory_server.py
│   ├── a2a_services/           # A2A protocol services and client
│   │   ├── quiz_service.py     # Quiz Generator as A2A service
│   │   └── a2a_client.py       # Client for calling A2A services
│   ├── crewai_agent/
│   │   └── study_buddy.py      # CrewAI agent served via A2A
│   └── observability/
│       └── langfuse_setup.py   # Langfuse callback handler
├── tests/
│   ├── conftest.py             # Shared fixtures and markers
│   ├── test_state.py           # 24 tests
│   ├── test_curriculum_planner.py  # 11 tests
│   ├── test_mcp_servers.py     # 36 tests
│   ├── test_explainer.py       # 14 tests
│   ├── test_quiz_and_coach.py  # 17 tests
│   ├── test_checkpointing.py   # 20 tests
│   ├── test_observability.py   # 16 tests
│   ├── test_a2a.py             # 19 tests
│   ├── test_crewai_interop.py  # 25 tests
│   └── test_eval.py            # 12 eval tests (requires Ollama)
├── study_materials/
│   └── sample_notes/           # Markdown files the agents read
├── docs/
│   ├── ARCHITECTURE.md
│   └── MODEL_SELECTION.md
├── data/                       # SQLite checkpoint DB (created at runtime)
├── main.py                     # CLI entry point
├── docker-compose.yml          # Langfuse self-hosted stack
├── Makefile                    # Automation commands
├── requirements.txt
└── .env.example
```

> [!NOTE]
> The legacy `streamlit_app.py` has been deprecated and is ignored by this project in favor of the Next.js `frontendv3` and FastAPI backend API setup.

---

## Running all services

For a fully coordinated execution with A2A services (Quiz Generator and CrewAI Study Buddy) and the modern frontend, run the following processes:

**Tab 1: Quiz Generator A2A service:**
```bash
source .venv/bin/activate
python src/a2a_services/quiz_service.py
# Serves at http://localhost:9001
```

**Tab 2: CrewAI Study Buddy A2A service:**
```bash
source .venv/bin/activate
python src/crewai_agent/study_buddy.py
# Serves at http://localhost:9002
```

**Tab 3: Backend API Server:**
```bash
source .venv/bin/activate
python -m uvicorn src.server.api:app --reload --port 8000
# Serves at http://localhost:8000
```

**Tab 4: Frontend App:**
```bash
cd frontendv3
npm install
npm run dev
# Serves at http://localhost:3000
```

### Alternatively, using the Makefile:
To run A2A services in the background and start the CLI application (optional):
```bash
make services   # starts both A2A services in the background
make run        # runs the CLI entrypoint
```

---

## Session resume

Every session is checkpointed to `data/checkpoints_api.db` (for API sessions) or `data/checkpoints.db` (for CLI sessions) after each agent node.
To resume a stopped CLI session:

```bash
python main.py --resume <session-id>
```

The session ID is printed at the start of every run.

---

## Observability

Start Langfuse locally:
```bash
docker compose up -d
# Open http://localhost:3000 (Langfuse UI)
```

Add your API keys to `.env` (from the Langfuse project settings), then run the servers as normal. Every agent call, LLM completion, and tool call appears in the trace UI automatically.

---

## Testing

```bash
# Fast unit tests, run during development (~3 seconds)
# 182 tests across 9 test files
pytest tests/ -m "not eval" -v

# Quality evaluation tests, run before releases (~90 seconds, requires Ollama)
# 12 LLM-as-judge tests
pytest tests/test_eval.py -v -s -m eval
```

---

## Adding your own study materials

Replace or add Markdown files in `study_materials/sample_notes/`.
The Explainer agent reads every `.md` file in that directory automatically via the MCP filesystem server. No configuration changes needed.

---

## Configuration reference

See `.env.example` for all available settings.

Key toggles:
| Variable | Default | Effect |
|---|---|---|
| `OLLAMA_MODEL` | `qwen2.5:7b` | Model for all agents |
| `USE_A2A_QUIZ` | `true` | Route quiz tasks to A2A service |
| `USE_STUDY_BUDDY` | `true` | Call CrewAI Study Buddy for low scores |
| `CHECKPOINT_DB` | `data/checkpoints.db` | SQLite path for checkpoints |
