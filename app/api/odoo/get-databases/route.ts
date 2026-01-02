import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requirePermission, PERMISSIONS } from "@/lib/auth-utils"
import { getAvailableDatabases } from "@/lib/odoo"

export async function POST(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.STAFF_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const body = await req.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL مطلوب" },
        { status: 400 }
      )
    }

    try {
      const databases = await getAvailableDatabases(url)
      return NextResponse.json({ 
        success: true, 
        databases: databases || [],
        message: databases && databases.length > 0 
          ? `تم العثور على ${databases.length} قاعدة بيانات`
          : "لم يتم العثور على قواعد بيانات متاحة"
      })
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message, databases: [] },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Error getting databases:", error)
    return NextResponse.json(
      { success: false, error: error.message || "حدث خطأ أثناء جلب قواعد البيانات", databases: [] },
      { status: 500 }
    )
  }
}







