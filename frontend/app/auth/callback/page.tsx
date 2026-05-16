'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError(errorParam)
      return
    }

    if (token) {
      // Store the token
      localStorage.setItem('github_token', token)

      // Trigger auth context update
      const handleCallback = (window as unknown as { handleAuthCallback?: (token: string) => void })
        .handleAuthCallback
      if (handleCallback) {
        handleCallback(token)
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } else {
      setError('No token received')
    }
  }, [searchParams, router])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="mb-4 text-4xl">❌</div>
          <h1 className="mb-2 text-xl font-bold text-white">Authentication Failed</h1>
          <p className="mb-6 text-gray-400">{error}</p>
          <a
            href="/"
            className="inline-block rounded-lg bg-violet-600 px-6 py-2 font-medium text-white hover:bg-violet-500"
          >
            Go Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent mx-auto"></div>
        <p className="text-gray-400">Completing authentication...</p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent mx-auto"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
