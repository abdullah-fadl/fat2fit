import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"

/**
 * GET - التقرير المالي مع البحث بالمدة
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

    // جلب المدفوعات في الفترة
    const payments = await prisma.payment.findMany({
      where: {
        paymentDate: {
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
          },
        },
        subscription: {
          include: {
            package: {
              select: {
                nameAr: true,
              },
            },
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    })

    // جلب الفواتير المدفوعة في الفترة
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        status: "PAID",
        paidAt: {
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
          },
        },
        subscription: {
          include: {
            package: {
              select: {
                nameAr: true,
              },
            },
          },
        },
      },
      orderBy: {
        paidAt: "desc",
      },
    })

    // حساب الإجماليات
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalInvoices = paidInvoices.reduce((sum, i) => sum + i.total, 0)
    
    // إجمالي الإيرادات (تجنب الحساب المزدوج)
    // نأخذ الفواتير التي ليس لها مدفوعات مسجلة
    const invoicesWithoutPayments = paidInvoices.filter(
      (inv) => !payments.some((p) => p.invoiceId === inv.id)
    )
    const revenueFromInvoicesOnly = invoicesWithoutPayments.reduce(
      (sum, i) => sum + i.total,
      0
    )

    const totalRevenue = totalPayments + revenueFromInvoicesOnly

    // تفصيل حسب طريقة الدفع
    const paymentMethods = payments.reduce((acc, p) => {
      const method = p.paymentMethod || "غير محدد"
      acc[method] = (acc[method] || 0) + p.amount
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      period: {
        startDate: start,
        endDate: end,
      },
      summary: {
        totalRevenue,
        totalPayments,
        totalInvoices: paidInvoices.length,
        paymentMethods,
      },
      payments,
      invoices: paidInvoices,
    })
  } catch (error: any) {
    console.error("Error fetching financial report:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء جلب التقرير المالي" },
      { status: 500 }
    )
  }
}

