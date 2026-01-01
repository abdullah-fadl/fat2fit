import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { logCreate } from "@/lib/audit-log"

export async function GET(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.CLIENTS_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const clients = await prisma.client.findMany({
      include: {
        subscriptions: {
          where: {
            status: "ACTIVE",
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error("Error fetching clients:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.CLIENTS_CREATE)
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

    // التحقق من وجود المستخدم في قاعدة البيانات
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود في قاعدة البيانات. يرجى تسجيل الدخول مرة أخرى." },
        { status: 401 }
      )
    }

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

    // Generate membership number with retry for database lock
    let membershipNumber = "MEM001"
    let lastClient
    let retries = 0
    const maxRetries = 3
    
    while (retries < maxRetries) {
      try {
        lastClient = await prisma.client.findFirst({
          orderBy: { createdAt: "desc" },
          select: { membershipNumber: true },
        })
        break
      } catch (dbError: any) {
        retries++
        if (dbError.code === "SQLITE_BUSY" || dbError.message?.includes("locked")) {
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100 * retries))
            continue
          }
        }
        throw dbError
      }
    }

    if (lastClient) {
      const lastNum = parseInt(lastClient.membershipNumber.replace("MEM", ""))
      membershipNumber = `MEM${String(lastNum + 1).padStart(3, "0")}`
    }

    // Generate QR Code (simple version - you can enhance this)
    const qrCode = `FAT2FIT-${membershipNumber}`

    // Create client with retry for database lock
    let client
    retries = 0
    
    while (retries < maxRetries) {
      try {
        client = await prisma.client.create({
          data: {
            name,
            phone,
            email: email || null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            height: height ? parseFloat(height) : null,
            weight: weight ? parseFloat(weight) : null,
            healthStatus: healthStatus || null,
            notes: notes || null,
            referredBy: referredBy || null,
            image: image || null,
            membershipNumber,
            qrCode,
            barcode: membershipNumber,
            status: "ACTIVE",
          },
        })
        break
      } catch (dbError: any) {
        retries++
        if ((dbError.code === "SQLITE_BUSY" || dbError.message?.includes("locked")) && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100 * retries))
          continue
        }
        throw dbError
      }
    }

    if (!client) {
      throw new Error("فشل إنشاء العميلة بعد عدة محاولات")
    }

    // Create audit log - non-blocking (fire and forget)
    logCreate(userId, "Client", client.id, client, `تم إنشاء عميلة جديدة: ${client.name}`).catch(
      (auditError: any) => {
        // إذا فشل audit log، لا نمنع إنشاء العميلة
        console.error("Error creating audit log:", auditError)
      }
    )

    return NextResponse.json(client, { status: 201 })
  } catch (error: any) {
    console.error("Error creating client:", error)
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    })
    
    if (error.code === "P2002") {
      // Unique constraint violation
      const field = error?.meta?.target?.[0] || "حقل"
      if (field === "phone") {
        return NextResponse.json(
          { error: "رقم الجوال مستخدم بالفعل" },
          { status: 400 }
        )
      } else if (field === "membershipNumber") {
        return NextResponse.json(
          { error: "رقم العضوية مستخدم بالفعل" },
          { status: 400 }
        )
      } else if (field === "qrCode" || field === "barcode") {
        return NextResponse.json(
          { error: "حدث خطأ في إنشاء رقم العضوية. يرجى المحاولة مرة أخرى." },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: `ال${field} مستخدم بالفعل` },
        { status: 400 }
      )
    }

    if (error.code === "P2003") {
      // Foreign key constraint failed
      const field = error?.meta?.field_name || error?.meta?.column_name || "حقل غير معروف"
      let fieldName = "حقل غير معروف"
      
      if (field?.includes("userId") || field === "userId") {
        fieldName = "المستخدم"
      } else if (field?.includes("clientId") || field === "clientId") {
        fieldName = "العميلة"
      } else if (field?.includes("subscriptionId") || field === "subscriptionId") {
        fieldName = "الاشتراك"
      }
      
      return NextResponse.json(
        { 
          error: `خطأ في القيد الخارجي: ${fieldName} غير موجود في قاعدة البيانات`,
          details: process.env.NODE_ENV === "development" ? {
            field,
            meta: error?.meta,
          } : undefined
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: error?.message || "حدث خطأ أثناء إنشاء العميلة",
        details: process.env.NODE_ENV === "development" ? {
          code: error?.code,
          meta: error?.meta,
        } : undefined
      },
      { status: 500 }
    )
  }
}

