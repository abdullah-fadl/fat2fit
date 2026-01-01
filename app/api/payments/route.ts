import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { logCreate } from "@/lib/audit-log"

export async function POST(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.PAYMENTS_CREATE)
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
      invoiceId,
      amount,
      paymentMethod,
      referenceNumber,
      notes,
      isPartial,
      remainingAmount,
    } = body

    // Get client
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return NextResponse.json({ error: "العميلة غير موجودة" }, { status: 404 })
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        clientId,
        subscriptionId: subscriptionId || null,
        invoiceId: invoiceId || null,
        amount: parseFloat(amount),
        paymentMethod,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
        isPartial: isPartial || false,
        remainingAmount: remainingAmount ? parseFloat(remainingAmount) : null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            membershipNumber: true,
            // odooPartnerId not in schema
          },
        },
        subscription: {
          include: {
            package: true,
          },
        },
        invoice: {
          select: {
            id: true,
            // odooInvoiceId not in schema
          },
        },
      },
    })

    // Update invoice status if payment is for invoice
    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true },
      })

      if (invoice) {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
        let newStatus = invoice.status

        if (totalPaid >= invoice.total) {
          newStatus = "PAID"
        } else if (totalPaid > 0) {
          newStatus = "PARTIAL"
        }

        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: newStatus,
            paidAt: newStatus === "PAID" ? new Date() : null,
          },
        })
      }
    }

    // Update client debt
    const allInvoices = await prisma.invoice.findMany({
      where: {
        clientId,
        status: { in: ["PENDING", "PARTIAL"] },
      },
      include: {
        payments: true,
      },
    })

    let totalDebt = 0
    allInvoices.forEach((invoice) => {
      const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
      totalDebt += invoice.total - paid
    })

    await prisma.client.update({
      where: { id: clientId },
      data: {
        totalDebt,
        status: totalDebt > 0 ? "HAS_DEBT" : "ACTIVE",
      },
    })

    // Create audit log
    const userId = (session.user as any)?.id || ""
    logCreate(
      userId,
      "Payment",
      payment.id,
      payment,
      `تم تسجيل دفعة: ${amount} ريال للعميلة ${client.name}`
    ).catch((error) => console.error("Error creating audit log:", error))

    // مزامنة مع Odoo إذا كانت مفعلة (معطلة مؤقتاً - Odoo fields غير موجودة في schema)
    /*
    try {
      const { getOdooClient } = await import("@/lib/odoo")
      const odooSettings = await prisma.odooSettings.findFirst({
        where: { isActive: true },
        // syncPayments field not in schema
      })

      if (odooSettings && payment.invoice?.id) {
        const { client: odooClient, error: odooError } = await getOdooClient()
        if (odooClient && !odooError && payment.client) {
          // التأكد من وجود العميل في Odoo
          let partnerId = payment.client.odooPartnerId
          if (!partnerId) {
            const clientData = await prisma.client.findUnique({
              where: { id: payment.clientId },
            })
            if (clientData) {
              partnerId = await odooClient.createOrFindPartner({
                name: clientData.name,
                email: clientData.email || undefined,
                phone: clientData.phone,
              })
              await prisma.client.update({
                where: { id: payment.clientId },
                data: { odooPartnerId: partnerId },
              })
            }
          }

          if (partnerId) {
            // إنشاء الدفعة في Odoo
            const odooPaymentId = await odooClient.createPayment({
              partner_id: partnerId,
              amount: parseFloat(amount),
              payment_date: payment.paymentDate.toISOString().split("T")[0],
              ref: payment.referenceNumber || undefined,
              communication: `دفعة للعميلة ${client.name}`,
            })

            // ربط الدفعة بالفاتورة إذا كانت موجودة في Odoo
            if (payment.invoiceId && payment.invoice.odooInvoiceId) {
              await odooClient.linkPaymentToInvoice(odooPaymentId, payment.invoice.odooInvoiceId)
            }

            // تأكيد الدفعة
            await odooClient.confirmPayment(odooPaymentId)

            // تحديث الدفعة برقم Odoo
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                odooPaymentId: odooPaymentId,
                odooSyncStatus: "SUCCESS",
                odooSyncedAt: new Date(),
              },
            })
          }
        }
      }
    } catch (error: any) {
      console.error("Error syncing payment with Odoo:", error)
      // تحديث الحالة بالفشل ولكن لا نمنع إنشاء الدفعة
      // await prisma.payment.update({
      //   where: { id: payment.id },
      //   data: {
      //     odooSyncStatus: "FAILED",
      //     odooSyncedAt: new Date(),
      //   },
      // })
    }
    */

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء تسجيل الدفعة" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.PAYMENTS_CREATE) // View payments requires payment permission
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const clientId = searchParams.get("clientId")
    const subscriptionId = searchParams.get("subscriptionId")

    const where: any = {}
    if (clientId) where.clientId = clientId
    if (subscriptionId) where.subscriptionId = subscriptionId

    const payments = await prisma.payment.findMany({
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
        invoice: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      // إزالة الحد الأقصى لضمان جلب جميع المدفوعات للتقارير
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

