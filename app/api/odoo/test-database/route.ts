import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requirePermission, PERMISSIONS } from "@/lib/auth-utils"
import { OdooClient } from "@/lib/odoo"

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
    const { url, database, username, apiKey } = body

    if (!url || !database || !username || !apiKey) {
      return NextResponse.json(
        { success: false, error: "جميع الحقول مطلوبة" },
        { status: 400 }
      )
    }

    try {
      const client = new OdooClient({
        url,
        database,
        username,
        apiKey,
      })

      await client.authenticate()
      return NextResponse.json({ 
        success: true, 
        database,
        message: `✅ قاعدة البيانات الصحيحة: ${database}` 
      })
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Error testing database:", error)
    return NextResponse.json(
      { success: false, error: error.message || "حدث خطأ أثناء الاختبار" },
      { status: 500 }
    )
  }
}







