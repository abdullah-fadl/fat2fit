// Helper to check role-based access in middleware
import { NextRequest, NextResponse } from "next/server"
import { PAGE_PERMISSIONS, hasAnyPermission } from "./lib/permissions"

// Note: auth() cannot be called directly in middleware in Next.js
// We'll check permissions at the page level instead
export function checkPagePermissions(pathname: string, userRole: string | undefined): boolean {
  const requiredPermissions = PAGE_PERMISSIONS[pathname]

  // If no permissions required, allow access
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true
  }

  if (!userRole) {
    return false
  }

  return hasAnyPermission(userRole, requiredPermissions)
}

