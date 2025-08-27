/**
 * Converts date and time to cron expression
 * @param date - Date object
 * @param time - Time string in HH:MM format
 * @returns Cron expression string
 */
export function dateToCron(date: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const day = date.getDate()
  const month = date.getMonth() + 1 // getMonth() returns 0-11
  const year = date.getFullYear()
  
  // Cron format: minute hour day month dayOfWeek
  // For specific date scheduling, we use: minute hour day month *
  return `${minutes} ${hours} ${day} ${month} *`
}

/**
 * Converts cron expression back to readable format
 * @param cronExpression - Cron expression string
 * @returns Object with date and time information
 */
export function cronToDateTime(cronExpression: string): {
  date: Date | null
  time: string
  readable: string
} {
  try {
    const parts = cronExpression.split(' ')
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression')
    }

    const [minute, hour, day, month, dayOfWeek] = parts
    
    // Handle specific date scheduling (day and month are numbers)
    if (day !== '*' && month !== '*') {
      const currentYear = new Date().getFullYear()
      const date = new Date(currentYear, parseInt(month) - 1, parseInt(day))
      const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
      
      return {
        date,
        time,
        readable: `${date.toLocaleDateString()} at ${time}`
      }
    }
    
    // Handle recurring schedules
    const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
    let readable = `Every day at ${time}`
    
    if (dayOfWeek !== '*') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      readable = `Every ${days[parseInt(dayOfWeek)]} at ${time}`
    }
    
    if (day !== '*' && month === '*') {
      readable = `Every month on day ${day} at ${time}`
    }
    
    return {
      date: null,
      time,
      readable
    }
  } catch (error) {
    return {
      date: null,
      time: '00:00',
      readable: 'Invalid schedule'
    }
  }
}

/**
 * Validates if a cron expression is valid
 * @param cronExpression - Cron expression string
 * @returns boolean indicating if the cron expression is valid
 */
export function isValidCron(cronExpression: string): boolean {
  try {
    const parts = cronExpression.split(' ')
    if (parts.length !== 5) return false
    
    const [minute, hour, day, month, dayOfWeek] = parts
    
    // Validate minute (0-59)
    if (minute !== '*' && (isNaN(parseInt(minute)) || parseInt(minute) < 0 || parseInt(minute) > 59)) {
      return false
    }
    
    // Validate hour (0-23)
    if (hour !== '*' && (isNaN(parseInt(hour)) || parseInt(hour) < 0 || parseInt(hour) > 23)) {
      return false
    }
    
    // Validate day (1-31)
    if (day !== '*' && (isNaN(parseInt(day)) || parseInt(day) < 1 || parseInt(day) > 31)) {
      return false
    }
    
    // Validate month (1-12)
    if (month !== '*' && (isNaN(parseInt(month)) || parseInt(month) < 1 || parseInt(month) > 12)) {
      return false
    }
    
    // Validate day of week (0-6)
    if (dayOfWeek !== '*' && (isNaN(parseInt(dayOfWeek)) || parseInt(dayOfWeek) < 0 || parseInt(dayOfWeek) > 6)) {
      return false
    }
    
    return true
  } catch (error) {
    return false
  }
}

/**
 * Creates common cron expressions
 */
export const cronPresets = {
  daily: (hour: number, minute: number) => `${minute} ${hour} * * *`,
  weekly: (hour: number, minute: number, dayOfWeek: number) => `${minute} ${hour} * * ${dayOfWeek}`,
  monthly: (hour: number, minute: number, day: number) => `${minute} ${hour} ${day} * *`,
  yearly: (hour: number, minute: number, day: number, month: number) => `${minute} ${hour} ${day} ${month} *`
}