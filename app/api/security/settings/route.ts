import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { logUpdate } from "@/lib/audit-log"

/**
 * GET - الحصول على إعدادات الأمان
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "هذه الصفحة متاحة للمديرات فقط" },
        { status: 403 }
      )
    }

    let settings = await prisma.securitySettings.findFirst()

    // إنشاء إعدادات افتراضية إذا لم تكن موجودة
    if (!settings) {
      settings = await prisma.securitySettings.create({
        data: {},
      })
    }

    return NextResponse.json(settings)
  } catch (error: any) {
    console.error("Error fetching security settings:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء جلب الإعدادات" },
      { status: 500 }
    )
  }
}

/**
 * PUT - تحديث إعدادات الأمان
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "هذه الصفحة متاحة للمديرات فقط" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const {
      encryptionEnabled,
      encryptPhoneNumbers,
      encryptNames,
      encryptEmails,
      autoBackupEnabled,
      backupIntervalHours,
      backupRetentionDays,
      requireStrongPassword,
      sessionTimeoutMinutes,
      maxLoginAttempts,
      allowDataExport,
      anonymizeLogs,
      auditLogRetentionDays,
      gdprCompliant,
      dataRetentionDays,
      rightToDelete,
    } = body

    let settings = await prisma.securitySettings.findFirst()

    if (!settings) {
      settings = await prisma.securitySettings.create({
        data: {},
      })
    }

    const oldSettings = { ...settings }

    const updatedSettings = await prisma.securitySettings.update({
      where: { id: settings.id },
      data: {
        encryptionEnabled,
        encryptPhoneNumbers,
        encryptNames,
        encryptEmails,
        autoBackupEnabled,
        backupIntervalHours,
        backupRetentionDays,
        requireStrongPassword,
        sessionTimeoutMinutes,
        maxLoginAttempts,
        allowDataExport,
        anonymizeLogs,
        auditLogRetentionDays,
        gdprCompliant,
        dataRetentionDays,
        rightToDelete,
      },
    })

    // تسجيل التعديل
    const userId = (session.user as any)?.id || ""
    await logUpdate(
      userId,
      "SecuritySettings" as any,
      settings.id,
      oldSettings,
      updatedSettings,
      "تم تحديث إعدادات الأمان والخصوصية"
    )

    return NextResponse.json(updatedSettings)
  } catch (error: any) {
    console.error("Error updating security settings:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء تحديث الإعدادات" },
      { status: 500 }
    )
  }
}


