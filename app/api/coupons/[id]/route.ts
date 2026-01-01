import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { logUpdate, logDelete } from "@/lib/audit-log"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.COUPONS_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const coupon = await prisma.coupon.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!coupon) {
      return NextResponse.json({ error: "الكوبون غير موجود" }, { status: 404 })
    }

    return NextResponse.json(coupon)
  } catch (error) {
    console.error("Error fetching coupon:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.COUPONS_EDIT, "غير مصرح لك بتعديل الكوبونات")
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
      code,
      name,
      description,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      validFrom,
      validUntil,
      maxUses,
      isActive,
    } = body

    const existingCoupon = await prisma.coupon.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingCoupon) {
      return NextResponse.json({ error: "الكوبون غير موجود" }, { status: 404 })
    }

    // Validate code uniqueness if changed
    if (code && code.toUpperCase() !== existingCoupon.code) {
      const codeExists = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() },
      })

      if (codeExists) {
        return NextResponse.json(
          { error: "كود الكوبون موجود بالفعل" },
          { status: 400 }
        )
      }
    }

    // Validate dates if provided
    if (validFrom && validUntil) {
      const from = new Date(validFrom)
      const until = new Date(validUntil)

      if (from >= until) {
        return NextResponse.json(
          { error: "تاريخ البداية يجب أن يكون قبل تاريخ الانتهاء" },
          { status: 400 }
        )
      }
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id: resolvedParams.id },
      data: {
        ...(code && { code: code.toUpperCase() }),
        ...(name && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(discountType && { discountType }),
        ...(discountValue !== undefined && { discountValue: parseFloat(discountValue) }),
        ...(minPurchase !== undefined && { minPurchase: minPurchase ? parseFloat(minPurchase) : null }),
        ...(maxDiscount !== undefined && { maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null }),
        ...(validFrom && { validFrom: new Date(validFrom) }),
        ...(validUntil && { validUntil: new Date(validUntil) }),
        ...(maxUses !== undefined && { maxUses: maxUses ? parseInt(maxUses) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    // Create audit log
    const userId = (session.user as any)?.id || ""
    logUpdate(
      userId,
      "Coupon",
      updatedCoupon.id,
      existingCoupon,
      updatedCoupon,
      `تم تحديث كوبون: ${updatedCoupon.code}`
    ).catch((error) => console.error("Error creating audit log:", error))

    return NextResponse.json(updatedCoupon)
  } catch (error: any) {
    console.error("Error updating coupon:", error)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "كود الكوبون موجود بالفعل" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الكوبون" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.COUPONS_DELETE, "غير مصرح لك بحذف الكوبونات")
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const coupon = await prisma.coupon.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!coupon) {
      return NextResponse.json({ error: "الكوبون غير موجود" }, { status: 404 })
    }

    await prisma.coupon.delete({
      where: { id: resolvedParams.id },
    })

    // Create audit log
    const userId = (session.user as any)?.id || ""
    logDelete(userId, "Coupon", coupon.id, coupon, `تم حذف كوبون: ${coupon.code}`).catch(
      (error) => console.error("Error creating audit log:", error)
    )

    return NextResponse.json({ message: "تم حذف الكوبون بنجاح" })
  } catch (error) {
    console.error("Error deleting coupon:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف الكوبون" },
      { status: 500 }
    )
  }
}

