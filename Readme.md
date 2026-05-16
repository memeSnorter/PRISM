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
      ↓
  Take Action
  (post AI comments · merge directly)
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
| 🔐 **GitHub OAuth Login** | Access all your public AND private repositories |
| 📁 **Repository Browser** | Browse repos and PRs directly in the dashboard |
| 💬 **AI-Generated Comments** | Generate and post review comments using Gemma |
| 🔀 **Direct PR Merge** | Merge, squash, or rebase PRs directly from PRISM |

---

## Tech Stack

**Backend**
- Python 3.11+
- FastAPI
- PyGithub
- GitHub OAuth 2.0

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
- [ ] Gemma 4 E2B (4.6B) downloaded in LM Studio
- [ ] A GitHub OAuth App (for full features) OR a Personal Access Token

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

Open `.env` and configure:

```env
# For basic functionality (analyze public PRs)
GITHUB_TOKEN=your_github_personal_access_token

# For full functionality (OAuth login, private repos, comments, merge)
GITHUB_CLIENT_ID=your_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_oauth_app_client_secret
GITHUB_REDIRECT_URI=http://localhost:8000/api/auth/callback
FRONTEND_URL=http://localhost:3000

# LM Studio
LM_STUDIO_URL=http://localhost:1234/v1
LM_STUDIO_MODEL=gemma-4-e2b
```

> **Setting up GitHub OAuth (recommended):**
> 1. Go to GitHub → Settings → Developer Settings → OAuth Apps
> 2. Click "New OAuth App"
> 3. Set Homepage URL: `http://localhost:3000`
> 4. Set Authorization callback URL: `http://localhost:8000/api/auth/callback`
> 5. Copy the Client ID and Client Secret to your `.env`

Start the backend:

```bash
uvicorn main:app --reload --port 8000
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

### Quick Analysis (No Login Required)
1. Paste any **public GitHub PR URL** into the input field
2. Click **Analyze PR**
3. View the intent drift analysis

### Full Features (With GitHub Login)
1. Click **Login with GitHub** in the header
2. Authorize PRISM to access your repositories
3. Browse your repositories in the **Dashboard**
4. Select a repo → view its PRs → click to analyze
5. After analysis, you can:
   - **Generate AI Comment**: Create a review comment using Gemma
   - **Merge PR**: Merge directly with your preferred method (merge/squash/rebase)

---

## Project Structure

```
prism/
├── backend/
│   ├── main.py                 ← FastAPI app with OAuth, analysis, PR actions
│   ├── requirements.txt
│   ├── .env.example
│   └── .env                    ← your secrets (gitignored)
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx            ← home page + quick analysis
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── auth/callback/      ← OAuth callback handler
│   │   └── dashboard/          ← authenticated dashboard
│   ├── components/
│   │   ├── Header.tsx          ← navigation with auth state
│   │   ├── PRISMInput.tsx      ← PR URL input
│   │   ├── LoadingState.tsx    ← animated loading steps
│   │   ├── ConfidenceGauge.tsx ← score display
│   │   ├── DriftBanner.tsx     ← drift detected / aligned banner
│   │   ├── ResultCard.tsx      ← intent comparison cards
│   │   └── RiskFlags.tsx       ← risk badge list
│   ├── lib/
│   │   ├── auth.tsx            ← authentication context
│   │   └── api.ts              ← API client functions
│   ├── package.json
│   └── tailwind.config.ts
│
└── README.md
```

---

## API Reference

### Authentication

#### `GET /api/auth/login`
Initiate GitHub OAuth flow. Returns `{ auth_url }` to redirect user.

#### `GET /api/auth/callback`
OAuth callback handler. Exchanges code for token and redirects to frontend.

#### `GET /api/auth/user`
Get current authenticated user info. Requires `Authorization: Bearer <token>`.

### Repositories & PRs

#### `GET /api/repos`
List all repositories accessible to the authenticated user.

#### `GET /api/repos/{owner}/{repo}/pulls`
List pull requests for a repository. Query params: `state=open|closed|all`

### Analysis

#### `POST /api/analyze`
Analyze a GitHub PR for intent drift.

**Request:**
```json
{ "pr_url": "https://github.com/owner/repo/pull/42" }
```

**Response:**
```json
{
  "merge_confidence_score": 34,
  "intent_match": "LOW",
  "claimed_intent": "Fixes a UI styling bug on the login page",
  "actual_changes": "Modifies payment authorization middleware",
  "drift_detected": true,
  "drift_reason": "PR claims UI fix but touches auth/payment code",
  "suspicious_files": ["src/auth/middleware.ts"],
  "risk_flags": ["Auth logic modified", "No tests added"],
  "summary": "Significant intent drift detected...",
  "pr_url": "https://github.com/owner/repo/pull/42",
  "pr_number": 42,
  "owner": "owner",
  "repo": "repo"
}
```

### PR Actions

#### `POST /api/repos/{owner}/{repo}/pulls/{pr_number}/comment`
Add a comment to a pull request.

#### `POST /api/repos/{owner}/{repo}/pulls/{pr_number}/merge`
Merge a pull request. Body: `{ "merge_method": "merge|squash|rebase" }`

#### `POST /api/generate-comment`
Generate an AI-powered review comment using Gemma.

### Health

#### `GET /api/health`
Check system status.

```json
{
  "lm_studio": true,
  "github": true,
  "oauth_configured": true
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

**OAuth not working**
- Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set
- Check the callback URL matches exactly: `http://localhost:8000/api/auth/callback`
- Make sure `FRONTEND_URL` is set to `http://localhost:3000`

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
| Read-only | Can comment and merge directly |

---

## Roadmap

- [x] GitHub OAuth integration
- [x] Repository browser dashboard
- [x] AI-generated review comments
- [x] Direct PR merge from UI
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
