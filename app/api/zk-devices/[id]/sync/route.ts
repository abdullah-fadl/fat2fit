import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { createZKDevice } from "@/lib/zk-device"

/**
 * POST - مزامنة البيانات من جهاز ZK
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    // التحقق من الصلاحية
    const permCheck = await requirePermission(PERMISSIONS.ZK_DEVICES_MANAGE, "غير مصرح لك بمزامنة أجهزة البصمة")
    if (permCheck.error) {
      return permCheck.response
    }

    const resolvedParams = await Promise.resolve(params)
    const device = await prisma.zKDevice.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!device) {
      return NextResponse.json({ error: "الجهاز غير موجود" }, { status: 404 })
    }

    // الاتصال بالجهاز
    const zkDevice = await createZKDevice({
      ip: device.ip,
      port: device.port,
      password: device.password || undefined,
      timeout: 10000,
    })

    try {
      await zkDevice.connect()

      // الحصول على سجلات الحضور
      const attendances = await zkDevice.getAttendances()
      
      // معالجة سجلات الحضور
      let syncedCount = 0
      let errors: string[] = []

      for (const attendance of attendances) {
        try {
          // البحث عن العميلة بناءً على fingerprintId (fingerprintId ليس unique في schema)
          const client = await prisma.client.findFirst({
            where: { fingerprintId: attendance.uid.toString() },
            include: {
              subscriptions: {
                where: { status: "ACTIVE" },
                take: 1,
              },
            },
          })

          if (!client) {
            errors.push(`لم يتم العثور على عميلة برقم البصمة ${attendance.uid}`)
            continue
          }

          // التحقق من وجود اشتراك نشط
          if (client.subscriptions.length === 0) {
            errors.push(`العميلة ${client.name} ليس لديها اشتراك نشط`)
            continue
          }

          // تحويل timestamp إلى Date
          const checkInDate = new Date(attendance.timestamp * 1000)

          // التحقق من عدم وجود تسجيل دخول مسبق في نفس الوقت
          const existingCheckIn = await prisma.checkIn.findFirst({
            where: {
              clientId: client.id,
              checkInDate: {
                gte: new Date(checkInDate.getTime() - 60000), // دقيقة واحدة
                lte: new Date(checkInDate.getTime() + 60000),
              },
            },
          })

          if (existingCheckIn) {
            continue // تخطي إذا كان موجوداً
          }

          // إنشاء سجل دخول
          await prisma.checkIn.create({
            data: {
              clientId: client.id,
              method: "FINGERPRINT",
              fingerprintId: attendance.uid.toString(),
              checkInDate: checkInDate,
            },
          })

          syncedCount++
        } catch (error: any) {
          errors.push(`خطأ في معالجة السجل ${attendance.uid}: ${error.message}`)
        }
      }

      // تحديث lastSync
      await prisma.zKDevice.update({
        where: { id: device.id },
        data: { lastSync: new Date() },
      })

      zkDevice.disconnect()

      return NextResponse.json({
        success: true,
        message: `تم مزامنة ${syncedCount} سجل دخول`,
        synced: syncedCount,
        errors: errors.length > 0 ? errors : undefined,
      })
    } catch (error: any) {
      zkDevice.disconnect()
      return NextResponse.json(
        { error: error.message || "فشل المزامنة" },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Error syncing ZK device:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء المزامنة" },
      { status: 500 }
    )
  }
}

