"use client"

import type React from "react"
import { useMessages } from "@/contexts/messages-context"
import { useWhatsApp } from "@/contexts/whatsapp-context"
import { useState, useEffect } from "react"
import { X, Bold, Italic, Strikethrough, Smile, ImageIcon, Send, Clock, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { apiService } from "@/lib/api"
import toast from "react-hot-toast"

interface MessageSchedulePanelProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
}

export function MessageSchedulePanel({ isOpen, onClose, selectedDate }: MessageSchedulePanelProps) {
  const [messageName, setMessageName] = useState("")
  const [messageBody, setMessageBody] = useState("")
  const [selectedGroup, setSelectedGroup] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [isScheduling, setIsScheduling] = useState(false)
  const [messageType, setMessageType] = useState<'instant' | 'scheduled'>('instant')
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date | null>(selectedDate)

  // Update internal date when selectedDate prop changes
  useEffect(() => {
    setInternalSelectedDate(selectedDate)
  }, [selectedDate])

  const { addMessage } = useMessages()
  const { groups, isConnected, isReady } = useWhatsApp()

  const formatDate = (date: Date | null) => {
    if (!date) return ""
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadedImages((prev) => [...prev, ...files])
  }

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    // Validation based on message type
    if (!selectedGroup || !messageName || !messageBody || isScheduling) {
      return
    }

    // For scheduled messages, require date and time
    if (messageType === 'scheduled' && (!internalSelectedDate || !selectedTime)) {
      return
    }

    setIsScheduling(true)

    try {
      const selectedGroupData = groups.find((g) => g.id === selectedGroup)

      if (messageType === 'instant') {
        // Send instant message via API
        const result = await apiService.sendMessage({
          groupName: selectedGroupData?.name || "Unknown Group",
          message: messageBody,
          images: uploadedImages,
        })

        if (!result.success) {
          console.error('Failed to send instant message:', result.error)
          throw new Error(result.error || 'Failed to send message')
        }

        console.log('Instant message sent successfully:', result.data)
        toast.success(`Message sent instantly to ${selectedGroupData?.name}!`)
      } else {
        // Schedule the message
        const success = await addMessage({
          date: internalSelectedDate!.toISOString().split("T")[0], // YYYY-MM-DD format
          time: selectedTime,
          groupId: selectedGroup,
          groupName: selectedGroupData?.name || "Unknown Group",
          name: messageName,
          body: messageBody,
          images: uploadedImages,
        })

        if (success) {
          toast.success(`Message scheduled for ${selectedGroupData?.name}!`)
        } else {
          toast.error('Failed to schedule message')
          return
        }
      }

      // Reset form and close panel
      setMessageName("")
      setMessageBody("")
      setSelectedGroup("")
      setSelectedTime("")
      setUploadedImages([])
      setMessageType('instant')
      setInternalSelectedDate(null)
      onClose()
    } catch (error) {
      console.error('Failed to process message:', error)
      toast.error(messageType === 'instant' ? 'Failed to send message' : 'Failed to schedule message')
    } finally {
      setIsScheduling(false)
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-50 w-96 bg-card border-l border-border shadow-lg transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">
            {messageType === 'instant' ? 'Send Message' : 'Schedule Message'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-card-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Message Type Toggle */}
          <div className="space-y-2">
            <Label className="text-card-foreground">Message Type</Label>
            <div className="flex space-x-2">
              <Button
                variant={messageType === 'instant' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageType('instant')}
                className="flex-1"
              >
                <Zap className="mr-2 h-4 w-4" />
                Send Now
              </Button>
              <Button
                variant={messageType === 'scheduled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageType('scheduled')}
                className="flex-1"
              >
                <Clock className="mr-2 h-4 w-4" />
                Schedule
              </Button>
            </div>
          </div>

          {/* Date Selection - Only for scheduled messages */}
          {messageType === 'scheduled' && (
            <div className="space-y-2">
              <Label htmlFor="date" className="text-card-foreground">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={internalSelectedDate ? internalSelectedDate.toISOString().split('T')[0] : ''}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value) : null
                  setInternalSelectedDate(newDate)
                }}
                className="bg-input border-border text-card-foreground"
              />
            </div>
          )}

          {/* Time Selection - Only for scheduled messages */}
          {messageType === 'scheduled' && (
            <div className="space-y-2">
              <Label htmlFor="time" className="text-card-foreground">
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="bg-input border-border text-card-foreground"
              />
            </div>
          )}

          {/* WhatsApp Group Selection */}
          <div className="space-y-2">
            <Label className="text-card-foreground">WhatsApp Group</Label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup} disabled={!isConnected || !isReady}>
              <SelectTrigger className="bg-input border-border text-card-foreground">
                <SelectValue placeholder={!isConnected ? "WhatsApp not connected" : !isReady ? "Loading groups..." : "Select a group"} />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(groups) ? groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{group.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{group.participants} members</span>
                    </div>
                  </SelectItem>
                )) : []}
              </SelectContent>
            </Select>
          </div>

          {/* Message Name */}
          <div className="space-y-2">
            <Label htmlFor="message-name" className="text-card-foreground">
              Message Name
            </Label>
            <Input
              id="message-name"
              placeholder="Enter message title..."
              value={messageName}
              onChange={(e) => setMessageName(e.target.value)}
              className="bg-input border-border text-card-foreground"
            />
          </div>

          {/* Rich Text Editor */}
          <div className="space-y-2">
            <Label className="text-card-foreground">Message Body</Label>

            {/* Formatting Toolbar */}
            <div className="flex items-center space-x-1 p-2 border border-border rounded-md bg-muted/50">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent"
                onClick={() => {
                  const textarea = document.getElementById("message-body") as HTMLTextAreaElement
                  const start = textarea.selectionStart
                  const end = textarea.selectionEnd
                  const selectedText = messageBody.substring(start, end)
                  const newText = messageBody.substring(0, start) + `*${selectedText}*` + messageBody.substring(end)
                  setMessageBody(newText)
                }}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent"
                onClick={() => {
                  const textarea = document.getElementById("message-body") as HTMLTextAreaElement
                  const start = textarea.selectionStart
                  const end = textarea.selectionEnd
                  const selectedText = messageBody.substring(start, end)
                  const newText = messageBody.substring(0, start) + `_${selectedText}_` + messageBody.substring(end)
                  setMessageBody(newText)
                }}
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent"
                onClick={() => {
                  const textarea = document.getElementById("message-body") as HTMLTextAreaElement
                  const start = textarea.selectionStart
                  const end = textarea.selectionEnd
                  const selectedText = messageBody.substring(start, end)
                  const newText = messageBody.substring(0, start) + `~${selectedText}~` + messageBody.substring(end)
                  setMessageBody(newText)
                }}
              >
                <Strikethrough className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-accent"
                onClick={() => setMessageBody((prev) => prev + " 😊")}
              >
                <Smile className="h-4 w-4" />
              </Button>
              <div className="flex-1" />
              <label htmlFor="image-upload">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent" asChild>
                  <span>
                    <ImageIcon className="h-4 w-4" />
                  </span>
                </Button>
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            <Textarea
              id="message-body"
              placeholder="Type your message here..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="min-h-32 bg-input border-border text-card-foreground resize-none"
            />
          </div>

          {/* Uploaded Images */}
          {uploadedImages.length > 0 && (
            <div className="space-y-2">
              <Label className="text-card-foreground">Uploaded Images</Label>
              <div className="grid grid-cols-2 gap-2">
                {uploadedImages.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file) || "/placeholder.svg"}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-20 object-cover rounded-md border border-border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button
            onClick={handleSubmit}
            disabled={
              !isConnected ||
              !isReady ||
              !selectedGroup ||
              !messageName ||
              !messageBody ||
              (messageType === 'scheduled' && (!selectedDate || !selectedTime)) ||
              isScheduling
            }
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="mr-2 h-4 w-4" />
            {isScheduling
              ? (messageType === 'instant' ? "Sending..." : "Scheduling...")
              : (messageType === 'instant' ? "Send Message" : "Schedule Message")
            }
          </Button>
        </div>
      </div>
    </div>
  )
}
