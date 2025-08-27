"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw, Smartphone, Wifi, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWhatsApp } from "@/contexts/whatsapp-context"
import { apiService } from "@/lib/api"

interface WhatsAppQRModalProps {
  isOpen: boolean
  onConnectionComplete: () => void
}

type ConnectionStatus = "connecting" | "waiting" | "connected" | "error"

export function WhatsAppQRModal({ isOpen, onConnectionComplete }: WhatsAppQRModalProps) {
  const {
    isConnected,
    isReady,
    error,
    refreshStatus
  } = useWhatsApp()

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting")
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Update connection status based on WhatsApp context
  useEffect(() => {
    if (isConnected && isReady) {
      setConnectionStatus("connected")
    } else if (isConnected && !isReady) {
      setConnectionStatus("waiting")
    } else if (error) {
      setConnectionStatus("error")
    } else if (qrCode) {
      setConnectionStatus("waiting")
    } else {
      setConnectionStatus("connecting")
    }
  }, [isConnected, isReady, qrCode, error])

  // Function to fetch QR code
  const fetchQRCode = async () => {
    setIsLoading(true)
    try {
      const response = await apiService.getQRCode()
      if (response.success && response.data) {
        setQrCode(response.data.qr)
      }
    } catch (error) {
      console.error('Error fetching QR code:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load QR code when modal opens
  useEffect(() => {
    if (isOpen && !isConnected) {
      fetchQRCode()
    }
  }, [isOpen, isConnected])

  const handleRefreshQR = () => {
    setConnectionStatus("connecting")
    fetchQRCode()
  }

  const handleContinue = () => {
    onConnectionComplete()
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => { }}>
      <DialogContent className="sm:max-w-md bg-card border-border" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-card-foreground text-center">Connect WhatsApp</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Scan the QR code with your WhatsApp mobile app to connect your account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code Section */}
          <div className="flex justify-center">
            <Card className="p-4 bg-background border-border">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="w-48 h-48 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">Loading QR code...</p>
                  </div>
                ) : qrCode ? (
                  <div className="w-48 h-48 flex items-center justify-center bg-white rounded-lg">
                    <img
                      src={`data:image/png;base64,${qrCode}`}
                      alt="WhatsApp QR Code"
                      className="w-44 h-44 rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-muted-foreground">No QR code available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>



          {/* Instructions */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-medium text-card-foreground mb-3">How to connect:</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                  1
                </div>
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-card-foreground">Open WhatsApp on your phone</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                  2
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-card-foreground">Tap Menu (⋮) → Linked Devices</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                  3
                </div>
                <div className="flex items-center space-x-2">
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-card-foreground">Scan this QR code</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleRefreshQR}
              disabled={isLoading}
              className="flex-1 border-border hover:bg-accent hover:text-accent-foreground bg-transparent"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
              Refresh QR
            </Button>

            <Button
              onClick={handleContinue}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
