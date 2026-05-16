"""
PRISM - Pull Request Intelligence & Security Machine
Backend API for analyzing GitHub PRs for intent drift
"""

import os
import re
import json
import secrets
from typing import Optional
from urllib.parse import urlparse, urlencode
from fastapi import FastAPI, HTTPException, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
from github import Github, GithubException

load_dotenv()

# Custom exceptions for URL parsing
class GitHubUrlError(Exception):
    """Base exception for GitHub URL parsing errors."""
    pass


class InvalidPrUrlError(GitHubUrlError):
    """Raised when the URL is not a valid GitHub PR URL."""
    pass


class IssueUrlProvidedError(GitHubUrlError):
    """Raised when an issue URL is provided instead of a PR URL."""
    pass


# Precompiled regex patterns for GitHub URL parsing
_GITHUB_PR_PATTERN = re.compile(
    r"^/(?P<owner>[^/]+)/(?P<repo>[^/]+)/pulls?/(?P<number>\d+)(?:/.*)?$"
)
_GITHUB_ISSUE_PATTERN = re.compile(
    r"^/(?P<owner>[^/]+)/(?P<repo>[^/]+)/issues/(?P<number>\d+)(?:/.*)?$"
)

app = FastAPI(
    title="PRISM API",
    description="Pull Request Intelligence & Security Machine",
    version="1.0.0"
)

# CORS middleware for frontend
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# LM Studio configuration
LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://localhost:1234/v1")
LM_STUDIO_MODEL = os.getenv("LM_STUDIO_MODEL", "gemma-4-e2b")

# GitHub OAuth configuration
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:8000/api/auth/callback")

# In-memory session storage (use Redis in production)
oauth_states: dict[str, bool] = {}
user_tokens: dict[str, str] = {}  # session_id -> access_token


# ============== Pydantic Models ==============

class PRAnalyzeRequest(BaseModel):
    pr_url: str


class PRCommentRequest(BaseModel):
    owner: str
    repo: str
    pr_number: int
    comment: str


class PRMergeRequest(BaseModel):
    owner: str
    repo: str
    pr_number: int
    merge_method: str = "merge"  # merge, squash, or rebase
    commit_title: Optional[str] = None
    commit_message: Optional[str] = None


class GenerateCommentRequest(BaseModel):
    owner: str
    repo: str
    pr_number: int
    analysis_summary: str
    risk_flags: list[str]
    suggested_changes: Optional[str] = None


class AnalysisResult(BaseModel):
    merge_confidence_score: int
    intent_match: str
    claimed_intent: str
    actual_changes: str
    drift_detected: bool
    drift_reason: Optional[str]
    suspicious_files: list[str]
    risk_flags: list[str]
    summary: str


# ============== Auth Helpers ==============

def get_github_client(authorization: Optional[str] = Header(None)) -> Github:
    """Get GitHub client from authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Not authenticated. Please login with GitHub."
        )

    token = authorization.replace("Bearer ", "")
    return Github(token)


def get_optional_github_client(authorization: Optional[str] = Header(None)) -> Optional[Github]:
    """Get GitHub client if authenticated, otherwise return None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.replace("Bearer ", "")
    return Github(token)


# ============== OAuth Endpoints ==============

@app.get("/api/auth/login")
async def github_login():
    """Initiate GitHub OAuth flow."""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth not configured. Set GITHUB_CLIENT_ID in .env"
        )

    state = secrets.token_urlsafe(32)
    oauth_states[state] = True

    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scope": "repo read:user",
        "state": state,
    }

    auth_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    return {"auth_url": auth_url}


@app.get("/api/auth/callback")
async def github_callback(code: str = Query(...), state: str = Query(...)):
    """Handle GitHub OAuth callback."""
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    del oauth_states[state]

    if not GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth not configured. Set GITHUB_CLIENT_SECRET in .env"
        )

    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"}
        )

        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")

        data = response.json()

        if "error" in data:
            raise HTTPException(status_code=400, detail=data.get("error_description", data["error"]))

        access_token = data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")

    # Redirect to frontend with token
    redirect_url = f"{FRONTEND_URL}/auth/callback?token={access_token}"
    return RedirectResponse(url=redirect_url)


