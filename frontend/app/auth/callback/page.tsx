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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mb-4 text-4xl">❌</div>
          <h1 className="mb-2 text-xl font-semibold text-gray-900">Authentication Failed</h1>
          <p className="mb-6 text-gray-500">{error}</p>
          <a
            href="/"
            className="inline-block rounded-lg bg-gray-900 px-6 py-2 font-medium text-white hover:bg-gray-800"
          >
            Go Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-900 border-t-transparent mx-auto"></div>
        <p className="text-gray-500">Completing authentication...</p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="text-center">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-900 border-t-transparent mx-auto"></div>
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
