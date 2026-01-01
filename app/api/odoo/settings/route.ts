import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission, PERMISSIONS } from "@/lib/auth-utils"

// GET - الحصول على إعدادات Odoo
export async function GET(req: NextRequest) {
  try {
    const permCheck = await requirePermission([PERMISSIONS.STAFF_VIEW, PERMISSIONS.INVOICES_VIEW])
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const settings = await prisma.odooSettings.findFirst({
      orderBy: { createdAt: "desc" },
    })

    // إخفاء API Key من النتيجة
    if (settings) {
      const { apiKey, ...safeSettings } = settings
      return NextResponse.json({
        ...safeSettings,
        hasApiKey: !!apiKey,
      })
    }

    return NextResponse.json(null)
  } catch (error) {
    console.error("Error fetching Odoo settings:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الإعدادات" },
      { status: 500 }
    )
  }
}

// POST/PUT - حفظ إعدادات Odoo
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
    const {
      url,
      database,
      username,
      apiKey,
      isActive,
      syncClients,
      syncInvoices,
      syncPayments,
      notes,
    } = body

    // التحقق من البيانات المطلوبة (URL, database, username)
    if (!url || !database || !username) {
      return NextResponse.json(
        { error: "عنوان Odoo وقاعدة البيانات واسم المستخدم مطلوبة" },
        { status: 400 }
      )
    }

    // البحث عن إعدادات موجودة
    const existing = await prisma.odooSettings.findFirst({
      orderBy: { createdAt: "desc" },
    })

    // إذا كان API Key غير موجود في الطلب وكانت هناك إعدادات موجودة، نستخدم API Key المحفوظ
    let finalApiKey = apiKey
    if (!finalApiKey && existing && existing.apiKey) {
      finalApiKey = existing.apiKey
    }

    // إذا لم يكن هناك إعدادات موجودة ولا API Key في الطلب
    if (!finalApiKey && !existing) {
      return NextResponse.json(
        { error: "API Key مطلوب لإعدادات جديدة" },
        { status: 400 }
      )
    }

    let settings
    if (existing) {
      // تحديث الإعدادات الموجودة
      const updateData: any = {
        url,
        database,
        username,
        isActive: isActive ?? false,
        syncClients: syncClients ?? true,
        syncInvoices: syncInvoices ?? true,
        syncPayments: syncPayments ?? true,
        notes: notes || null,
      }

      // تحديث API Key فقط إذا تم إرساله
      if (apiKey) {
        updateData.apiKey = apiKey
      }

      settings = await prisma.odooSettings.update({
        where: { id: existing.id },
        data: updateData,
      })
    } else {
      // إنشاء إعدادات جديدة (يجب أن يكون هناك API Key)
      settings = await prisma.odooSettings.create({
        data: {
          url,
          database,
          username,
          apiKey: finalApiKey!,
          isActive: isActive ?? false,
          syncClients: syncClients ?? true,
          syncInvoices: syncInvoices ?? true,
          syncPayments: syncPayments ?? true,
          notes: notes || null,
        },
      })
    }

    // إخفاء API Key من النتيجة
    const { apiKey: _, ...safeSettings } = settings

    return NextResponse.json({
      ...safeSettings,
      hasApiKey: true,
    })
  } catch (error: any) {
    console.error("Error saving Odoo settings:", error)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "الإعدادات موجودة بالفعل" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "حدث خطأ أثناء حفظ الإعدادات" },
      { status: 500 }
    )
  }
}


