import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"

/**
 * GET - الحصول على قائمة أجهزة ZK
 */
export async function GET(req: NextRequest) {
  try {
    // التحقق من المصادقة
    let session
    try {
      session = await auth()
    } catch (authError: any) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: "خطأ في المصادقة" }, { status: 401 })
    }

    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    // التحقق من الصلاحية
    const permCheck = await requirePermission(PERMISSIONS.ZK_DEVICES_VIEW, "غير مصرح لك بعرض أجهزة البصمة")
    if (permCheck.error) {
      return permCheck.response
    }

    // التحقق من Prisma
    if (!prisma) {
      console.error("prisma is undefined")
      return NextResponse.json(
        { error: "خطأ في الاتصال بقاعدة البيانات" },
        { status: 500 }
      )
    }

    // التحقق من أن zKDevice موجود في Prisma Client
    if (!prisma.zKDevice) {
      const availableModels = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'))
      console.error("prisma.zKDevice is undefined. Available models:", availableModels)
      return NextResponse.json(
        { error: "نموذج ZKDevice غير موجود. يرجى إعادة توليد Prisma Client" },
        { status: 500 }
      )
    }

    // جلب البيانات
    const devices = await prisma.zKDevice.findMany({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(devices || [])
  } catch (error: any) {
    console.error("Error fetching ZK devices:", error)
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      prismaAvailable: !!prisma,
      zKDeviceAvailable: !!(prisma as any)?.zKDevice,
    })
    // إرجاع رسالة خطأ واضحة
    const errorMessage = error?.message || "حدث خطأ أثناء جلب البيانات"
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST - إضافة جهاز ZK جديد
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    // التحقق من الصلاحية
    const permCheck = await requirePermission(PERMISSIONS.ZK_DEVICES_MANAGE, "غير مصرح لك بإدارة أجهزة البصمة")
    if (permCheck.error) {
      return permCheck.response
    }

    const body = await req.json()
    const { name, ip, port, password, description } = body

    if (!name || !ip) {
      return NextResponse.json(
        { error: "الاسم وعنوان IP مطلوبان" },
        { status: 400 }
      )
    }

    const device = await prisma.zKDevice.create({
      data: {
        name,
        ip,
        port: port || 4370,
        password: password || null,
        description: description || null,
        isActive: true,
      },
    })

    return NextResponse.json(device, { status: 201 })
  } catch (error: any) {
    console.error("Error creating ZK device:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء إنشاء الجهاز" },
      { status: 500 }
    )
  }
}

