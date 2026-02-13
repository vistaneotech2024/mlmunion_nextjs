'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface SidebarContextType {
  collapsed: boolean
  toggleSidebar: () => void
  setCollapsed: (collapsed: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

const SIDEBAR_STORAGE_KEY = 'admin_sidebar_collapsed'

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored)
      if (typeof parsed === 'boolean') setCollapsedState(parsed)
    } catch {
      localStorage.removeItem(SIDEBAR_STORAGE_KEY)
    }
  }, [])

  // Persist to localStorage whenever collapsed state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(collapsed))
    }
  }, [collapsed])

  const toggleSidebar = () => {
    setCollapsedState((prev) => !prev)
  }

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value)
  }

  return (
    <SidebarContext.Provider value={{ collapsed, toggleSidebar, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

