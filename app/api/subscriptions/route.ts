import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { addDays } from "date-fns"
import { logCreate } from "@/lib/audit-log"

export async function GET(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.SUBSCRIPTIONS_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get("status")
    const clientId = searchParams.get("clientId")

    const where: any = {}
    if (status) where.status = status
    if (clientId) where.clientId = clientId

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
        package: true,
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(subscriptions)
  } catch (error) {
    console.error("Error fetching subscriptions:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.SUBSCRIPTIONS_CREATE)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    // التأكد من وجود userId
    const userId = (session.user as any)?.id
    if (!userId) {
      return NextResponse.json(
        { error: "خطأ في بيانات المستخدم. يرجى تسجيل الدخول مرة أخرى." },
        { status: 401 }
      )
    }

    const body = await req.json()
    const {
      clientId,
      packageId,
      startDate,
      discountAmount,
      discountPercent,
      couponCode,
      autoRenew,
      notes,
      createInvoiceOnly, // إنشاء فاتورة فقط بدون تفعيل
    } = body

    // Get package details
    const packageData = await prisma.subscriptionPackage.findUnique({
      where: { id: packageId },
    })

    if (!packageData) {
      return NextResponse.json({ error: "الباقة غير موجودة" }, { status: 404 })
    }

    // Calculate dates
    const start = startDate ? new Date(startDate) : new Date()
    const endDate = addDays(start, packageData.duration)
    const originalEndDate = endDate

    // Calculate price
    let totalPrice = packageData.price
    let finalPrice = totalPrice
    let couponDiscountAmount = 0

    // Apply coupon discount if provided
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      })

      if (coupon && coupon.isActive) {
        const now = new Date()
        const isValidDate = now >= coupon.validFrom && now <= coupon.validUntil
        const isValidUsage = !coupon.maxUses || coupon.currentUses < coupon.maxUses
        const isValidMinPurchase = !coupon.minPurchase || totalPrice >= coupon.minPurchase

        if (isValidDate && isValidUsage && isValidMinPurchase) {
          // Calculate discount
          if (coupon.discountType === "PERCENTAGE") {
            couponDiscountAmount = (totalPrice * coupon.discountValue) / 100
            if (coupon.maxDiscount && couponDiscountAmount > coupon.maxDiscount) {
              couponDiscountAmount = coupon.maxDiscount
            }
          } else {
            couponDiscountAmount = coupon.discountValue
            if (totalPrice < couponDiscountAmount) {
              couponDiscountAmount = totalPrice
            }
          }

          finalPrice = totalPrice - couponDiscountAmount

          // Increment coupon usage
          await prisma.coupon.update({
            where: { id: coupon.id },
            data: {
              currentUses: {
                increment: 1,
              },
            },
          })
        }
      }
    }

    // Apply manual discount
    if (discountPercent) {
      const discount = (totalPrice * discountPercent) / 100
      finalPrice = finalPrice - discount
    } else if (discountAmount) {
      finalPrice = finalPrice - parseFloat(discountAmount)
    }

    if (finalPrice < 0) finalPrice = 0

    // إنشاء اشتراك بحالة PENDING إذا كانت الفاتورة فقط
    const subscriptionStatus = createInvoiceOnly ? "PENDING" : "ACTIVE"

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        clientId,
        packageId,
        startDate: start,
        endDate,
        originalEndDate,
        totalPrice,
        discountAmount: discountAmount ? parseFloat(discountAmount) : 0,
        discountPercent: discountPercent ? parseFloat(discountPercent) : null,
        finalPrice,
        autoRenew: autoRenew || false,
        notes: notes || null,
        status: subscriptionStatus,
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
        package: true,
      },
    })

    // التأكد من أن الاشتراك تم إنشاؤه بنجاح
    if (!subscription || !subscription.id) {
      return NextResponse.json(
        { error: "فشل إنشاء الاشتراك" },
        { status: 500 }
      )
    }

    // Update client status only if activating subscription
    if (!createInvoiceOnly) {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          status: "ACTIVE",
        },
      })
    }

    // Create invoice for the subscription
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
    // إذا كان finalPrice = 1000 ريال (يحتوي على الضريبة)
    // فإن: السعر الأصلي = 1000 / 1.15 = 869.57
    // والضريبة = 1000 - 869.57 = 130.43 (أو 869.57 * 0.15)
    const taxAmount = finalPrice - (finalPrice / 1.15)
    const invoiceTotal = finalPrice // الإجمالي هو نفس المبلغ (يحتوي على الضريبة)

    // التحقق من وجود جميع القيم المطلوبة قبل إنشاء الفاتورة
    const verifyUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!verifyUser) {
      return NextResponse.json(
        { error: `المستخدم غير موجود في قاعدة البيانات (ID: ${userId})` },
        { status: 400 }
      )
    }

    const verifyClient = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })
    if (!verifyClient) {
      return NextResponse.json(
        { error: `العميلة غير موجودة في قاعدة البيانات (ID: ${clientId})` },
        { status: 400 }
      )
    }

    const verifySubscription = await prisma.subscription.findUnique({
      where: { id: subscription.id },
      select: { id: true },
    })
    if (!verifySubscription) {
      return NextResponse.json(
        { error: `الاشتراك غير موجود في قاعدة البيانات (ID: ${subscription.id})` },
        { status: 400 }
      )
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId,
        subscriptionId: subscription.id,
        userId: userId, // استخدام userId المؤكد
        subtotal: totalPrice,
        discountAmount: discountAmount ? parseFloat(discountAmount) : 0,
        taxAmount,
        total: invoiceTotal,
        status: "PENDING",
        notes: notes || null,
        couponCode: couponCode || null,
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
    logCreate(
      userId,
      "Subscription",
      subscription.id,
      subscription,
      createInvoiceOnly
        ? `تم إنشاء فاتورة للاشتراك (غير مفعل): ${subscription.client.name}`
        : `تم إنشاء اشتراك جديد للعميلة: ${subscription.client.name}`
    ).catch((error) => console.error("Error creating audit log:", error))

    // مزامنة مع Odoo إذا كانت مفعلة (فقط بعد نجاح إنشاء الفاتورة)
    try {
      const { getOdooClient } = await import("@/lib/odoo")
      const odooSettings = await prisma.odooSettings.findFirst({
        where: { isActive: true },
        // syncInvoices field not in schema
      })

      if (odooSettings && invoice && invoice.client) {
        const { client: odooClient, error: odooError } = await getOdooClient()
        if (odooClient && !odooError) {
          // الحصول على بيانات العميل الكاملة مع Odoo fields
          const clientData = await prisma.client.findUnique({
            where: { id: invoice.client.id },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          })

          if (clientData) {
            // الحصول على odooPartnerId مباشرة من قاعدة البيانات باستخدام raw query
            const result = await prisma.$queryRaw<Array<{ odooPartnerId: number | null }>>`
              SELECT odooPartnerId FROM clients WHERE id = ${clientData.id}
            `
            const odooPartnerId = result[0]?.odooPartnerId || null

            // التأكد من وجود العميل في Odoo
            let partnerId = odooPartnerId
            if (!partnerId) {
              partnerId = await odooClient.createOrFindPartner({
                name: clientData.name,
                email: clientData.email || undefined,
                phone: clientData.phone,
              })
              // تحديث odooPartnerId مباشرة باستخدام raw query
              await prisma.$executeRaw`
                UPDATE clients SET odooPartnerId = ${partnerId} WHERE id = ${clientData.id}
              `
            }

            // إنشاء الفاتورة في Odoo
            const odooInvoiceId = await odooClient.createInvoice({
              partner_id: partnerId!,
              invoice_date: invoice.createdAt.toISOString().split("T")[0],
              invoice_line_ids: [
                {
                  name: subscription.package.nameAr || "اشتراك نادي",
                  quantity: 1,
                  price_unit: subscription.totalPrice,
                },
              ],
              amount_total: invoice.total,
              amount_tax: invoice.taxAmount,
              amount_untaxed: subscription.totalPrice - invoice.discountAmount,
              invoice_origin: invoiceNumber,
              narration: invoice.notes || undefined,
            })

            // تحديث الفاتورة برقم Odoo (fields not in schema)
            // await prisma.invoice.update({
            //   where: { id: invoice.id },
            //   data: {
            //     odooInvoiceId: odooInvoiceId,
            //     odooSyncStatus: "SUCCESS",
            //     odooSyncedAt: new Date(),
            //   },
            // })
          }
        }
      }
    } catch (error: any) {
      console.error("Error syncing invoice with Odoo:", error)
      // لا نمنع إنشاء الفاتورة إذا فشلت المزامنة مع Odoo
      if (invoice) {
        // try {
        //   await prisma.invoice.update({
        //     where: { id: invoice.id },
        //     data: {
        //       odooSyncStatus: "FAILED",
        //       odooSyncedAt: new Date(),
        //     },
        //   })
        // } catch (updateError) {
        //   console.error("Error updating invoice sync status:", updateError)
        // }
      }
    }

    // إرجاع البيانات المطلوبة - دائماً نرجع invoiceId للتوجيه إلى صفحة الفاتورة
    return NextResponse.json(
      {
        subscription,
        invoice,
        invoiceId: invoice.id,
        message: "تم إنشاء الاشتراك والفاتورة بنجاح.",
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error creating subscription:", error)
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    })
    
    // رسالة خطأ أكثر وضوحاً
    let errorMessage = "حدث خطأ أثناء إنشاء الاشتراك"
    
    if (error?.code === "P2003") {
      // Foreign key constraint failed
      const field = error?.meta?.field_name || "حقل غير معروف"
      errorMessage = `خطأ في القيد الخارجي: الحقل ${field} غير صالح. يرجى التحقق من البيانات.`
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

