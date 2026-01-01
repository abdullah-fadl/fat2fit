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
    const permCheck = await requirePermission(PERMISSIONS.CLIENTS_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const client = await prisma.client.findUnique({
      where: { id: resolvedParams.id },
      include: {
        subscriptions: {
          include: {
            package: true,
            payments: true,
            invoices: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        payments: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        invoices: {
          include: {
            payments: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        checkIns: {
          orderBy: {
            checkInDate: "desc",
          },
          take: 50,
        },
        clientNotes: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "العميلة غير موجودة" }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error("Error fetching client:", error)
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
    const permCheck = await requirePermission(PERMISSIONS.CLIENTS_EDIT)
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
      phone,
      email,
      dateOfBirth,
      height,
      weight,
      healthStatus,
      notes,
      referredBy,
      image,
    } = body

    const oldClient = await prisma.client.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!oldClient) {
      return NextResponse.json({ error: "العميلة غير موجودة" }, { status: 404 })
    }

    const updatedClient = await prisma.client.update({
      where: { id: resolvedParams.id },
      data: {
        name: name,
        phone: phone,
        email: email || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        healthStatus: healthStatus || null,
        notes: notes || null,
        referredBy: referredBy || null,
        image: image !== undefined ? image : oldClient.image,
      },
    })

    // Create audit log
    const userId = (session.user as any)?.id || ""
    logUpdate(
      userId,
      "Client",
      resolvedParams.id,
      oldClient,
      updatedClient,
      `تم تحديث بيانات العميلة: ${updatedClient.name}`
    ).catch((error) => console.error("Error creating audit log:", error))

    return NextResponse.json(updatedClient)
  } catch (error: any) {
    console.error("Error updating client:", error)
    
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "رقم الجوال مستخدم بالفعل" },
        { status: 400 }
      )
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
    const permCheck = await requirePermission(PERMISSIONS.CLIENTS_DELETE)
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
    const client = await prisma.client.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, name: true },
    })

    if (!client) {
      return NextResponse.json({ error: "العميلة غير موجودة" }, { status: 404 })
    }

    // حذف العميلة (سيتم حذف البيانات المرتبطة تلقائياً بسبب onDelete: Cascade)
    await prisma.client.delete({
      where: { id: resolvedParams.id },
    })

    // Create audit log
    logDelete(userId, "Client", resolvedParams.id, client, `تم حذف العميلة: ${client.name}`).catch(
      (auditError) => {
        console.error("Error creating audit log:", auditError)
      }
    )

    return NextResponse.json({ message: "تم حذف العميلة بنجاح" })
  } catch (error: any) {
    console.error("Error deleting client:", error)
    return NextResponse.json(
      { error: error?.message || "حدث خطأ أثناء حذف العميلة" },
      { status: 500 }
    )
  }
}

