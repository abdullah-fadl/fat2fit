import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { createDatabaseBackup, cleanupOldBackups } from "@/lib/backup"
import { logCreate } from "@/lib/audit-log"

/**
 * POST - إنشاء نسخة احتياطية يدوية
 * يتطلب صلاحية ADMIN فقط
 */
export async function POST(req: NextRequest) {
  try {
    // التحقق من الصلاحية (ADMIN فقط)
    const permCheck = await requirePermission(
      PERMISSIONS.STAFF_MANAGE || "admin.access", // TODO: إضافة صلاحية خاصة
      "غير مصرح لك بإنشاء نسخة احتياطية"
    )

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "هذه العملية متاحة للمديرات فقط" },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { compress = true } = body

    // إنشاء النسخة الاحتياطية
    const result = await createDatabaseBackup({
      includePersonalData: true,
      compress,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "فشل إنشاء النسخة الاحتياطية" },
        { status: 500 }
      )
    }

    // تنظيف النسخ القديمة
    await cleanupOldBackups(10)

    // تسجيل في سجل الأنشطة
    const userId = (session.user as any)?.id || ""
    await logCreate({
      userId,
      entityType: "Backup",
      entityId: result.filePath || "unknown",
      description: `تم إنشاء نسخة احتياطية: ${result.filePath}`,
    })

    return NextResponse.json({
      success: true,
      message: "تم إنشاء النسخة الاحتياطية بنجاح",
      filePath: result.filePath,
      size: result.size,
    })
  } catch (error: any) {
    console.error("Error creating backup:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء إنشاء النسخة الاحتياطية" },
      { status: 500 }
    )
  }
}


