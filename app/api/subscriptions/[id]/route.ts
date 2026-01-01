import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { addDays, differenceInDays } from "date-fns"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { logUpdate, logDelete, logCreate } from "@/lib/audit-log"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.SUBSCRIPTIONS_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const subscription = await prisma.subscription.findUnique({
      where: { id: resolvedParams.id },
      include: {
        client: true,
        package: true,
        payments: true,
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: "الاشتراك غير موجود" }, { status: 404 })
    }

    return NextResponse.json(subscription)
  } catch (error) {
    console.error("Error fetching subscription:", error)
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
    const resolvedParams = await Promise.resolve(params)
    const body = await req.json()
    const { action, frozenReason, frozenDays, frozenEndDate } = body

    // Check permissions based on action
    let requiredPermission: string = PERMISSIONS.SUBSCRIPTIONS_VIEW
    if (action === "freeze" || action === "unfreeze") {
      requiredPermission = PERMISSIONS.SUBSCRIPTIONS_FREEZE
    } else if (action === "renew" || action === "upgrade") {
      requiredPermission = PERMISSIONS.SUBSCRIPTIONS_RENEW
    }

    const permCheck = await requirePermission(requiredPermission as any)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const userId = (session.user as any)?.id || ""

    const subscription = await prisma.subscription.findUnique({
      where: { id: resolvedParams.id },
      include: { 
        client: true,
        package: true,
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: "الاشتراك غير موجود" }, { status: 404 })
    }

    if (action === "freeze") {
      // تجميد الاشتراك
      if (subscription.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "يمكن تجميد الاشتراكات النشطة فقط" },
          { status: 400 }
        )
      }

      if (subscription.isFrozen) {
        return NextResponse.json(
          { error: "الاشتراك مجمد بالفعل" },
          { status: 400 }
        )
      }

      const frozenStart = new Date()
      let frozenEnd: Date
      let daysToFreeze: number

      if (frozenEndDate) {
        // إذا تم تحديد تاريخ انتهاء التجميد
        frozenEnd = new Date(frozenEndDate)
        daysToFreeze = differenceInDays(frozenEnd, frozenStart)
      } else if (frozenDays) {
        // إذا تم تحديد عدد الأيام
        daysToFreeze = parseInt(frozenDays)
        frozenEnd = addDays(frozenStart, daysToFreeze)
      } else {
        return NextResponse.json(
          { error: "يجب تحديد مدة التجميد" },
          { status: 400 }
        )
      }

      if (daysToFreeze <= 0) {
        return NextResponse.json(
          { error: "مدة التجميد يجب أن تكون أكبر من صفر" },
          { status: 400 }
        )
      }

      // تحديث تاريخ الانتهاء بإضافة أيام التجميد
      const newEndDate = addDays(subscription.endDate, daysToFreeze)

      const updatedSubscription = await prisma.subscription.update({
        where: { id: resolvedParams.id },
        data: {
          isFrozen: true,
          status: "FROZEN",
          frozenReason: frozenReason || null,
          frozenStartDate: frozenStart,
          frozenEndDate: frozenEnd,
          frozenDays: daysToFreeze,
          endDate: newEndDate,
        },
        include: {
          client: true,
          package: true,
        },
      })

      // إنشاء سجل تدقيق
      logUpdate(
        userId,
        "Subscription",
        subscription.id,
        subscription,
        updatedSubscription,
        `تم تجميد اشتراك العميلة: ${subscription.client.name} لمدة ${daysToFreeze} يوم. السبب: ${frozenReason || "غير محدد"}`
      ).catch((error) => console.error("Error creating audit log:", error))

      return NextResponse.json(updatedSubscription)
    } else if (action === "unfreeze") {
      // إلغاء تجميد الاشتراك
      if (!subscription.isFrozen) {
        return NextResponse.json(
          { error: "الاشتراك غير مجمد" },
          { status: 400 }
        )
      }

      const updatedSubscription = await prisma.subscription.update({
        where: { id: resolvedParams.id },
        data: {
          isFrozen: false,
          status: "ACTIVE",
          frozenReason: null,
          frozenStartDate: null,
          frozenEndDate: null,
          frozenDays: 0,
          // استعادة تاريخ الانتهاء الأصلي (تم تعديله عند التجميد)
          endDate: subscription.originalEndDate,
        },
        include: {
          client: true,
          package: true,
        },
      })

      // إنشاء سجل تدقيق
      logUpdate(
        userId,
        "Subscription",
        subscription.id,
        subscription,
        updatedSubscription,
        `تم إلغاء تجميد اشتراك العميلة: ${subscription.client.name}`
      ).catch((error) => console.error("Error creating audit log:", error))

      return NextResponse.json(updatedSubscription)
    } else if (action === "renew") {
      // تجديد الاشتراك
      const { newPackageId, startDate, discountAmount, discountPercent, couponCode, notes } = body

      // Get new package if upgrading
      let newPackage = subscription.package
      if (newPackageId && newPackageId !== subscription.packageId) {
        const packageData = await prisma.subscriptionPackage.findUnique({
          where: { id: newPackageId },
        })
        if (!packageData) {
          return NextResponse.json({ error: "الباقة غير موجودة" }, { status: 404 })
        }
        newPackage = packageData
      }

      // Calculate start date (use current end date if not specified)
      const start = startDate ? new Date(startDate) : subscription.endDate
      const endDate = addDays(start, newPackage.duration)

      // Calculate price
      let totalPrice = newPackage.price
      let finalPrice = totalPrice

      // Apply coupon discount if provided
      if (couponCode) {
        const coupon = await prisma.coupon.findUnique({
          where: { code: couponCode.toUpperCase() },
        })

        if (coupon && coupon.isActive) {
          const now = new Date()
          const isValidDate = now >= coupon.validFrom && now <= coupon.validUntil
          const isValidUsage = !coupon.maxUses || coupon.currentUses < coupon.maxUses
          const isValidMinPurchase = !coupon.minPurchase || totalPrice >= coupon.minPurchase

          if (isValidDate && isValidUsage && isValidMinPurchase) {
            if (coupon.discountType === "PERCENTAGE") {
              const couponDiscount = (totalPrice * coupon.discountValue) / 100
              finalPrice = totalPrice - (coupon.maxDiscount && couponDiscount > coupon.maxDiscount ? coupon.maxDiscount : couponDiscount)
            } else {
              finalPrice = totalPrice - (coupon.discountValue > totalPrice ? totalPrice : coupon.discountValue)
            }

            await prisma.coupon.update({
              where: { id: coupon.id },
              data: { currentUses: { increment: 1 } },
            })
          }
        }
      }

      // Apply manual discount
      if (discountPercent) {
        const discount = (totalPrice * discountPercent) / 100
        finalPrice = finalPrice - discount
      } else if (discountAmount) {
        finalPrice = finalPrice - parseFloat(discountAmount)
      }

      if (finalPrice < 0) finalPrice = 0

      // Create new subscription
      const newSubscription = await prisma.subscription.create({
        data: {
          clientId: subscription.clientId,
          packageId: newPackageId || subscription.packageId,
          startDate: start,
          endDate,
          originalEndDate: endDate,
          totalPrice,
          discountAmount: discountAmount ? parseFloat(discountAmount) : 0,
          discountPercent: discountPercent ? parseFloat(discountPercent) : null,
          finalPrice,
          autoRenew: subscription.autoRenew,
          notes: notes || null,
          status: "ACTIVE",
        },
        include: {
          client: true,
          package: true,
        },
      })

      // Update old subscription status
      await prisma.subscription.update({
        where: { id: resolvedParams.id },
        data: { status: "EXPIRED" },
      })

      // Update client status
      await prisma.client.update({
        where: { id: subscription.clientId },
        data: { status: "ACTIVE" },
      })

      // Create audit log
      logCreate(
        userId,
        "Subscription",
        newSubscription.id,
        newSubscription,
        `تم تجديد اشتراك العميلة: ${subscription.client.name}${newPackageId !== subscription.packageId ? " (ترقية)" : ""}`
      ).catch((error) => console.error("Error creating audit log:", error))

      return NextResponse.json(newSubscription)
    } else if (action === "upgrade") {
      // ترقية الباقة مع دفع الفرق
      const { newPackageId, discountAmount, discountPercent, couponCode } = body

      if (!newPackageId) {
        return NextResponse.json({ error: "يجب اختيار الباقة الجديدة" }, { status: 400 })
      }

      const newPackage = await prisma.subscriptionPackage.findUnique({
        where: { id: newPackageId },
      })

      if (!newPackage) {
        return NextResponse.json({ error: "الباقة غير موجودة" }, { status: 404 })
      }

      // Calculate remaining days in current subscription
      const now = new Date()
      const remainingDays = Math.max(0, differenceInDays(subscription.endDate, now))
      
      // Calculate pro-rated price for new package
      const dailyRateNewPackage = newPackage.price / newPackage.duration
      const newPriceForRemainingDays = dailyRateNewPackage * remainingDays
      
      const dailyRateOldPackage = subscription.finalPrice / (differenceInDays(subscription.endDate, subscription.startDate) || 1)
      const oldPriceForRemainingDays = dailyRateOldPackage * remainingDays

      // Price difference
      let priceDifference = newPriceForRemainingDays - oldPriceForRemainingDays

      // Apply coupon discount if provided
      if (couponCode && priceDifference > 0) {
        const coupon = await prisma.coupon.findUnique({
          where: { code: couponCode.toUpperCase() },
        })

        if (coupon && coupon.isActive) {
          const isValidDate = now >= coupon.validFrom && now <= coupon.validUntil
          const isValidUsage = !coupon.maxUses || coupon.currentUses < coupon.maxUses
          const isValidMinPurchase = !coupon.minPurchase || priceDifference >= coupon.minPurchase

          if (isValidDate && isValidUsage && isValidMinPurchase) {
            let couponDiscount = 0
            if (coupon.discountType === "PERCENTAGE") {
              couponDiscount = (priceDifference * coupon.discountValue) / 100
              if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
                couponDiscount = coupon.maxDiscount
              }
            } else {
              couponDiscount = coupon.discountValue > priceDifference ? priceDifference : coupon.discountValue
            }
            priceDifference = priceDifference - couponDiscount

            await prisma.coupon.update({
              where: { id: coupon.id },
              data: { currentUses: { increment: 1 } },
            })
          }
        }
      }

      // Apply manual discount
      if (discountPercent) {
        const discount = (priceDifference * discountPercent) / 100
        priceDifference = priceDifference - discount
      } else if (discountAmount) {
        priceDifference = priceDifference - parseFloat(discountAmount)
      }

      if (priceDifference < 0) priceDifference = 0

      // Update subscription
      const updatedSubscription = await prisma.subscription.update({
        where: { id: resolvedParams.id },
        data: {
          packageId: newPackageId,
          totalPrice: subscription.totalPrice + priceDifference,
          finalPrice: subscription.finalPrice + priceDifference,
        },
        include: {
          client: true,
          package: true,
        },
      })

      // Create audit log
      logUpdate(
        userId,
        "Subscription",
        subscription.id,
        subscription,
        updatedSubscription,
        `تم ترقية اشتراك العميلة: ${subscription.client.name} من ${subscription.package.nameAr} إلى ${newPackage.nameAr}. الفرق: ${priceDifference.toFixed(2)} ريال`
      ).catch((error) => console.error("Error creating audit log:", error))

      return NextResponse.json({ subscription: updatedSubscription, priceDifference })
    } else {
      return NextResponse.json(
        { error: "عملية غير صحيحة" },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Error updating subscription:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الاشتراك" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.SUBSCRIPTIONS_CANCEL)
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

    const resolvedParams = await Promise.resolve(params)
    const subscription = await prisma.subscription.findUnique({
      where: { id: resolvedParams.id },
      include: {
        client: {
          select: { name: true },
        },
        package: {
          select: { nameAr: true },
        },
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: "الاشتراك غير موجود" }, { status: 404 })
    }

    // حذف الاشتراك
    await prisma.subscription.delete({
      where: { id: resolvedParams.id },
    })

    // Create audit log
    logDelete(
      userId,
      "Subscription",
      resolvedParams.id,
      subscription,
      `تم حذف اشتراك العميلة: ${subscription.client.name} - ${subscription.package.nameAr}`
    ).catch((auditError) => {
      console.error("Error creating audit log:", auditError)
    })

    return NextResponse.json({ message: "تم حذف الاشتراك بنجاح" })
  } catch (error: any) {
    console.error("Error deleting subscription:", error)
    return NextResponse.json(
      { error: error?.message || "حدث خطأ أثناء حذف الاشتراك" },
      { status: 500 }
    )
  }
}

