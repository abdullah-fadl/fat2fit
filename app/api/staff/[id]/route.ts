import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { logUpdate, logDelete } from "@/lib/audit-log"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.STAFF_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const staff = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!staff) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
    }

    // Don't return password
    const { password, ...staffWithoutPassword } = staff
    return NextResponse.json(staffWithoutPassword)
  } catch (error: any) {
    console.error("Error fetching staff:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.STAFF_EDIT, "غير مصرح لك بتعديل الموظفات")
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
      email,
      phone,
      password,
      role,
      isActive,
    } = body

    const oldUser = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!oldUser) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
    }

    // Prepare update data (only fields that exist in schema)
    const updateData: any = {
      name,
      email: email || null,
      phone: phone || null,
      role,
      isActive: isActive !== undefined ? isActive : oldUser.isActive,
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: updateData,
      // include: {
      //   staffSchedules: true, // staffSchedules not in schema
      // },
    })

    // Update schedules if provided (staffSchedule model not in schema)
    /*
    if (schedules) {
      // Delete old schedules
      await prisma.staffSchedule.deleteMany({
        where: { userId: resolvedParams.id },
      })

      // Create new schedules
      if (schedules.length > 0) {
        await prisma.staffSchedule.createMany({
          data: schedules.map((schedule: any) => ({
            userId: resolvedParams.id,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            isActive: schedule.isActive !== false,
          })),
        })
      }
    }
    */

    const finalUser = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      // include: {
      //   staffSchedules: true, // staffSchedules not in schema
      // },
    })

    // Create audit log
    const userId = (session.user as any)?.id || ""
    logUpdate(
      userId,
      "User",
      resolvedParams.id,
      oldUser,
      finalUser,
      `تم تحديث بيانات الموظف: ${updatedUser.name}`
    ).catch((error) => console.error("Error creating audit log:", error))

    const { password: _, ...userWithoutPassword } = finalUser!
    return NextResponse.json(userWithoutPassword)
  } catch (error: any) {
    console.error("Error updating staff:", error)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "البريد الإلكتروني أو رقم الهاتف مستخدم بالفعل" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الموظف" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.STAFF_DELETE, "غير مصرح لك بحذف الموظفات")
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!user) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
    }

    // Don't delete, just deactivate
    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: { isActive: false },
    })

    // Create audit log
    const userId = (session.user as any)?.id || ""
    logUpdate(
      userId,
      "User",
      resolvedParams.id,
      user,
      updatedUser,
      `تم إلغاء تفعيل الموظف: ${user.name}`
    ).catch((error) => console.error("Error creating audit log:", error))

    return NextResponse.json({ message: "تم الحذف بنجاح" })
  } catch (error) {
    console.error("Error deleting staff:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف الموظف" },
      { status: 500 }
    )
  }
}

