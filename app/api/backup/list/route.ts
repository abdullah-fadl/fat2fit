import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import fs from "fs/promises"
import path from "path"

/**
 * GET - قائمة النسخ الاحتياطية المتوفرة
 * يتطلب صلاحية ADMIN فقط
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "هذه العملية متاحة للمديرات فقط" },
        { status: 403 }
      )
    }

    const backupDir = path.join(process.cwd(), "backups")

    try {
      await fs.access(backupDir)
    } catch {
      return NextResponse.json({ backups: [] })
    }

    const files = await fs.readdir(backupDir)
    const backupFiles = files
      .filter(
        (f) =>
          f.startsWith("backup-") &&
          (f.endsWith(".sql") || f.endsWith(".db") || f.endsWith(".gz"))
      )
      .map((f) => path.join(backupDir, f))

    const backups = await Promise.all(
      backupFiles.map(async (filePath) => {
        const stats = await fs.stat(filePath)
        return {
          fileName: path.basename(filePath),
          filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        }
      })
    )

    // ترتيب حسب التاريخ (الأحدث أولاً)
    backups.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )

    return NextResponse.json({ backups })
  } catch (error: any) {
    console.error("Error listing backups:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء جلب النسخ الاحتياطية" },
      { status: 500 }
    )
  }
}


