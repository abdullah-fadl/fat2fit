// @ts-nocheck - Odoo fields غير موجودة في schema حالياً
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * REST API endpoint لاستقبال بيانات المدفوعات من Odoo
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
      odoo_id,              // ID الدفعة من Odoo
      client_odoo_id,       // ID العميلة من Odoo
      invoice_number,       // رقم الفاتورة (اختياري)
      amount,               // المبلغ
      payment_method,       // طريقة الدفع
      payment_date,         // تاريخ الدفعة
      reference_number,     // رقم المرجع
      action,               // create, update, delete
    } = body

    if (!odoo_id || !client_odoo_id || !amount) {
      return NextResponse.json(
        { error: "بيانات الدفعة غير كاملة" },
        { status: 400 }
      )
    }

    // البحث عن العميلة
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
      // حذف الدفعة بناءً على reference_number
      if (reference_number) {
        await prisma.payment.deleteMany({
          where: { referenceNumber: reference_number },
        })
        return NextResponse.json({ success: true, message: "تم حذف الدفعة" })
      }
    }

    // البحث عن فاتورة إذا كان invoice_number موجوداً
    let invoice = null
    if (invoice_number) {
      invoice = await prisma.invoice.findUnique({
        where: { invoiceNumber: invoice_number },
      })
    }

    // البحث عن دفعة موجودة
    const existingPayment = reference_number
      ? await prisma.payment.findFirst({
          where: { referenceNumber: reference_number },
        })
      : null

    const paymentData = {
      clientId: client.id,
      invoiceId: invoice?.id || null,
      amount: parseFloat(amount),
      paymentMethod: payment_method || "CASH",
      referenceNumber: reference_number || `ODOO-${odoo_id}`,
      paymentDate: payment_date ? new Date(payment_date) : new Date(),
      notes: `مستوردة من Odoo - ID: ${odoo_id}`,
    }

    if (existingPayment) {
      // تحديث الدفعة
      const updated = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: paymentData,
      })
      return NextResponse.json({
        success: true,
        message: "تم تحديث الدفعة",
        payment_id: updated.id,
      })
    } else {
      // إنشاء دفعة جديدة
      const payment = await prisma.payment.create({
        data: paymentData,
      })

      // تحديث المديونية للعميلة
      await prisma.client.update({
        where: { id: client.id },
        data: {
          totalDebt: Math.max(0, client.totalDebt - parseFloat(amount)),
        },
      })

      return NextResponse.json(
        {
          success: true,
          message: "تم إنشاء الدفعة",
          payment_id: payment.id,
        },
        { status: 201 }
      )
    }
  } catch (error: any) {
    console.error("Error in Odoo webhook (payments):", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء معالجة البيانات" },
      { status: 500 }
    )
  }
}





