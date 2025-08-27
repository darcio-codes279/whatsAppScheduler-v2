"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { apiService, type WhatsAppStatus, type WhatsAppGroup } from "@/lib/api"

interface WhatsAppContextType {
  isConnected: boolean
  isReady: boolean
  clientInfo?: {
    pushname: string
    wid: {
      user: string
      server: string
    }
  }
  groups: WhatsAppGroup[]
  showQRModal: boolean
  isLoading: boolean
  error: string | null
  setShowQRModal: (show: boolean) => void
  refreshStatus: () => Promise<void>
  refreshGroups: () => Promise<void>
  reconnect: () => Promise<void>
}

const WhatsAppContext = createContext<WhatsAppContextType | undefined>(undefined)

export function WhatsAppProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [clientInfo, setClientInfo] = useState<WhatsAppContextType['clientInfo']>()
  const [groups, setGroups] = useState<WhatsAppGroup[]>([])
  const [showQRModal, setShowQRModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check connection status on mount
  useEffect(() => {
    refreshStatus()

    // Set up polling for status updates
    const interval = setInterval(refreshStatus, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const refreshStatus = async () => {
    try {
      setError(null)
      const response = await apiService.getWhatsAppStatus()

      if (response.success && response.data) {
        setIsConnected(response.data.isConnected)
        setIsReady(response.data.isReady)
        setClientInfo(response.data.clientInfo)

        // Show QR modal if not connected
        if (!response.data.isConnected && !showQRModal) {
          setShowQRModal(true)
        }

        // Load groups if connected and ready
        if (response.data.isConnected && response.data.isReady) {
          console.log('🔗 WhatsApp is connected and ready, fetching groups...')
          refreshGroups()
        } else {
          console.log('⚠️ WhatsApp not ready for groups:', { connected: response.data.isConnected, ready: response.data.isReady })
        }
      } else {
        setError(response.error || 'Failed to get WhatsApp status')
        setIsConnected(false)
        setIsReady(false)
      }
    } catch (err) {
      setError('Failed to connect to backend')
      setIsConnected(false)
      setIsReady(false)
    }
  }



  const refreshGroups = async () => {
    try {
      const response = await apiService.getGroups()

      if (response.success && response.data) {
        // Handle both direct array and nested object responses
        const groupsData = Array.isArray(response.data) ? response.data : (response.data as any)?.data || response.data
        setGroups(Array.isArray(groupsData) ? groupsData : [])
        setError(null)
      } else {
        setError(response.error || 'Failed to get groups')
      }
    } catch (err) {
      setError('Failed to get groups')
    }
  }

  const reconnect = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await apiService.reconnectWhatsApp()

      if (response.success) {
        // Refresh status after reconnection attempt
        setTimeout(refreshStatus, 2000)
      } else {
        setError(response.error || 'Failed to reconnect')
      }
    } catch (err) {
      setError('Failed to reconnect')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <WhatsAppContext.Provider
      value={{
        isConnected,
        isReady,
        clientInfo,
        groups,
        showQRModal,
        isLoading,
        error,
        setShowQRModal,
        refreshStatus,
        refreshGroups,
        reconnect,
      }}
    >
      {children}
    </WhatsAppContext.Provider>
  )
}

export function useWhatsApp() {
  const context = useContext(WhatsAppContext)
  if (context === undefined) {
    throw new Error("useWhatsApp must be used within a WhatsAppProvider")
  }
  return context
}
