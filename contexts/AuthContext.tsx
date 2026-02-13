'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Provider } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: any) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithSocial: (provider: Provider) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  resendEmailVerification: (email: string) => Promise<void>
  generateOTP: (email: string) => Promise<string>
  verifyOTP: (email: string, otp: string) => Promise<boolean>
  resetPasswordWithOTP: (email: string, otp: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    const safeSetUser = (next: User | null) => {
      if (cancelled) return
      setUser(next)
    }

    const safeSetLoading = (next: boolean) => {
      if (cancelled) return
      setLoading(next)
    }

    const isInvalidRefreshTokenMessage = (msg: string) => {
      const m = msg.toLowerCase()
      return (
        m.includes('refresh_token_not_found') ||
        m.includes('invalid_grant') ||
        m.includes('invalid refresh token') ||
        m.includes('refresh token not found')
      )
    }

    const initialize = async () => {
      safeSetLoading(true)
      try {
        const sbKeyPresent = (() => {
          try {
            if (typeof window === 'undefined') return false
            return Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k))
          } catch {
            return false
          }
        })()
        console.log(`Auth init: sb-*-auth-token key ${sbKeyPresent ? 'present' : 'missing'}`)

        const { data, error } = await supabase.auth.getSession()
        if (error) {
          const msg = String((error as any)?.message || '')
          console.warn('Auth init: getSession error:', msg)
          if (isInvalidRefreshTokenMessage(msg)) {
            try {
              await supabase.auth.signOut()
            } catch {
              // ignore
            }
            safeSetUser(null)
          } else {
            safeSetUser(null)
          }
        } else {
          safeSetUser(data.session?.user ?? null)
        }
      } finally {
        safeSetLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        safeSetUser(null)
        safeSetLoading(false)
        return
      }
      safeSetUser(session?.user ?? null)
      safeSetLoading(false)
    })

    initialize()

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      // Check if email already exists in profiles
      const { data: existingUsers, error: emailCheckError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .limit(1)
      
      if (!emailCheckError && existingUsers && existingUsers.length > 0) {
        throw new Error('An account with this email already exists. Please sign in instead.')
      }
      
      // Check if phone number already exists
      if (metadata?.phone_number) {
        const { data: existingPhones, error: phoneCheckError } = await supabase
          .from('profiles')
          .select('phone_number')
          .eq('phone_number', metadata.phone_number)
          .limit(1)
        
        if (!phoneCheckError && existingPhones && existingPhones.length > 0) {
          throw new Error('An account with this phone number already exists. Please use a different number.')
        }
      }
      
      // Get the correct redirect URL for email verification callback
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : ''
      
      // Always extract username from email (part before @)
      let username = metadata?.username
      if (username && username.includes('@')) {
        username = username.split('@')[0]
      } else if (!username) {
        username = email.split('@')[0]
      }
      
      const sanitizedMetadata = {
        ...metadata,
        username: username
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: sanitizedMetadata,
          emailRedirectTo: redirectUrl
        }
      })
      
      if (error) {
        if (error.message.includes('already registered') || 
            error.message.includes('already exists') ||
            error.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please sign in instead.')
        }
        throw error
      }
      
      // If user is created, ensure profile is created/updated
      if (data.user) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, full_name, phone_number, country, state, city, email')
            .eq('id', data.user.id)
            .single()
          
          if (profileError && profileError.code === 'PGRST116') {
            const extractedUsername = email.split('@')[0]
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                username: extractedUsername,
                full_name: metadata?.full_name || '',
                phone_number: metadata?.phone_number || null,
                country: metadata?.country || null,
                state: metadata?.state || null,
                city: metadata?.city || null,
                email: email
              })
            
            if (insertError) {
              console.error('Error creating profile:', insertError)
              await new Promise(resolve => setTimeout(resolve, 1000))
              const extractedUsername = email.split('@')[0]
              const { error: retryError } = await supabase
                .from('profiles')
                .insert({
                  id: data.user.id,
                  username: extractedUsername,
                  full_name: metadata?.full_name || '',
                  phone_number: metadata?.phone_number || null,
                  country: metadata?.country || null,
                  state: metadata?.state || null,
                  city: metadata?.city || null,
                  email: email
                })
              
              if (retryError) {
                console.error('Retry failed:', retryError)
                throw new Error('Account created but profile setup failed. Please contact support.')
              } else {
                console.log('✅ Profile created successfully (retry)')
              }
            } else {
              console.log('✅ Profile created successfully')
            }
            
            await new Promise(resolve => setTimeout(resolve, 500))
            const { data: createdProfile } = await supabase
              .from('profiles')
              .select('username, email')
              .eq('id', data.user.id)
              .single()
            
            if (createdProfile && (createdProfile.username?.includes('@') || createdProfile.username === createdProfile.email)) {
              const extractedUsername = email.split('@')[0]
              await supabase
                .from('profiles')
                .update({ username: extractedUsername })
                .eq('id', data.user.id)
              console.log('✅ Username immediately fixed to:', extractedUsername)
            }
          } else if (!profileError && profile) {
            const extractedUsername = email.split('@')[0]
            const needsUsernameFix = !profile.username || profile.username.includes('@') || profile.username === email
            
            if (needsUsernameFix) {
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  username: extractedUsername,
                  full_name: metadata?.full_name || profile.full_name || '',
                  phone_number: metadata?.phone_number || profile.phone_number || null,
                  country: metadata?.country || profile.country || null,
                  state: metadata?.state || profile.state || null,
                  city: metadata?.city || profile.city || null,
                  email: email
                })
                .eq('id', data.user.id)
              
              if (updateError) {
                console.error('Error updating profile:', updateError)
              } else {
                console.log('✅ Profile username fixed to:', extractedUsername)
              }
            } else {
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  full_name: metadata?.full_name || profile.full_name || '',
                  phone_number: metadata?.phone_number || profile.phone_number || null,
                  country: metadata?.country || profile.country || null,
                  state: metadata?.state || profile.state || null,
                  city: metadata?.city || profile.city || null,
                  email: email
                })
                .eq('id', data.user.id)
              
              if (updateError) {
                console.error('Error updating profile:', updateError)
              } else {
                console.log('✅ Profile updated successfully')
              }
            }
          } else if (profileError) {
            console.error('Error checking profile:', profileError)
          }
        } catch (profileErr: any) {
          console.error('Profile creation check error:', profileErr)
        }
      }
      
      toast.success('Account created successfully! Please check your email to confirm your account.')
    } catch (error: any) {
      const errorMessage = error.message || 'Error during sign up'
      toast.error(errorMessage)
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      toast.success('Signed in successfully')
    } catch (error: any) {
      toast.error(error.message || 'Error signing in')
      throw error
    }
  }

  const signInWithSocial = async (provider: Provider) => {
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : ''
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      if (error) throw error
    } catch (error: any) {
      toast.error(error.message || 'Error signing in')
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      toast.success('Signed out successfully')
    } catch (error: any) {
      toast.error(error.message || 'Error signing out')
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : ''
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })
      if (error) throw error
    } catch (error: any) {
      toast.error(error.message || 'Error sending password reset email')
      throw error
    }
  }

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })
      if (error) throw error
    } catch (error: any) {
      toast.error(error.message || 'Error updating password')
      throw error
    }
  }

  const resendEmailVerification = async (email: string) => {
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : ''
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      })
      if (error) throw error
      toast.success('Verification email sent! Please check your inbox.')
    } catch (error: any) {
      toast.error(error.message || 'Error sending verification email')
      throw error
    }
  }

  const generateOTP = async (email: string): Promise<string> => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single()

      if (profileError || !profile) {
        return ''
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + 10)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          otp_code: otp,
          otp_expires_at: expiresAt.toISOString()
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      try {
        try {
          console.log('Invoking custom-email function for OTP...')
          const { data, error: emailError } = await supabase.functions.invoke('custom-email', {
            body: {
              type: 'password_reset_otp',
              email: email,
              otp: otp
            }
          })

          if (!emailError && data && !('error' in data)) {
            console.log('OTP email sent successfully via Edge Function')
            return ''
          }
        } catch (edgeErr: any) {
          console.warn('Edge Function not available, trying alternative method:', edgeErr.message)
        }

        console.log('Using fallback email method')
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔐 OTP for', email, ':', otp)
          console.warn('⚠️ Email not sent. Configure email service or deploy Edge Function.')
          console.log('%c🔐 OTP CODE', 'color: #4f46e5; font-size: 16px; font-weight: bold;')
          console.log(`%cEmail: ${email}%c\nOTP: ${otp}`, 'color: #1f2937; font-size: 14px;', 'color: #4f46e5; font-size: 20px; font-weight: bold;')
          toast.success(`OTP generated: ${otp} (Check console - Email service not configured)`)
        } else {
          toast.success('OTP sent to your email. Please check your inbox.')
        }
        
      } catch (emailErr: any) {
        console.error('Error sending OTP email:', emailErr)
        if (process.env.NODE_ENV === 'development') {
          console.log('%c🔐 OTP CODE (Email failed)', 'color: #ef4444; font-size: 16px; font-weight: bold;')
          console.log(`%cEmail: ${email}%c\nOTP: ${otp}`, 'color: #1f2937; font-size: 14px;', 'color: #4f46e5; font-size: 20px; font-weight: bold;')
          toast.success(`OTP: ${otp} (Email failed - check console)`)
        } else {
          throw new Error('Failed to send OTP email. Please try again or contact support.')
        }
      }

      return ''
    } catch (error: any) {
      console.error('Error generating OTP:', error)
      throw error
    }
  }

  const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, otp_code, otp_expires_at')
        .eq('email', email)
        .single()

      if (profileError || !profile) {
        throw new Error('Invalid email or OTP')
      }

      if (!profile.otp_code) {
        throw new Error('No OTP found. Please request a new one.')
      }

      if (!profile.otp_expires_at || new Date(profile.otp_expires_at) < new Date()) {
        throw new Error('OTP has expired. Please request a new one.')
      }

      if (profile.otp_code !== otp) {
        throw new Error('Invalid OTP. Please check and try again.')
      }

      return true
    } catch (error: any) {
      console.error('Error verifying OTP:', error)
      throw error
    }
  }

  const resetPasswordWithOTP = async (email: string, otp: string, newPassword: string): Promise<void> => {
    try {
      const { data: userId, error: verifyError } = await supabase.rpc('verify_and_clear_otp', {
        user_email: email,
        provided_otp: otp
      })

      if (verifyError || !userId) {
        throw new Error(verifyError?.message || 'Invalid or expired OTP')
      }

      const { error: updateError } = await supabase.functions.invoke('reset-password', {
        body: {
          userId: userId,
          newPassword: newPassword
        }
      })

      if (updateError) {
        throw new Error('Failed to update password. Please try again.')
      }

      toast.success('Password reset successfully!')
    } catch (error: any) {
      console.error('Error resetting password:', error)
      toast.error(error.message || 'Error resetting password')
      throw error
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInWithSocial,
    signOut,
    resetPassword,
    updatePassword,
    resendEmailVerification,
    generateOTP,
    verifyOTP,
    resetPasswordWithOTP,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

