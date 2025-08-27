import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
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
          <WhatsAppProvider>
            <MessagesProvider>{children}</MessagesProvider>
          </WhatsAppProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--background)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
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