@app.get("/api/auth/user")
async def get_current_user(g: Github = Depends(get_github_client)):
    """Get current authenticated user info."""
    try:
        user = g.get_user()
        return {
            "login": user.login,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "email": user.email,
        }
    except GithubException as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@app.post("/api/auth/logout")
async def logout():
    """Logout (client should clear token)."""
    return {"message": "Logged out successfully"}


# ============== Repository Endpoints ==============

@app.get("/api/repos")
async def list_repositories(g: Github = Depends(get_github_client)):
    """List all repositories accessible to the authenticated user."""
    try:
        user = g.get_user()
        repos = []

        # Get user's own repos
        for repo in user.get_repos(sort="updated"):
            repos.append({
                "id": repo.id,
                "name": repo.name,
                "full_name": repo.full_name,
                "private": repo.private,
                "description": repo.description,
                "html_url": repo.html_url,
                "updated_at": repo.updated_at.isoformat() if repo.updated_at else None,
                "open_issues_count": repo.open_issues_count,
                "owner": {
                    "login": repo.owner.login,
                    "avatar_url": repo.owner.avatar_url,
                }
            })

            # Limit to 100 repos for performance
            if len(repos) >= 100:
                break

        return {"repositories": repos}

    except GithubException as e:
        raise HTTPException(status_code=500, detail=f"GitHub API error: {str(e)}")


@app.get("/api/repos/{owner}/{repo}/pulls")
async def list_pull_requests(
    owner: str,
    repo: str,
    state: str = "open",
    g: Github = Depends(get_github_client)
):
    """List pull requests for a repository."""
    try:
        repository = g.get_repo(f"{owner}/{repo}")
        prs = []

        for pr in repository.get_pulls(state=state, sort="updated", direction="desc"):
            prs.append({
                "number": pr.number,
                "title": pr.title,
                "state": pr.state,
                "html_url": pr.html_url,
                "created_at": pr.created_at.isoformat() if pr.created_at else None,
                "updated_at": pr.updated_at.isoformat() if pr.updated_at else None,
                "user": {
                    "login": pr.user.login,
                    "avatar_url": pr.user.avatar_url,
                },
                "head": {
                    "ref": pr.head.ref,
                    "sha": pr.head.sha,
                },
                "base": {
                    "ref": pr.base.ref,
                },
                "mergeable": pr.mergeable,
                "merged": pr.merged,
                "draft": pr.draft,
            })

            # Limit to 50 PRs
            if len(prs) >= 50:
                break

        return {"pull_requests": prs}

    except GithubException as e:
        if e.status == 404:
            raise HTTPException(status_code=404, detail=f"Repository not found: {owner}/{repo}")
        raise HTTPException(status_code=500, detail=f"GitHub API error: {str(e)}")


# ============== PR Action Endpoints ==============

@app.post("/api/repos/{owner}/{repo}/pulls/{pr_number}/comment")
async def add_pr_comment(
    owner: str,
    repo: str,
    pr_number: int,
    request: PRCommentRequest,
    g: Github = Depends(get_github_client)
):
    """Add a comment to a pull request."""
    try:
        repository = g.get_repo(f"{owner}/{repo}")
        issue = repository.get_issue(pr_number)
        comment = issue.create_comment(request.comment)

        return {
            "success": True,
            "comment_id": comment.id,
            "comment_url": comment.html_url,
        }

    except GithubException as e:
        if e.status == 404:
            raise HTTPException(status_code=404, detail=f"PR not found: {owner}/{repo}#{pr_number}")
        elif e.status == 403:
            raise HTTPException(status_code=403, detail="You don't have permission to comment on this PR")
        raise HTTPException(status_code=500, detail=f"GitHub API error: {str(e)}")


