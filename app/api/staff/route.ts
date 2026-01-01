import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { logCreate } from "@/lib/audit-log"

export async function GET(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.STAFF_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const staff = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            auditLogs: true,
            checkIns: true,
            invoices: true,
          },
        },
      },
    })

    return NextResponse.json(staff)
  } catch (error) {
    console.error("Error fetching staff:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.STAFF_CREATE, "غير مصرح لك بإنشاء الموظفات")
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      email,
      phone,
      password,
      role,
      specialization,
      hourlyRate,
      bio,
      schedules,
    } = body

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        password: hashedPassword,
        role: role || "RECEPTION",
      },
    })

    // Create audit log
    const userId = (session.user as any)?.id || ""
    logCreate(userId, "User", user.id, user, `تم إنشاء موظف/مدربة جديد: ${user.name}`).catch(
      (error) => console.error("Error creating audit log:", error)
    )

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    console.error("Error creating staff:", error)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "البريد الإلكتروني أو رقم الهاتف مستخدم بالفعل" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الموظف" },
      { status: 500 }
    )
  }
}

