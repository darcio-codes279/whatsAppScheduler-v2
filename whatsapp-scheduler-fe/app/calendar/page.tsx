"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Calendar } from "@/components/calendar"
import { MessageSchedulePanel } from "@/components/message-schedule-panel"
import { useWhatsApp } from "@/contexts/whatsapp-context"
import { WhatsAppQRModal } from "@/components/whatsapp-qr-modal"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"
import { ScheduledMessage } from "@/contexts/messages-context"

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null)
  const { isConnected, showQRModal, setShowQRModal } = useWhatsApp()

  const handleDateClick = (date: Date) => {
    if (!isConnected) {
      setShowQRModal(true)
      return
    }
    setSelectedDate(date)
    setIsPanelOpen(true)
  }

  const handleClosePanel = () => {
    setIsPanelOpen(false)
    setSelectedDate(null)
    setEditingMessage(null)
  }

  const handleMessageEdit = (message: ScheduledMessage) => {
    setEditingMessage(message)
    setSelectedDate(null)
    setIsPanelOpen(true)
  }

  const handleConnectionComplete = () => {
    setShowQRModal(false)
  }

  return (
    <div className="flex h-screen bg-background">
      <Navigation />

      <main className="flex-1 overflow-hidden relative">
        <div className="p-6 h-full">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Calendar</h1>
            <p className="text-muted-foreground">Schedule and manage your WhatsApp messages</p>
          </div>

          {/* Connection Required Message */}
          {!isConnected ? (
            <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  WhatsApp Connection Required
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300 mb-4">
                  You need to connect your WhatsApp account before you can schedule messages.
                </p>
                <Button onClick={() => setShowQRModal(true)} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                  Connect WhatsApp
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Calendar Component */
            <Calendar onDateClick={handleDateClick} onMessageEdit={handleMessageEdit} />
          )}
        </div>

        {/* Slide-out Panel */}
        {isConnected && (
          <MessageSchedulePanel
            isOpen={isPanelOpen}
            onClose={handleClosePanel}
            selectedDate={selectedDate}
            editingMessage={editingMessage}
            initialMessageType="scheduled"
          />
        )}

        {/* WhatsApp QR Modal */}
        <WhatsAppQRModal isOpen={showQRModal} onConnectionComplete={handleConnectionComplete} />
      </main>
    </div>
  )
}
