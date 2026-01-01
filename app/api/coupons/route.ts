import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { logCreate } from "@/lib/audit-log"

export async function GET(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.COUPONS_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const isActive = searchParams.get("isActive")
    const code = searchParams.get("code")

    const where: any = {}
    if (isActive !== null) {
      where.isActive = isActive === "true"
    }
    if (code) {
      where.code = { contains: code, mode: "insensitive" }
    }

    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(coupons)
  } catch (error) {
    console.error("Error fetching coupons:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.COUPONS_CREATE, "غير مصرح لك بإنشاء الكوبونات")
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const body = await req.json()
    const {
      code,
      name,
      description,
      discountType, // "PERCENTAGE" or "FIXED"
      discountValue,
      minPurchase,
      maxDiscount,
      validFrom,
      validUntil,
      maxUses,
      isActive,
    } = body

    // Validate code uniqueness
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (existingCoupon) {
      return NextResponse.json(
        { error: "كود الكوبون موجود بالفعل" },
        { status: 400 }
      )
    }

    // Validate dates
    const from = new Date(validFrom)
    const until = new Date(validUntil)

    if (from >= until) {
      return NextResponse.json(
        { error: "تاريخ البداية يجب أن يكون قبل تاريخ الانتهاء" },
        { status: 400 }
      )
    }

    // Validate discount value
    if (discountType === "PERCENTAGE" && (discountValue < 0 || discountValue > 100)) {
      return NextResponse.json(
        { error: "نسبة الخصم يجب أن تكون بين 0 و 100" },
        { status: 400 }
      )
    }

    if (discountType === "FIXED" && discountValue < 0) {
      return NextResponse.json(
        { error: "قيمة الخصم يجب أن تكون أكبر من صفر" },
        { status: 400 }
      )
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        name,
        description: description || null,
        discountType,
        discountValue: parseFloat(discountValue),
        minPurchase: minPurchase ? parseFloat(minPurchase) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        validFrom: from,
        validUntil: until,
        maxUses: maxUses ? parseInt(maxUses) : null,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    // Create audit log
    const userId = (session.user as any)?.id || ""
    logCreate(userId, "Coupon", coupon.id, coupon, `تم إنشاء كوبون خصم جديد: ${coupon.code}`).catch(
      (error) => console.error("Error creating audit log:", error)
    )

    return NextResponse.json(coupon, { status: 201 })
  } catch (error: any) {
    console.error("Error creating coupon:", error)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "كود الكوبون موجود بالفعل" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الكوبون" },
      { status: 500 }
    )
  }
}

