const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface WhatsAppStatus {
  isReady: boolean
  isConnected: boolean
  clientInfo?: {
    pushname: string
    wid: {
      user: string
      server: string
    }
  }
}

export interface WhatsAppGroup {
  id: string
  name: string
  participants: number
}

export interface ScheduledMessage {
  id: string
  groupName: string
  message: string
  cron: string
  imagePaths?: string[]
  status: 'pending' | 'sent' | 'failed'
  createdAt: string
  lastAttempt?: string
  description?: string
  createdBy?: string
  errorMessage?: string
}

export interface SendMessageRequest {
  groupName: string
  message: string
  images?: File[]
}

export interface ScheduleMessageRequest {
  groupName: string
  message: string
  cronTime: string
  images?: File[]
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: errorText || `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json()
      return {
        success: true,
        data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  private async requestWithFormData<T>(
    endpoint: string,
    formData: FormData
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: errorText || `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json()
      return {
        success: true,
        data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  // Health check
  async checkHealth(): Promise<ApiResponse<{ status: string; whatsapp: { ready: boolean } }>> {
    return this.request('/api/health')
  }

  // WhatsApp QR Code
  async getQRCode(): Promise<ApiResponse<{ qr: string }>> {
    const response = await this.request<{ hasQr: boolean; qrDataUrl?: string; qrCode?: string; message?: string }>('/api/whatsapp/qr')
    
    if (response.success && response.data) {
      // Handle direct qrCode field (this is what the backend actually returns)
      if (response.data.qrCode) {
        return {
          success: true,
          data: { qr: response.data.qrCode }
        }
      }
      
      // Handle response with QR data URL (fallback)
      if (response.data.hasQr && response.data.qrDataUrl) {
        // Extract base64 data from data URL (remove "data:image/png;base64," prefix)
        const base64Data = response.data.qrDataUrl.split(',')[1]
        return {
          success: true,
          data: { qr: base64Data }
        }
      }
      
      // Handle case where hasQr is false
      if (response.data.hasQr === false) {
        return {
          success: false,
          error: response.data.message || 'WhatsApp is already connected'
        }
      }
    }
    
    return {
      success: false,
      error: response.data?.message || response.error || 'No QR code available'
    }
  }

  // WhatsApp Status
  async getWhatsAppStatus(): Promise<ApiResponse<WhatsAppStatus>> {
    return this.request('/api/whatsapp/status')
  }

  // WhatsApp Health
  async getWhatsAppHealth(): Promise<ApiResponse<{ ready: boolean; canSendMessages: boolean }>> {
    return this.request('/api/whatsapp/health')
  }

  // Reconnect WhatsApp
  async reconnectWhatsApp(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/whatsapp/reconnect', { method: 'POST' })
  }

  // Get Groups
  async getGroups(): Promise<ApiResponse<WhatsAppGroup[]>> {
    return this.request('/api/groups')
  }

  // Promote bot to admin in all groups
  async promoteBotToAdmin(): Promise<ApiResponse<any>> {
    return this.request('/api/groups/promote-bot', { method: 'POST' })
  }

  // Send immediate message
  async sendMessage(request: SendMessageRequest): Promise<ApiResponse<{ message: string }>> {
    const formData = new FormData()
    formData.append('groupName', request.groupName)
    formData.append('message', request.message)
    
    if (request.images) {
      request.images.forEach((image, index) => {
        formData.append('images', image)
      })
    }

    return this.requestWithFormData('/api/messages/send', formData)
  }

  // Schedule message
  async scheduleMessage(request: ScheduleMessageRequest): Promise<ApiResponse<{ message: string; id: string }>> {
    const formData = new FormData()
    formData.append('groupName', request.groupName)
    formData.append('message', request.message)
    formData.append('cronTime', request.cronTime)
    
    if (request.images) {
      request.images.forEach((image, index) => {
        formData.append('images', image)
      })
    }

    return this.requestWithFormData('/api/messages/schedule', formData)
  }

  // Get scheduled messages
  async getScheduledMessages(): Promise<ApiResponse<{ scheduledMessages: ScheduledMessage[] }>> {
    return this.request<{ scheduledMessages: ScheduledMessage[] }>('/api/messages/scheduled')
  }

  // Update scheduled message
  async updateScheduledMessage(
    id: string,
    request: ScheduleMessageRequest
  ): Promise<ApiResponse<{ message: string }>> {
    const formData = new FormData()
    formData.append('groupName', request.groupName)
    formData.append('message', request.message)
    formData.append('cronTime', request.cronTime)
    
    if (request.images) {
      request.images.forEach((image, index) => {
        formData.append('images', image)
      })
    }

    return this.requestWithFormData(`/api/messages/scheduled/${id}`, formData)
  }

  // Delete scheduled message
  async deleteScheduledMessage(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/messages/scheduled/${id}`, { method: 'DELETE' })
  }

  // Upload file
  async uploadFile(file: File): Promise<ApiResponse<{ filename: string; path: string }>> {
    const formData = new FormData()
    formData.append('file', file)

    return this.requestWithFormData('/api/upload', formData)
  }
}

export const apiService = new ApiService()