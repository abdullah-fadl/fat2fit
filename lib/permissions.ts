// نظام الصلاحيات
export type Role = "ADMIN" | "RECEPTION" | "TRAINER"

export interface Permission {
  id: string
  name: string
  description: string
}

export const PERMISSIONS = {
  // إدارة العميلات
  CLIENTS_VIEW: "clients.view",
  CLIENTS_CREATE: "clients.create",
  CLIENTS_EDIT: "clients.edit",
  CLIENTS_DELETE: "clients.delete",

  // إدارة الاشتراكات
  SUBSCRIPTIONS_VIEW: "subscriptions.view",
  SUBSCRIPTIONS_CREATE: "subscriptions.create",
  SUBSCRIPTIONS_RENEW: "subscriptions.renew",
  SUBSCRIPTIONS_FREEZE: "subscriptions.freeze",
  SUBSCRIPTIONS_CANCEL: "subscriptions.cancel",
  SUBSCRIPTIONS_EXTEND: "subscriptions.extend", // إضافة مدة للاشتراك

  // الباقات
  PACKAGES_VIEW: "packages.view",
  PACKAGES_CREATE: "packages.create",
  PACKAGES_EDIT: "packages.edit",
  PACKAGES_DELETE: "packages.delete",

  // الكوبونات
  COUPONS_VIEW: "coupons.view",
  COUPONS_CREATE: "coupons.create",
  COUPONS_EDIT: "coupons.edit",
  COUPONS_DELETE: "coupons.delete",

  // الفواتير والمدفوعات
  INVOICES_VIEW: "invoices.view",
  INVOICES_CREATE: "invoices.create",
  INVOICES_EDIT: "invoices.edit",
  INVOICES_DELETE: "invoices.delete",
  PAYMENTS_CREATE: "payments.create",

  // تسجيل الدخول
  CHECKIN: "checkin.access",

  // الموظفات
  STAFF_VIEW: "staff.view",
  STAFF_CREATE: "staff.create",
  STAFF_EDIT: "staff.edit",
  STAFF_DELETE: "staff.delete",

  // الحجوزات (للمدربات)
  BOOKINGS_VIEW: "bookings.view",
  BOOKINGS_CREATE: "bookings.create",
  BOOKINGS_EDIT: "bookings.edit",
  BOOKINGS_DELETE: "bookings.delete",
  CLASSES_MANAGE: "classes.manage",

  // التقييم الصحي (للمدربات)
  HEALTH_VIEW: "health.view",
  HEALTH_CREATE: "health.create",
  HEALTH_EDIT: "health.edit",

  // التقارير
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",

  // سجل الأنشطة (Audit Log)
  AUDIT_LOG_VIEW: "audit_log.view",

  // أجهزة البصمة ZK
  ZK_DEVICES_VIEW: "zk_devices.view",
  ZK_DEVICES_MANAGE: "zk_devices.manage",

  // الرسائل والحملات التسويقية
  MESSAGES_VIEW: "messages.view",
  MESSAGES_SEND: "messages.send",
  CAMPAIGNS_VIEW: "campaigns.view",
  CAMPAIGNS_CREATE: "campaigns.create",
  CAMPAIGNS_MANAGE: "campaigns.manage",
} as const

// الصلاحيات لكل دور
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: [
    // كل الصلاحيات
    ...Object.values(PERMISSIONS),
  ],

  RECEPTION: [
    // العميلات (العضوية)
    PERMISSIONS.CLIENTS_VIEW,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_EDIT,

    // الاشتراكات
    PERMISSIONS.SUBSCRIPTIONS_VIEW,
    PERMISSIONS.SUBSCRIPTIONS_CREATE,
    PERMISSIONS.SUBSCRIPTIONS_RENEW,
    PERMISSIONS.SUBSCRIPTIONS_FREEZE,
    PERMISSIONS.SUBSCRIPTIONS_EXTEND,

    // الباقات
    PERMISSIONS.PACKAGES_VIEW,

    // الكوبونات
    PERMISSIONS.COUPONS_VIEW,

    // الفواتير والمدفوعات
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.PAYMENTS_CREATE,

    // تسجيل الدخول
    PERMISSIONS.CHECKIN,

    // الحجوزات
    PERMISSIONS.BOOKINGS_VIEW,
    PERMISSIONS.BOOKINGS_CREATE,
    PERMISSIONS.BOOKINGS_EDIT,

    // التقارير
    PERMISSIONS.REPORTS_VIEW,

    // الرسائل والحملات
    PERMISSIONS.MESSAGES_VIEW,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.CAMPAIGNS_VIEW,
    PERMISSIONS.CAMPAIGNS_CREATE,

    // ملاحظة: RECEPTION لا يمكنها الوصول إلى:
    // - AUDIT_LOG_VIEW (سجل الأنشطة)
    // - ZK_DEVICES_VIEW (أجهزة البصمة)
    // - STAFF_* (إدارة الموظفات)
    // - CAMPAIGNS_MANAGE (إدارة متقدمة للحملات)
  ],

  TRAINER: [
    // عرض العميلات فقط
    PERMISSIONS.CLIENTS_VIEW,

    // الحجوزات
    PERMISSIONS.BOOKINGS_VIEW,
    PERMISSIONS.BOOKINGS_EDIT,
    PERMISSIONS.CLASSES_MANAGE,

    // التقييم الصحي
    PERMISSIONS.HEALTH_VIEW,
    PERMISSIONS.HEALTH_CREATE,
    PERMISSIONS.HEALTH_EDIT,
  ],
}

// التحقق من الصلاحية
export function hasPermission(role: Role | string | undefined, permission: string): boolean {
  if (!role) return false

  const permissions = ROLE_PERMISSIONS[role as Role]
  if (!permissions) return false

  return permissions.includes(permission)
}

// التحقق من أي صلاحية من قائمة
export function hasAnyPermission(role: Role | string | undefined, permissions: string[]): boolean {
  if (!role) return false
  return permissions.some((permission) => hasPermission(role, permission))
}

// التحقق من جميع الصلاحيات
export function hasAllPermissions(role: Role | string | undefined, permissions: string[]): boolean {
  if (!role) return false
  return permissions.every((permission) => hasPermission(role, permission))
}

// الحصول على قائمة الصلاحيات للدور
export function getRolePermissions(role: Role | string | undefined): string[] {
  if (!role) return []
  return ROLE_PERMISSIONS[role as Role] || []
}

// الأذونات المطلوبة للصفحات
export const PAGE_PERMISSIONS: Record<string, string[]> = {
  "/dashboard/clients": [PERMISSIONS.CLIENTS_VIEW],
  "/dashboard/clients/new": [PERMISSIONS.CLIENTS_CREATE],
  "/dashboard/subscriptions": [PERMISSIONS.SUBSCRIPTIONS_VIEW],
  "/dashboard/subscriptions/new": [PERMISSIONS.SUBSCRIPTIONS_CREATE],
  "/dashboard/packages": [PERMISSIONS.PACKAGES_VIEW],
  "/dashboard/coupons": [PERMISSIONS.COUPONS_VIEW],
  "/dashboard/invoices": [PERMISSIONS.INVOICES_VIEW],
  "/dashboard/payments/new": [PERMISSIONS.PAYMENTS_CREATE],
  "/dashboard/checkin": [PERMISSIONS.CHECKIN],
  "/dashboard/staff": [PERMISSIONS.STAFF_VIEW],
  "/dashboard/reports": [PERMISSIONS.REPORTS_VIEW],
}





