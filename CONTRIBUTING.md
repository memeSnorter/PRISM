# Contributing to PRISM

Thank you for your interest in contributing. PRISM is a local-first, privacy-preserving software intelligence tool — every contribution helps make it more useful for engineers who care about code quality, intent, and security.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Branch Naming](#branch-naming)
- [Commit Style](#commit-style)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Project Structure](#project-structure)
- [Core Principles](#core-principles)

---

## Code of Conduct

Be respectful. Be constructive. We're all engineers trying to build something useful.

- No harassment, discrimination, or personal attacks
- Feedback on code, not on people
- Assume good intent in all discussions

---

## Getting Started

1. **Fork** this repository using the **Fork** button at the top of the page
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/your-username/prism.git
   cd prism
   ```
3. **Set up** the project locally by following the [README](./README.md)
4. **Create a branch** for your work (see [Branch Naming](#branch-naming))
5. **Make your changes**, test them, then open a Pull Request against `main`

---

## How to Contribute

| Type | Description |
|---|---|
| 🐛 Bug Fix | Fix something that's broken |
| ✨ Feature | Add a new capability |
| 📝 Docs | Improve or fix documentation |
| 🎨 UI/UX | Improve the frontend interface |
| ⚡ Performance | Make inference or API calls faster |
| 🧪 Tests | Add or improve test coverage |
| 🔐 Security | Identify or fix a security issue |

If you're unsure where to start, look for issues tagged **`good first issue`** on the [Issues page](../../issues).

---

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- [LM Studio](https://lmstudio.ai) with Gemma 4 E2B (4.6B) loaded and server started
- A GitHub Personal Access Token with `repo` scope
- A GitHub OAuth App (for dashboard and PR management features)

### Environment Setup

```bash
cp backend/.env.example backend/.env
```

Fill in `backend/.env`:

```env
GITHUB_TOKEN=your_personal_access_token
GITHUB_CLIENT_ID=your_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_oauth_app_client_secret
GITHUB_REDIRECT_URI=http://localhost:8000/api/auth/callback
FRONTEND_URL=http://localhost:3000
LM_STUDIO_URL=http://localhost:1234/v1
LM_STUDIO_MODEL=your-model-id-from-lm-studio
```

> ⚠️ **Never commit `.env`**. It is gitignored. If you accidentally expose secrets, rotate them immediately at GitHub → Settings → Developer Settings.

### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### LM Studio

- Open LM Studio → load **Gemma 4 E2B (4.6B)**
- Go to **Local Server** tab → click **Start Server**
- Confirm running at `http://localhost:1234`
- Run `curl http://localhost:1234/v1/models` to get the exact model ID and put it in `.env`

### GitHub OAuth App

Create one at [https://github.com/settings/developers](https://github.com/settings/developers):

| Field | Value |
|---|---|
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `http://localhost:8000/api/auth/callback` |

---

## Branch Naming

```
<type>/<short-description>
```

| Type | When to use |
|---|---|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `docs/` | Documentation only |
| `ui/` | Frontend/visual changes |
| `perf/` | Performance improvement |
| `refactor/` | Code restructuring, no behavior change |
| `test/` | Tests only |
| `security/` | Security-related changes |

**Examples:**

```
feat/merge-confidence-history
fix/oauth-callback-redirect
ui/dashboard-repo-filter
docs/lm-studio-windows-setup
security/token-rotation-handling
```

---

## Commit Style

PRISM uses [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <short description>
```

**Examples:**

```
feat(backend): add GitHub OAuth token refresh flow
fix(frontend): handle null drift_reason without crashing
feat(dashboard): add merge method selector (merge/squash/rebase)
docs(readme): update LM Studio model identifier step
ui(gauge): animate confidence score on load
fix(backend): strip markdown fences from Gemma JSON response
perf(backend): truncate diff before prompt construction not after
```

Keep descriptions under 72 characters. Use the commit body for more detail if needed.

---

## Pull Request Guidelines

Before opening a PR:

- [ ] Branch is up to date with `main`
- [ ] Backend starts without errors (`uvicorn main:app --reload`)
- [ ] Frontend builds without errors (`npm run build`)
- [ ] Tested with at least one real GitHub PR URL
- [ ] `.env` is NOT committed
- [ ] `node_modules` is NOT committed
- [ ] No hardcoded tokens, secrets, or credentials anywhere in the code

When opening the PR:

- Use a clear title following the commit style above
- Describe **what** you changed and **why**
- If it's a UI change, attach a screenshot
- Link any related issues with `Closes #N`

PR reviews typically happen within 48 hours.

---

## Reporting Bugs

Open an issue via [Issues](../../issues) with the **`bug`** label and include:

- **What happened** — what did you see?
- **What you expected** — what should have happened?
- **Steps to reproduce** — exact steps to trigger it
- **Environment:**
  - OS (Windows / macOS / Linux)
  - Python version (`python --version`)
  - Node version (`node --version`)
  - LM Studio version
  - Gemma model identifier from `curl http://localhost:1234/v1/models`
- **Logs** — paste any terminal errors or LM Studio server logs

> ⚠️ **Never include your GitHub token, OAuth secrets, or private repository URLs in bug reports.**

---

## Suggesting Features

Open an issue via [Issues](../../issues) with the **`enhancement`** label and describe:

- **The problem** you're trying to solve
- **Your proposed solution**
- **Alternatives you considered**
- **Any examples** from other tools you find inspiring

The most welcome feature suggestions stay true to PRISM's core principle:

> **Local-first, privacy-preserving software intelligence.**

Features that require sending code to external APIs will not be accepted.

---

## Project Structure

```
prism/
├── backend/
│   ├── main.py                  ← FastAPI app, GitHub OAuth, LM Studio integration
│   ├── requirements.txt
│   └── .env.example             ← template — copy to .env, never commit .env
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx             ← home page + results view
│   │   ├── layout.tsx
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── page.tsx     ← OAuth callback handler
│   │   └── dashboard/
│   │       └── page.tsx         ← repository browser + PR management
│   ├── components/
│   │   ├── PRISMInput.tsx       ← PR URL input
│   │   ├── LoadingState.tsx     ← animated loading steps
│   │   ├── ConfidenceGauge.tsx  ← merge confidence score display
│   │   ├── DriftBanner.tsx      ← drift detected / aligned banner
│   │   ├── ResultCard.tsx       ← intent comparison cards
│   │   ├── RiskFlags.tsx        ← risk badge list
│   │   └── Header.tsx           ← nav with auth state
│   └── package.json
│
├── CONTRIBUTING.md              ← this file
├── LICENSE
└── README.md
```

---

## Core Principles

These are non-negotiable for any contribution:

**1. Local-first** — Inference runs on the user's machine via LM Studio. No code is sent to OpenAI, Anthropic, or any external AI API.

**2. Privacy by design** — User code and PR diffs are never logged, stored externally, or transmitted beyond the local backend.

**3. No node_modules in git** — Ever. The `.gitignore` enforces this. If you see node_modules tracked, fix it before opening a PR.

**4. No secrets in code** — All tokens, keys, and credentials go in `.env` only. Use `.env.example` for documentation.

**5. One sharp feature over ten half-built ones** — PRISM wins by doing intent drift detection exceptionally well, not by doing everything adequately.

---

## Questions?

Open a [Discussion](../../discussions) or file an [Issue](../../issues).

---

*PRISM — Understand what your code change REALLY affects.*