'use client'

import { useAuth } from '@/lib/auth'
import Link from 'next/link'

export default function Header() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth()

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <svg
            className="h-7 w-7"
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
          <span className="text-xl font-semibold text-gray-900">PRISM</span>
        </Link>

        <nav className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          ) : isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
              >
                Dashboard
              </Link>
              <div className="flex items-center gap-3">
                <img
                  src={user?.avatar_url}
                  alt={user?.login}
                  className="h-8 w-8 rounded-full border border-gray-200"
                />
                <span className="text-sm text-gray-700">{user?.login}</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-900 transition"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Login with GitHub
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
