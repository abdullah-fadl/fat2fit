import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { logUpdate, logDelete } from "@/lib/audit-log"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.INVOICES_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const invoice = await prisma.invoice.findUnique({
      where: { id: resolvedParams.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            membershipNumber: true,
            phone: true,
          },
        },
        subscription: {
          select: {
            id: true,
            status: true,
            package: {
              select: {
                nameAr: true,
              },
            },
          },
        },
        payments: {
          orderBy: {
            paymentDate: "desc",
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error fetching invoice:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

/**
 * PUT - تحديث حالة الفاتورة (للمدير فقط)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    // التحقق من أن المستخدم هو مدير فقط
    const userRole = (session.user as any)?.role
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "غير مصرح - هذه العملية للمدير فقط" },
        { status: 403 }
      )
    }

    const resolvedParams = await Promise.resolve(params)
    const body = await req.json()
    const { status: newStatus } = body

    // التحقق من أن الحالة الجديدة صحيحة
    const validStatuses = ["PENDING", "PAID", "PARTIAL", "CANCELLED", "REFUNDED"]
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: "حالة الفاتورة غير صحيحة" },
        { status: 400 }
      )
    }

    // جلب الفاتورة قبل التحديث
    const invoice = await prisma.invoice.findUnique({
      where: { id: resolvedParams.id },
      include: {
        client: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 })
    }

    // تحديث حالة الفاتورة
    const updatedInvoice = await prisma.invoice.update({
      where: { id: resolvedParams.id },
      data: {
        status: newStatus,
        paidAt: newStatus === "PAID" && !invoice.paidAt ? new Date() : invoice.paidAt,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            membershipNumber: true,
            phone: true,
          },
        },
        subscription: {
          select: {
            id: true,
            status: true,
            package: {
              select: {
                nameAr: true,
              },
            },
          },
        },
        payments: {
          orderBy: {
            paymentDate: "desc",
          },
        },
      },
    })

    // تسجيل العملية في audit log
    const userId = (session.user as any)?.id || ""
    logUpdate(
      userId,
      "Invoice",
      invoice.id,
      { status: invoice.status },
      { status: newStatus },
      `تم تغيير حالة الفاتورة ${invoice.invoiceNumber} من ${invoice.status} إلى ${newStatus}`
    ).catch((auditError: any) => {
      console.error("Error creating audit log:", auditError)
      // لا نمنع التحديث إذا فشل audit log
    })

    return NextResponse.json(updatedInvoice)
  } catch (error: any) {
    console.error("Error updating invoice status:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء تحديث حالة الفاتورة" },
      { status: 500 }
    )
  }
}

/**
 * DELETE - حذف فاتورة (للمدير فقط)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    // التحقق من أن المستخدم هو مدير فقط
    const userRole = (session.user as any)?.role
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "غير مصرح - هذه العملية للمدير فقط" },
        { status: 403 }
      )
    }

    const resolvedParams = await Promise.resolve(params)
    
    // جلب الفاتورة قبل الحذف لتسجيلها في audit log
    const invoice = await prisma.invoice.findUnique({
      where: { id: resolvedParams.id },
      include: {
        client: {
          select: {
            name: true,
            membershipNumber: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 })
    }

    // حذف الفاتورة
    await prisma.invoice.delete({
      where: { id: resolvedParams.id },
    })

    // تسجيل العملية في audit log
    const userId = (session.user as any)?.id || ""
    logDelete(
      userId,
      "Invoice",
      resolvedParams.id,
      invoice,
      `تم حذف فاتورة: ${invoice.invoiceNumber} للعميلة: ${invoice.client.name}`
    ).catch((auditError: any) => {
      console.error("Error creating audit log:", auditError)
      // لا نمنع الحذف إذا فشل audit log
    })

    return NextResponse.json(
      { success: true, message: "تم حذف الفاتورة بنجاح" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error deleting invoice:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء حذف الفاتورة" },
      { status: 500 }
    )
  }
}

