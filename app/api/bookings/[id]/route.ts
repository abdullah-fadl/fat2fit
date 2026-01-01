// @ts-nocheck - هذا الملف معطل مؤقتاً لأن Booking model غير موجود في schema
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.BOOKINGS_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    // هذه الميزة غير مفعلة حالياً - Booking model غير موجود في schema
    return NextResponse.json(
      { error: "ميزة الحجوزات غير مفعلة حالياً" },
      { status: 501 }
    )

    /* الكود أدناه معطل مؤقتاً
    const resolvedParams = await Promise.resolve(params)
    // @ts-ignore - Booking model not in schema
    const booking = await prisma.booking.findUnique({
      where: { id: resolvedParams.id },
      include: {
        client: true,
        class: {
          include: {
            trainer: true,
          },
        },
        trainer: true,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "الحجز غير موجود" }, { status: 404 })
    }

    return NextResponse.json(booking)
    */
  } catch (error) {
    console.error("Error fetching booking:", error)
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
    // هذه الميزة غير مفعلة حالياً
    return NextResponse.json(
      { error: "ميزة الحجوزات غير مفعلة حالياً" },
      { status: 501 }
    )

    const permCheck = await requirePermission(PERMISSIONS.BOOKINGS_EDIT)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const body = await req.json()
    const { status, cancellationReason } = body

    // @ts-ignore - Booking model not in schema
    const booking = await prisma.booking.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!booking) {
      return NextResponse.json({ error: "الحجز غير موجود" }, { status: 404 })
    }

    // @ts-ignore - Booking model not in schema
    const updatedBooking = await prisma.booking.update({
      where: { id: resolvedParams.id },
      data: {
        status,
        cancelledAt: status === "CANCELLED" ? new Date() : null,
        cancelledBy: status === "CANCELLED" ? "STAFF" : null,
        cancellationReason: cancellationReason || null,
      },
      include: {
        client: true,
        class: true,
      },
    })

    return NextResponse.json(updatedBooking)
  } catch (error) {
    console.error("Error updating booking:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الحجز" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // هذه الميزة غير مفعلة حالياً
    return NextResponse.json(
      { error: "ميزة الحجوزات غير مفعلة حالياً" },
      { status: 501 }
    )

    const permCheck = await requirePermission(PERMISSIONS.BOOKINGS_DELETE, "غير مصرح لك بحذف الحجوزات")
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    // @ts-ignore - Booking model not in schema
    await prisma.booking.delete({
      where: { id: resolvedParams.id },
    })

    return NextResponse.json({ message: "تم الحذف بنجاح" })
  } catch (error) {
    console.error("Error deleting booking:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف الحجز" },
      { status: 500 }
    )
  }
}

