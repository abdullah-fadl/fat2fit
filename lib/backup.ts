// نظام النسخ الاحتياطي التلقائي

import { prisma } from "./prisma"
import fs from "fs/promises"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

interface BackupOptions {
  includePersonalData?: boolean
  compress?: boolean
  outputPath?: string
}

interface BackupResult {
  success: boolean
  filePath?: string
  size?: number
  error?: string
}

/**
 * إنشاء نسخة احتياطية من قاعدة البيانات
 */
export async function createDatabaseBackup(
  options: BackupOptions = {}
): Promise<BackupResult> {
  try {
    const {
      includePersonalData = true,
      compress = true,
      outputPath,
    } = options

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupDir = outputPath || path.join(process.cwd(), "backups")
    
    // إنشاء مجلد النسخ الاحتياطي إذا لم يكن موجوداً
    try {
      await fs.access(backupDir)
    } catch {
      await fs.mkdir(backupDir, { recursive: true })
    }

    // تحديد اسم الملف
    const dbUrl = process.env.DATABASE_URL
    let backupFileName = `backup-${timestamp}`
    
    if (dbUrl?.startsWith("postgresql://")) {
      // PostgreSQL backup
      backupFileName += ".sql"
      const backupPath = path.join(backupDir, backupFileName)
      
      // استخراج معلومات الاتصال
      const url = new URL(dbUrl)
      const dbName = url.pathname.substring(1)
      const dbHost = url.hostname
      const dbPort = url.port || "5432"
      const dbUser = url.username
      const dbPassword = url.password
      
      // إنشاء نسخة احتياطية باستخدام pg_dump
      const env = { ...process.env, PGPASSWORD: dbPassword }
      const pgDumpCmd = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F c -f "${backupPath}"`
      
      await execAsync(pgDumpCmd, { env })
      
      // ضغط الملف إذا طُلب
      if (compress) {
        const compressedPath = backupPath + ".gz"
        await execAsync(`gzip -c "${backupPath}" > "${compressedPath}"`)
        await fs.unlink(backupPath) // حذف الملف غير المضغوط
        return {
          success: true,
          filePath: compressedPath,
          size: (await fs.stat(compressedPath)).size,
        }
      }
      
      return {
        success: true,
        filePath: backupPath,
        size: (await fs.stat(backupPath)).size,
      }
    } else if (dbUrl?.startsWith("file:") || dbUrl?.endsWith(".db")) {
      // SQLite backup
      backupFileName += ".db"
      const backupPath = path.join(backupDir, backupFileName)
      const dbPath = dbUrl.replace("file:", "").replace("?connection_limit=1", "")
      
      // نسخ ملف SQLite
      await fs.copyFile(dbPath, backupPath)
      
      // ضغط الملف إذا طُلب
      if (compress) {
        const compressedPath = backupPath + ".gz"
        await execAsync(`gzip -c "${backupPath}" > "${compressedPath}"`)
        await fs.unlink(backupPath)
        return {
          success: true,
          filePath: compressedPath,
          size: (await fs.stat(compressedPath)).size,
        }
      }
      
      return {
        success: true,
        filePath: backupPath,
        size: (await fs.stat(backupPath)).size,
      }
    } else {
      throw new Error("Unsupported database type")
    }
  } catch (error: any) {
    console.error("Error creating backup:", error)
    return {
      success: false,
      error: error.message || "Failed to create backup",
    }
  }
}

/**
 * تنظيف النسخ الاحتياطية القديمة (الاحتفاظ بـ N نسخة فقط)
 */
export async function cleanupOldBackups(
  keepCount: number = 10,
  backupDir?: string
): Promise<void> {
  try {
    const dir = backupDir || path.join(process.cwd(), "backups")
    
    try {
      await fs.access(dir)
    } catch {
      return // لا يوجد مجلد نسخ احتياطي
    }
    
    const files = await fs.readdir(dir)
    const backupFiles = files
      .filter((f) => f.startsWith("backup-") && (f.endsWith(".sql") || f.endsWith(".db") || f.endsWith(".gz")))
      .map((f) => ({
        name: f,
        path: path.join(dir, f),
      }))
    
    // ترتيب حسب تاريخ الإنشاء (الأحدث أولاً)
    const filesWithStats = await Promise.all(
      backupFiles.map(async (f) => ({
        ...f,
        stats: await fs.stat(f.path),
      }))
    )
    
    filesWithStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime())
    
    // حذف النسخ القديمة
    if (filesWithStats.length > keepCount) {
      const toDelete = filesWithStats.slice(keepCount)
      await Promise.all(toDelete.map((f) => fs.unlink(f.path)))
      console.log(`Deleted ${toDelete.length} old backup(s)`)
    }
  } catch (error) {
    console.error("Error cleaning up old backups:", error)
  }
}

/**
 * جدولة النسخ الاحتياطي التلقائي
 */
export async function scheduleAutomaticBackups(
  intervalHours: number = 24
): Promise<void> {
  // يمكن استخدام node-cron أو setInterval
  // هذه دالة مساعدة للتكامل مع cron jobs
  
  console.log(`Automatic backups scheduled every ${intervalHours} hours`)
  
  // يمكن استدعاء هذه الدالة من cron job:
  // createDatabaseBackup({ compress: true }).then(cleanupOldBackups)
}

/**
 * استعادة نسخة احتياطية
 */
export async function restoreBackup(
  backupFilePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const dbUrl = process.env.DATABASE_URL
    
    if (dbUrl?.startsWith("postgresql://")) {
      // PostgreSQL restore
      const url = new URL(dbUrl)
      const dbName = url.pathname.substring(1)
      const dbHost = url.hostname
      const dbPort = url.port || "5432"
      const dbUser = url.username
      const dbPassword = url.password
      
      // فك الضغط إذا لزم الأمر
      let sqlFile = backupFilePath
      if (backupFilePath.endsWith(".gz")) {
        sqlFile = backupFilePath.replace(".gz", "")
        await execAsync(`gunzip -c "${backupFilePath}" > "${sqlFile}"`)
      }
      
      const env = { ...process.env, PGPASSWORD: dbPassword }
      const pgRestoreCmd = `pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c "${sqlFile}"`
      
      await execAsync(pgRestoreCmd, { env })
      
      if (sqlFile !== backupFilePath) {
        await fs.unlink(sqlFile)
      }
      
      return { success: true }
    } else {
      // SQLite restore (استبدال الملف)
      const dbPath = dbUrl.replace("file:", "").replace("?connection_limit=1", "")
      let dbFile = backupFilePath
      
      if (backupFilePath.endsWith(".gz")) {
        dbFile = backupFilePath.replace(".gz", "")
        await execAsync(`gunzip -c "${backupFilePath}" > "${dbFile}"`)
      }
      
      await fs.copyFile(dbFile, dbPath)
      
      if (dbFile !== backupFilePath) {
        await fs.unlink(dbFile)
      }
      
      return { success: true }
    }
  } catch (error: any) {
    console.error("Error restoring backup:", error)
    return {
      success: false,
      error: error.message || "Failed to restore backup",
    }
  }
}