@app.post("/api/repos/{owner}/{repo}/pulls/{pr_number}/merge")
async def merge_pull_request(
    owner: str,
    repo: str,
    pr_number: int,
    request: PRMergeRequest,
    g: Github = Depends(get_github_client)
):
    """Merge a pull request."""
    try:
        repository = g.get_repo(f"{owner}/{repo}")
        pr = repository.get_pull(pr_number)

        # Check if PR is mergeable
        if pr.merged:
            raise HTTPException(status_code=400, detail="PR is already merged")

        if pr.mergeable is False:
            raise HTTPException(status_code=400, detail="PR has merge conflicts and cannot be merged")

        # Merge the PR
        merge_result = pr.merge(
            commit_title=request.commit_title,
            commit_message=request.commit_message,
            merge_method=request.merge_method,
        )

        return {
            "success": merge_result.merged,
            "sha": merge_result.sha,
            "message": merge_result.message,
        }

    except GithubException as e:
        if e.status == 404:
            raise HTTPException(status_code=404, detail=f"PR not found: {owner}/{repo}#{pr_number}")
        elif e.status == 403:
            raise HTTPException(status_code=403, detail="You don't have permission to merge this PR")
        elif e.status == 405:
            raise HTTPException(status_code=405, detail="PR cannot be merged (check branch protection rules)")
        raise HTTPException(status_code=500, detail=f"GitHub API error: {str(e)}")


@app.post("/api/generate-comment")
async def generate_ai_comment(
    request: GenerateCommentRequest,
    g: Github = Depends(get_github_client)
):
    """Generate an AI-powered review comment for a PR."""
    try:
        # Fetch PR data for context
        repository = g.get_repo(f"{request.owner}/{request.repo}")
        pr = repository.get_pull(request.pr_number)

        # Build the prompt for generating a comment
        system = """You are PRISM, an AI code review assistant. Generate a helpful, constructive code review comment for a GitHub Pull Request. Be professional, specific, and actionable. Format the comment in Markdown."""

        risk_flags_text = ", ".join(request.risk_flags) if request.risk_flags else "None"

        prompt = f"""Generate a code review comment for this Pull Request:

PR Title: {pr.title}
PR Description: {pr.body or "No description provided"}

PRISM Analysis Summary: {request.analysis_summary}

Risk Flags Detected: {risk_flags_text}

Additional Context/Suggested Changes: {request.suggested_changes or "None provided"}

Generate a professional code review comment that:
1. Acknowledges the PR's intent
2. Highlights any concerns from the analysis
3. Provides specific, actionable suggestions if there are issues
4. Uses a constructive and helpful tone
5. Includes a PRISM confidence indicator

Format the comment in GitHub Markdown with appropriate headers and bullet points."""

        comment_text = call_lm_studio(prompt, system)

        # Clean up any code fences if present
        comment_text = comment_text.strip()
        if comment_text.startswith("```markdown"):
            comment_text = comment_text[11:]
        if comment_text.startswith("```"):
            comment_text = comment_text[3:]
        if comment_text.endswith("```"):
            comment_text = comment_text[:-3]
        comment_text = comment_text.strip()

        return {
            "comment": comment_text,
            "pr_title": pr.title,
        }

    except GithubException as e:
        raise HTTPException(status_code=500, detail=f"GitHub API error: {str(e)}")


# ============== URL Parsing ==============

def parse_pr_url(pr_url: str) -> tuple[str, str, int]:
    """Parse GitHub PR URL to extract owner, repo, and PR number."""
    parsed = urlparse(pr_url.strip())

    if parsed.netloc not in ("github.com", "www.github.com"):
        raise InvalidPrUrlError(
            "URL must be from github.com. "
            "Please provide a URL like: https://github.com/owner/repo/pull/123"
        )

    issue_match = _GITHUB_ISSUE_PATTERN.match(parsed.path)
    if issue_match:
        raise IssueUrlProvidedError(
            "This is a GitHub Issue URL, not a Pull Request URL. "
            "PRISM analyzes Pull Requests. Please provide a URL like: "
            "https://github.com/owner/repo/pull/123"
        )

    pr_match = _GITHUB_PR_PATTERN.match(parsed.path)
    if pr_match:
        return (
            pr_match.group("owner"),
            pr_match.group("repo"),
            int(pr_match.group("number"))
        )

    raise InvalidPrUrlError(
        "Invalid GitHub PR URL. Please provide a URL like: "
        "https://github.com/owner/repo/pull/123"
    )


# ============== Core Analysis Functions ==============

