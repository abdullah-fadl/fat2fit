// @ts-nocheck - هذا الملف معطل مؤقتاً لأن Class model غير موجود في schema
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"

export async function GET(req: NextRequest) {
  try {
    // Allow viewing classes for anyone who can view bookings
    const permCheck = await requirePermission([PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.CLASSES_MANAGE])
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    // هذه الميزة غير مفعلة حالياً - Class model غير موجود في schema
    return NextResponse.json(
      { error: "ميزة الحصص غير مفعلة حالياً" },
      { status: 501 }
    )

    /* الكود أدناه معطل مؤقتاً
    const classes = await prisma.class.findMany({
      where: { isActive: true },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
          },
        },
        classSchedules: {
          where: { isActive: true },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: { nameAr: "asc" },
    })

    return NextResponse.json(classes)
    */
  } catch (error) {
    console.error("Error fetching classes:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    // هذه الميزة غير مفعلة حالياً
    return NextResponse.json(
      { error: "ميزة الحصص غير مفعلة حالياً" },
      { status: 501 }
    )

    const permCheck = await requirePermission(PERMISSIONS.CLASSES_MANAGE, "غير مصرح لك بإنشاء الحصص")
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const body = await req.json()
    const { name, nameAr, type, trainerId, maxCapacity, duration, price, description, schedules } = body

    // @ts-ignore - Class model not in schema
    const classData = await prisma.class.create({
      data: {
        name,
        nameAr,
        type,
        trainerId: trainerId || null,
        maxCapacity: parseInt(maxCapacity),
        duration: parseInt(duration),
        price: price ? parseFloat(price) : null,
        description: description || null,
        classSchedules: {
          create: schedules?.map((schedule: any) => ({
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            isActive: true,
          })) || [],
        },
      },
      include: {
        trainer: true,
        classSchedules: true,
      },
    })

    return NextResponse.json(classData, { status: 201 })
  } catch (error) {
    console.error("Error creating class:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الحصة" },
      { status: 500 }
    )
  }
}

