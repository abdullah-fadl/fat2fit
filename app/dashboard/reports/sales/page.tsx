"use client"

import { useState, useEffect } from "react"
import { Users, TrendingUp, Calendar, UserPlus, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface SalesReport {
  period: {
    startDate: string
    endDate: string
  }
  summary: {
    newMembersCount: number
    newMembersRevenue: number
    renewalsCount: number
    renewalsRevenue: number
    totalRevenue: number
  }
  newMembers: Array<{
    id: string
    name: string
    membershipNumber: string
    phone: string
    createdAt: string
    subscriptions: Array<{
      package: {
        nameAr: string
        price: number
      }
    }>
  }>
  newSubscriptions: any[]
  renewalSubscriptions: any[]
}

export default function SalesReportPage() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<SalesReport | null>(null)
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    fetchReport()
  }, [])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/api/reports/sales?startDate=${startDate}&endDate=${endDate}`
      )
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">تقرير المبيعات</h1>
        <p className="mt-2 text-gray-600">عرض الأعضاء الجدد والتجديدات</p>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              من تاريخ
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-2 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
            >
              {loading ? "جاري البحث..." : "بحث"}
            </button>
          </div>
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">أعضاء جدد</p>
                  <p className="mt-2 text-3xl font-bold text-green-600">
                    {report.summary.newMembersCount}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {report.summary.newMembersRevenue.toFixed(2)} ريال
                  </p>
                </div>
                <UserPlus className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">تجديدات</p>
                  <p className="mt-2 text-3xl font-bold text-blue-600">
                    {report.summary.renewalsCount}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {report.summary.renewalsRevenue.toFixed(2)} ريال
                  </p>
                </div>
                <RefreshCw className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي الإيرادات</p>
                  <p className="mt-2 text-3xl font-bold text-purple-600">
                    {report.summary.totalRevenue.toFixed(2)} ريال
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي الاشتراكات</p>
                  <p className="mt-2 text-3xl font-bold text-orange-600">
                    {report.summary.newMembersCount + report.summary.renewalsCount}
                  </p>
                </div>
                <Users className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* New Members */}
          {report.newMembers.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                الأعضاء الجدد ({report.newMembers.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        التاريخ
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        الاسم
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        رقم العضوية
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        الجوال
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        الباقة الأولى
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {report.newMembers.map((member) => (
                      <tr key={member.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {format(new Date(member.createdAt), "dd/MM/yyyy", { locale: ar })}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {member.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {member.membershipNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{member.phone}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {member.subscriptions[0]?.package?.nameAr || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Renewals */}
          {report.renewalSubscriptions.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                التجديدات ({report.renewalSubscriptions.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        التاريخ
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        العضو
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        الباقة
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        المبلغ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {report.renewalSubscriptions.map((sub) => (
                      <tr key={sub.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {format(new Date(sub.createdAt), "dd/MM/yyyy", { locale: ar })}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {sub.client.name} ({sub.client.membershipNumber})
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {sub.package.nameAr}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {sub.finalPrice.toFixed(2)} ريال
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

