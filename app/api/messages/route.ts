import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { sendMessage, replaceVariables } from "@/lib/messaging"
import { logCreate } from "@/lib/audit-log"

// GET - الحصول على قائمة الرسائل
export async function GET(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.MESSAGES_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const clientId = searchParams.get("clientId")
    const campaignId = searchParams.get("campaignId")
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    const where: any = {}
    if (clientId) where.clientId = clientId
    if (campaignId) where.campaignId = campaignId
    if (status) where.status = status

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              membershipNumber: true,
              phone: true,
            },
          },
          campaign: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.message.count({ where }),
    ])

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

// POST - إرسال رسالة
export async function POST(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.MESSAGES_SEND)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const body = await req.json()
    const { clientId, phoneNumber, content, channel, campaignId } = body

    if (!phoneNumber || !content || !channel) {
      return NextResponse.json(
        { error: "رقم الهاتف والمحتوى والقناة مطلوبة" },
        { status: 400 }
      )
    }

    // الحصول على بيانات العميلة إذا كان clientId موجود
    let client = null
    let recipientName = null
    if (clientId) {
      client = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          name: true,
          phone: true,
          membershipNumber: true,
        },
      })
      recipientName = client?.name || null
    }

    // إرسال الرسالة
    const result = await sendMessage({
      phoneNumber,
      content,
      channel: channel as "SMS" | "WHATSAPP" | "EMAIL",
      recipientName: recipientName ?? undefined,
    })

    // حفظ الرسالة في قاعدة البيانات
    const message = await prisma.message.create({
      data: {
        clientId: clientId || null,
        campaignId: campaignId || null,
        type: channel,
        channel: channel,
        content,
        status: result.status,
        errorMessage: result.error || null,
        phoneNumber,
        recipientName,
        sentAt: result.success ? new Date() : null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            membershipNumber: true,
          },
        },
      },
    })

    // إنشاء سجل تدقيق
    const userId = (session.user as any)?.id || ""
    await logCreate(
      userId,
      "Message",
      message.id,
      { channel, recipient: recipientName || phoneNumber, content },
      `تم إرسال رسالة ${channel} إلى ${recipientName || phoneNumber}`
    )

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "فشل إرسال الرسالة",
          message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error: any) {
    console.error("Error sending message:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء إرسال الرسالة" },
      { status: 500 }
    )
  }
}


