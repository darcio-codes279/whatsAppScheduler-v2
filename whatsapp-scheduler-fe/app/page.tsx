"use client"

import { Navigation } from "@/components/navigation"
import { useWhatsApp } from "@/contexts/whatsapp-context"
import { useMessages } from "@/contexts/messages-context"
import { WhatsAppQRModal } from "@/components/whatsapp-qr-modal"
import { MessageSchedulePanel } from "@/components/message-schedule-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Activity,
  Zap,
  Globe,
  Settings,
} from "lucide-react"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { ScheduledMessage } from "@/contexts/messages-context"

export default function DashboardPage() {
  const { isConnected, isReady, showQRModal, setShowQRModal, groups, clientInfo } = useWhatsApp()
  const { messages } = useMessages()
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const router = useRouter()

  // Calculate real stats from messages
  const stats = useMemo(() => {
    const totalMessages = messages.length
    const pendingMessages = messages.filter(msg => msg.status === 'scheduled').length
    const successfulMessages = messages.filter(msg => msg.status === 'sent').length
    const failedMessages = messages.filter(msg => msg.status === 'failed').length

    // Calculate success rate only from completed messages (sent + failed), excluding scheduled/pending
    const completedMessages = successfulMessages + failedMessages
    const successRate = completedMessages > 0 ? ((successfulMessages / completedMessages) * 100).toFixed(1) : '0.0'

    // Get upcoming scheduled messages (sorted by creation date)
    const upcomingMessages = messages
      .filter(msg => msg.status === 'scheduled')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 3)

    // Generate recent activity log from last 24 hours
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const recentActivity = messages
      .filter(msg => new Date(msg.createdAt) >= last24Hours || (msg.sentAt && new Date(msg.sentAt) >= last24Hours))
      .map(msg => {
        const activities = []

        // Message creation activity
        if (new Date(msg.createdAt) >= last24Hours) {
          activities.push({
            id: `${msg.id}-created`,
            type: 'scheduled',
            message: `Message scheduled for ${msg.groupName}`,
            timestamp: new Date(msg.createdAt),
            status: 'scheduled',
            icon: 'Clock'
          })
        }

        // Message sent activity
        if (msg.sentAt && new Date(msg.sentAt) >= last24Hours) {
          activities.push({
            id: `${msg.id}-sent`,
            type: msg.status === 'sent' ? 'success' : 'failed',
            message: msg.status === 'sent'
              ? `Message delivered to ${msg.groupName}`
              : `Message failed to deliver to ${msg.groupName}`,
            timestamp: new Date(msg.sentAt),
            status: msg.status,
            icon: msg.status === 'sent' ? 'CheckCircle' : 'AlertTriangle'
          })
        }

        return activities
      })
      .flat()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5) // Show only last 5 activities

    return {
      totalMessages,
      pendingMessages,
      successRate,
      activeGroups: groups.length,
      upcomingMessages,
      recentActivity
    }
  }, [messages, groups])

  const handleClosePanel = () => {
    setIsPanelOpen(false)
    setSelectedDate(null)
  }

  return (
    <div className="flex h-screen bg-background">
      <Navigation />

      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              {isConnected
                ? "Monitor and manage your WhatsApp scheduling operations"
                : "Connect your WhatsApp account to access the full dashboard"}
            </p>
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
                      Connect your WhatsApp account to access all dashboard features
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

          {/* Bento Grid Dashboard Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {/* Primary Stats - Top Row */}
            <Link href="/messages">
              <Card className="bg-card border-border cursor-pointer hover:bg-accent/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-card-foreground">Total Messages</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-card-foreground">{stats.totalMessages}</div>
                  <p className="text-xs text-muted-foreground">Click to view all messages</p>
                </CardContent>
              </Card>
            </Link>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-card-foreground">Active Groups</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">{stats.activeGroups}</div>
                <p className="text-xs text-muted-foreground">{isConnected ? 'Connected groups' : 'Connect WhatsApp'}</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-card-foreground">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">{stats.successRate}%</div>
                <p className="text-xs text-muted-foreground">Sent vs failed messages</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-card-foreground">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">{stats.pendingMessages}</div>
                <p className="text-xs text-muted-foreground">{stats.pendingMessages > 0 ? 'Scheduled messages' : 'No pending messages'}</p>
              </CardContent>
            </Card>

            {/* Upcoming Messages - Wide Card */}
            <Card className="md:col-span-2 bg-card border-border cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => router.push('/calendar')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-card-foreground">Upcoming Messages</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stats.upcomingMessages.length > 0 ? (
                  <div className="space-y-3">
                    {stats.upcomingMessages.map((message, index) => (
                      <div key={message.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">
                            {message.groupName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {message.body && message.body.length > 40 ? `${message.body.substring(0, 40)}...` : message.body || 'No message content'}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-xs text-muted-foreground">
                            {message.cronTime || `${message.date} ${message.time}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {new Date(message.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {stats.pendingMessages > 4 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{stats.pendingMessages - 4} more scheduled messages
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">No scheduled messages</p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedDate(new Date())
                        setIsPanelOpen(true)
                      }}
                      disabled={!isConnected}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Click to create message
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Status - Wide Card */}
            <Card className="md:col-span-2 bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isConnected && isReady ? 'bg-green-500' : isConnected ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm text-card-foreground">WhatsApp API</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className={isConnected && isReady ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : isConnected ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}
                    >
                      {isConnected && isReady ? 'Online' : isConnected ? 'Connecting' : 'Offline'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-card-foreground">Message Queue</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    >
                      Healthy
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-card-foreground">Database</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    >
                      Slow
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card className="lg:col-span-2 bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-card-foreground">Message Delivery</span>
                      <span className="text-sm text-muted-foreground">94%</span>
                    </div>
                    <Progress value={94} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-card-foreground">Response Time</span>
                      <span className="text-sm text-muted-foreground">1.2s avg</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-card-foreground">Queue Processing</span>
                      <span className="text-sm text-muted-foreground">87%</span>
                    </div>
                    <Progress value={87} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="md:col-span-2 bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center">
                  <Zap className="mr-2 h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    className="h-12 bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={!isConnected}
                    onClick={() => {
                      setSelectedDate(new Date())
                      setIsPanelOpen(true)
                    }}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    New Message
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 border-border text-card-foreground hover:bg-accent hover:text-accent-foreground bg-transparent"
                    disabled={!isConnected}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 border-border text-card-foreground hover:bg-accent hover:text-accent-foreground bg-transparent"
                    disabled={!isConnected}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Groups
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 border-border text-card-foreground hover:bg-accent hover:text-accent-foreground bg-transparent"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="lg:col-span-3 bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Recent Activity</CardTitle>
                <CardDescription>Latest system events and message activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentActivity.length > 0 ? (
                    stats.recentActivity.map((activity) => {
                      const getTimeAgo = (timestamp: Date) => {
                        const now = new Date()
                        const diffMs = now.getTime() - timestamp.getTime()
                        const diffMins = Math.floor(diffMs / (1000 * 60))
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

                        if (diffMins < 1) return 'Just now'
                        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
                        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
                        return timestamp.toLocaleDateString()
                      }

                      const getIcon = (iconName: string) => {
                        switch (iconName) {
                          case 'CheckCircle': return <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          case 'Clock': return <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                          case 'AlertTriangle': return <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                          default: return <Activity className="h-5 w-5 text-gray-500 mt-0.5" />
                        }
                      }

                      const getBadgeStyle = (status: string) => {
                        switch (status) {
                          case 'sent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }
                      }

                      const getBadgeText = (status: string) => {
                        switch (status) {
                          case 'sent': return 'Delivered'
                          case 'scheduled': return 'Scheduled'
                          case 'failed': return 'Failed'
                          default: return 'Unknown'
                        }
                      }

                      return (
                        <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg bg-muted/50">
                          {getIcon(activity.icon)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-card-foreground">{activity.message}</p>
                            <p className="text-xs text-muted-foreground">{getTimeAgo(activity.timestamp)}</p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={getBadgeStyle(activity.status)}
                          >
                            {getBadgeText(activity.status)}
                          </Badge>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">No recent activity</p>
                      <p className="text-xs text-muted-foreground text-center">Activity from the last 24 hours will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Analytics Summary */}
            <Card className="lg:col-span-3 bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Analytics Summary
                </CardTitle>
                <CardDescription>Key performance indicators for the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-card-foreground">Messages Sent</span>
                      <span className="text-lg font-semibold text-card-foreground">2,847</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-card-foreground">Delivery Rate</span>
                      <span className="text-lg font-semibold text-green-600">98.7%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-card-foreground">Failed Messages</span>
                      <span className="text-lg font-semibold text-red-600">37</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-card-foreground">Active Users</span>
                      <span className="text-lg font-semibold text-card-foreground">156</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-card-foreground">Avg Response Time</span>
                      <span className="text-lg font-semibold text-blue-600">1.2s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-card-foreground">Queue Size</span>
                      <span className="text-lg font-semibold text-orange-600">47</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Global Status */}
            <Card className="md:col-span-2 bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center">
                  <Globe className="mr-2 h-5 w-5" />
                  Global Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-card-foreground">Server Uptime</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-card-foreground">99.9%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-card-foreground">API Status</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-card-foreground">Operational</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-card-foreground">Last Backup</span>
                    <span className="text-sm text-muted-foreground">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-card-foreground">Storage Used</span>
                    <span className="text-sm text-muted-foreground">2.4 GB / 10 GB</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* WhatsApp QR Modal */}
      <WhatsAppQRModal isOpen={showQRModal} onConnectionComplete={() => setShowQRModal(false)} />

      {/* Message Schedule Panel */}
      {isConnected && (
        <MessageSchedulePanel isOpen={isPanelOpen} onClose={handleClosePanel} selectedDate={selectedDate} />
      )}
    </div>
  )
}
