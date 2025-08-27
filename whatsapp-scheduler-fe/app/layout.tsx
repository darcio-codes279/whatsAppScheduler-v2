import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { WhatsAppProvider } from "@/contexts/whatsapp-context"
import { MessagesProvider } from "@/contexts/messages-context"
import { Toaster } from "react-hot-toast"

export const metadata: Metadata = {
  title: "WhatsApp Scheduler",
  description: "Professional WhatsApp message scheduling platform",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
          storageKey="whatsapp-scheduler-theme"
        >
          <AuthProvider>
            <WhatsAppProvider>
              <MessagesProvider>{children}</MessagesProvider>
            </WhatsAppProvider>
          </AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              },
              success: {
                iconTheme: {
                  primary: 'var(--primary)',
                  secondary: 'var(--primary-foreground)',
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
