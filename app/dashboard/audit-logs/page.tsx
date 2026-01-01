"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  Calendar,
  Activity,
} from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string
  oldValue: string | null
  newValue: string | null
  description: string | null
  ipAddress: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string | null
    role: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AuditLogsPage() {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState({
    userId: "",
    entityType: "",
    action: "",
    search: "",
  })

  useEffect(() => {
    fetchLogs()
  }, [pagination.page, filters])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (filters.userId) params.append("userId", filters.userId)
      if (filters.entityType) params.append("entityType", filters.entityType)
      if (filters.action) params.append("action", filters.action)

      const res = await fetch(`/api/audit-logs?${params.toString()}`)
      if (!res.ok) {
        throw new Error("فشل جلب البيانات")
      }
      const data = await res.json()
      setLogs(data.logs || [])
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      }))
    } catch (error) {
      console.error("Error fetching audit logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const getActionBadge = (action: string) => {
    const styles: { [key: string]: string } = {
      CREATE: "bg-green-100 text-green-800",
      UPDATE: "bg-blue-100 text-blue-800",
      DELETE: "bg-red-100 text-red-800",
      VIEW: "bg-gray-100 text-gray-800",
      LOGIN: "bg-purple-100 text-purple-800",
      LOGOUT: "bg-orange-100 text-orange-800",
      CHECKIN: "bg-cyan-100 text-cyan-800",
    }
    const labels: { [key: string]: string } = {
      CREATE: "إنشاء",
      UPDATE: "تعديل",
      DELETE: "حذف",
      VIEW: "عرض",
      LOGIN: "تسجيل دخول",
      LOGOUT: "تسجيل خروج",
      CHECKIN: "تسجيل دخول",
    }
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[action] || "bg-gray-100 text-gray-800"}`}>
        {labels[action] || action}
      </span>
    )
  }

  const getEntityTypeLabel = (entityType: string) => {
    const labels: { [key: string]: string } = {
      Client: "عميلة",
      Subscription: "اشتراك",
      Invoice: "فاتورة",
      Payment: "دفعة",
      User: "مستخدم",
      Package: "باقة",
      Coupon: "كوبون",
      CheckIn: "تسجيل دخول",
      ZKDevice: "جهاز بصمة",
    }
    return labels[entityType] || entityType
  }

  const filteredLogs = logs.filter((log) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      return (
        log.user.name.toLowerCase().includes(searchLower) ||
        log.description?.toLowerCase().includes(searchLower) ||
        log.entityType.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">سجل الأنشطة</h1>
          <p className="mt-1 text-sm text-gray-600">
            تتبع جميع العمليات والأنشطة في النظام
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              نوع الكيان
            </label>
            <select
              value={filters.entityType}
              onChange={(e) =>
                setFilters({ ...filters, entityType: e.target.value })
              }
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            >
              <option value="">الكل</option>
              <option value="Client">عميلة</option>
              <option value="Subscription">اشتراك</option>
              <option value="Invoice">فاتورة</option>
              <option value="Payment">دفعة</option>
              <option value="User">مستخدم</option>
              <option value="Package">باقة</option>
              <option value="Coupon">كوبون</option>
              <option value="CheckIn">تسجيل دخول</option>
              <option value="ZKDevice">جهاز بصمة</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              نوع العملية
            </label>
            <select
              value={filters.action}
              onChange={(e) =>
                setFilters({ ...filters, action: e.target.value })
              }
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            >
              <option value="">الكل</option>
              <option value="CREATE">إنشاء</option>
              <option value="UPDATE">تعديل</option>
              <option value="DELETE">حذف</option>
              <option value="VIEW">عرض</option>
              <option value="LOGIN">تسجيل دخول</option>
              <option value="LOGOUT">تسجيل خروج</option>
              <option value="CHECKIN">تسجيل دخول</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              البحث
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="block w-full rounded-lg border border-gray-300 bg-white pr-10 pl-4 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({
                  userId: "",
                  entityType: "",
                  action: "",
                  search: "",
                })
                setPagination({ ...pagination, page: 1 })
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-lg bg-white shadow">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <Activity className="mx-auto h-12 w-12 animate-pulse text-pink-500" />
              <p className="mt-4 text-sm text-gray-600">جاري جلب البيانات...</p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <Activity className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm text-gray-600">لا توجد سجلات أنشطة</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700">
                      التاريخ والوقت
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700">
                      المستخدم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700">
                      العملية
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700">
                      نوع الكيان
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700">
                      الوصف
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700">
                      IP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div>
                              {format(new Date(log.createdAt), "dd/MM/yyyy", {
                                locale: ar,
                              })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(log.createdAt), "HH:mm:ss", {
                                locale: ar,
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {log.user.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {log.user.role}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {getEntityTypeLabel(log.entityType)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={log.description || ""}>
                          {log.description || "-"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {log.ipAddress || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span>
                    صفحة {pagination.page} من {pagination.totalPages}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>إجمالي {pagination.total} سجل</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setPagination({ ...pagination, page: pagination.page - 1 })
                    }
                    disabled={pagination.page === 1}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setPagination({ ...pagination, page: pagination.page + 1 })
                    }
                    disabled={pagination.page >= pagination.totalPages}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

