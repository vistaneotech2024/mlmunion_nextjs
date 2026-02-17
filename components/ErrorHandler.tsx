'use client'

import { useEffect } from 'react'

/**
 * Global error handler to catch and suppress MetaMask connection errors
 * and other unhandled runtime errors
 */
export function ErrorHandler() {
  useEffect(() => {
    // Prevent MetaMask from auto-connecting by wrapping ethereum object
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const originalEthereum = (window as any).ethereum
      
      // Wrap the request method to catch connection errors
      if (originalEthereum.request) {
        const originalRequest = originalEthereum.request.bind(originalEthereum)
        originalEthereum.request = async (args: any) => {
          try {
            return await originalRequest(args)
          } catch (error: any) {
            // Suppress MetaMask connection errors
            if (
              error?.message?.includes('Failed to connect to MetaMask') ||
              error?.message?.includes('MetaMask') ||
              error?.code === 4001 || // User rejected request
              error?.code === -32002 // Request already pending
            ) {
              console.warn('MetaMask connection error suppressed:', error?.message)
              throw error // Re-throw but it will be caught by our error handlers
            }
            throw error
          }
        }
      }
    }

    // Handle unhandled promise rejections (like MetaMask connection failures)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || String(event.reason || '')
      const errorStack = String(event.reason?.stack || '')
      
      // Suppress MetaMask connection errors
      if (
        errorMessage.includes('Failed to connect to MetaMask') ||
        errorMessage.includes('MetaMask') ||
        errorMessage.includes('ethereum') ||
        errorStack.includes('nkbihfbeogaeaoehlefnkodbefgpgknn') ||
        errorStack.includes('inpage.js') ||
        event.reason?.code === 4001 || // User rejected request
        event.reason?.code === -32002 // Request already pending
      ) {
        event.preventDefault()
        // Prevent Next.js dev overlay listeners from firing
        ;(event as any).stopImmediatePropagation?.()
        ;(event as any).stopPropagation?.()
        console.warn('MetaMask connection error suppressed:', errorMessage)
        return
      }
      
      // Log other unhandled rejections but don't prevent default
      console.error('Unhandled promise rejection:', event.reason)
    }

    // Handle general runtime errors
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || ''
      const errorSource = event.filename || ''
      
      // Suppress MetaMask-related errors from extension scripts
      if (
        errorMessage.includes('Failed to connect to MetaMask') ||
        errorMessage.includes('MetaMask') ||
        errorSource.includes('nkbihfbeogaeaoehlefnkodbefgpgknn') || // MetaMask extension ID
        errorSource.includes('inpage.js')
      ) {
        event.preventDefault()
        // Prevent Next.js dev overlay listeners from firing
        ;(event as any).stopImmediatePropagation?.()
        ;(event as any).stopPropagation?.()
        console.warn('MetaMask error suppressed:', errorMessage)
        return
      }
    }

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true)
    window.addEventListener('error', handleError, true)

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true)
      window.removeEventListener('error', handleError, true)
    }
  }, [])

  return null
}
