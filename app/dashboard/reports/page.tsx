"use client"

import { useState, useEffect } from "react"
import { FileText, Users, CreditCard, TrendingUp, Calendar } from "lucide-react"
import { format, startOfMonth, endOfMonth, subDays } from "date-fns"
import { ar } from "date-fns/locale"

interface Stats {
  totalClients: number
  activeClients: number
  totalSubscriptions: number
  totalRevenue: number
  pendingInvoices: number
  clientsWithDebt: number
}

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    activeClients: 0,
    totalSubscriptions: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
    clientsWithDebt: 0,
  })
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"today" | "week" | "month">("month")

  useEffect(() => {
    fetchStats()
  }, [period])

  const fetchStats = async () => {
    try {
      setLoading(true)
      
      // Fetch clients
      const clientsRes = await fetch("/api/clients")
      if (!clientsRes.ok) {
        throw new Error("فشل جلب العملاء")
      }
      const clients = await clientsRes.json()
      
      // Fetch subscriptions
      const subsRes = await fetch("/api/subscriptions")
      if (!subsRes.ok) {
        throw new Error("فشل جلب الاشتراكات")
      }
      const subscriptions = await subsRes.json()
      
      // Fetch invoices
      const invoicesRes = await fetch("/api/invoices")
      if (!invoicesRes.ok) {
        throw new Error("فشل جلب الفواتير")
      }
      const invoices = await invoicesRes.json()
      
      // Fetch payments
      const paymentsRes = await fetch("/api/payments")
      if (!paymentsRes.ok) {
        throw new Error("فشل جلب المدفوعات")
      }
      const payments = await paymentsRes.json()
      
      // التأكد من أن البيانات هي arrays
      const safeSubscriptions = Array.isArray(subscriptions) ? subscriptions : []
      const safePayments = Array.isArray(payments) ? payments : []
      const safeInvoices = Array.isArray(invoices) ? invoices : []
      const safeClients = Array.isArray(clients) ? clients : []

      // Calculate date range
      let startDate: Date
      const endDate = new Date()
      endDate.setHours(23, 59, 59, 999) // نهاية اليوم
      
      switch (period) {
        case "today":
          startDate = new Date()
          startDate.setHours(0, 0, 0, 0)
          break
        case "week":
          startDate = subDays(endDate, 7)
          startDate.setHours(0, 0, 0, 0)
          break
        case "month":
          startDate = startOfMonth(endDate)
          startDate.setHours(0, 0, 0, 0)
          break
      }

      // Filter data by period - تحويل التواريخ بشكل صحيح
      const filteredSubscriptions = safeSubscriptions.filter((s: any) => {
        if (!s || !s.createdAt) return false
        try {
          const subDate = new Date(s.createdAt)
          return subDate >= startDate && subDate <= endDate
        } catch (e) {
          return false
        }
      })
      
      const filteredPayments = safePayments.filter((p: any) => {
        if (!p || !p.paymentDate) return false
        try {
          const paymentDate = new Date(p.paymentDate)
          return paymentDate >= startDate && paymentDate <= endDate
        } catch (e) {
          return false
        }
      })

      const filteredInvoices = safeInvoices.filter((i: any) => {
        if (!i || !i.createdAt) return false
        try {
          const invoiceDate = new Date(i.createdAt)
          return invoiceDate >= startDate && invoiceDate <= endDate
        } catch (e) {
          return false
        }
      })

      const activeClients = safeClients.filter(
        (c: any) => c && c.status === "ACTIVE"
      ).length

      // حساب الإيرادات من المدفوعات في الفترة
      const revenueFromPayments = filteredPayments.reduce(
        (sum: number, p: any) => {
          const amount = parseFloat(p?.amount) || 0
          return sum + amount
        },
        0
      )

      // حساب الإيرادات من الفواتير المدفوعة بالكامل في الفترة
      // (التي تم وضعها كـ PAID مباشرة بدون إنشاء payment منفصل)
      const paidInvoicesInPeriod = safeInvoices.filter((i: any) => {
        if (!i || i.status !== "PAID") return false
        try {
          // استخدام paidAt إذا كان موجوداً، وإلا استخدام createdAt
          const paidDate = new Date(i.paidAt || i.createdAt)
          return paidDate >= startDate && paidDate <= endDate
        } catch (e) {
          return false
        }
      })

      // حساب إجمالي الفواتير المدفوعة التي ليس لها مدفوعات مسجلة
      // (تم وضعها كـ PAID مباشرة)
      const revenueFromDirectPaidInvoices = paidInvoicesInPeriod.reduce(
        (sum: number, invoice: any) => {
          // إذا كانت الفاتورة ليس لها مدفوعات مسجلة، نضيف قيمتها
          const hasPayments = invoice.payments && invoice.payments.length > 0
          if (!hasPayments) {
            return sum + (parseFloat(invoice?.total) || 0)
          }
          return sum
        },
        0
      )

      // إجمالي الإيرادات = المدفوعات + الفواتير المدفوعة مباشرة (بدون payments)
      const totalRevenue = revenueFromPayments + revenueFromDirectPaidInvoices

      const pendingInvoices = safeInvoices.filter(
        (i: any) => i && (i.status === "PENDING" || i.status === "PARTIAL")
      ).length

      const clientsWithDebt = safeClients.filter(
        (c: any) => c && (parseFloat(c?.totalDebt) || 0) > 0
      ).length

      setStats({
        totalClients: safeClients.length,
        activeClients,
        totalSubscriptions: filteredSubscriptions.length,
        totalRevenue,
        pendingInvoices,
        clientsWithDebt,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const periodLabels = {
    today: "اليوم",
    week: "هذا الأسبوع",
    month: "هذا الشهر",
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">التقارير والإحصائيات</h1>
        <p className="mt-2 text-gray-600">عرض إحصائيات شاملة للنادي</p>
      </div>

      {/* Period Selector */}
      <div className="mb-6 flex gap-3">
        {(["today", "week", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-6 py-2 font-medium transition-colors ${
              period === p
                ? "bg-pink-500 text-white"
                : "bg-white text-gray-700 shadow hover:bg-gray-50"
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-pink-500 border-t-transparent mx-auto"></div>
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Total Clients */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي العضويات</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalClients}</p>
              </div>
              <div className="rounded-full bg-pink-100 p-4">
                <Users className="h-8 w-8 text-pink-600" />
              </div>
            </div>
          </div>

          {/* Active Clients */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">الأعضاء النشطين</p>
                <p className="mt-2 text-3xl font-bold text-green-600">{stats.activeClients}</p>
              </div>
              <div className="rounded-full bg-green-100 p-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Subscriptions */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">الاشتراكات ({periodLabels[period]})</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">{stats.totalSubscriptions}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-4">
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">الإيرادات ({periodLabels[period]})</p>
                <p className="mt-2 text-3xl font-bold text-purple-600">
                  {stats.totalRevenue.toFixed(2)} ريال
                </p>
              </div>
              <div className="rounded-full bg-purple-100 p-4">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Pending Invoices */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">الفواتير المعلقة</p>
                <p className="mt-2 text-3xl font-bold text-orange-600">{stats.pendingInvoices}</p>
              </div>
              <div className="rounded-full bg-orange-100 p-4">
                <FileText className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Clients with Debt */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">عميلات مع مديونية</p>
                <p className="mt-2 text-3xl font-bold text-red-600">{stats.clientsWithDebt}</p>
              </div>
              <div className="rounded-full bg-red-100 p-4">
                <FileText className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Navigation */}
      <div className="mt-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">التقارير التفصيلية</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <a
            href="/dashboard/reports/financial"
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
          >
            <TrendingUp className="h-6 w-6 text-purple-600" />
            <div>
              <div className="font-medium text-gray-900">التقرير المالي</div>
              <div className="text-sm text-gray-600">تقرير مالي مفصل مع البحث بالمدة</div>
            </div>
          </a>
          <a
            href="/dashboard/reports/sales"
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
          >
            <Users className="h-6 w-6 text-green-600" />
            <div>
              <div className="font-medium text-gray-900">تقرير المبيعات</div>
              <div className="text-sm text-gray-600">أعضاء جدد وتجديدات</div>
            </div>
          </a>
          <a
            href="/dashboard/reports/members"
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
          >
            <Users className="h-6 w-6 text-blue-600" />
            <div>
              <div className="font-medium text-gray-900">تقرير الأعضاء</div>
              <div className="text-sm text-gray-600">نوع، مدة، وحالة الاشتراك</div>
            </div>
          </a>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-8 rounded-lg bg-blue-50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">ملاحظات</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>الإحصائيات يتم تحديثها تلقائياً</li>
          <li>يمكنك تغيير الفترة الزمنية لعرض البيانات</li>
          <li>الإيرادات تشمل جميع المدفوعات في الفترة المحددة</li>
          <li>استخدم التقارير التفصيلية للحصول على معلومات أكثر</li>
        </ul>
      </div>
    </div>
  )
}












