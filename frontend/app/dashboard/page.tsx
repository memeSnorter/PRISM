'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { api, Repository, PullRequest, AnalysisResult } from '@/lib/api'
import Header from '@/components/Header'
import ConfidenceGauge from '@/components/ConfidenceGauge'
import DriftBanner from '@/components/DriftBanner'
import ResultCard from '@/components/ResultCard'
import RiskFlags from '@/components/RiskFlags'

type ViewState = 'repos' | 'prs' | 'analysis'

export default function Dashboard() {
  const router = useRouter()
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth()

  const [view, setView] = useState<ViewState>('repos')
  const [repos, setRepos] = useState<Repository[]>([])
  const [prs, setPRs] = useState<PullRequest[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [prFilter, setPRFilter] = useState<'open' | 'closed' | 'all'>('open')

  // Comment/Merge states
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isGeneratingComment, setIsGeneratingComment] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [isCommenting, setIsCommenting] = useState(false)
  const [mergeMethod, setMergeMethod] = useState<'merge' | 'squash' | 'rebase'>('merge')
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [authLoading, isAuthenticated, router])

  // Load repositories on mount
  useEffect(() => {
    if (token) {
      loadRepos()
    }
  }, [token])

  const loadRepos = async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.listRepos(token)
      setRepos(data.repositories)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories')
    } finally {
      setIsLoading(false)
    }
  }

  const loadPRs = async (repo: Repository) => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    setSelectedRepo(repo)
    setView('prs')
    try {
      const data = await api.listPRs(repo.owner.login, repo.name, prFilter, token)
      setPRs(data.pull_requests)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pull requests')
    } finally {
      setIsLoading(false)
    }
  }

  const analyzePR = async (pr: PullRequest) => {
    if (!token || !selectedRepo) return
    setIsLoading(true)
    setError(null)
    setSelectedPR(pr)
    setView('analysis')
    try {
      const result = await api.analyze(pr.html_url, token)
      setAnalysis(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsLoading(false)
    }
  }

  const generateComment = async () => {
    if (!token || !analysis || !selectedRepo || !selectedPR) return
    setIsGeneratingComment(true)
    try {
      const result = await api.generateComment(
        selectedRepo.owner.login,
        selectedRepo.name,
        selectedPR.number,
        analysis.summary,
        analysis.risk_flags,
        null,
        token
      )
      setCommentText(result.comment)
      setShowCommentModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate comment')
    } finally {
      setIsGeneratingComment(false)
    }
  }

  const submitComment = async () => {
    if (!token || !selectedRepo || !selectedPR || !commentText) return
    setIsCommenting(true)
    try {
      await api.addComment(
        selectedRepo.owner.login,
        selectedRepo.name,
        selectedPR.number,
        commentText,
        token
      )
      setShowCommentModal(false)
      setCommentText('')
      setActionSuccess('Comment posted successfully!')
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setIsCommenting(false)
    }
  }

  const mergePR = async () => {
    if (!token || !selectedRepo || !selectedPR) return
    setIsMerging(true)
    try {
      await api.mergePR(
        selectedRepo.owner.login,
        selectedRepo.name,
        selectedPR.number,
        mergeMethod,
        token
      )
      setShowMergeModal(false)
      setActionSuccess('Pull request merged successfully!')
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge PR')
    } finally {
      setIsMerging(false)
    }
  }

  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm">
          <button
            onClick={() => {
              setView('repos')
              setSelectedRepo(null)
              setSelectedPR(null)
              setAnalysis(null)
            }}
            className={`${view === 'repos' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Repositories
          </button>
          {selectedRepo && (
            <>
              <span className="text-gray-600">/</span>
              <button
                onClick={() => {
                  setView('prs')
                  setSelectedPR(null)
                  setAnalysis(null)
                }}
                className={`${view === 'prs' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {selectedRepo.name}
              </button>
            </>
          )}
          {selectedPR && (
            <>
              <span className="text-gray-600">/</span>
              <span className="text-white">PR #{selectedPR.number}</span>
            </>
          )}
        </nav>

        {/* Success message */}
        {actionSuccess && (
          <div className="mb-6 rounded-lg bg-green-500/20 border border-green-500/50 p-4 text-green-400">
            ✓ {actionSuccess}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-500/20 border border-red-500/50 p-4 text-red-400">
            ⚠️ {error}
            <button onClick={() => setError(null)} className="ml-4 text-sm underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Repository List */}
        {view === 'repos' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Your Repositories</h1>
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => loadPRs(repo)}
                    className="card-hover rounded-xl border border-gray-800 bg-gray-900 p-4 text-left"
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <img
                        src={repo.owner.avatar_url}
                        alt={repo.owner.login}
                        className="h-8 w-8 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{repo.name}</h3>
                        <p className="text-sm text-gray-500">{repo.owner.login}</p>
                      </div>
                      {repo.private && (
                        <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                          Private
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-sm text-gray-400 line-clamp-2">{repo.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                      <span>{repo.open_issues_count} open issues</span>
                      {repo.updated_at && (
                        <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pull Request List */}
        {view === 'prs' && selectedRepo && (
          <div className="animate-fade-in">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Pull Requests</h1>
              <div className="flex gap-2">
                {(['open', 'closed', 'all'] as const).map((state) => (
                  <button
                    key={state}
                    onClick={() => {
                      setPRFilter(state)
                      loadPRs(selectedRepo)
                    }}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      prFilter === state
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {state.charAt(0).toUpperCase() + state.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
              </div>
            ) : prs.length === 0 ? (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
                <p className="text-gray-400">No {prFilter} pull requests found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {prs.map((pr) => (
                  <button
                    key={pr.number}
                    onClick={() => analyzePR(pr)}
                    className="card-hover w-full rounded-xl border border-gray-800 bg-gray-900 p-4 text-left"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={pr.user.avatar_url}
                        alt={pr.user.login}
                        className="h-10 w-10 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-500">#{pr.number}</span>
                          <h3 className="font-semibold text-white truncate">{pr.title}</h3>
                          {pr.draft && (
                            <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
                              Draft
                            </span>
                          )}
                          {pr.merged && (
                            <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
                              Merged
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-400">
                          {pr.user.login} wants to merge {pr.head.ref} into {pr.base.ref}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {pr.updated_at && `Updated ${new Date(pr.updated_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="text-violet-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analysis View */}
        {view === 'analysis' && selectedPR && (
          <div className="animate-fade-in">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent mb-4" />
                <p className="text-gray-400">Analyzing PR #{selectedPR.number}...</p>
              </div>
            ) : analysis ? (
              <>
                {/* PR Info Header */}
                <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">{selectedPR.title}</h2>
                      <p className="text-sm text-gray-400">
                        #{selectedPR.number} · {selectedRepo?.full_name}
                      </p>
                    </div>
                    <a
                      href={selectedPR.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      View on GitHub ↗
                    </a>
                  </div>
                </div>

                {/* Analysis Results */}
                <div className="mb-8 grid gap-6 lg:grid-cols-2">
                  <div className="space-y-6">
                    <ConfidenceGauge score={analysis.merge_confidence_score} />

                    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                      <div className="text-center">
                        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
                          Intent Match
                        </p>
                        <span
                          className={`inline-flex rounded-full px-6 py-2 text-lg font-bold ${
                            analysis.intent_match === 'HIGH'
                              ? 'bg-green-500/20 text-green-400'
                              : analysis.intent_match === 'MEDIUM'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {analysis.intent_match}
                        </span>
                      </div>
                    </div>

                    <DriftBanner driftDetected={analysis.drift_detected} />
                  </div>

                  <div className="space-y-4">
                    <ResultCard icon="💬" title="What the PR claims" content={analysis.claimed_intent} />
                    <ResultCard
                      icon="🔍"
                      title="What the code actually does"
                      content={analysis.actual_changes}
                    />
                    {analysis.drift_detected && analysis.drift_reason && (
                      <ResultCard
                        icon="⚠️"
                        title="Why drift was detected"
                        content={analysis.drift_reason}
                        variant="danger"
                      />
                    )}
                  </div>
                </div>

                {/* Risk flags, suspicious files, summary */}
                <div className="space-y-6 mb-8">
                  {analysis.risk_flags.length > 0 && <RiskFlags flags={analysis.risk_flags} />}

                  {analysis.suspicious_files.length > 0 && (
                    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                      <h3 className="mb-4 text-lg font-semibold text-white">Suspicious Files</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.suspicious_files.map((file, index) => (
                          <span
                            key={index}
                            className="rounded-lg bg-gray-800 px-3 py-1.5 font-mono text-sm text-gray-300"
                          >
                            {file}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border-l-4 border-l-violet-600 border-t border-r border-b border-gray-800 bg-gray-900 p-6">
                    <h3 className="mb-3 text-lg font-semibold text-white">PRISM Assessment</h3>
                    <p className="leading-relaxed text-gray-300">{analysis.summary}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 border-t border-gray-800 pt-6">
                  <button
                    onClick={generateComment}
                    disabled={isGeneratingComment}
                    className="flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {isGeneratingComment ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <span>💬</span>
                        Generate AI Comment
                      </>
                    )}
                  </button>

                  {!selectedPR.merged && (
                    <button
                      onClick={() => setShowMergeModal(true)}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-500"
                    >
                      <span>🔀</span>
                      Merge PR
                    </button>
                  )}

                  <a
                    href={selectedPR.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-gray-800 px-6 py-3 font-semibold text-white hover:bg-gray-700"
                  >
                    <span>↗</span>
                    View on GitHub
                  </a>
                </div>
              </>
            ) : null}
          </div>
        )}
      </main>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-700 bg-gray-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Post Comment to PR</h3>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={12}
              className="mb-4 w-full rounded-lg border border-gray-700 bg-gray-800 p-4 text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none font-mono text-sm"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCommentModal(false)}
                className="rounded-lg bg-gray-800 px-4 py-2 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={submitComment}
                disabled={isCommenting || !commentText.trim()}
                className="rounded-lg bg-violet-600 px-4 py-2 text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {isCommenting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Merge Pull Request</h3>
            <p className="mb-4 text-gray-400">
              Are you sure you want to merge PR #{selectedPR?.number}?
            </p>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-300">Merge Method</label>
              <div className="flex gap-2">
                {(['merge', 'squash', 'rebase'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setMergeMethod(method)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      mergeMethod === method
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowMergeModal(false)}
                className="rounded-lg bg-gray-800 px-4 py-2 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={mergePR}
                disabled={isMerging}
                className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-500 disabled:opacity-50"
              >
                {isMerging ? 'Merging...' : 'Confirm Merge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