def extract_linked_issues(body: str) -> list[int]:
    """Extract linked issue numbers from PR body."""
    if not body:
        return []

    patterns = [
        r"(?:fixes|closes|resolves|fix|close|resolve)\s*#(\d+)",
        r"(?:fixes|closes|resolves|fix|close|resolve)\s+#(\d+)",
    ]

    issues = []
    for pattern in patterns:
        matches = re.findall(pattern, body, re.IGNORECASE)
        issues.extend([int(m) for m in matches])

    return list(set(issues))


def fetch_pr_data(owner: str, repo: str, pr_number: int, g: Optional[Github] = None) -> dict:
    """Fetch PR data from GitHub API using PyGithub."""
    if g is None:
        # Fall back to env token if no authenticated client
        token = os.getenv("GITHUB_TOKEN", "")
        if not token:
            raise HTTPException(
                status_code=401,
                detail="Authentication required. Please login with GitHub or set GITHUB_TOKEN."
            )
        g = Github(token)

    try:
        repository = g.get_repo(f"{owner}/{repo}")
        pr = repository.get_pull(pr_number)

        pr_title = pr.title
        pr_body = pr.body or ""

        files = pr.get_files()
        changed_files = []
        diff_text = ""

        for file in files:
            changed_files.append(file.filename)
            if file.patch:
                diff_text += f"\n--- {file.filename} ---\n{file.patch}\n"

        linked_issue_numbers = extract_linked_issues(pr_body)
        linked_issue_body = None

        if linked_issue_numbers:
            try:
                first_issue = repository.get_issue(linked_issue_numbers[0])
                linked_issue_body = f"Issue #{linked_issue_numbers[0]}: {first_issue.title}\n{first_issue.body or ''}"
            except GithubException:
                pass

        return {
            "pr_title": pr_title,
            "pr_description": pr_body,
            "changed_files": changed_files,
            "diff": diff_text,
            "linked_issue": linked_issue_body,
            "pr_url": pr.html_url,
            "pr_number": pr_number,
            "owner": owner,
            "repo": repo,
        }

    except GithubException as e:
        if e.status == 401:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token. Please login again."
            )
        elif e.status == 404:
            raise HTTPException(
                status_code=404,
                detail=f"PR not found: {owner}/{repo}#{pr_number}"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"GitHub API error: {str(e)}"
            )


def call_lm_studio(prompt: str, system: str) -> str:
    """Call LM Studio's OpenAI-compatible API."""
    try:
        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                f"{LM_STUDIO_URL}/chat/completions",
                json={
                    "model": LM_STUDIO_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.2,
                    "max_tokens": 1500,
                },
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="LM Studio is not running. Open LM Studio → Local Server → Start Server"
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="LM Studio request timed out. The model may be loading or the diff is too large."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"LM Studio error: {str(e)}"
        )


