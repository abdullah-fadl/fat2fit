// نظام تسجيل الوصول والأنشطة الحساسة

import { prisma } from "./prisma"
import { headers } from "next/headers"
import { maskSensitiveData, maskPhone } from "./encryption"

export type AccessAction =
  | "LOGIN"
  | "LOGOUT"
  | "VIEW_DATA"
  | "EXPORT_DATA"
  | "DELETE_DATA"
  | "MODIFY_DATA"
  | "ACCESS_BACKUP"
  | "VIEW_SENSITIVE_DATA"

interface AccessLogData {
  userId?: string
  ipAddress: string
  userAgent?: string
  action: AccessAction
  resource?: string
  resourceId?: string
  success: boolean
  errorMessage?: string
}

/**
 * تسجيل وصول أو نشاط
 */
export async function logAccess(data: AccessLogData): Promise<void> {
  try {
    await prisma.accessLog.create({
      data: {
        userId: data.userId || null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent || null,
        action: data.action,
        resource: data.resource || null,
        resourceId: data.resourceId || null,
        success: data.success,
        errorMessage: data.errorMessage || null,
      },
    })
  } catch (error) {
    // لا نريد أن تعطل عملية التسجيل العملية الأصلية
    console.error("Failed to create access log:", error)
  }
}

/**
 * الحصول على عنوان IP من الطلب
 */
export async function getIpAddress(): Promise<string> {
  try {
    const headersList = await headers()
    const forwardedFor = headersList.get("x-forwarded-for")
    const realIp = headersList.get("x-real-ip")
    const cfConnectingIp = headersList.get("cf-connecting-ip") // Cloudflare

    if (forwardedFor) {
      return forwardedFor.split(",")[0].trim()
    }
    if (cfConnectingIp) {
      return cfConnectingIp
    }
    if (realIp) {
      return realIp
    }

    return "unknown"
  } catch (error) {
    return "unknown"
  }
}

/**
 * الحصول على User Agent
 */
export async function getUserAgent(): Promise<string | undefined> {
  try {
    const headersList = await headers()
    return headersList.get("user-agent") || undefined
  } catch (error) {
    return undefined
  }
}

/**
 * تسجيل محاولة تسجيل دخول
 */
export async function logLogin(
  userId: string | null,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const ipAddress = await getIpAddress()
  const userAgent = await getUserAgent()

  await logAccess({
    userId: userId || undefined,
    ipAddress,
    userAgent,
    action: "LOGIN",
    success,
    errorMessage,
  })
}

/**
 * تسجيل تسجيل خروج
 */
export async function logLogout(userId: string): Promise<void> {
  const ipAddress = await getIpAddress()
  const userAgent = await getUserAgent()

  await logAccess({
    userId,
    ipAddress,
    userAgent,
    action: "LOGOUT",
    success: true,
  })
}

/**
 * تسجيل عرض بيانات حساسة
 */
export async function logViewSensitiveData(
  userId: string,
  resource: string,
  resourceId: string
): Promise<void> {
  const ipAddress = await getIpAddress()
  const userAgent = await getUserAgent()

  await logAccess({
    userId,
    ipAddress,
    userAgent,
    action: "VIEW_SENSITIVE_DATA",
    resource,
    resourceId,
    success: true,
  })
}

/**
 * تسجيل تصدير بيانات
 */
export async function logDataExport(
  userId: string,
  resource: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const ipAddress = await getIpAddress()
  const userAgent = await getUserAgent()

  await logAccess({
    userId,
    ipAddress,
    userAgent,
    action: "EXPORT_DATA",
    resource,
    success,
    errorMessage,
  })
}

/**
 * تسجيل الوصول إلى النسخ الاحتياطية
 */
export async function logBackupAccess(
  userId: string,
  action: "CREATE" | "VIEW" | "DOWNLOAD" | "RESTORE",
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const ipAddress = await getIpAddress()
  const userAgent = await getUserAgent()

  await logAccess({
    userId,
    ipAddress,
    userAgent,
    action: "ACCESS_BACKUP",
    resource: `BACKUP_${action}`,
    success,
    errorMessage,
  })
}


