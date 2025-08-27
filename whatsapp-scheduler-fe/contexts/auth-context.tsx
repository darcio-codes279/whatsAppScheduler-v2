'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { authHelpers, dbHelpers } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface UserProfile {
  id: string
  email: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  createdAt?: string
  updatedAt?: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, userData?: { firstName?: string; lastName?: string }) => Promise<{ success: boolean; error?: string }>
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { user: currentUser } = await authHelpers.getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        await loadUserProfile(currentUser.id)
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = authHelpers.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await loadUserProfile(session.user.id)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await dbHelpers.getUserProfile(userId)
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading profile:', error)
        return
      }

      if (data) {
        setProfile(data)
      } else {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await dbHelpers.createUserProfile(userId, {
          email: user?.email,
          firstName: user?.user_metadata?.firstName,
          lastName: user?.user_metadata?.lastName
        })

        if (createError) {
          console.error('Error creating profile:', createError)
        } else {
          setProfile(newProfile)
        }
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error)
    }
  }

  const signUp = async (email: string, password: string, userData?: { firstName?: string; lastName?: string }) => {
    try {
      setLoading(true)
      const { data, error } = await authHelpers.signUp(email, password, userData)

      if (error) {
        toast.error(error.message)
        return { success: false, error: error.message }
      }

      if (data.user && !data.session) {
        toast.success('Check your email for the confirmation link!')
      }

      return { success: true }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during sign up'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await authHelpers.signIn(email, password)

      if (error) {
        toast.error(error.message)
        return { success: false, error: error.message }
      }

      toast.success('Welcome back!')
      return { success: true }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during sign in'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await authHelpers.signOut()

      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Signed out successfully')
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during sign out')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await authHelpers.resetPassword(email)

      if (error) {
        toast.error(error.message)
        return { success: false, error: error.message }
      }

      toast.success('Password reset email sent!')
      return { success: true }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updatePassword = async (password: string) => {
    try {
      const { data, error } = await authHelpers.updatePassword(password)

      if (error) {
        toast.error(error.message)
        return { success: false, error: error.message }
      }

      toast.success('Password updated successfully!')
      return { success: true }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { success: false, error: 'No user logged in' }
    }

    try {
      const { data, error } = await dbHelpers.updateUserProfile(user.id, updates)

      if (error) {
        toast.error(error.message)
        return { success: false, error: error.message }
      }

      // Update local profile state
      setProfile(prev => prev ? { ...prev, ...updates } : null)
      toast.success('Profile updated successfully!')
      return { success: true }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}