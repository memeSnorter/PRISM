'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { api, AnalysisResult } from '@/lib/api'
import Header from '@/components/Header'
import PRISMInput from '@/components/PRISMInput'
import LoadingState from '@/components/LoadingState'
import ConfidenceGauge from '@/components/ConfidenceGauge'
import DriftBanner from '@/components/DriftBanner'
import ResultCard from '@/components/ResultCard'
import RiskFlags from '@/components/RiskFlags'

export default function Home() {
  const { isAuthenticated, token, login } = useAuth()

  const [isLoading, setIsLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Comment states
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isGeneratingComment, setIsGeneratingComment] = useState(false)
  const [isCommenting, setIsCommenting] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [mergeMethod, setMergeMethod] = useState<'merge' | 'squash' | 'rebase'>('merge')
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const handleAnalyze = async (prUrl: string) => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    setLoadingPhase(0)

    const phaseInterval = setInterval(() => {
      setLoadingPhase((prev) => (prev < 2 ? prev + 1 : prev))
    }, 2000)

    try {
      const data = await api.analyze(prUrl, token)
      setResult(data)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      clearInterval(phaseInterval)
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    setActionSuccess(null)
  }

  const generateComment = async () => {
    if (!token || !result || !result.owner || !result.repo || !result.pr_number) {
      setError('Please login with GitHub to use this feature')
      return
    }
    setIsGeneratingComment(true)
    try {
      const data = await api.generateComment(
        result.owner,
        result.repo,
        result.pr_number,
        result.summary,
        result.risk_flags,
        null,
        token
      )
      setCommentText(data.comment)
      setShowCommentModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate comment')
    } finally {
      setIsGeneratingComment(false)
    }
  }

  const submitComment = async () => {
    if (!token || !result || !result.owner || !result.repo || !result.pr_number) return
    setIsCommenting(true)
    try {
      await api.addComment(result.owner, result.repo, result.pr_number, commentText, token)
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
    if (!token || !result || !result.owner || !result.repo || !result.pr_number) return
    setIsMerging(true)
    try {
      await api.mergePR(result.owner, result.repo, result.pr_number, mergeMethod, token)
      setShowMergeModal(false)
      setActionSuccess('Pull request merged successfully!')
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge PR')
    } finally {
      setIsMerging(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="px-4 py-8 md:py-12">
        <div className="mx-auto max-w-6xl">
          {/* Header - only show when no results */}
          {!result && !isLoading && (
            <header className="mb-12 text-center animate-fade-in">
              <div className="mb-6 flex items-center justify-center">
                <svg
                  className="h-14 w-14 md:h-16 md:w-16"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polygon points="50,15 85,75 15,75" fill="#1a1a1a" />
                  <line x1="50" y1="15" x2="50" y2="55" stroke="#ffffff" strokeWidth="2" />
                  <line x1="50" y1="55" x2="30" y2="75" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
                  <line x1="50" y1="55" x2="50" y2="75" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
                  <line x1="50" y1="55" x2="70" y2="75" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
                </svg>
              </div>

              <h1 className="mb-3 text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
                PRISM
              </h1>
              <p className="mb-2 text-sm font-medium text-gray-500">
                Pull Request Intelligence & Security Machine
              </p>

              <p className="mx-auto max-w-md text-base text-gray-600">
                Understand what your code change <span className="font-medium text-gray-900">really</span>{' '}
                affects.
              </p>

              {/* Login prompt for unauthenticated users */}
              {!isAuthenticated && (
                <div className="mt-6">
                  <button
                    onClick={login}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    Login with GitHub for full features
                  </button>
                  <p className="mt-2 text-xs text-gray-500">
                    Access private repos, post comments, and merge PRs directly
                  </p>
                </div>
              )}
            </header>
          )}

          {/* Success message */}
          {actionSuccess && (
            <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-700 text-center">
              ✓ {actionSuccess}
            </div>
          )}

          {/* Input */}
          {!isLoading && !result && !error && (
            <div className="animate-fade-in">
              <PRISMInput onAnalyze={handleAnalyze} />
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="animate-fade-in">
              <LoadingState phase={loadingPhase} />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mx-auto max-w-2xl animate-fade-in">
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                <div className="mb-4 text-4xl">⚠️</div>
                <h3 className="mb-2 text-lg font-medium text-red-700">Analysis Failed</h3>
                <p className="mb-6 text-gray-600">{error}</p>
                <button
                  onClick={handleReset}
                  className="rounded-lg bg-gray-900 px-6 py-2 font-medium text-white transition hover:bg-gray-800"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="animate-slide-up">
              {/* Two Column Layout */}
              <div className="mb-8 grid gap-6 lg:grid-cols-2">
                {/* Left Column - Metrics */}
                <div className="space-y-6">
                  <ConfidenceGauge score={result.merge_confidence_score} />

                  <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="text-center">
                      <p className="mb-3 text-sm font-medium text-gray-500">
                        Intent Match
                      </p>
                      <span
                        className={`inline-flex rounded-md px-5 py-2 text-base font-semibold ${
                          result.intent_match === 'HIGH'
                            ? 'bg-emerald-100 text-emerald-700'
                            : result.intent_match === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {result.intent_match}
                      </span>
                    </div>
                  </div>

                  <DriftBanner driftDetected={result.drift_detected} />
                </div>

                {/* Right Column - Details */}
                <div className="space-y-4">
                  <ResultCard icon="💬" title="What the PR claims" content={result.claimed_intent} />
                  <ResultCard
                    icon="🔍"
                    title="What the code actually does"
                    content={result.actual_changes}
                  />
                  {result.drift_detected && result.drift_reason && (
                    <ResultCard
                      icon="⚠️"
                      title="Why drift was detected"
                      content={result.drift_reason}
                      variant="danger"
                    />
                  )}
                </div>
              </div>

              {/* Full Width Section */}
              <div className="space-y-6">
                {result.risk_flags.length > 0 && <RiskFlags flags={result.risk_flags} />}

                {result.suspicious_files.length > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-base font-medium text-gray-900">Suspicious Files</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.suspicious_files.map((file, index) => (
                        <span
                          key={index}
                          className="rounded-md bg-gray-100 px-3 py-1.5 font-mono text-sm text-gray-700"
                        >
                          {file}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border-l-4 border-l-gray-900 border-t border-r border-b border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-3 text-base font-medium text-gray-900">PRISM Assessment</h3>
                  <p className="leading-relaxed text-gray-600">{result.summary}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-3 border-t border-gray-200 pt-6">
                  {isAuthenticated && result.owner && result.repo && result.pr_number && (
                    <>
                      <button
                        onClick={generateComment}
                        disabled={isGeneratingComment}
                        className="flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
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

                      <button
                        onClick={() => setShowMergeModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
                      >
                        <span>🔀</span>
                        Merge PR
                      </button>
                    </>
                  )}

                  {result.pr_url && (
                    <a
                      href={result.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <span>↗</span>
                      View on GitHub
                    </a>
                  )}

                  <button
                    onClick={handleReset}
                    className="btn-primary rounded-lg px-5 py-2.5 text-sm font-medium"
                  >
                    Analyze Another PR
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-16 text-center">
            <p className="text-sm text-gray-400">
              Runs 100% locally. Your code never leaves your machine.
            </p>
          </footer>
        </div>
      </main>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Post Comment to PR</h3>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={12}
              className="mb-4 w-full rounded-lg border border-gray-300 bg-white p-4 text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 font-mono text-sm"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCommentModal(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitComment}
                disabled={isCommenting || !commentText.trim()}
                className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isCommenting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Merge Pull Request</h3>
            <p className="mb-4 text-gray-600">
              Are you sure you want to merge this pull request?
            </p>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">Merge Method</label>
              <div className="flex gap-2">
                {(['merge', 'squash', 'rebase'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setMergeMethod(method)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      mergeMethod === method
                        ? 'bg-emerald-600 text-white'
                        : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
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
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={mergePR}
                disabled={isMerging}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
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
