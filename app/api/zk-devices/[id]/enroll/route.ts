import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { createZKDevice } from "@/lib/zk-device"

/**
 * POST - تسجيل بصمة عميلة في جهاز ZK
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
    const { clientId } = await req.json()

    if (!clientId) {
      return NextResponse.json(
        { error: "معرف العميلة مطلوب" },
        { status: 400 }
      )
    }

    // الحصول على الجهاز والعميلة
    const [device, client] = await Promise.all([
      prisma.zKDevice.findUnique({
        where: { id: resolvedParams.id },
      }),
      prisma.client.findUnique({
        where: { id: clientId },
      }),
    ])

    if (!device) {
      return NextResponse.json({ error: "الجهاز غير موجود" }, { status: 404 })
    }

    if (!client) {
      return NextResponse.json({ error: "العميلة غير موجودة" }, { status: 404 })
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

      // توليد رقم بصمة فريد (يمكن استخدام رقم عضوية أو ID)
      let fingerprintId = client.fingerprintId
      
      if (!fingerprintId) {
        // استخدام رقم عضوية كرقم بصمة
        const membershipNum = parseInt(client.membershipNumber.replace("MEM", ""))
        fingerprintId = 1000 + membershipNum // بداية من 1000
      }

      // إضافة المستخدم للجهاز
      await zkDevice.setUser(fingerprintId, client.name, 0)

      // تحديث العميلة برقم البصمة
      await prisma.client.update({
        where: { id: client.id },
        data: { fingerprintId },
      })

      zkDevice.disconnect()

      return NextResponse.json({
        success: true,
        message: `تم تسجيل بصمة ${client.name} في الجهاز`,
        fingerprintId,
      })
    } catch (error: any) {
      zkDevice.disconnect()
      return NextResponse.json(
        { error: error.message || "فشل تسجيل البصمة. تأكد من أن العميلة تضغط على الجهاز" },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Error enrolling fingerprint:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء تسجيل البصمة" },
      { status: 500 }
    )
  }
}

