import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { logCreate } from "@/lib/audit-log"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const includeInactive = searchParams.get("includeInactive") === "true"

    const packages = await prisma.subscriptionPackage.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: {
        price: "asc",
      },
    })

    return NextResponse.json(packages)
  } catch (error) {
    console.error("Error fetching packages:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.PACKAGES_CREATE, "غير مصرح لك بإنشاء الباقات")
    if (permCheck.error) {
      return permCheck.response
    }

    const body = await req.json()
    const {
      name,
      nameAr,
      type,
      duration,
      price,
      visits,
      isVIP,
      description,
    } = body

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const packageData = await prisma.subscriptionPackage.create({
      data: {
        name,
        nameAr,
        type,
        duration: parseInt(duration),
        price: parseFloat(price),
        visits: visits ? parseInt(visits) : null,
        isVIP: isVIP || false,
        description: description || null,
      },
    })

    // Create audit log
    const userId = (session.user as any)?.id || ""
    logCreate(
      userId,
      "Package",
      packageData.id,
      packageData,
      `تم إنشاء باقة جديدة: ${packageData.nameAr}`
    ).catch((error) => console.error("Error creating audit log:", error))

    return NextResponse.json(packageData, { status: 201 })
  } catch (error) {
    console.error("Error creating package:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء الباقة" },
      { status: 500 }
    )
  }
}

