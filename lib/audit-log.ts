import { prisma } from "./prisma"
import { headers } from "next/headers"

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "LOGIN" | "LOGOUT" | "CHECKIN"
export type EntityType =
  | "Client"
  | "Subscription"
  | "Invoice"
  | "Payment"
  | "User"
  | "Package"
  | "Coupon"
  | "CheckIn"
  | "ZKDevice"
  | "Backup"
  | "Campaign"
  | "Message"
  | "SecuritySettings"

interface AuditLogData {
  userId: string
  action: AuditAction
  entityType: EntityType
  entityId: string
  oldValue?: any
  newValue?: any
  description?: string
  ipAddress?: string
}

/**
 * تسجيل نشاط في سجل التدقيق
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValue: data.oldValue ? JSON.stringify(data.oldValue) : null,
        newValue: data.newValue ? JSON.stringify(data.newValue) : null,
        description: data.description || null,
        ipAddress: data.ipAddress || null,
      },
    })
  } catch (error) {
    // لا نريد أن تعطل عملية التسجيل العملية الأصلية
    console.error("Failed to create audit log:", error)
  }
}

/**
 * الحصول على عنوان IP من الطلب
 */
export async function getIpAddress(): Promise<string | undefined> {
  try {
    const headersList = await headers()
    const forwardedFor = headersList.get("x-forwarded-for")
    const realIp = headersList.get("x-real-ip")

    if (forwardedFor) {
      return forwardedFor.split(",")[0].trim()
    }
    if (realIp) {
      return realIp
    }

    return undefined
  } catch (error) {
    return undefined
  }
}

/**
 * Helper function لتسجيل إنشاء كيان جديد
 */
export async function logCreate(
  userId: string,
  entityType: EntityType,
  entityId: string,
  data: any,
  description?: string
): Promise<void> {
  const ipAddress = await getIpAddress()
  await createAuditLog({
    userId,
    action: "CREATE",
    entityType,
    entityId,
    newValue: data,
    description,
    ipAddress,
  })
}

/**
 * Helper function لتسجيل تعديل كيان
 */
export async function logUpdate(
  userId: string,
  entityType: EntityType,
  entityId: string,
  oldData: any,
  newData: any,
  description?: string
): Promise<void> {
  const ipAddress = await getIpAddress()
  await createAuditLog({
    userId,
    action: "UPDATE",
    entityType,
    entityId,
    oldValue: oldData,
    newValue: newData,
    description,
    ipAddress,
  })
}

/**
 * Helper function لتسجيل حذف كيان
 */
export async function logDelete(
  userId: string,
  entityType: EntityType,
  entityId: string,
  data: any,
  description?: string
): Promise<void> {
  const ipAddress = await getIpAddress()
  await createAuditLog({
    userId,
    action: "DELETE",
    entityType,
    entityId,
    oldValue: data,
    description,
    ipAddress,
  })
}


