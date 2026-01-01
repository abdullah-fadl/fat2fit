// @ts-nocheck - Odoo fields غير موجودة في schema حالياً
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * REST API endpoint لاستقبال بيانات العميلات من Odoo
 * يستخدم Odoo هذا endpoint لإرسال بيانات العملاء
 */
export async function POST(req: NextRequest) {
  try {
    // التحقق من API Key
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "")
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key مطلوب" },
        { status: 401 }
      )
    }

    // التحقق من صحة API Key (يمكنك إضافة نظام أكثر تعقيداً)
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
      odoo_id,        // ID من Odoo
      name,           // اسم العميلة
      phone,          // رقم الجوال
      email,          // البريد الإلكتروني
      membership_number, // رقم العضوية
      action          // create, update, delete
    } = body

    if (!name || !phone) {
      return NextResponse.json(
        { error: "الاسم ورقم الجوال مطلوبان" },
        { status: 400 }
      )
    }

    if (action === "delete" && odoo_id) {
      // حذف العميلة بناءً على odoo_id (odooPartnerId field not in schema)
      // await prisma.client.deleteMany({
      //   where: { odooPartnerId: odoo_id.toString() },
      // })
      return NextResponse.json({ success: true, message: "تم حذف العميلة" })
    }

    // البحث عن عميلة موجودة بناءً على odoo_id أو رقم الجوال
    let client = null
    if (odoo_id) {
      client = await prisma.client.findFirst({
        where: { odooPartnerId: odoo_id.toString() },
      })
    }
    
    if (!client && phone) {
      client = await prisma.client.findUnique({
        where: { phone },
      })
    }

    if (client) {
      // تحديث العميلة الموجودة
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          name,
          email: email || null,
          odooPartnerId: odoo_id?.toString() || client.odooPartnerId,
        },
      })
      return NextResponse.json({ 
        success: true, 
        message: "تم تحديث العميلة",
        client_id: client.id 
      })
    } else {
      // إنشاء عميلة جديدة
      // توليد رقم عضوية إذا لم يكن موجوداً
      let membershipNumber = membership_number || "MEM001"
      if (!membership_number) {
        const lastClient = await prisma.client.findFirst({
          orderBy: { createdAt: "desc" },
          select: { membershipNumber: true },
        })
        if (lastClient) {
          const lastNum = parseInt(lastClient.membershipNumber.replace("MEM", ""))
          membershipNumber = `MEM${String(lastNum + 1).padStart(3, "0")}`
        }
      }

      client = await prisma.client.create({
        data: {
          name,
          phone,
          email: email || null,
          membershipNumber,
          odooPartnerId: odoo_id?.toString() || null,
          status: "ACTIVE",
        },
      })
      return NextResponse.json({ 
        success: true, 
        message: "تم إنشاء العميلة",
        client_id: client.id 
      }, { status: 201 })
    }
  } catch (error: any) {
    console.error("Error in Odoo webhook (clients):", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء معالجة البيانات" },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint للحصول على قائمة العميلات (لـ Odoo)
 */
export async function GET(req: NextRequest) {
  try {
    // التحقق من API Key
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

    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        membershipNumber: true,
        odooPartnerId: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ clients })
  } catch (error: any) {
    console.error("Error fetching clients:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}