def extract_json_from_response(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown fences."""
    cleaned = text.strip()

    cleaned = re.sub(r'^```json\s*', '', cleaned)
    cleaned = re.sub(r'^```\s*', '', cleaned)
    cleaned = re.sub(r'\s*```$', '', cleaned)
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        raise ValueError("Could not extract valid JSON from response")


def build_analysis_prompt(pr_data: dict) -> tuple[str, str]:
    """Build the system and user prompts for analysis."""
    system = """You are PRISM, a software intelligence system. You analyze GitHub pull requests to detect intent drift — when the code changes don't match what the PR claims to do. You respond ONLY in valid JSON. No markdown. No explanation outside JSON."""

    diff = pr_data["diff"]
    if len(diff) > 3000:
        diff = diff[:3000] + "\n\n[diff truncated for context window]"

    user = f"""Analyze this pull request for intent drift.

PR Title: {pr_data["pr_title"]}
PR Description: {pr_data["pr_description"]}
Linked Issue: {pr_data["linked_issue"] or "None"}
Changed Files: {", ".join(pr_data["changed_files"])}
Diff Summary:
{diff}

Respond with this exact JSON structure:
{{
    "merge_confidence_score": <integer 0-100>,
    "intent_match": "<HIGH | MEDIUM | LOW>",
    "claimed_intent": "<one sentence: what the PR says it does>",
    "actual_changes": "<one sentence: what the diff actually does>",
    "drift_detected": <true | false>,
    "drift_reason": "<if drift_detected is true, explain why. Otherwise null>",
    "suspicious_files": ["<filename>", ...],
    "risk_flags": ["<short flag>", ...],
    "summary": "<2-3 sentence overall assessment a senior engineer would give>"
}}"""

    return system, user


def get_fallback_analysis(pr_data: dict) -> dict:
    """Generate a fallback analysis when LLM fails."""
    return {
        "merge_confidence_score": 50,
        "intent_match": "MEDIUM",
        "claimed_intent": pr_data["pr_title"],
        "actual_changes": f"Modifies {len(pr_data['changed_files'])} file(s): {', '.join(pr_data['changed_files'][:5])}",
        "drift_detected": False,
        "drift_reason": None,
        "suspicious_files": [],
        "risk_flags": ["analysis_incomplete"],
        "summary": "PRISM could not complete full analysis. Manual review recommended. The AI model returned an invalid response."
    }


# ============== Analysis Endpoints ==============

@app.post("/api/analyze")
async def analyze_pr(
    request: PRAnalyzeRequest,
    g: Optional[Github] = Depends(get_optional_github_client)
):
    """Analyze a GitHub PR for intent drift."""
    try:
        owner, repo, pr_number = parse_pr_url(request.pr_url)
    except GitHubUrlError as e:
        raise HTTPException(status_code=400, detail=str(e))

    pr_data = fetch_pr_data(owner, repo, pr_number, g)

    system, user = build_analysis_prompt(pr_data)

    try:
        raw_response = call_lm_studio(user, system)
        result = extract_json_from_response(raw_response)
    except ValueError:
        retry_user = user + "\n\nIMPORTANT: Output ONLY the JSON object. No prose. No markdown fences."
        try:
            raw_response = call_lm_studio(retry_user, system)
            result = extract_json_from_response(raw_response)
        except (ValueError, HTTPException):
            result = get_fallback_analysis(pr_data)

    result["merge_confidence_score"] = max(0, min(100, int(result.get("merge_confidence_score", 50))))
    result["intent_match"] = result.get("intent_match", "MEDIUM").upper()
    if result["intent_match"] not in ["HIGH", "MEDIUM", "LOW"]:
        result["intent_match"] = "MEDIUM"
    result["drift_detected"] = bool(result.get("drift_detected", False))
    result["suspicious_files"] = result.get("suspicious_files", []) or []
    result["risk_flags"] = result.get("risk_flags", []) or []

    # Add PR metadata to result
    result["pr_url"] = pr_data.get("pr_url")
    result["pr_number"] = pr_data.get("pr_number")
    result["owner"] = pr_data.get("owner")
    result["repo"] = pr_data.get("repo")

    return result


@app.get("/api/health")
async def health_check():
    """Check if LM Studio and GitHub are properly configured."""
    lm_studio_ok = False
    github_ok = False
    oauth_configured = False
    lm_studio_error = None
    github_error = None

    # Check LM Studio
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(f"{LM_STUDIO_URL}/models")
            if response.status_code == 200:
                lm_studio_ok = True
    except httpx.ConnectError:
        lm_studio_error = "LM Studio is not running. Open LM Studio → Local Server → Start Server"
    except Exception as e:
        lm_studio_error = str(e)

    # Check if OAuth is configured
    oauth_configured = bool(GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET)

    # Check fallback GitHub token
    github_token = os.getenv("GITHUB_TOKEN", "")
    if github_token:
        try:
            g = Github(github_token)
            g.get_user().login
            github_ok = True
        except GithubException as e:
            github_error = f"Invalid GitHub token: {e.data.get('message', str(e))}"
        except Exception as e:
            github_error = str(e)
    else:
        github_error = "GITHUB_TOKEN not set (OAuth available if configured)"

    return {
        "lm_studio": lm_studio_ok,
        "lm_studio_error": lm_studio_error,
        "github": github_ok,
        "github_error": github_error,
        "oauth_configured": oauth_configured,
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "PRISM API",
        "version": "2.0.0",
        "description": "Pull Request Intelligence & Security Machine",
        "features": [
            "Intent Drift Detection",
            "GitHub OAuth Authentication",
            "Repository Browser",
            "AI-Powered PR Comments",
            "Direct PR Merge",
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
