// @ts-nocheck - Odoo fields غير موجودة في schema حالياً
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission, PERMISSIONS } from "@/lib/auth-utils"
import { getOdooClient, getAvailableDatabases } from "@/lib/odoo"

// POST - مزامنة مع Odoo
export async function POST(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.STAFF_EDIT)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const body = await req.json()
    const { type, ids } = body // type: 'client', 'invoice', 'payment', 'all'

    const { client, error: clientError } = await getOdooClient(true) // السماح بالإعدادات غير المفعلة للاختبار
    if (!client) {
      return NextResponse.json(
        { error: clientError || "لم يتم تكوين إعدادات Odoo بشكل صحيح أو البيانات غير صحيحة" },
        { status: 400 }
      )
    }

    const results: any = {
      success: [],
      failed: [],
    }

    // مزامنة العملاء
    if (type === "client" || type === "all") {
      const clientsToSync = ids
        ? await prisma.client.findMany({
            where: { id: { in: ids } },
          })
        : await prisma.client.findMany({
            where: {
              OR: [
                { odooSyncStatus: { not: "SUCCESS" } },
                { odooSyncStatus: null },
                { odooPartnerId: null },
              ],
            },
            take: 50, // حد أقصى 50 عميلة في كل مرة
          })

      for (const clientData of clientsToSync) {
        try {
          const partnerId = await client.createOrFindPartner({
            name: clientData.name,
            email: clientData.email || undefined,
            phone: clientData.phone,
            mobile: clientData.phone,
            customer_rank: 1,
            comment: clientData.notes || undefined,
          })

          await prisma.client.update({
            where: { id: clientData.id },
            data: {
              odooPartnerId: partnerId,
              odooSyncStatus: "SUCCESS",
              odooSyncedAt: new Date(),
            },
          })

          results.success.push({
            type: "client",
            id: clientData.id,
            odooId: partnerId,
          })
        } catch (error: any) {
          await prisma.client.update({
            where: { id: clientData.id },
            data: {
              odooSyncStatus: "FAILED",
              odooSyncedAt: new Date(),
            },
          })

          results.failed.push({
            type: "client",
            id: clientData.id,
            error: error.message,
          })
        }
      }
    }

    // مزامنة الفواتير
    if (type === "invoice" || type === "all") {
      const invoicesToSync = ids
        ? await prisma.invoice.findMany({
            where: { id: { in: ids } },
            include: { client: true, subscription: { include: { package: true } } },
          })
        : await prisma.invoice.findMany({
            where: {
              OR: [
                { odooSyncStatus: { not: "SUCCESS" } },
                { odooSyncStatus: null },
                { odooInvoiceId: null },
              ],
            },
            include: { client: true, subscription: { include: { package: true } } },
            take: 50,
          })

      for (const invoiceData of invoicesToSync) {
        try {
          // التأكد من وجود العميل في Odoo أولاً
          if (!invoiceData.client.odooPartnerId) {
            const partnerId = await client.createOrFindPartner({
              name: invoiceData.client.name,
              email: invoiceData.client.email || undefined,
              phone: invoiceData.client.phone,
            })
            await prisma.client.update({
              where: { id: invoiceData.clientId },
              data: { odooPartnerId: partnerId },
            })
          }

          const invoiceId = await client.createInvoice({
            partner_id: invoiceData.client.odooPartnerId!,
            invoice_date: invoiceData.createdAt.toISOString().split("T")[0],
            invoice_line_ids: [
              {
                name: invoiceData.subscription?.package?.nameAr || "اشتراك نادي",
                quantity: 1,
                price_unit: invoiceData.subtotal,
              },
            ],
            amount_total: invoiceData.total,
            amount_tax: invoiceData.taxAmount,
            amount_untaxed: invoiceData.subtotal - invoiceData.discountAmount,
            invoice_origin: invoiceData.invoiceNumber,
            narration: invoiceData.notes || undefined,
          })

          // تأكيد الفاتورة إذا كانت مدفوعة
          if (invoiceData.status === "PAID") {
            await client.confirmInvoice(invoiceId)
          }

          await prisma.invoice.update({
            where: { id: invoiceData.id },
            data: {
              odooInvoiceId: invoiceId,
              odooSyncStatus: "SUCCESS",
              odooSyncedAt: new Date(),
            },
          })

          results.success.push({
            type: "invoice",
            id: invoiceData.id,
            odooId: invoiceId,
          })
        } catch (error: any) {
          await prisma.invoice.update({
            where: { id: invoiceData.id },
            data: {
              odooSyncStatus: "FAILED",
              odooSyncedAt: new Date(),
            },
          })

          results.failed.push({
            type: "invoice",
            id: invoiceData.id,
            error: error.message,
          })
        }
      }
    }

    // تحديث إعدادات آخر مزامنة
    await prisma.odooSettings.updateMany({
      where: { isActive: true },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: results.failed.length > 0 ? "PARTIAL" : "SUCCESS",
      },
    })

    return NextResponse.json(results)
  } catch (error: any) {
    console.error("Error syncing with Odoo:", error)
    return NextResponse.json(
      { error: `حدث خطأ أثناء المزامنة: ${error.message}` },
      { status: 500 }
    )
  }
}

// GET - اختبار الاتصال مع Odoo
export async function GET(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.STAFF_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    // التحقق من وجود إعدادات أولاً (حتى لو لم تكن مفعلة)
    const settings = await prisma.odooSettings.findFirst({
      orderBy: { createdAt: "desc" },
    })

    if (!settings) {
      return NextResponse.json(
        { success: false, error: "لم يتم تكوين إعدادات Odoo. يرجى حفظ الإعدادات أولاً." },
        { status: 400 }
      )
    }

    // التحقق من البيانات المطلوبة
    if (!settings.url || !settings.database || !settings.username || !settings.apiKey) {
      return NextResponse.json(
        { success: false, error: "إعدادات Odoo غير مكتملة. يرجى التأكد من إدخال جميع البيانات." },
        { status: 400 }
      )
    }

    // محاولة الحصول على قائمة قواعد البيانات إذا فشل الاتصال
    let databases: string[] = []
    try {
      databases = await getAvailableDatabases(settings.url)
    } catch (error) {
      console.error("Error getting databases:", error)
    }

    const { client, error: clientError } = await getOdooClient(true) // السماح بالإعدادات غير المفعلة للاختبار
    if (!client) {
      let errorMessage = clientError || "فشل الاتصال بـ Odoo. يرجى التحقق من البيانات (URL، Database، Username، API Key)."
      
      // إضافة قائمة قواعد البيانات المتاحة إذا كانت موجودة
      if (databases.length > 0) {
        errorMessage += `\n\nقواعد البيانات المتاحة:\n${databases.map((db) => `- ${db}`).join("\n")}`
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }

    // الاتصال نجح (تم المصادقة بالفعل في getOdooClient)
    return NextResponse.json({ 
      success: true, 
      message: "الاتصال ناجح ✅",
      availableDatabases: databases.length > 0 ? databases : undefined
    })
  } catch (error: any) {
    console.error("Error testing Odoo connection:", error)
    return NextResponse.json(
      { success: false, error: error.message || "حدث خطأ أثناء اختبار الاتصال" },
      { status: 500 }
    )
  }
}


