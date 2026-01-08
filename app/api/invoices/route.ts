import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { logCreate } from "@/lib/audit-log"

export async function POST(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.INVOICES_CREATE)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const body = await req.json()
    const {
      clientId,
      subscriptionId,
      subtotal,
      discountAmount,
      taxAmount,
      notes,
      couponCode,
    } = body

    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { createdAt: "desc" },
      select: { invoiceNumber: true },
    })

    let invoiceNumber = "INV-001"
    if (lastInvoice) {
      const lastNum = parseInt(lastInvoice.invoiceNumber.split("-")[1])
      invoiceNumber = `INV-${String(lastNum + 1).padStart(3, "0")}`
    }

    // حساب الضريبة من ضمن المبلغ (السعر المعروض يحتوي على الضريبة)
    // إذا كان amountAfterDiscount = 1000 ريال (يحتوي على الضريبة)
    // فإن: الضريبة = 1000 - (1000 / 1.15) = 130.43
    const amountAfterDiscount = parseFloat(subtotal) - (discountAmount || 0)
    const calculatedTax = taxAmount ? parseFloat(taxAmount) : amountAfterDiscount - (amountAfterDiscount / 1.15)
    
    const total = amountAfterDiscount // الإجمالي هو نفس المبلغ (يحتوي على الضريبة)

    // الحصول على نوع الاشتراك (الباقة) إذا كان هناك اشتراك
    let subscriptionType: string | null = null
    if (subscriptionId) {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { package: true },
      })
      subscriptionType = subscription?.package?.nameAr || subscription?.package?.name || null
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId,
        subscriptionId: subscriptionId || null,
        userId: (session.user as any)?.id || "",
        subtotal: parseFloat(subtotal),
        discountAmount: discountAmount ? parseFloat(discountAmount) : 0,
        taxAmount: calculatedTax, // استخدام الضريبة المحسوبة تلقائياً
        total,
        status: "PENDING",
        notes: notes || null,
        couponCode: couponCode || null,
        subscriptionType,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            membershipNumber: true,
            phone: true,
            email: true,
          },
        },
        subscription: {
          include: {
            package: true,
          },
        },
      },
    })

    // Create audit log
    const userId = (session.user as any)?.id || ""
    logCreate(userId, "Invoice", invoice.id, invoice, `تم إنشاء فاتورة: ${invoiceNumber}`).catch(
      (error) => console.error("Error creating audit log:", error)
    )

    // مزامنة مع Odoo إذا كانت مفعلة
    try {
      // Odoo integration - commented out until Odoo fields are added to schema
      // const { getOdooClient } = await import("@/lib/odoo")
      // const odooSettings = await prisma.odooSettings.findFirst({
      //   where: { isActive: true },
      // })
      //
      // if (odooSettings && odooSettings.syncInvoices) {
      //   const { client: odooClient, error: odooError } = await getOdooClient()
      //   if (odooClient && !odooError) {
      //     try {
      //       // Odoo integration code here
      //       // Note: odooPartnerId field needs to be added to Client model first
      //     } catch (odooSyncError) {
      //       console.error("Error syncing with Odoo:", odooSyncError)
      //     }
      //   }
      // }
    } catch (error: any) {
      console.error("Error syncing invoice with Odoo:", error)
      // لا نمنع إنشاء الفاتورة إذا فشلت المزامنة مع Odoo
      // TODO: يمكن إضافة تسجيل الخطأ في notes إذا لزم
    }

    return NextResponse.json(invoice, { status: 201 })
  } catch (error: any) {
    console.error("Error creating invoice:", error)
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    })
    
    let errorMessage = "حدث خطأ أثناء إنشاء الفاتورة"
    
    if (error?.code === "P2002") {
      errorMessage = "رقم الفاتورة مستخدم بالفعل. يرجى المحاولة مرة أخرى."
    } else if (error?.code === "P2003") {
      errorMessage = "العميلة أو الاشتراك غير موجود في قاعدة البيانات."
    } else if (error?.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? {
          code: error?.code,
          meta: error?.meta,
          message: error?.message,
        } : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.INVOICES_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const clientId = searchParams.get("clientId")
    const status = searchParams.get("status")

    const where: any = {}
    if (clientId) where.clientId = clientId
    if (status) where.status = status

    const invoices = await prisma.invoice.findMany({
      where,
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
            package: true,
          },
        },
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      // إزالة الحد الأقصى لضمان جلب جميع الفواتير للتقارير
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

