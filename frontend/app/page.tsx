'use client'

import { useState } from 'react'
import PRISMInput from '@/components/PRISMInput'
import LoadingState from '@/components/LoadingState'
import ConfidenceGauge from '@/components/ConfidenceGauge'
import DriftBanner from '@/components/DriftBanner'
import ResultCard from '@/components/ResultCard'
import RiskFlags from '@/components/RiskFlags'

interface AnalysisResult {
  merge_confidence_score: number
  intent_match: 'HIGH' | 'MEDIUM' | 'LOW'
  claimed_intent: string
  actual_changes: string
  drift_detected: boolean
  drift_reason: string | null
  suspicious_files: string[]
  risk_flags: string[]
  summary: string
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async (prUrl: string) => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    setLoadingPhase(0)

    // Simulate loading phases
    const phaseInterval = setInterval(() => {
      setLoadingPhase((prev) => (prev < 2 ? prev + 1 : prev))
    }, 2000)

    try {
      const response = await fetch('http://localhost:8000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pr_url: prUrl }),
      })

      clearInterval(phaseInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Analysis failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      clearInterval(phaseInterval)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
  }

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-12 text-center">
          {/* Logo */}
          <div className="mb-6 flex items-center justify-center">
            <div className="relative">
              <svg
                className="h-16 w-16 md:h-20 md:w-20"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="prismGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="50%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#5b21b6" />
                  </linearGradient>
                  <linearGradient id="prismGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c4b5fd" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                {/* Outer glow */}
                <polygon
                  points="50,5 95,85 5,85"
                  fill="none"
                  stroke="url(#prismGlow)"
                  strokeWidth="2"
                  opacity="0.3"
                  className="pulse-ring"
                />
                {/* Main prism */}
                <polygon
                  points="50,15 85,75 15,75"
                  fill="url(#prismGradient)"
                  opacity="0.9"
                />
                {/* Light refraction lines */}
                <line x1="50" y1="15" x2="50" y2="55" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
                <line x1="50" y1="55" x2="30" y2="75" stroke="#a78bfa" strokeWidth="1.5" opacity="0.8" />
                <line x1="50" y1="55" x2="50" y2="75" stroke="#7c3aed" strokeWidth="1.5" opacity="0.8" />
                <line x1="50" y1="55" x2="70" y2="75" stroke="#5b21b6" strokeWidth="1.5" opacity="0.8" />
                {/* Highlight */}
                <polygon
                  points="50,15 60,35 40,35"
                  fill="#ffffff"
                  opacity="0.2"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">
            <span className="gradient-text">PRISM</span>
          </h1>
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-gray-500">
            Pull Request Intelligence & Security Machine
          </p>

          {/* Tagline */}
          <p className="mx-auto max-w-md text-lg text-gray-400">
            Understand what your code change <span className="font-semibold text-white">REALLY</span> affects.
          </p>
        </header>

        {/* Main Content */}
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
            <div className="rounded-xl border border-red-800 bg-red-950/50 p-6 text-center">
              <div className="mb-4 text-4xl">⚠️</div>
              <h3 className="mb-2 text-lg font-semibold text-red-400">Analysis Failed</h3>
              <p className="mb-6 text-gray-400">{error}</p>
              <button
                onClick={handleReset}
                className="rounded-lg bg-gray-800 px-6 py-2 font-medium text-white transition hover:bg-gray-700"
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
                {/* Confidence Gauge */}
                <ConfidenceGauge score={result.merge_confidence_score} />

                {/* Intent Match Badge */}
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                  <div className="text-center">
                    <p className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
                      Intent Match
                    </p>
                    <span
                      className={`inline-flex rounded-full px-6 py-2 text-lg font-bold ${
                        result.intent_match === 'HIGH'
                          ? 'bg-green-500/20 text-green-400'
                          : result.intent_match === 'MEDIUM'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {result.intent_match}
                    </span>
                  </div>
                </div>

                {/* Drift Banner */}
                <DriftBanner driftDetected={result.drift_detected} />
              </div>

              {/* Right Column - Details */}
              <div className="space-y-4">
                <ResultCard
                  icon="💬"
                  title="What the PR claims"
                  content={result.claimed_intent}
                />
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
              {/* Risk Flags */}
              {result.risk_flags.length > 0 && (
                <RiskFlags flags={result.risk_flags} />
              )}

              {/* Suspicious Files */}
              {result.suspicious_files.length > 0 && (
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-white">Suspicious Files</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.suspicious_files.map((file, index) => (
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

              {/* Summary */}
              <div className="rounded-xl border-l-4 border-l-violet-600 border-t border-r border-b border-gray-800 bg-gray-900 p-6">
                <h3 className="mb-3 text-lg font-semibold text-white">PRISM Assessment</h3>
                <p className="leading-relaxed text-gray-300">{result.summary}</p>
              </div>

              {/* Analyze Another Button */}
              <div className="text-center">
                <button
                  onClick={handleReset}
                  className="gradient-button rounded-xl px-8 py-3 font-semibold text-white"
                >
                  Analyze Another PR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-sm text-gray-600">
            Runs 100% locally. Your code never leaves your machine.
          </p>
        </footer>
      </div>
    </main>
  )
}
