"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Plus, CalendarIcon, Clock, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useMessages } from "@/contexts/messages-context"

interface CalendarProps {
  onDateClick: (date: Date) => void
  onMessageEdit?: (message: any) => void
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function Calendar({ onDateClick, onMessageEdit }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"Month" | "Week" | "Day">("Month")
  const { getMessagesByDate, getFilteredMessages } = useMessages()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const firstDayWeekday = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getDayKey = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const isToday = (day: number) => {
    const today = new Date()
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500"
      case "sent":
        return "bg-green-500"
      case "failed":
        return "bg-red-500"
      default:
        return "bg-primary"
    }
  }

  const upcomingEvents = getFilteredMessages("all")
    .filter((msg) => {
      const msgDate = new Date(msg.date + " " + msg.time)
      return msgDate >= new Date()
    })
    .sort((a, b) => {
      const dateA = new Date(a.date + " " + a.time)
      const dateB = new Date(b.date + " " + b.time)
      return dateA.getTime() - dateB.getTime()
    })
    .slice(0, 8)

  return (
    <TooltipProvider>
      <div className="flex min-h-[calc(100vh-8rem)] gap-4 lg:gap-6">
        <div className="w-64 lg:w-72 flex-shrink-0 hidden lg:block">
          <Card className="h-fit min-h-[calc(100vh-8rem)] flex flex-col">
            <div className="p-4 lg:p-6 border-b">
              <Button onClick={() => onDateClick(new Date())} className="w-full bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>

            <div className="flex-1 p-4 lg:p-6">
              {upcomingEvents.length > 0 && (
                <div className="flex justify-end mb-2">
                  <div className="relative group">
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md shadow-md border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      Click the event below to edit upcoming message
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover"></div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Upcoming Messages</h3>
                <span className="text-sm text-muted-foreground">{upcomingEvents.length} Messages</span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No upcoming messages</p>
                  </div>
                ) : (
                  upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${event.status === 'scheduled'
                        ? 'hover:bg-accent/50 cursor-pointer'
                        : 'cursor-default opacity-75'
                        }`}
                      onClick={() => {
                        if (event.status === 'scheduled' && onMessageEdit) {
                          onMessageEdit({
                            id: event.id,
                            date: event.date,
                            time: event.time,
                            groupId: event.groupId,
                            groupName: event.groupName,
                            name: event.name,
                            body: event.body,
                            images: event.images || []
                          })
                        }
                      }}
                    >
                      <div className={cn("w-3 h-3 rounded-full mt-1 flex-shrink-0", getStatusColor(event.status))} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.name}</p>
                        <div className="flex items-center space-x-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(event.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}{" "}
                            {event.time}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">To: {event.groupName}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="flex-1 min-w-0">
          <Card className="h-fit min-h-[calc(100vh-8rem)] flex flex-col">
            <div className="p-4 lg:p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 lg:space-x-4">
                  <div className="flex items-center space-x-1 lg:space-x-2">
                    <Button variant="outline" size="icon" onClick={previousMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={nextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" onClick={goToToday} className="px-3 lg:px-4 bg-transparent text-sm">
                    Today
                  </Button>
                </div>

                <h2 className="text-xl lg:text-2xl font-semibold">
                  {MONTHS[month]} {year}
                </h2>

                <div className="flex items-center space-x-1">
                  {(["Month", "Week", "Day"] as const).map((viewType) => (
                    <Button
                      key={viewType}
                      variant={view === viewType ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setView(viewType)}
                      className="px-2 lg:px-3 text-xs lg:text-sm"
                    >
                      {viewType}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 lg:p-6">
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {/* Day Headers */}
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="bg-muted/50 p-2 lg:p-3 text-center text-xs lg:text-sm font-medium text-muted-foreground"
                  >
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.slice(0, 1)}</span>
                  </div>
                ))}

                {/* Empty cells for days before month starts */}
                {Array.from({ length: firstDayWeekday }).map((_, index) => (
                  <div key={`empty-${index}`} className="bg-card h-20 lg:h-24 p-1 lg:p-2" />
                ))}

                {/* Calendar Days */}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1
                  const dayKey = getDayKey(day)
                  const dayMessages = getMessagesByDate(dayKey)
                  const today = isToday(day)

                  return (
                    <button
                      key={day}
                      onClick={() => onDateClick(new Date(year, month, day))}
                      className={cn(
                        "bg-card h-20 lg:h-24 p-1 lg:p-2 hover:bg-accent transition-colors text-left relative group flex flex-col",
                        today && "bg-primary text-primary-foreground hover:bg-primary/90",
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs lg:text-sm font-medium mb-1 flex-shrink-0",
                          today ? "text-primary-foreground" : "text-foreground",
                        )}
                      >
                        {day}
                      </span>

                      {dayMessages.length > 0 && (
                        <div className="flex-1 space-y-1 overflow-hidden min-h-0">
                          {dayMessages.slice(0, 2).map((message) => (
                            <Tooltip key={message.id}>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "text-xs px-1 lg:px-1.5 py-0.5 rounded truncate cursor-pointer flex items-center space-x-1",
                                    message.status === "scheduled" &&
                                    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                                    message.status === "sent" &&
                                    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                                    message.status === "failed" &&
                                    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full flex-shrink-0",
                                      getStatusColor(message.status),
                                    )}
                                  />
                                  <span className="truncate text-xs">{message.name}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-1">
                                  <div className="font-medium">{message.name}</div>
                                  <div className="text-xs text-muted-foreground">Time: {message.time}</div>
                                  <div className="text-xs text-muted-foreground">To: {message.groupName}</div>
                                  <div className="text-xs">
                                    Status:{" "}
                                    <span
                                      className={cn(
                                        "capitalize font-medium",
                                        message.status === "scheduled" && "text-blue-500",
                                        message.status === "sent" && "text-green-500",
                                        message.status === "failed" && "text-red-500",
                                      )}
                                    >
                                      {message.status}
                                    </span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {dayMessages.length > 2 && (
                            <div className="text-xs text-muted-foreground">+{dayMessages.length - 2}</div>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
