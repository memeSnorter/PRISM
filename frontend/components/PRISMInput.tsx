'use client'

import { useState } from 'react'

interface PRISMInputProps {
  onAnalyze: (prUrl: string) => void
}

export default function PRISMInput({ onAnalyze }: PRISMInputProps) {
  const [prUrl, setPrUrl] = useState('')
  const [isValid, setIsValid] = useState(true)

  const validateUrl = (url: string): boolean => {
    const pattern = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/i
    return pattern.test(url)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!prUrl.trim()) {
      setIsValid(false)
      return
    }

    if (!validateUrl(prUrl)) {
      setIsValid(false)
      return
    }

    setIsValid(true)
    onAnalyze(prUrl)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrUrl(e.target.value)
    if (!isValid) {
      setIsValid(true)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={prUrl}
            onChange={handleChange}
            placeholder="Paste a GitHub PR URL..."
            className={`w-full rounded-lg border bg-white px-5 py-4 text-base text-gray-900 placeholder-gray-400 outline-none transition-all ${
              isValid
                ? 'border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10'
                : 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
            }`}
          />
          {!isValid && (
            <p className="mt-2 text-sm text-red-500">
              Please enter a valid GitHub PR URL (e.g., https://github.com/owner/repo/pull/123)
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary w-full rounded-lg py-4 text-base font-medium"
        >
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            Analyze PR
          </span>
        </button>
      </form>

      {/* Example URLs */}
      <div className="mt-8 text-center">
        <p className="mb-3 text-sm text-gray-500">Try with a public PR:</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setPrUrl('https://github.com/facebook/react/pull/27592')}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-200"
          >
            facebook/react
          </button>
          <button
            type="button"
            onClick={() => setPrUrl('https://github.com/vercel/next.js/pull/52001')}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-200"
          >
            vercel/next.js
          </button>
          <button
            type="button"
            onClick={() => setPrUrl('https://github.com/microsoft/vscode/pull/195000')}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-200"
          >
            microsoft/vscode
          </button>
        </div>
      </div>
    </div>
  )
}
