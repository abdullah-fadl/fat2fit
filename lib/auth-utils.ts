import { NextResponse } from "next/server"
import { auth } from "./auth"
import { hasPermission, hasAnyPermission, Role, PERMISSIONS } from "./permissions"

// Re-export PERMISSIONS for convenience
export { PERMISSIONS }

// التحقق من الصلاحية في API routes
export async function checkPermission(
  permission: string | string[],
  redirect?: boolean
): Promise<{ allowed: boolean; role?: string }> {
  const session = await auth()

  if (!session) {
    return { allowed: false }
  }

  const role = (session.user as any)?.role as Role

  if (!role) {
    return { allowed: false, role }
  }

  if (Array.isArray(permission)) {
    const allowed = hasAnyPermission(role, permission)
    return { allowed, role }
  } else {
    const allowed = hasPermission(role, permission)
    return { allowed, role }
  }
}

// التحقق من الصلاحية مع إرجاع response جاهز
export async function requirePermission(
  permission: string | string[],
  errorMessage: string = "غير مصرح"
) {
  const { allowed } = await checkPermission(permission)

  if (!allowed) {
    return {
      error: true,
      response: NextResponse.json({ error: errorMessage }, { status: 403 }),
    }
  }

  return { error: false }
}

