"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, LayoutDashboard, Settings, MessageSquare, ChevronLeft, ChevronRight, User, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/auth-context"

const navigationItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: Calendar,
  },
  {
    title: "Messages",
    href: "/messages",
    icon: MessageSquare,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export function Navigation() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()

  // Load collapse state from localStorage on mount
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar-collapsed")
    if (savedCollapsed !== null) {
      setIsCollapsed(JSON.parse(savedCollapsed))
    }
  }, [])

  // Save collapse state to localStorage when it changes
  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newCollapsed))
  }

  return (
    <div
      className={cn(
        "relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6 text-sidebar-primary" />
            <span className="font-semibold text-sidebar-foreground">WhatsApp Scheduler</span>
          </div>
        )}
        <div className="flex items-center space-x-1">
          {!isCollapsed && <ThemeToggle />}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full h-10 transition-all duration-200",
                      isCollapsed ? "justify-center px-2" : "justify-start px-3",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                    {!isCollapsed && <span className="truncate">{item.title}</span>}
                  </Button>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        {/* User Menu - Commented out for testing */}
        {/* <div className={cn("mb-4", isCollapsed ? "flex justify-center" : "")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "h-10 transition-all duration-200 hover:bg-sidebar-accent",
                  isCollapsed ? "w-10 p-0" : "w-full justify-start px-3"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={profile?.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {profile?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="ml-3 flex-1 text-left">
                    <div className="text-sm font-medium text-sidebar-foreground truncate">
                      {profile?.firstName && profile?.lastName
                        ? `${profile.firstName} ${profile.lastName}`
                        : user?.email
                      }
                    </div>
                    <div className="text-xs text-sidebar-foreground/60 truncate">
                      {user?.email}
                    </div>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div> */}

        {/* Simple placeholder for testing */}
        <div className={cn("mb-4", isCollapsed ? "flex justify-center" : "")}>
          <div className={cn(
            "flex items-center transition-all duration-200",
            isCollapsed ? "justify-center" : "px-3"
          )}>
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">U</AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="ml-3 flex-1 text-left">
                <div className="text-sm font-medium text-sidebar-foreground">
                  Test User
                </div>
                <div className="text-xs text-sidebar-foreground/60">
                  test@example.com
                </div>
              </div>
            )}
          </div>
        </div>

        {isCollapsed && (
          <div className="flex justify-center mb-3">
            <ThemeToggle />
          </div>
        )}
        {!isCollapsed && <div className="text-xs text-sidebar-foreground/60">WhatsApp Scheduler v1.0</div>}
      </div>
    </div>
  )
}
