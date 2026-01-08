"use client"

import { useState, useEffect } from "react"
import { Users, Filter, Package } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { ar } from "date-fns/locale"

interface MemberReport {
  total: number
  statsByType: Record<
    string,
    {
      count: number
      totalRevenue: number
      active: number
      expired: number
      frozen: number
    }
  >
  statsByStatus: Record<string, number>
  members: Array<{
    id: string
    status: string
    isFrozen: boolean
    startDate: string
    endDate: string
    finalPrice: number
    subscriptionDuration: number
    remainingDays: number
    isExpired: boolean
    client: {
      name: string
      membershipNumber: string
      phone: string
    }
    package: {
      nameAr: string
      type: string
      duration: number
    }
  }>
}

export default function MembersReportPage() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<MemberReport | null>(null)
  const [filters, setFilters] = useState({
    subscriptionType: "",
    status: "",
    minDuration: "",
    maxDuration: "",
  })

  useEffect(() => {
    fetchReport()
  }, [])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.subscriptionType) params.append("subscriptionType", filters.subscriptionType)
      if (filters.status) params.append("status", filters.status)
      if (filters.minDuration) params.append("minDuration", filters.minDuration)
      if (filters.maxDuration) params.append("maxDuration", filters.maxDuration)

      const res = await fetch(`/api/reports/members?${params.toString()}`)
      if (!res.ok) {
        throw new Error("فشل جلب التقرير")
      }
      const data = await res.json()
      setReport(data)
    } catch (error) {
      console.error("Error fetching report:", error)
      alert("حدث خطأ أثناء جلب التقرير")
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const getStatusBadge = (member: MemberReport["members"][0]) => {
    if (member.isFrozen) {
      return <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">موقوف</span>
    }
    if (member.isExpired) {
      return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">منتهي</span>
    }
    if (member.status === "ACTIVE") {
      return <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">نشط</span>
    }
    return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">{member.status}</span>
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">تقرير الأعضاء</h1>
        <p className="mt-2 text-gray-600">عرض الأعضاء حسب نوع الاشتراك، المدة، والحالة</p>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">فلترة البحث</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع الاشتراك
            </label>
            <input
              type="text"
              value={filters.subscriptionType}
              onChange={(e) => handleFilterChange("subscriptionType", e.target.value)}
              placeholder="مثال: شهري"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              حالة الاشتراك
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
            >
              <option value="">الكل</option>
              <option value="ACTIVE">نشط</option>
              <option value="EXPIRED">منتهي</option>
              <option value="FROZEN">موقوف</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الحد الأدنى للمدة (أيام)
            </label>
            <input
              type="number"
              value={filters.minDuration}
              onChange={(e) => handleFilterChange("minDuration", e.target.value)}
              placeholder="مثال: 30"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الحد الأقصى للمدة (أيام)
            </label>
            <input
              type="number"
              value={filters.maxDuration}
              onChange={(e) => handleFilterChange("maxDuration", e.target.value)}
              placeholder="مثال: 365"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-2 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
          >
            {loading ? "جاري البحث..." : "بحث"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-pink-500 border-t-transparent mx-auto"></div>
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      )}

      {report && !loading && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي العضويات</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{report.total}</p>
                </div>
                <Users className="h-8 w-8 text-gray-600" />
              </div>
            </div>

            {Object.entries(report.statsByStatus).map(([status, count]) => (
              <div key={status} className="rounded-lg bg-white p-6 shadow">
                <div>
                  <p className="text-sm text-gray-600">
                    {status === "ACTIVE" ? "نشط" : status === "EXPIRED" ? "منتهي" : status === "FROZEN" ? "موقوف" : status}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-blue-600">{count}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats by Type */}
          {Object.keys(report.statsByType).length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
                <Package className="h-5 w-5" />
                إحصائيات حسب نوع الاشتراك
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        نوع الاشتراك
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        العدد
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        نشط
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        منتهي
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        موقوف
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        إجمالي الإيرادات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(report.statsByType).map(([type, stats]) => (
                      <tr key={type}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{type}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{stats.count}</td>
                        <td className="px-4 py-3 text-sm text-green-600">{stats.active}</td>
                        <td className="px-4 py-3 text-sm text-red-600">{stats.expired}</td>
                        <td className="px-4 py-3 text-sm text-yellow-600">{stats.frozen}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {stats.totalRevenue.toFixed(2)} ريال
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              قائمة الأعضاء ({report.members.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      العضو
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      نوع الاشتراك
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      مدة الاشتراك
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      المتبقي
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      حالة الاشتراك
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      المبلغ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.members.map((member) => (
                    <tr key={member.id}>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium text-gray-900">{member.client.name}</div>
                          <div className="text-xs text-gray-500">
                            {member.client.membershipNumber}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {member.package.nameAr}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {member.subscriptionDuration} يوم
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {member.isExpired ? (
                          <span className="text-red-600">منتهي</span>
                        ) : (
                          `${member.remainingDays} يوم`
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{getStatusBadge(member)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {member.finalPrice.toFixed(2)} ريال
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

