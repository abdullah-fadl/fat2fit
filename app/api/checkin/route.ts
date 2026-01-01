import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"

export async function POST(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.CHECKIN)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const body = await req.json()
    const { clientId, method = "MANUAL" } = body

    // Get client with active subscription
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        subscriptions: {
          where: {
            status: "ACTIVE",
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "العميلة غير موجودة" }, { status: 404 })
    }

    // Check if client has active subscription
    if (client.subscriptions.length === 0) {
      return NextResponse.json(
        { error: "لا يوجد اشتراك نشط للعميلة" },
        { status: 400 }
      )
    }

    const subscription = client.subscriptions[0]
    const endDate = new Date(subscription.endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (endDate < today) {
      return NextResponse.json(
        { error: "الاشتراك منتهي. يرجى تجديد الاشتراك" },
        { status: 400 }
      )
    }

    // Create check-in record
    const checkIn = await prisma.checkIn.create({
      data: {
        clientId,
        userId: (session.user as any)?.id || "",
        method,
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any)?.id || "",
        action: "CHECK_IN",
        entityType: "CheckIn",
        entityId: checkIn.id,
        description: `تم تسجيل دخول العميلة: ${client.name}`,
      },
    })

    return NextResponse.json(checkIn)
  } catch (error) {
    console.error("Error checking in:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الدخول" },
      { status: 500 }
    )
  }
}

