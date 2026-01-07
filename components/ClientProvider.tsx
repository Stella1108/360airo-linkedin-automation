'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  email?: string
  name?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  generateToken: () => Promise<string>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      // For demo, create a mock user
      const mockUser = {
        id: `user_${Math.random().toString(36).substr(2, 9)}`,
        email: 'demo@360airo.com',
        name: 'Demo User'
      }
      setUser(mockUser)
      setLoading(false)
    }

    checkSession()
  }, [])

  const signIn = async (email: string, password: string) => {
    // Mock sign in for demo
    const mockUser = {
      id: `user_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name: email.split('@')[0]
    }
    setUser(mockUser)
    return { user: mockUser, error: null }
  }

  const signUp = async (email: string, password: string) => {
    // Mock sign up for demo
    const mockUser = {
      id: `user_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name: email.split('@')[0]
    }
    setUser(mockUser)
    return { user: mockUser, error: null }
  }

  const signOut = async () => {
    setUser(null)
    // Clear any stored data
    localStorage.removeItem('360airo_user')
  }

  const generateToken = async (): Promise<string> => {
    if (!user) throw new Error('No user logged in')
    
    const token = `ext_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Save to Supabase
    await supabase
      .from('extension_tokens')
      .insert({
        user_id: user.id,
        token: token,
        name: 'Chrome Extension Token',
        is_active: true,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
    
    return token
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, generateToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a ClientProvider')
  }
  return context
}