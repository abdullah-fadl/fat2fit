import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendMessage, replaceVariables } from "@/lib/messaging"

/**
 * API Route للتحقق من الاشتراكات المنتهية وإرسال تذكيرات تلقائية
 * يمكن استدعاء هذا الـ route من cron job أو scheduled task
 */
export async function POST(req: NextRequest) {
  try {
    // التحقق من API Key (لحماية من الاستدعاءات غير المصرح بها)
    const apiKey = req.headers.get("x-api-key")
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    // الحصول على إعدادات الرسائل
    const settings = await prisma.messageSettings.findFirst({
      where: { isActive: true },
    })

    if (!settings || !settings.expiryReminderEnabled) {
      return NextResponse.json({
        message: "تذكيرات انتهاء الاشتراك معطلة",
      })
    }

    // الحصول على أيام التذكير
    const reminderDays = settings.expiryReminderDays
      .split(",")
      .map((d) => parseInt(d.trim()))
      .filter((d) => !isNaN(d))

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let totalRemindersSent = 0
    let totalErrors = 0

    // إرسال تذكيرات لكل يوم محدد
    for (const days of reminderDays) {
      const targetDate = new Date(today)
      targetDate.setDate(targetDate.getDate() + days)

      // البحث عن اشتراكات تنتهي في هذا اليوم
      const expiringSubscriptions = await prisma.subscription.findMany({
        where: {
          status: "ACTIVE",
          endDate: {
            gte: new Date(targetDate.getTime() - 86400000), // يوم قبل
            lte: new Date(targetDate.getTime() + 86400000), // يوم بعد
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              membershipNumber: true,
            },
          },
          package: {
            select: {
              nameAr: true,
            },
          },
        },
      })

      // إرسال تذكيرات
      for (const subscription of expiringSubscriptions) {
        try {
          // التحقق من عدم إرسال تذكير لنفس الاشتراك في نفس اليوم
          const existingMessage = await prisma.message.findFirst({
            where: {
              clientId: subscription.clientId,
              type: "EXPIRY_REMINDER",
              createdAt: {
                gte: new Date(today.getTime() - 86400000),
              },
            },
          })

          if (existingMessage) {
            continue // تم إرسال تذكير اليوم
          }

          // استبدال المتغيرات في الرسالة
          const content = replaceVariables(settings.expiryReminderMessage, {
            name: subscription.client.name,
            membershipNumber: subscription.client.membershipNumber,
            days: days.toString(),
            packageName: subscription.package.nameAr,
            endDate: subscription.endDate.toLocaleDateString("ar-SA"),
          })

          // اختيار القناة (SMS أو WhatsApp حسب الإعدادات)
          const channel = settings.whatsappProvider ? "WHATSAPP" : "SMS"

          // إرسال الرسالة
          const result = await sendMessage({
            phoneNumber: subscription.client.phone,
            content,
            channel: channel as "SMS" | "WHATSAPP",
            recipientName: subscription.client.name,
          })

          // حفظ الرسالة
          await prisma.message.create({
            data: {
              clientId: subscription.clientId,
              type: "EXPIRY_REMINDER",
              channel: channel,
              content,
              status: result.status,
              errorMessage: result.error || null,
              phoneNumber: subscription.client.phone,
              recipientName: subscription.client.name,
              sentAt: result.success ? new Date() : null,
            },
          })

          if (result.success) {
            totalRemindersSent++
          } else {
            totalErrors++
          }

          // تأخير صغير
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error: any) {
          console.error(
            `Error sending reminder to ${subscription.client.phone}:`,
            error
          )
          totalErrors++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم إرسال ${totalRemindersSent} تذكير`,
      totalRemindersSent,
      totalErrors,
    })
  } catch (error: any) {
    console.error("Error sending expiry reminders:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء إرسال التذكيرات" },
      { status: 500 }
    )
  }
}


