"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
// import { ProtectedRoute } from "@/components/auth/protected-route"
import { UserProfile } from "@/components/auth/user-profile"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Bell, MessageSquare, Palette, Shield, Smartphone, Save, Upload, Trash2, Eye, EyeOff } from "lucide-react"
import { useWhatsApp } from "@/contexts/whatsapp-context"
import { useTheme } from "next-themes"

export default function SettingsPage() {
  return (
    // <ProtectedRoute>
    <SettingsContent />
    // </ProtectedRoute>
  )
}

function SettingsContent() {
  const { isConnected, setShowQRModal } = useWhatsApp()
  const { theme, setTheme } = useTheme()

  // User profile state
  const [profile, setProfile] = useState({
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    company: "Acme Corp",
    bio: "Marketing manager focused on automated communication strategies.",
  })

  // Settings state
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    messagePreview: true,
    autoSchedule: false,
    timezone: "America/New_York",
    language: "en",
    messageRetries: "3",
    defaultDelay: "5",
  })

  const [showApiKey, setShowApiKey] = useState(false)

  const handleProfileUpdate = () => {
    // Handle profile update logic
    console.log("Profile updated:", profile)
  }

  const handleSettingsUpdate = () => {
    // Handle settings update logic
    console.log("Settings updated:", settings)
  }

  const handleDisconnectWhatsApp = () => {
    // Handle WhatsApp disconnection
    localStorage.removeItem("whatsapp-connected")
    window.location.reload()
  }

  return (
    <div className="flex h-screen bg-background">
      <Navigation />

      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences and application settings</p>
          </div>

          <div className="space-y-8">
            {/* User Profile Section */}
            {/* <UserProfile /> */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Manage your account information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="Enter your first name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Enter your last name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Enter your email" />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            {/* WhatsApp Connection */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  WhatsApp Connection
                </CardTitle>
                <CardDescription>Manage your WhatsApp account connection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                    <div>
                      <p className="font-medium text-card-foreground">{isConnected ? "Connected" : "Not Connected"}</p>
                      <p className="text-sm text-muted-foreground">
                        {isConnected ? "WhatsApp account is active" : "Connect your WhatsApp account"}
                      </p>
                    </div>
                  </div>
                  <div className="space-x-2">
                    {isConnected ? (
                      <Button variant="destructive" size="sm" onClick={handleDisconnectWhatsApp}>
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setShowQRModal(true)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>

                {isConnected && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-card-foreground">Connected Device</span>
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      >
                        <Smartphone className="mr-1 h-3 w-3" />
                        iPhone 15 Pro
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-card-foreground">Last Activity</span>
                      <span className="text-sm text-muted-foreground">2 minutes ago</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center">
                  <Palette className="mr-2 h-5 w-5" />
                  Appearance
                </CardTitle>
                <CardDescription>Customize the look and feel of your dashboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-card-foreground">Theme</Label>
                    <p className="text-sm text-muted-foreground">Choose your preferred color scheme</p>
                  </div>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-32 bg-input border-border text-card-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center">
                  <Bell className="mr-2 h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-card-foreground">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-card-foreground">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive browser notifications</p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-card-foreground">Message Preview</Label>
                    <p className="text-sm text-muted-foreground">Show message content in notifications</p>
                  </div>
                  <Switch
                    checked={settings.messagePreview}
                    onCheckedChange={(checked) => setSettings({ ...settings, messagePreview: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Advanced Settings
                </CardTitle>
                <CardDescription>Configure advanced application behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-card-foreground">Timezone</Label>
                    <Select
                      value={settings.timezone}
                      onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                    >
                      <SelectTrigger className="bg-input border-border text-card-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-card-foreground">Language</Label>
                    <Select
                      value={settings.language}
                      onValueChange={(value) => setSettings({ ...settings, language: value })}
                    >
                      <SelectTrigger className="bg-input border-border text-card-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-card-foreground">Message Retries</Label>
                    <Select
                      value={settings.messageRetries}
                      onValueChange={(value) => setSettings({ ...settings, messageRetries: value })}
                    >
                      <SelectTrigger className="bg-input border-border text-card-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 retry</SelectItem>
                        <SelectItem value="3">3 retries</SelectItem>
                        <SelectItem value="5">5 retries</SelectItem>
                        <SelectItem value="10">10 retries</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-card-foreground">Default Delay (minutes)</Label>
                    <Select
                      value={settings.defaultDelay}
                      onValueChange={(value) => setSettings({ ...settings, defaultDelay: value })}
                    >
                      <SelectTrigger className="bg-input border-border text-card-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 minute</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-card-foreground">Auto-Schedule</Label>
                    <p className="text-sm text-muted-foreground">Automatically schedule recurring messages</p>
                  </div>
                  <Switch
                    checked={settings.autoSchedule}
                    onCheckedChange={(checked) => setSettings({ ...settings, autoSchedule: checked })}
                  />
                </div>

                <Separator />

                {/* API Key Section */}
                <div className="space-y-3">
                  <Label className="text-card-foreground">API Key</Label>
                  <div className="flex space-x-2">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value="sk-1234567890abcdef"
                      readOnly
                      className="bg-input border-border text-card-foreground"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="border-border hover:bg-accent"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use this API key to integrate with external applications
                  </p>
                </div>

                <Button
                  onClick={handleSettingsUpdate}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
