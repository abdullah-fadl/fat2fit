"use client"

import { useSession } from "next-auth/react"
import { hasPermission, PERMISSIONS, Role } from "@/lib/permissions"

interface ProtectedButtonProps {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit" | "reset"
}

export function ProtectedButton({
  permission,
  children,
  fallback = null,
  className,
  onClick,
  disabled,
  type = "button",
}: ProtectedButtonProps) {
  const { data: session } = useSession()
  const role = session?.user?.role as Role

  if (!hasPermission(role, permission)) {
    return <>{fallback}</>
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  )
}








