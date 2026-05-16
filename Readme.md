# ◈ PRISM
### Pull Request Intelligence & Security Machine

> **Understand what your code change REALLY affects.**  
> Local AI-powered intent drift detection for GitHub Pull Requests. Your code never leaves your machine.

![Status](https://img.shields.io/badge/status-hackathon--ready-7c3aed?style=flat-square)
![AI](https://img.shields.io/badge/AI-Gemma%204%20E2B%204.6B-4f46e5?style=flat-square)
![Privacy](https://img.shields.io/badge/privacy-100%25%20local-22c55e?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-gray?style=flat-square)

---

## What is PRISM?

Most AI code review tools tell you *how* your code is written.  
PRISM tells you whether your code does *what it claims to do*.

PRISM analyzes a GitHub Pull Request and detects **Intent Drift** — the gap between what a PR *says* it does (title, description, linked issue) and what the diff *actually* changes. It then generates a **Merge Confidence Score** so your team knows the real risk before merging.

Everything runs locally using **LM Studio + Gemma 4 E2B (4.6B)**. No OpenAI. No cloud. No code leaves your machine.

---

## How It Works

```
GitHub PR URL
      ↓
  Fetch via GitHub API
  (title · description · diff · linked issue)
      ↓
  Local Context Engine
  (diff parsing · intent extraction)
      ↓
  Gemma 4 E2B via LM Studio
  (intent drift analysis)
      ↓
  PRISM Dashboard
  (confidence score · drift report · risk flags)
```

---

## Features

| Feature | Description |
|---|---|
| 🎯 **Intent Drift Detection** | Compares PR claims vs. actual code changes |
| 📊 **Merge Confidence Score** | 0–100 risk score with color-coded severity |
| ⚠️ **Drift Reason Explanation** | Clear human-readable explanation of the mismatch |
| 🗂️ **Suspicious File Flagging** | Highlights files that shouldn't be touched by this PR |
| 🚩 **Risk Flags** | Quick-scan badges for common risk patterns |
| 🔒 **100% Local Inference** | Gemma 4 via LM Studio — zero external API calls |
| 🔗 **Linked Issue Parsing** | Auto-fetches `Fixes #N` / `Closes #N` issues for full context |

---

## Tech Stack

**Backend**
- Python 3.11+
- FastAPI
- PyGithub
- OpenAI SDK (pointed at LM Studio's local server)

**Frontend**
- Next.js 14 (App Router)
- Tailwind CSS
- TypeScript

**AI**
- LM Studio (local inference server)
- Gemma 4 E2B — 4.6B parameter model

---

## Prerequisites

Before you begin, make sure you have:

- [ ] Python 3.11 or higher
- [ ] Node.js 18 or higher
- [ ] [LM Studio](https://lmstudio.ai) installed
- [ ] A GitHub Personal Access Token
- [ ] Gemma 4 E2B (4.6B) downloaded in LM Studio

---

## Setup & Installation

### Step 1 — Clone the repository

```bash
git clone https://github.com/yourusername/prism.git
cd prism
```

### Step 2 — Set up LM Studio

1. Open **LM Studio**
2. Search for and download **Gemma 4 E2B (4.6B)**
3. Go to the **Local Server** tab in the left sidebar
4. Click **Start Server**
5. Confirm the server is running at `http://localhost:1234`
6. Note the exact model identifier shown (e.g. `gemma-4-e2b`) — you'll need it in Step 4

### Step 3 — Set up the backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

Open `.env` and add your GitHub token:

```env
GITHUB_TOKEN=your_github_personal_access_token_here
LM_STUDIO_URL=http://localhost:1234/v1
LM_STUDIO_MODEL=gemma-4-e2b
```

> **How to get a GitHub token:**  
> GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)  
> Required scopes: `repo`, `read:org`

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO: Uvicorn running on http://127.0.0.1:8000
```

### Step 4 — Set up the frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage

1. Find any **public or private GitHub PR URL** you have access to
2. Paste it into the PRISM input field:
   ```
   https://github.com/owner/repo/pull/42
   ```
3. Click **Analyze PR**
4. Wait ~10–20 seconds for local inference
5. Review the results:
   - **Merge Confidence Score** — is this PR safe to merge?
   - **Intent Match** — HIGH / MEDIUM / LOW alignment
   - **Drift Banner** — clear verdict on whether drift was detected
   - **Claimed vs Actual** — side-by-side intent comparison
   - **Suspicious Files** — files that shouldn't be in this PR
   - **Risk Flags** — quick-scan badges
   - **PRISM Assessment** — senior-engineer-level summary

---

## Project Structure

```
prism/
├── backend/
│   ├── main.py                 ← FastAPI app, GitHub fetch, LM Studio call
│   ├── requirements.txt
│   ├── .env.example
│   └── .env                    ← your secrets (gitignored)
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx            ← home page + results view
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── PRISMInput.tsx      ← PR URL input
│   │   ├── LoadingState.tsx    ← animated loading steps
│   │   ├── ConfidenceGauge.tsx ← score display
│   │   ├── DriftBanner.tsx     ← drift detected / aligned banner
│   │   ├── ResultCard.tsx      ← intent comparison cards
│   │   └── RiskFlags.tsx       ← risk badge list
│   ├── package.json
│   └── tailwind.config.ts
│
└── README.md
```

---

## API Reference

### `POST /api/analyze`

Analyze a GitHub PR for intent drift.

**Request body:**
```json
{
  "pr_url": "https://github.com/owner/repo/pull/42"
}
```

**Response:**
```json
{
  "merge_confidence_score": 34,
  "intent_match": "LOW",
  "claimed_intent": "Fixes a UI styling bug on the login page",
  "actual_changes": "Modifies payment authorization middleware and token refresh logic",
  "drift_detected": true,
  "drift_reason": "The PR claims to fix UI styling but the diff primarily touches auth and payment files unrelated to the frontend.",
  "suspicious_files": ["src/auth/middleware.ts", "src/payments/retry.ts"],
  "risk_flags": ["Auth logic modified", "No tests added", "Payment flow changed"],
  "summary": "This PR has significant intent drift. The stated goal is cosmetic but the actual changes touch critical backend systems. This should not be merged without a full security review."
}
```

### `GET /api/health`

Check if LM Studio and GitHub are reachable.

```json
{
  "lm_studio": true,
  "github": true
}
```

---

## Troubleshooting

**LM Studio not connecting**
- Make sure you clicked **Start Server** in the Local Server tab
- Confirm it's running at `http://localhost:1234`
- Check the model identifier in `.env` matches exactly what LM Studio shows

**GitHub API errors**
- Verify your `GITHUB_TOKEN` in `.env` is valid and not expired
- Make sure the token has `repo` scope
- For private repos, ensure the token has access to that organization

**Malformed JSON from Gemma**
- This is normal occasionally — PRISM automatically retries with a stricter prompt
- If it persists, lower `temperature` in `main.py` to `0.1`

**Slow inference**
- 4.6B on CPU will be slow (~60–90s) — enable GPU acceleration in LM Studio settings
- On GPU (even a mid-range one) expect ~10–20s

---

## Why PRISM is Different

| Typical AI PR tools | PRISM |
|---|---|
| Reviews code style and syntax | Detects *intent* vs *reality* mismatch |
| Needs cloud API | Runs fully offline |
| Comments line by line | Reasons over the whole PR |
| No privacy guarantees | Code never leaves your machine |
| Reactive | Proactive risk intelligence |

---

## Roadmap

- [ ] GitHub App integration (auto-trigger on PR open)
- [ ] Dependency impact graph ("what else does this touch?")
- [ ] Merge Confidence history tracking per repo
- [ ] VS Code extension
- [ ] Support for GitLab and Bitbucket

---

## License

MIT © 2025 PRISM Contributors

---

<div align="center">

**PRISM** — *Understand what your code change REALLY affects.*

Built with Gemma 4 · LM Studio · FastAPI · Next.js

</div>