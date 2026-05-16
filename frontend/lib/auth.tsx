'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  login: string
  name: string | null
  avatar_url: string
  email: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('github_token')
    if (storedToken) {
      setToken(storedToken)
      fetchUser(storedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchUser = async (accessToken: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setToken(accessToken)
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('github_token')
        setToken(null)
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      localStorage.removeItem('github_token')
      setToken(null)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`)
      const data = await response.json()

      if (data.auth_url) {
        window.location.href = data.auth_url
      } else {
        throw new Error(data.detail || 'Failed to initiate login')
      }
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('github_token')
    setToken(null)
    setUser(null)
  }

  const handleCallback = (accessToken: string) => {
    localStorage.setItem('github_token', accessToken)
    setToken(accessToken)
    fetchUser(accessToken)
  }

  // Expose handleCallback for the callback page
  useEffect(() => {
    (window as unknown as { handleAuthCallback: (token: string) => void }).handleAuthCallback = handleCallback
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
