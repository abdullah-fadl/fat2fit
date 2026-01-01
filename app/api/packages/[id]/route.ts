import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { logUpdate, logDelete } from "@/lib/audit-log"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.PACKAGES_EDIT, "غير مصرح لك بتعديل الباقات")
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const body = await req.json()
    const {
      name,
      nameAr,
      type,
      duration,
      price,
      visits,
      isVIP,
      description,
      isActive,
    } = body

    const oldPackage = await prisma.subscriptionPackage.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!oldPackage) {
      return NextResponse.json({ error: "الباقة غير موجودة" }, { status: 404 })
    }

    const updatedPackage = await prisma.subscriptionPackage.update({
      where: { id: resolvedParams.id },
      data: {
        name,
        nameAr,
        type,
        duration: parseInt(duration),
        price: parseFloat(price),
        visits: visits ? parseInt(visits) : null,
        isVIP: isVIP || false,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    // Create audit log
    const userId = (session.user as any)?.id || ""
    logUpdate(
      userId,
      "Package",
      resolvedParams.id,
      oldPackage,
      updatedPackage,
      `تم تحديث باقة: ${updatedPackage.nameAr}`
    ).catch((error) => console.error("Error creating audit log:", error))

    return NextResponse.json(updatedPackage)
  } catch (error: any) {
    console.error("Error updating package:", error)
    
    if (error.code === "P2025") {
      return NextResponse.json({ error: "الباقة غير موجودة" }, { status: 404 })
    }

    return NextResponse.json(
      { error: "حدث خطأ أثناء التحديث" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.PACKAGES_DELETE, "غير مصرح لك بحذف الباقات")
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    
    // Get package before deleting/deactivating
    const packageData = await prisma.subscriptionPackage.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!packageData) {
      return NextResponse.json({ error: "الباقة غير موجودة" }, { status: 404 })
    }

    // Check if package is being used
    const subscriptions = await prisma.subscription.findFirst({
      where: { packageId: resolvedParams.id },
    })

    const userId = (session.user as any)?.id || ""

    if (subscriptions) {
      // Instead of deleting, deactivate
      const updatedPackage = await prisma.subscriptionPackage.update({
        where: { id: resolvedParams.id },
        data: { isActive: false },
      })
      
      // Create audit log
      logUpdate(
        userId,
        "Package",
        resolvedParams.id,
        packageData,
        updatedPackage,
        `تم تعطيل باقة: ${packageData.nameAr}`
      ).catch((error) => console.error("Error creating audit log:", error))

      return NextResponse.json({ message: "تم تعطيل الباقة" })
    }

    await prisma.subscriptionPackage.delete({
      where: { id: resolvedParams.id },
    })

    // Create audit log
    logDelete(userId, "Package", resolvedParams.id, packageData, `تم حذف باقة: ${packageData.nameAr}`).catch(
      (error) => console.error("Error creating audit log:", error)
    )

    return NextResponse.json({ message: "تم حذف الباقة بنجاح" })
  } catch (error: any) {
    console.error("Error deleting package:", error)
    
    if (error.code === "P2025") {
      return NextResponse.json({ error: "الباقة غير موجودة" }, { status: 404 })
    }

    return NextResponse.json(
      { error: "حدث خطأ أثناء الحذف" },
      { status: 500 }
    )
  }
}

