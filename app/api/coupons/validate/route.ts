import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const body = await req.json()
    const { code, amount } = body

    if (!code) {
      return NextResponse.json(
        { error: "يجب إدخال كود الكوبون" },
        { status: 400 }
      )
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!coupon) {
      return NextResponse.json(
        { error: "كود الكوبون غير صحيح" },
        { status: 404 }
      )
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return NextResponse.json(
        { error: "الكوبون غير نشط" },
        { status: 400 }
      )
    }

    // Check if coupon is still valid
    const now = new Date()
    if (now < coupon.validFrom) {
      return NextResponse.json(
        { error: "الكوبون لم يبدأ بعد" },
        { status: 400 }
      )
    }

    if (now > coupon.validUntil) {
      return NextResponse.json(
        { error: "الكوبون منتهي الصلاحية" },
        { status: 400 }
      )
    }

    // Check max uses
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      return NextResponse.json(
        { error: "تم تجاوز الحد الأقصى لاستخدام هذا الكوبون" },
        { status: 400 }
      )
    }

    // Check min purchase if provided
    if (coupon.minPurchase && amount && parseFloat(amount) < coupon.minPurchase) {
      return NextResponse.json(
        { error: `الحد الأدنى للشراء هو ${coupon.minPurchase} ريال` },
        { status: 400 }
      )
    }

    // Calculate discount
    let discount = 0
    if (coupon.discountType === "PERCENTAGE") {
      discount = (parseFloat(amount || "0") * coupon.discountValue) / 100
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount
      }
    } else {
      discount = coupon.discountValue
      if (parseFloat(amount || "0") < discount) {
        discount = parseFloat(amount || "0")
      }
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount: discount,
      },
    })
  } catch (error) {
    console.error("Error validating coupon:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء التحقق من الكوبون" },
      { status: 500 }
    )
  }
}







