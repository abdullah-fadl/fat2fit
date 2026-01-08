"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Calendar, Download } from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface FinancialReport {
  period: {
    startDate: string
    endDate: string
  }
  summary: {
    totalRevenue: number
    totalPayments: number
    totalInvoices: number
    paymentMethods: Record<string, number>
  }
  payments: Array<{
    id: string
    amount: number
    paymentMethod: string
    paymentDate: string
    client: {
      name: string
      membershipNumber: string
    }
  }>
  invoices: Array<{
    id: string
    invoiceNumber: string
    total: number
    paidAt: string
    client: {
      name: string
      membershipNumber: string
    }
  }>
}

export default function FinancialReportPage() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<FinancialReport | null>(null)
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
        `/api/reports/financial?startDate=${startDate}&endDate=${endDate}`
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

  const handleExport = () => {
    if (!report) return

    // تصدير بسيط (يمكن تحسينه)
    const csv = [
      ["التاريخ", "النوع", "المبلغ", "العضو", "رقم العضوية", "الطريقة"].join(","),
      ...report.payments.map((p) =>
        [
          format(new Date(p.paymentDate), "yyyy-MM-dd", { locale: ar }),
          "دفعة",
          p.amount,
          p.client.name,
          p.client.membershipNumber,
          p.paymentMethod,
        ].join(",")
      ),
      ...report.invoices.map((i) =>
        [
          format(new Date(i.paidAt), "yyyy-MM-dd", { locale: ar }),
          "فاتورة",
          i.total,
          i.client.name,
          i.client.membershipNumber,
          "فاتورة",
        ].join(",")
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `financial-report-${startDate}-${endDate}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">التقرير المالي</h1>
        <p className="mt-2 text-gray-600">تقرير مالي مفصل مع إمكانية البحث بالمدة</p>
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
          <div className="flex items-end gap-2">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="flex-1 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-2 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
            >
              {loading ? "جاري البحث..." : "بحث"}
            </button>
            {report && (
              <button
                onClick={handleExport}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                title="تصدير"
              >
                <Download className="h-5 w-5" />
              </button>
            )}
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
          {/* Summary */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
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
              <div>
                <p className="text-sm text-gray-600">إجمالي المدفوعات</p>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  {report.summary.totalPayments.toFixed(2)} ريال
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div>
                <p className="text-sm text-gray-600">عدد الفواتير المدفوعة</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">
                  {report.summary.totalInvoices}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div>
                <p className="text-sm text-gray-600">طرق الدفع</p>
                <p className="mt-2 text-lg font-medium text-gray-900">
                  {Object.keys(report.summary.paymentMethods).length} طريقة
                </p>
              </div>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          {Object.keys(report.summary.paymentMethods).length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">تفصيل طرق الدفع</h2>
              <div className="space-y-2">
                {Object.entries(report.summary.paymentMethods).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between py-2">
                    <span className="text-gray-700">{method}</span>
                    <span className="font-medium text-gray-900">
                      {amount.toFixed(2)} ريال
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payments List */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">المدفوعات</h2>
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
                      المبلغ
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      طريقة الدفع
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {format(new Date(payment.paymentDate), "dd/MM/yyyy", { locale: ar })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {payment.client.name} ({payment.client.membershipNumber})
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {payment.amount.toFixed(2)} ريال
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {payment.paymentMethod}
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

