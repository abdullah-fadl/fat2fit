import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { differenceInDays } from "date-fns"

/**
 * GET - تقرير الأعضاء (نوع الاشتراك، مدة الاشتراك، حالة الاشتراك)
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
    const subscriptionType = searchParams.get("subscriptionType") // نوع الاشتراك
    const status = searchParams.get("status") // حالة الاشتراك
    const minDuration = searchParams.get("minDuration") // الحد الأدنى للمدة (بالأيام)
    const maxDuration = searchParams.get("maxDuration") // الحد الأقصى للمدة

    // بناء where clause
    const where: any = {}

    if (status) {
      where.status = status
    }

    if (subscriptionType) {
      where.package = {
        nameAr: {
          contains: subscriptionType,
        },
      }
    }

    // جلب الاشتراكات
    const subscriptions = await prisma.subscription.findMany({
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
        package: {
          select: {
            id: true,
            nameAr: true,
            type: true,
            duration: true,
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // حساب مدة الاشتراك لكل اشتراك
    const membersWithDetails = subscriptions.map((sub) => {
      const subscriptionDuration = differenceInDays(sub.endDate, sub.startDate)
      const remainingDays = differenceInDays(sub.endDate, new Date())
      const isExpired = sub.endDate < new Date()

      return {
        ...sub,
        subscriptionDuration, // مدة الاشتراك بالأيام
        remainingDays: Math.max(0, remainingDays), // الأيام المتبقية
        isExpired,
      }
    })

    // فلترة حسب المدة إذا تم تحديدها
    let filteredMembers = membersWithDetails
    if (minDuration) {
      filteredMembers = filteredMembers.filter(
        (m) => m.subscriptionDuration >= parseInt(minDuration)
      )
    }
    if (maxDuration) {
      filteredMembers = filteredMembers.filter(
        (m) => m.subscriptionDuration <= parseInt(maxDuration)
      )
    }

    // إحصائيات
    const statsByType = filteredMembers.reduce((acc, member) => {
      const type = member.package.nameAr || "غير محدد"
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          totalRevenue: 0,
          active: 0,
          expired: 0,
          frozen: 0,
        }
      }
      acc[type].count++
      acc[type].totalRevenue += member.finalPrice
      if (member.status === "ACTIVE" && !member.isExpired) {
        acc[type].active++
      } else if (member.isExpired) {
        acc[type].expired++
      }
      if (member.isFrozen) {
        acc[type].frozen++
      }
      return acc
    }, {} as Record<string, any>)

    const statsByStatus = filteredMembers.reduce((acc, member) => {
      const statusKey = member.isFrozen
        ? "FROZEN"
        : member.isExpired
        ? "EXPIRED"
        : member.status
      if (!acc[statusKey]) {
        acc[statusKey] = 0
      }
      acc[statusKey]++
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      total: filteredMembers.length,
      statsByType,
      statsByStatus,
      members: filteredMembers,
    })
  } catch (error: any) {
    console.error("Error fetching members report:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء جلب تقرير الأعضاء" },
      { status: 500 }
    )
  }
}

