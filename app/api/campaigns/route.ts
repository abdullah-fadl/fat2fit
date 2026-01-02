import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { sendMessage, replaceVariables } from "@/lib/messaging"
import { logCreate, logUpdate } from "@/lib/audit-log"

// GET - الحصول على قائمة الحملات
export async function GET(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.CAMPAIGNS_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.campaign.count({ where }),
    ])

    return NextResponse.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching campaigns:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

// POST - إنشاء حملة جديدة
export async function POST(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.CAMPAIGNS_CREATE)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      description,
      type,
      channel,
      content,
      targetType,
      filters,
      scheduledAt,
      sendImmediately = false,
    } = body

    if (!name || !type || !channel || !content || !targetType) {
      return NextResponse.json(
        { error: "جميع الحقول مطلوبة" },
        { status: 400 }
      )
    }

    const userId = (session.user as any)?.id || ""

    // إنشاء الحملة
    const campaign = await prisma.campaign.create({
      data: {
        name,
        description: description || null,
        type,
        channel,
        content,
        targetType,
        filters: filters ? JSON.stringify(filters) : null,
        status: sendImmediately ? "RUNNING" : scheduledAt ? "SCHEDULED" : "DRAFT",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        startedAt: sendImmediately ? new Date() : null,
        createdBy: userId,
      },
    })

    // إذا كان sendImmediately = true، ابدأ إرسال الرسائل
    if (sendImmediately) {
      // إرسال الرسائل في الخلفية (async)
      sendCampaignMessages(campaign.id).catch(console.error)
    }

    // إنشاء سجل تدقيق
    await logCreate(
      userId,
      "Campaign",
      campaign.id,
      campaign,
      `تم إنشاء حملة تسويقية: ${name}`
    )

    return NextResponse.json(campaign, { status: 201 })
  } catch (error: any) {
    console.error("Error creating campaign:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء إنشاء الحملة" },
      { status: 500 }
    )
  }
}

// دالة مساعدة لإرسال رسائل الحملة
async function sendCampaignMessages(campaignId: string) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      throw new Error("Campaign not found")
    }

    // تحديث حالة الحملة
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "RUNNING", startedAt: new Date() },
    })

    // الحصول على قائمة المستلمين بناءً على targetType
    const recipients = await getCampaignRecipients(campaign)

    let sentCount = 0
    let failedCount = 0

    // إرسال الرسائل
    for (const recipient of recipients) {
      try {
        // استبدال المتغيرات في المحتوى
        const content = replaceVariables(campaign.content, {
          name: recipient.name,
          membershipNumber: recipient.membershipNumber,
          phone: recipient.phone,
          days: recipient.daysUntilExpiry || "",
          packageName: recipient.packageName || "",
        })

        // إرسال الرسالة
        const result = await sendMessage({
          phoneNumber: recipient.phone,
          content,
          channel: campaign.channel as "SMS" | "WHATSAPP" | "EMAIL",
          recipientName: recipient.name,
        })

        // حفظ الرسالة
        await prisma.message.create({
          data: {
            campaignId: campaign.id,
            clientId: recipient.clientId,
            type: campaign.channel,
            channel: campaign.channel,
            content,
            status: result.status,
            errorMessage: result.error || null,
            phoneNumber: recipient.phone,
            recipientName: recipient.name,
            sentAt: result.success ? new Date() : null,
          },
        })

        if (result.success) {
          sentCount++
        } else {
          failedCount++
        }

        // تأخير صغير لتجنب rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error: any) {
        console.error(`Error sending message to ${recipient.phone}:`, error)
        failedCount++

        // حفظ الرسالة الفاشلة
        await prisma.message.create({
          data: {
            campaignId: campaign.id,
            clientId: recipient.clientId,
            type: campaign.channel,
            channel: campaign.channel,
            content: replaceVariables(campaign.content, {
              name: recipient.name,
              membershipNumber: recipient.membershipNumber,
              phone: recipient.phone,
            }),
            status: "FAILED",
            errorMessage: error.message,
            phoneNumber: recipient.phone,
            recipientName: recipient.name,
          },
        })
      }
    }

    // تحديث إحصائيات الحملة
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        totalRecipients: recipients.length,
        sentCount,
        failedCount,
        deliveredCount: sentCount, // TODO: تحديث عند إضافة webhook للتسليم
      },
    })
  } catch (error: any) {
    console.error("Error sending campaign messages:", error)
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "CANCELLED",
        errorMessage: error.message,
      },
    })
  }
}

// دالة مساعدة للحصول على قائمة المستلمين
async function getCampaignRecipients(campaign: any): Promise<any[]> {
  const recipients: any[] = []

  switch (campaign.targetType) {
    case "ALL_CLIENTS":
      const allClients = await prisma.client.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          phone: true,
          membershipNumber: true,
        },
      })
      recipients.push(...allClients.map((c) => ({ ...c, clientId: c.id })))
      break

    case "ACTIVE_SUBSCRIPTIONS":
      const activeSubscriptions = await prisma.subscription.findMany({
        where: { status: "ACTIVE" },
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
      recipients.push(
        ...activeSubscriptions.map((sub) => ({
          clientId: sub.client.id,
          name: sub.client.name,
          phone: sub.client.phone,
          membershipNumber: sub.client.membershipNumber,
          packageName: sub.package.nameAr,
        }))
      )
      break

    case "EXPIRING_SUBSCRIPTIONS":
      const days = [7, 3, 1] // أيام قبل الانتهاء
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const day of days) {
        const expiryDate = new Date(today)
        expiryDate.setDate(expiryDate.getDate() + day)

        const expiringSubs = await prisma.subscription.findMany({
          where: {
            status: "ACTIVE",
            endDate: {
              gte: new Date(expiryDate.getTime() - 86400000), // يوم قبل
              lte: new Date(expiryDate.getTime() + 86400000), // يوم بعد
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

        recipients.push(
          ...expiringSubs.map((sub) => ({
            clientId: sub.client.id,
            name: sub.client.name,
            phone: sub.client.phone,
            membershipNumber: sub.client.membershipNumber,
            packageName: sub.package.nameAr,
            daysUntilExpiry: day,
          }))
        )
      }
      break

    case "SPECIFIC_CLIENTS":
      if (campaign.filters) {
        const filters = JSON.parse(campaign.filters)
        const clientIds = filters.clientIds || []
        const specificClients = await prisma.client.findMany({
          where: {
            id: { in: clientIds },
            status: "ACTIVE",
          },
          select: {
            id: true,
            name: true,
            phone: true,
            membershipNumber: true,
          },
        })
        recipients.push(...specificClients.map((c) => ({ ...c, clientId: c.id })))
      }
      break
  }

  // إزالة التكرارات
  const uniqueRecipients = Array.from(
    new Map(recipients.map((r) => [r.clientId, r])).values()
  )

  return uniqueRecipients
}


