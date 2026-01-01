import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json([])
    }

    // SQLite does not support case-insensitive mode, so we use contains
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { phone: { contains: query } },
          { membershipNumber: { contains: query } },
        ],
      },
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
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error("Error searching clients:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء البحث" },
      { status: 500 }
    )
  }
}

