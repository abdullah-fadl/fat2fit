import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * REST API endpoint لاستقبال بيانات الفواتير من Odoo
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "")
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key مطلوب" },
        { status: 401 }
      )
    }

    const settings = await prisma.odooSettings.findFirst({
      where: { isActive: true },
    })

    if (!settings || settings.apiKey !== apiKey) {
      return NextResponse.json(
        { error: "API Key غير صحيح" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const {
      odoo_id,              // ID الفاتورة من Odoo
      client_odoo_id,       // ID العميلة من Odoo
      invoice_number,       // رقم الفاتورة
      subtotal,             // الإجمالي قبل الخصم
      discount_amount,      // قيمة الخصم
      tax_amount,           // الضريبة
      total,                // الإجمالي النهائي
      invoice_date,         // تاريخ الفاتورة
      status,               // حالة الفاتورة
      action,               // create, update, delete
    } = body

    if (!odoo_id || !client_odoo_id || !invoice_number) {
      return NextResponse.json(
        { error: "بيانات الفاتورة غير كاملة" },
        { status: 400 }
      )
    }

    // البحث عن العميلة بناءً على odoo_id
    const client = await prisma.client.findFirst({
      where: { odooPartnerId: client_odoo_id.toString() },
    })

    if (!client) {
      return NextResponse.json(
        { error: "العميلة غير موجودة" },
        { status: 404 }
      )
    }

    if (action === "delete") {
      // حذف الفاتورة
      await prisma.invoice.deleteMany({
        where: { invoiceNumber: invoice_number },
      })
      return NextResponse.json({ success: true, message: "تم حذف الفاتورة" })
    }

    // البحث عن فاتورة موجودة
    let invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber: invoice_number },
    })

    const invoiceData = {
      clientId: client.id,
      subtotal: parseFloat(subtotal) || 0,
      discountAmount: parseFloat(discount_amount) || 0,
      taxAmount: parseFloat(tax_amount) || 0,
      total: parseFloat(total) || 0,
      status: status || "PENDING",
      notes: `مستوردة من Odoo - ID: ${odoo_id}`,
    }

    if (invoice) {
      // تحديث الفاتورة
      invoice = await prisma.invoice.update({
        where: { id: invoice.id },
        data: invoiceData,
      })
      return NextResponse.json({
        success: true,
        message: "تم تحديث الفاتورة",
        invoice_id: invoice.id,
      })
    } else {
      // إنشاء فاتورة جديدة
      // نحتاج userId - يمكن استخدام المستخدم الأول أو إنشاء مستخدم افتراضي
      const defaultUser = await prisma.user.findFirst({
        where: { role: "ADMIN" },
      })

      if (!defaultUser) {
        return NextResponse.json(
          { error: "لا يوجد مستخدم في النظام" },
          { status: 500 }
        )
      }

      invoice = await prisma.invoice.create({
        data: {
          ...invoiceData,
          invoiceNumber: invoice_number,
          userId: defaultUser.id,
        },
      })

      return NextResponse.json(
        {
          success: true,
          message: "تم إنشاء الفاتورة",
          invoice_id: invoice.id,
        },
        { status: 201 }
      )
    }
  } catch (error: any) {
    console.error("Error in Odoo webhook (invoices):", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء معالجة البيانات" },
      { status: 500 }
    )
  }
}





