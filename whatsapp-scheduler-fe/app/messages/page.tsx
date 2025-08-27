"use client"

import { Navigation } from "@/components/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useWhatsApp } from "@/contexts/whatsapp-context"
import { useMessages } from "@/contexts/messages-context"
import { WhatsAppQRModal } from "@/components/whatsapp-qr-modal"
import { MessageSchedulePanel } from "@/components/message-schedule-panel"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit,
  Trash2,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Eye
} from "lucide-react"
import { useState, useMemo } from "react"

// Using real messages from context

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <MessagesContent />
    </ProtectedRoute>
  )
}

function MessagesContent() {
  const { isConnected, setShowQRModal, showQRModal } = useWhatsApp()
  const { messages, isLoading, error, deleteMessage } = useMessages()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingMessage, setEditingMessage] = useState<{
    id: string
    date: string
    time: string
    groupId: string
    groupName: string
    name: string
    body: string
    images: string[]
  } | null>(null)
  const [isSchedulePanelOpen, setIsSchedulePanelOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "sent" | "failed" | "pending">("all")
  const [sortBy, setSortBy] = useState<"date" | "name" | "status" | "group">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [showFilters, setShowFilters] = useState(false)

  const handleClosePanel = () => {
    setIsSchedulePanelOpen(false)
    setSelectedDate(null)
    setEditingMessage(null)
  }

  const handleConnectionComplete = () => {
    setShowQRModal(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "scheduled":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    }

    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  // Filter and sort messages
  const filteredAndSortedMessages = useMemo(() => {
    let filtered = messages.filter(message => {
      const matchesSearch =
        message.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.groupName.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || message.status === statusFilter

      return matchesSearch && matchesStatus
    })

    // Sort messages
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "date":
          const dateA = new Date(a.date + " " + a.time)
          const dateB = new Date(b.date + " " + b.time)
          comparison = dateA.getTime() - dateB.getTime()
          break
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
        case "group":
          comparison = a.groupName.localeCompare(b.groupName)
          break
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [messages, searchTerm, statusFilter, sortBy, sortOrder])

  const handleSort = (field: "date" | "name" | "status" | "group") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const getSortIcon = (field: "date" | "name" | "status" | "group") => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const getMessageCount = () => {
    const total = messages.length
    const filtered = filteredAndSortedMessages.length
    if (total === filtered) return `${total} message${total !== 1 ? 's' : ''}`
    return `${filtered} of ${total} message${total !== 1 ? 's' : ''}`
  }

  return (
    <div className="flex h-screen bg-background">
      <Navigation />

      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Messages</h1>
                <p className="text-muted-foreground">
                  Manage your scheduled and sent WhatsApp messages • {getMessageCount()}
                </p>
              </div>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!isConnected}
                onClick={() => {
                  setSelectedDate(new Date())
                  setIsSchedulePanelOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Message
              </Button>
            </div>
          </div>

          {/* Connection Status Banner */}
          {!isConnected && (
            <Card className="mb-6 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">WhatsApp Not Connected</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Connect your WhatsApp account to manage messages
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowQRModal(true)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    Connect Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search and Filter */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search messages by name, content, or group..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
                Filters
                {(statusFilter !== "all" || searchTerm) && (
                  <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                    {[statusFilter !== "all" ? 1 : 0, searchTerm ? 1 : 0].reduce((a, b) => a + b)}
                  </span>
                )}
              </Button>
            </div>

            {/* Filter Controls */}
            {showFilters && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                <div className="flex flex-wrap gap-4">
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="all">All Statuses</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="pending">Pending</option>
                      <option value="sent">Sent</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  {/* Sort Options */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort by</label>
                    <div className="flex gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="date">Date & Time</option>
                        <option value="name">Contact Name</option>
                        <option value="group">Group</option>
                        <option value="status">Status</option>
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                        className="px-3"
                      >
                        {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Clear Filters */}
                {(statusFilter !== "all" || searchTerm) && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStatusFilter("all")
                        setSearchTerm("")
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear all filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Messages List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <Card className="bg-destructive/10 border-destructive/20">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Messages</h3>
                  <p className="text-destructive/80">{error}</p>
                </CardContent>
              </Card>
            ) : messages.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-card-foreground mb-2">No Messages Yet</h3>
                  <p className="text-muted-foreground mb-4">Start by creating your first scheduled message</p>
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={!isConnected}
                    onClick={() => {
                      setSelectedDate(new Date())
                      setIsSchedulePanelOpen(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Message
                  </Button>
                </CardContent>
              </Card>
            ) : filteredAndSortedMessages.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-card-foreground mb-2">No Messages Found</h3>
                  <p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setStatusFilter("all")
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Table Header */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground">
                  <button
                    className="col-span-2 flex items-center gap-1 hover:text-foreground transition-colors text-left"
                    onClick={() => handleSort("name")}
                  >
                    Contact {getSortIcon("name")}
                  </button>
                  <button
                    className="col-span-2 flex items-center gap-1 hover:text-foreground transition-colors text-left"
                    onClick={() => handleSort("group")}
                  >
                    Group {getSortIcon("group")}
                  </button>
                  <div className="col-span-3">Message</div>
                  <button
                    className="col-span-2 flex items-center gap-1 hover:text-foreground transition-colors text-left"
                    onClick={() => handleSort("date")}
                  >
                    Date & Time {getSortIcon("date")}
                  </button>
                  <button
                    className="col-span-1 flex items-center gap-1 hover:text-foreground transition-colors text-left"
                    onClick={() => handleSort("status")}
                  >
                    Status {getSortIcon("status")}
                  </button>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {filteredAndSortedMessages.map((message) => (
                  <Card key={message.id} className="bg-card border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {/* Desktop Layout */}
                      <div className="hidden md:grid md:grid-cols-12 gap-4 items-start">
                        {/* Contact */}
                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-card-foreground truncate">{message.name}</span>
                          </div>
                        </div>

                        {/* Group */}
                        <div className="col-span-2">
                          <span className="text-sm text-muted-foreground truncate">{message.groupName}</span>
                        </div>

                        {/* Message */}
                        <div className="col-span-3">
                          <p className="text-sm text-card-foreground line-clamp-2">{message.body}</p>
                          {message.images && message.images.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {message.images.slice(0, 3).map((image, index) => (
                                <div key={index} className="w-8 h-8 bg-muted rounded border overflow-hidden">
                                  <img
                                    src={image}
                                    alt={`Attachment ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                              {message.images.length > 3 && (
                                <div className="w-8 h-8 bg-muted rounded border flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground">+{message.images.length - 3}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Date & Time */}
                        <div className="col-span-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{message.date}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{message.time}</span>
                            </div>
                            {message.sentAt && (
                              <div className="flex items-center gap-1 text-sm">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span className="text-green-600 text-xs">Sent: {message.sentAt.toLocaleDateString()}</span>
                              </div>
                            )}
                            {message.responseCount && message.responseCount > 0 && (
                              <div className="flex items-center gap-1 text-sm">
                                <MessageSquare className="h-3 w-3 text-blue-500" />
                                <span className="text-blue-600 text-xs">{message.responseCount} responses</span>
                              </div>
                            )}
                            {message.readAt && (
                              <div className="flex items-center gap-1 text-sm">
                                <Eye className="h-3 w-3 text-purple-500" />
                                <span className="text-purple-600 text-xs">Read</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="col-span-1">
                          {getStatusBadge(message.status)}
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 ${message.status === 'scheduled'
                              ? 'text-muted-foreground hover:text-card-foreground cursor-pointer'
                              : 'text-muted-foreground/50 cursor-not-allowed'
                              }`}
                            disabled={message.status !== 'scheduled'}
                            onClick={() => {
                              if (message.status === 'scheduled') {
                                setEditingMessage({
                                  id: message.id,
                                  date: message.date,
                                  time: message.time,
                                  groupId: message.groupId,
                                  groupName: message.groupName,
                                  name: message.name,
                                  body: message.body,
                                  images: message.images
                                })
                                setIsSchedulePanelOpen(true)
                              }
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-red-500 h-8 w-8 p-0"
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this message?')) {
                                await deleteMessage(message.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Mobile Layout */}
                      <div className="md:hidden space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-card-foreground">{message.name}</span>
                              {getStatusBadge(message.status)}
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">→ {message.groupName}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 w-8 p-0 ${message.status === 'scheduled'
                                ? 'text-muted-foreground hover:text-card-foreground cursor-pointer'
                                : 'text-muted-foreground/50 cursor-not-allowed'
                                }`}
                              disabled={message.status !== 'scheduled'}
                              onClick={() => {
                                if (message.status === 'scheduled') {
                                  setEditingMessage({
                                    id: message.id,
                                    date: message.date,
                                    time: message.time,
                                    groupId: message.groupId,
                                    groupName: message.groupName,
                                    name: message.name,
                                    body: message.body,
                                    images: message.images
                                  })
                                  setIsSchedulePanelOpen(true)
                                }
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-red-500 h-8 w-8 p-0"
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this message?')) {
                                  await deleteMessage(message.id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <p className="text-card-foreground text-sm leading-relaxed">{message.body}</p>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{message.date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{message.time}</span>
                          </div>
                          {message.sentAt && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span>Sent</span>
                            </div>
                          )}
                          {message.status === 'failed' && (
                            <div className="flex items-center gap-1 text-red-500">
                              <AlertCircle className="h-4 w-4" />
                              <span>Failed</span>
                            </div>
                          )}
                        </div>

                        {message.images && message.images.length > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Attachments:</p>
                            <div className="flex gap-2">
                              {message.images.map((image, index) => (
                                <div key={index} className="w-16 h-16 bg-muted rounded border overflow-hidden">
                                  <img
                                    src={image}
                                    alt={`Attachment ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        </div>
      </main>

      {/* WhatsApp QR Modal */}
      <WhatsAppQRModal isOpen={showQRModal} onConnectionComplete={handleConnectionComplete} />

      {/* Message Schedule Panel */}
      {isConnected && (
        <MessageSchedulePanel
          isOpen={isSchedulePanelOpen}
          onClose={() => {
            setIsSchedulePanelOpen(false)
            setEditingMessage(null)
          }}
          selectedDate={selectedDate}
          editingMessage={editingMessage}
        />
      )}
    </div>
  )
}
