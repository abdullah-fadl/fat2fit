import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { createZKDevice } from "@/lib/zk-device"

/**
 * POST - اختبار الاتصال بجهاز ZK
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

    const userRole = (session.user as any)?.role
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح - هذه الصفحة للمديرات فقط" }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    const device = await prisma.zKDevice.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!device) {
      return NextResponse.json({ error: "الجهاز غير موجود" }, { status: 404 })
    }

    // محاولة الاتصال بالجهاز
    const zkDevice = await createZKDevice({
      ip: device.ip,
      port: device.port,
      password: device.password || undefined,
      timeout: 5000,
    })

    try {
      const connected = await zkDevice.connect()
      
      if (connected) {
        // تحديث lastSync
        await prisma.zKDevice.update({
          where: { id: device.id },
          data: { lastSync: new Date() },
        })

        zkDevice.disconnect()
        return NextResponse.json({
          success: true,
          message: "تم الاتصال بالجهاز بنجاح",
        })
      } else {
        return NextResponse.json(
          { error: "فشل الاتصال بالجهاز" },
          { status: 400 }
        )
      }
    } catch (error: any) {
      zkDevice.disconnect()
      return NextResponse.json(
        { error: error.message || "فشل الاتصال بالجهاز. تأكد من عنوان IP والمنفذ" },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Error testing ZK device:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء اختبار الاتصال" },
      { status: 500 }
    )
  }
}

