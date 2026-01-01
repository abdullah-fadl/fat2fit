import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"

export async function GET(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.BOOKINGS_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const date = searchParams.get("date")
    const classId = searchParams.get("classId")
    const clientId = searchParams.get("clientId")

    const where: any = {}
    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      where.bookingDate = {
        gte: startDate,
        lte: endDate,
      }
    }
    if (classId) where.classId = classId
    if (clientId) where.clientId = clientId

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            membershipNumber: true,
          },
        },
        class: {
          select: {
            id: true,
            nameAr: true,
            maxCapacity: true,
          },
        },
        trainer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        bookingDate: "asc",
      },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.BOOKINGS_CREATE)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const body = await req.json()
    const { clientId, classId, scheduleId, bookingDate, startTime, endTime, trainerId, bookingType, ptId } = body

    // Check capacity if it's a group class
    if (classId && bookingType === "GROUP") {
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          _count: {
            select: {
              bookings: {
                where: {
                  bookingDate: new Date(bookingDate),
                  status: { in: ["CONFIRMED", "COMPLETED"] },
                },
              },
            },
          },
        },
      })

      if (classData && classData._count.bookings >= classData.maxCapacity) {
        return NextResponse.json(
          { error: "الحصة ممتلئة" },
          { status: 400 }
        )
      }
    }

    const booking = await prisma.booking.create({
      data: {
        clientId,
        classId: classId || null,
        scheduleId: scheduleId || null,
        bookingDate: new Date(bookingDate),
        startTime,
        endTime,
        trainerId: trainerId || null,
        bookingType: bookingType || "GROUP",
        ptId: ptId || null,
        status: "CONFIRMED",
      },
      include: {
        client: true,
        class: true,
      },
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error("Error creating booking:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الحجز" },
      { status: 500 }
    )
  }
}

