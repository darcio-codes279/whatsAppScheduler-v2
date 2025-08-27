"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { apiService, type ScheduledMessage as ApiScheduledMessage, type ScheduleMessageRequest } from "@/lib/api"
import { dateToCron, cronToDateTime } from "@/lib/cron-utils"
import toast from "react-hot-toast"

export interface ScheduledMessage {
  id: string
  date: string // YYYY-MM-DD format
  time: string
  groupId: string
  groupName: string
  name: string
  body: string
  images: string[]
  status: "scheduled" | "sent" | "failed" | "pending"
  createdAt: Date
  sentAt?: Date
  cronTime?: string
  // Message interaction tracking
  deliveredAt?: Date
  readAt?: Date
  ackStatus?: "pending" | "server" | "device" | "read" | "played"
  responseCount?: number
  firstResponseAt?: Date
  responseTimeMs?: number // Time to first response in milliseconds
  interactions?: {
    type: "response" | "reaction" | "mention"
    timestamp: Date
    fromUser: string
  }[]
}

interface MessagesContextType {
  messages: ScheduledMessage[]
  isLoading: boolean
  error: string | null
  addMessage: (message: Omit<ScheduledMessage, "id" | "createdAt" | "status" | "images"> & { images: File[] }) => Promise<boolean>
  updateMessage: (id: string, message: Partial<ScheduledMessage>) => Promise<boolean>
  deleteMessage: (id: string) => Promise<boolean>
  refreshMessages: () => Promise<void>
  getMessagesByDate: (date: string) => ScheduledMessage[]
  getFilteredMessages: (filter: "all" | "scheduled" | "sent" | "failed" | "pending") => ScheduledMessage[]
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined)

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ScheduledMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load messages from backend on mount
  useEffect(() => {
    refreshMessages()

    // Set up polling for message updates
    const interval = setInterval(refreshMessages, 10000) // Poll every 10 seconds

    return () => clearInterval(interval)
  }, [])

  const refreshMessages = async () => {
    try {
      setError(null)
      const response = await apiService.getScheduledMessages()

      if (response.success && response.data?.scheduledMessages) {
        // Convert API messages to frontend format
        const convertedMessages: ScheduledMessage[] = response.data.scheduledMessages.map((apiMsg) => {
          const cronData = cronToDateTime(apiMsg.cron)
          return {
            id: apiMsg.id,
            date: cronData.date ? cronData.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            time: cronData.time,
            groupId: apiMsg.groupName, // Using groupName as groupId for now
            groupName: apiMsg.groupName,
            name: `Message to ${apiMsg.groupName}`, // Generate a name since API doesn't have this
            body: apiMsg.message,
            images: apiMsg.imagePaths || [],
            status: apiMsg.status === 'pending' ? 'scheduled' : apiMsg.status as ScheduledMessage['status'],
            createdAt: new Date(apiMsg.createdAt),
            sentAt: apiMsg.lastAttempt ? new Date(apiMsg.lastAttempt) : undefined,
            cronTime: apiMsg.cron
          }
        })

        setMessages(convertedMessages)
      } else {
        setError(response.error || 'Failed to load messages')
      }
    } catch (err) {
      setError('Failed to connect to backend')
    }
  }

  const addMessage = async (messageData: Omit<ScheduledMessage, "id" | "createdAt" | "status" | "images"> & { images: File[] }): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      // Convert date and time to cron expression
      const date = new Date(messageData.date)
      const cronTime = dateToCron(date, messageData.time)

      // Create request with File[] images
      const request: ScheduleMessageRequest = {
        groupName: messageData.groupName,
        message: messageData.body,
        cronTime,
        images: messageData.images
      }

      const response = await apiService.scheduleMessage(request)

      if (response.success) {
        // Refresh messages to get the updated list
        await refreshMessages()
        return true
      } else {
        setError(response.error || 'Failed to schedule message')
        return false
      }
    } catch (err) {
      setError('Failed to schedule message')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const updateMessage = async (id: string, messageData: Partial<ScheduledMessage>): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      // Find the existing message to get current data
      const existingMessage = messages.find(msg => msg.id === id)
      if (!existingMessage) {
        setError('Message not found')
        return false
      }

      // Merge the updates
      const updatedMessage = { ...existingMessage, ...messageData }

      // Convert date and time to cron expression if they were updated
      let cronTime = existingMessage.cronTime
      if (messageData.date || messageData.time) {
        const date = new Date(messageData.date || existingMessage.date)
        const time = messageData.time || existingMessage.time
        cronTime = dateToCron(date, time)
      }

      const request: ScheduleMessageRequest = {
        groupName: updatedMessage.groupName,
        message: updatedMessage.body,
        cronTime: cronTime!,
        // images will be handled separately
      }

      const response = await apiService.updateScheduledMessage(id, request)

      if (response.success) {
        // Refresh messages to get the updated list
        await refreshMessages()
        toast.success('Message updated successfully!')
        return true
      } else {
        setError(response.error || 'Failed to update message')
        toast.error('Failed to update message')
        return false
      }
    } catch (err) {
      setError('Failed to update message')
      toast.error('Failed to update message')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const deleteMessage = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await apiService.deleteScheduledMessage(id)

      if (response.success) {
        // Remove from local state immediately for better UX
        setMessages(prev => prev.filter(msg => msg.id !== id))
        toast.success('Message deleted successfully!')
        return true
      } else {
        setError(response.error || 'Failed to delete message')
        toast.error('Failed to delete message')
        return false
      }
    } catch (err) {
      setError('Failed to delete message')
      toast.error('Failed to delete message')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const getMessagesByDate = (date: string) => {
    return messages.filter((msg) => msg.date === date)
  }

  const getFilteredMessages = (filter: "all" | "scheduled" | "sent" | "failed" | "pending") => {
    if (filter === "all") return messages
    return messages.filter((msg) => msg.status === filter)
  }

  return (
    <MessagesContext.Provider
      value={{
        messages,
        isLoading,
        error,
        addMessage,
        updateMessage,
        deleteMessage,
        refreshMessages,
        getMessagesByDate,
        getFilteredMessages,
      }}
    >
      {children}
    </MessagesContext.Provider>
  )
}

export function useMessages() {
  const context = useContext(MessagesContext)
  if (context === undefined) {
    throw new Error("useMessages must be used within a MessagesProvider")
  }
  return context
}
