// app/layout.tsx
'use client'

import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import ClientProvider from '@/components/ClientProvider'
import './globals.css'
import { useEffect, useState } from 'react'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        {/* Only render after mounting (client-side) */}
        {mounted && (
          <ClientProvider>
            {children}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </ClientProvider>
        )}
      </body>
    </html>
  )
}