import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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

    // التحقق من وجود المستخدم في قاعدة البيانات
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود في قاعدة البيانات. يرجى تسجيل الدخول مرة أخرى." },
        { status: 401 }
      )
    }

    const resolvedParams = await Promise.resolve(params)
    const subscriptionId = resolvedParams.id

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        client: true,
        package: true,
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: "الاشتراك غير موجود" }, { status: 404 })
    }

    if (subscription.status === "ACTIVE") {
      return NextResponse.json({ error: "الاشتراك مفعل بالفعل" }, { status: 400 })
    }

    // Activate subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "ACTIVE",
      },
      include: {
        client: true,
        package: true,
      },
    })

    // Update client status
    await prisma.client.update({
      where: { id: subscription.clientId },
      data: {
        status: "ACTIVE",
      },
    })

    // Create audit log - مع معالجة الأخطاء
    try {
      await prisma.auditLog.create({
        data: {
          userId: userId, // استخدام userId المؤكد
          action: "ACTIVATE",
          entityType: "Subscription",
          entityId: subscription.id,
          oldValue: JSON.stringify({ status: subscription.status }),
          newValue: JSON.stringify({ status: "ACTIVE" }),
          description: `تم تفعيل الاشتراك للعميلة: ${subscription.client.name}`,
        },
      })
    } catch (auditError: any) {
      // إذا فشل audit log، لا نمنع تفعيل الاشتراك
      console.error("Error creating audit log:", auditError)
    }

    return NextResponse.json(updatedSubscription)
  } catch (error: any) {
    console.error("Error activating subscription:", error)
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    })
    
    return NextResponse.json(
      { 
        error: error?.message || "حدث خطأ أثناء تفعيل الاشتراك",
        details: process.env.NODE_ENV === "development" ? {
          code: error?.code,
          meta: error?.meta,
        } : undefined
      },
      { status: 500 }
    )
  }
}


