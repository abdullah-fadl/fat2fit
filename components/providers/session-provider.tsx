"use client"

import { SessionProvider } from "next-auth/react"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={60 * 60} // Refetch every hour
      refetchOnWindowFocus={false} // Don't refetch on window focus to avoid redirects
    >
      {children}
    </SessionProvider>
  )
}






