"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { hasPermission, Role } from "@/lib/permissions"

interface ProtectedLinkProps {
  permission: string
  href: string
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

export function ProtectedLink({
  permission,
  href,
  children,
  fallback = null,
  className,
}: ProtectedLinkProps) {
  const { data: session } = useSession()
  const role = session?.user?.role as Role

  if (!hasPermission(role, permission)) {
    return <>{fallback}</>
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}







