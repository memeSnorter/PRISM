"""
PRISM - Pull Request Intelligence & Security Machine
Backend API for analyzing GitHub PRs for intent drift
"""

import os
import re
import json
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
from github import Github, GithubException

load_dotenv()

app = FastAPI(
    title="PRISM API",
    description="Pull Request Intelligence & Security Machine",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# LM Studio configuration
LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://localhost:1234/v1")
LM_STUDIO_MODEL = os.getenv("LM_STUDIO_MODEL", "gemma-4-e2b")

# GitHub token
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")


class PRAnalyzeRequest(BaseModel):
    pr_url: str


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


def parse_pr_url(pr_url: str) -> tuple[str, str, int]:
    """Parse GitHub PR URL to extract owner, repo, and PR number."""
    # Check if user provided an issue URL instead of a PR URL
    issue_pattern = r"github\.com/([^/]+)/([^/]+)/issues/(\d+)"
    if re.search(issue_pattern, pr_url):
        raise ValueError(
            "This is a GitHub Issue URL, not a Pull Request URL. "
            "PRISM analyzes Pull Requests. Please provide a URL like: "
            "https://github.com/owner/repo/pull/123"
        )

    # PR URL patterns
    patterns = [
        r"github\.com/([^/]+)/([^/]+)/pull/(\d+)",
        r"github\.com/([^/]+)/([^/]+)/pulls/(\d+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, pr_url)
        if match:
            owner, repo, pr_number = match.groups()
            return owner, repo, int(pr_number)

    raise ValueError(
        "Invalid GitHub PR URL. Please provide a URL like: "
        "https://github.com/owner/repo/pull/123"
    )


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


def fetch_pr_data(owner: str, repo: str, pr_number: int) -> dict:
    """Fetch PR data from GitHub API using PyGithub."""
    if not GITHUB_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="Add a valid GITHUB_TOKEN to backend/.env"
        )

    try:
        g = Github(GITHUB_TOKEN)
        repository = g.get_repo(f"{owner}/{repo}")
        pr = repository.get_pull(pr_number)

        # Get PR details
        pr_title = pr.title
        pr_body = pr.body or ""

        # Get changed files and diffs
        files = pr.get_files()
        changed_files = []
        diff_text = ""

        for file in files:
            changed_files.append(file.filename)
            if file.patch:
                diff_text += f"\n--- {file.filename} ---\n{file.patch}\n"

        # Get linked issues
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
            "linked_issue": linked_issue_body
        }

    except GithubException as e:
        if e.status == 401:
            raise HTTPException(
                status_code=401,
                detail="Invalid GITHUB_TOKEN. Please check your token in backend/.env"
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
    # Clean up the response
    cleaned = text.strip()

    # Remove markdown code fences
    cleaned = re.sub(r'^```json\s*', '', cleaned)
    cleaned = re.sub(r'^```\s*', '', cleaned)
    cleaned = re.sub(r'\s*```$', '', cleaned)
    cleaned = cleaned.strip()

    # Try to find JSON object in the response
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to extract JSON object using regex
        match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        # Try to find any JSON-like structure
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

    # Truncate diff if needed
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


@app.post("/api/analyze")
async def analyze_pr(request: PRAnalyzeRequest):
    """Analyze a GitHub PR for intent drift."""
    try:
        # Parse PR URL
        owner, repo, pr_number = parse_pr_url(request.pr_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Fetch PR data from GitHub
    pr_data = fetch_pr_data(owner, repo, pr_number)

    # Build prompts
    system, user = build_analysis_prompt(pr_data)

    # Call LM Studio
    try:
        raw_response = call_lm_studio(user, system)
        result = extract_json_from_response(raw_response)
    except ValueError:
        # Retry with stricter prompt
        retry_user = user + "\n\nIMPORTANT: Output ONLY the JSON object. No prose. No markdown fences."
        try:
            raw_response = call_lm_studio(retry_user, system)
            result = extract_json_from_response(raw_response)
        except (ValueError, HTTPException):
            # Return fallback analysis
            result = get_fallback_analysis(pr_data)

    # Validate and normalize the result
    result["merge_confidence_score"] = max(0, min(100, int(result.get("merge_confidence_score", 50))))
    result["intent_match"] = result.get("intent_match", "MEDIUM").upper()
    if result["intent_match"] not in ["HIGH", "MEDIUM", "LOW"]:
        result["intent_match"] = "MEDIUM"
    result["drift_detected"] = bool(result.get("drift_detected", False))
    result["suspicious_files"] = result.get("suspicious_files", []) or []
    result["risk_flags"] = result.get("risk_flags", []) or []

    return result


@app.get("/api/health")
async def health_check():
    """Check if LM Studio and GitHub are properly configured."""
    lm_studio_ok = False
    github_ok = False
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

    # Check GitHub token
    if GITHUB_TOKEN:
        try:
            g = Github(GITHUB_TOKEN)
            g.get_user().login
            github_ok = True
        except GithubException as e:
            github_error = f"Invalid GitHub token: {e.data.get('message', str(e))}"
        except Exception as e:
            github_error = str(e)
    else:
        github_error = "GITHUB_TOKEN not set in backend/.env"

    return {
        "lm_studio": lm_studio_ok,
        "lm_studio_error": lm_studio_error,
        "github": github_ok,
        "github_error": github_error
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "PRISM API",
        "version": "1.0.0",
        "description": "Pull Request Intelligence & Security Machine"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
