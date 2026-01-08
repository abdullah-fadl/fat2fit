import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"

/**
 * GET - تقرير المبيعات (أعضاء جدد، تجديد)
 */
export async function GET(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.REPORTS_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // تحديد نطاق التاريخ
    let start: Date
    let end: Date = new Date()
    end.setHours(23, 59, 59, 999)

    if (startDate && endDate) {
      start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
    } else {
      // افتراضياً: الشهر الحالي
      start = new Date()
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
    }

    // الأعضاء الجدد (تم إنشاء العضوية في الفترة)
    const newMembers = await prisma.client.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        name: true,
        membershipNumber: true,
        phone: true,
        createdAt: true,
        subscriptions: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            package: {
              select: {
                nameAr: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // الاشتراكات (تحديد الجديدة والتجديد)
    const allSubscriptions = await prisma.subscription.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            membershipNumber: true,
            createdAt: true,
          },
        },
        package: {
          select: {
            nameAr: true,
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // فصل الاشتراكات: جديدة (لأعضاء جدد) أو تجديد (لأعضاء موجودين)
    const newSubscriptions: any[] = []
    const renewalSubscriptions: any[] = []

    for (const sub of allSubscriptions) {
      // إذا كان العميل تم إنشاؤه قبل الفترة المحددة، فهو تجديد
      if (sub.client.createdAt < start) {
        renewalSubscriptions.push(sub)
      } else {
        newSubscriptions.push(sub)
      }
    }

    // حساب الإيرادات
    const newMembersRevenue = newSubscriptions.reduce(
      (sum, s) => sum + s.finalPrice,
      0
    )
    const renewalsRevenue = renewalSubscriptions.reduce(
      (sum, s) => sum + s.finalPrice,
      0
    )

    return NextResponse.json({
      period: {
        startDate: start,
        endDate: end,
      },
      summary: {
        newMembersCount: newMembers.length,
        newMembersRevenue,
        renewalsCount: renewalSubscriptions.length,
        renewalsRevenue,
        totalRevenue: newMembersRevenue + renewalsRevenue,
      },
      newMembers,
      newSubscriptions,
      renewalSubscriptions,
    })
  } catch (error: any) {
    console.error("Error fetching sales report:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء جلب تقرير المبيعات" },
      { status: 500 }
    )
  }
}

