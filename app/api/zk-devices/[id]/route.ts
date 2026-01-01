import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { createZKDevice } from "@/lib/zk-device"

/**
 * GET - الحصول على جهاز ZK محدد
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح - هذه الصفحة للمديرات فقط" }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    const device = await prisma.zKDevice.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!device) {
      return NextResponse.json({ error: "الجهاز غير موجود" }, { status: 404 })
    }

    return NextResponse.json(device)
  } catch (error) {
    console.error("Error fetching ZK device:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

/**
 * PUT - تحديث جهاز ZK
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح - هذه الصفحة للمديرات فقط" }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    const body = await req.json()
    const { name, ip, port, password, isActive, description } = body

    const device = await prisma.zKDevice.update({
      where: { id: resolvedParams.id },
      data: {
        name: name || undefined,
        ip: ip || undefined,
        port: port || undefined,
        password: password !== undefined ? password : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        description: description !== undefined ? description : undefined,
      },
    })

    return NextResponse.json(device)
  } catch (error: any) {
    console.error("Error updating ZK device:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء تحديث الجهاز" },
      { status: 500 }
    )
  }
}

/**
 * DELETE - حذف جهاز ZK
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "غير مصرح - هذه الصفحة للمديرات فقط" }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    await prisma.zKDevice.delete({
      where: { id: resolvedParams.id },
    })

    return NextResponse.json({ success: true, message: "تم حذف الجهاز" })
  } catch (error: any) {
    console.error("Error deleting ZK device:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء حذف الجهاز" },
      { status: 500 }
    )
  }
}


