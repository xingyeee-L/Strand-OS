# Strand OS: Multimodal Cognitive Agent

Strand OS is a spaceship-style multimodal cognitive agent for vocabulary learning and knowledge exploration.  
It renders your knowledge graph as an interactive 3D star map, while a tactical AI copilot (Gemini) drives retrieval, reasoning, and mission guidance.  
During boot, a cinematic sequence preloads graph state and missions so the first interaction is instant and immersive.

<p align="center">
  <a href="#architecture-diagram">Architecture</a> ·
  <a href="#quick-start-reproducible-testing">Quick Start</a> ·
  <a href="#technology-stack">Stack</a> ·
  <a href="#gcp-deployment-proof">GCP Proof</a> ·
  <a href="JOURNEY.md">Journey</a>
</p>

## Architecture Diagram

<p align="center">
  <img alt="Architecture Overview" src="docs/diagrams/mermaid-diagram-2026-03-15-005326_%E5%89%AF%E6%9C%AC.png" width="900" />
</p>

<p align="center">
  <img alt="Boot & Preload Sequence" src="docs/diagrams/mermaid-diagram-2026-03-15-005337_%E5%89%AF%E6%9C%AC.png" width="900" />
</p>

## Quick Start (Reproducible Testing)

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Google Gemini API key

### 1) Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
```

Edit `backend/.env` and set:

```bash
LLM_TYPE=gemini
GOOGLE_API_KEY=YOUR_KEY_HERE
```

Run:

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 2) Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173/` and click “开始探索” to start the boot sequence.

### 3) Run Tests

Backend:

```bash
cd ../backend
source venv/bin/activate
python -m pytest -q
```

Frontend:

```bash
cd ../frontend
npx vitest run
npm run lint
npm run build
```

## Technology Stack

- FastAPI (backend API)
- SQLModel + SQLite (relational state)
- ChromaDB (vector store)
- Google GenAI SDK (`google-genai`) for Gemini
- Google Cloud Storage (GCS) for uploads/archives
- React + Vite + Zustand (frontend + state)
- React Three Fiber (R3F) + drei (3D star map + effects)

## GCP Deployment Proof

This project is designed to run on Google Cloud Platform (Cloud Run).  
Deployment proof artifacts:

- Frontend hosting proof (screenshot):

  ![Firebase Hosting Proof](docs/diagrams/proof.png)

- Frontend hosting proof (video): https://youtu.be/KlEAxLWCPoI
- Cloud Run service (screenshot): TODO
- Cloud Run logs (video link): TODO

Full development write-up: [JOURNEY.md](file:///Users/lijunyi/Code/Strand/JOURNEY.md)
