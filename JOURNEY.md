# Strand OS — Development Journey (Gemini Live Agent Challenge)

I created Strand OS for the #GeminiLiveAgentChallenge.  
This document explains how I built a multimodal cognitive agent around Google Gemini (via the official Google GenAI SDK) and deployed the backend on Google Cloud Platform.  
The focus is not only the demo experience, but also reproducible engineering: stable APIs, test coverage, and deployable infrastructure.

## 1) Problem & Goal

Vocabulary learning often fails because knowledge stays flat: lists, flashcards, and disconnected notes. My goal was to build an interface where vocabulary becomes a navigable “world”:

- A 3D knowledge graph star map for exploration
- A tactical copilot that can chat, reason, and suggest next steps
- A RAG pipeline that continuously distills uploads into high-signal memory
- A boot sequence that hides cold-start latency while preloading graph state

## 2) Architecture Overview

Strand OS is a full-stack system:

- Frontend: React + Vite + Zustand + R3F (3D + console-style UI)
- Backend: FastAPI + SQLModel + SQLite + ChromaDB
- LLM: Google Gemini via `google-genai` (official SDK)
- Cloud: Cloud Run for backend compute, GCS for storage

See the architecture diagram in the README.

## 3) Key Technical Decisions

### 3.1 Google GenAI SDK as “identity proof”

To comply with the challenge rules and keep the implementation auditable, the backend Gemini calls are made through the official Google GenAI SDK (`google-genai`) rather than proxy APIs.

### 3.2 Resilient execution path

Even when Gemini is temporarily unavailable (quota or transient errors), the system keeps the UI responsive:

- Gemini is the primary provider for reasoning and narrative generation
- A local LLM can be used as a fallback for non-vision tasks

### 3.3 Boot-time parallel preloading

The cinematic boot is not “just animation”. It is a real preload window:

- Fetch initial graph context (center + neighbors)
- Load missions and user profile/book progress
- Enter the world only after both the timeline and preloading complete

## 4) Multimodal Agent Capabilities

### 4.1 Chat mode (role + boundary)

Chat is backed by a fixed system prompt defining:

- The AI role (tactical copilot, SC-7274)
- Tone and response style (console-like, concise, actionable)
- Safety boundaries (no secrets, no fabrication, no harmful instructions)

### 4.2 Vision mode

The vision endpoint accepts a base64 screenshot and asks Gemini to return structured JSON:

- Summary of current map state
- Suggested next actions
- Detected key nodes (optional)

This enables a “scan → synthesize → act” interaction loop.

## 5) RAG Pipeline (Upload → Distill → Index)

The RAG loop is designed to reduce noise and improve retrieval quality:

1. Upload raw content (optionally stored in GCS)
2. Distill into concise atomic knowledge fragments
3. Index distilled fragments in ChromaDB
4. Use retrieval results as context for subsequent reasoning

## 6) Google Cloud Deployment (Cloud Run + GCS)

The backend is containerized and deployable to Cloud Run.

Example deployment command:

```bash
gcloud run deploy strand-backend \
  --source ./backend \
  --region <REGION> \
  --allow-unauthenticated \
  --set-env-vars LLM_TYPE=gemini,GOOGLE_API_KEY=***,GCS_BUCKET=***,GCS_PREFIX=raw_archive
```

Add proof artifacts (screenshots / video links) in the README under “GCP Deployment Proof”.

## 7) What I’d Improve Next

- Session memory for chat (short-term: store recent turns; long-term: retrieval-assisted memory)
- Better layout stability for graph neighbors across sessions and refresh
- Stronger observability (structured logs, request tracing, latency metrics)
- Model-specific prompt tuning for higher JSON compliance and lower hallucination
