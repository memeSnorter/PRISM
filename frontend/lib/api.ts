const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface FetchOptions extends RequestInit {
  token?: string | null
}

async function fetchAPI(endpoint: string, options: FetchOptions = {}) {
  const { token, ...fetchOptions } = options

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

export interface Repository {
  id: number
  name: string
  full_name: string
  private: boolean
  description: string | null
  html_url: string
  updated_at: string | null
  open_issues_count: number
  owner: {
    login: string
    avatar_url: string
  }
}

export interface PullRequest {
  number: number
  title: string
  state: string
  html_url: string
  created_at: string | null
  updated_at: string | null
  user: {
    login: string
    avatar_url: string
  }
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
  }
  mergeable: boolean | null
  merged: boolean
  draft: boolean
}

export interface AnalysisResult {
  merge_confidence_score: number
  intent_match: 'HIGH' | 'MEDIUM' | 'LOW'
  claimed_intent: string
  actual_changes: string
  drift_detected: boolean
  drift_reason: string | null
  suspicious_files: string[]
  risk_flags: string[]
  summary: string
  pr_url?: string
  pr_number?: number
  owner?: string
  repo?: string
}

export const api = {
  // Health check
  health: () => fetchAPI('/api/health'),

  // Analysis
  analyze: (prUrl: string, token?: string | null) =>
    fetchAPI('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ pr_url: prUrl }),
      token,
    }),

  // Repositories
  listRepos: (token: string) =>
    fetchAPI('/api/repos', { token }) as Promise<{ repositories: Repository[] }>,

  // Pull Requests
  listPRs: (owner: string, repo: string, state: string, token: string) =>
    fetchAPI(`/api/repos/${owner}/${repo}/pulls?state=${state}`, { token }) as Promise<{
      pull_requests: PullRequest[]
    }>,

  // PR Actions
  addComment: (owner: string, repo: string, prNumber: number, comment: string, token: string) =>
    fetchAPI(`/api/repos/${owner}/${repo}/pulls/${prNumber}/comment`, {
      method: 'POST',
      body: JSON.stringify({ owner, repo, pr_number: prNumber, comment }),
      token,
    }),

  mergePR: (
    owner: string,
    repo: string,
    prNumber: number,
    mergeMethod: string,
    token: string,
    commitTitle?: string,
    commitMessage?: string
  ) =>
    fetchAPI(`/api/repos/${owner}/${repo}/pulls/${prNumber}/merge`, {
      method: 'POST',
      body: JSON.stringify({
        owner,
        repo,
        pr_number: prNumber,
        merge_method: mergeMethod,
        commit_title: commitTitle,
        commit_message: commitMessage,
      }),
      token,
    }),

  generateComment: (
    owner: string,
    repo: string,
    prNumber: number,
    analysisSummary: string,
    riskFlags: string[],
    suggestedChanges: string | null,
    token: string
  ) =>
    fetchAPI('/api/generate-comment', {
      method: 'POST',
      body: JSON.stringify({
        owner,
        repo,
        pr_number: prNumber,
        analysis_summary: analysisSummary,
        risk_flags: riskFlags,
        suggested_changes: suggestedChanges,
      }),
      token,
    }),
}
