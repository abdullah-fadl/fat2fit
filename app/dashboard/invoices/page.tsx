"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { FileText, Eye, Download, Plus, Trash2, Search } from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface Invoice {
  id: string
  invoiceNumber: string
  client: {
    name: string
    membershipNumber: string
  }
  total: number
  status: string
  createdAt: Date
  payments: Array<{
    amount: number
  }>
}

export default function InvoicesPage() {
  const { data: session } = useSession()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [deleting, setDeleting] = useState<string | null>(null)
  
  const isAdmin = (session?.user as any)?.role === "ADMIN"

  useEffect(() => {
    fetchInvoices()
  }, [filter])

  const fetchInvoices = async () => {
    try {
      const url = filter !== "all" ? `/api/invoices?status=${filter}` : "/api/invoices"
      const res = await fetch(url)
      const data = await res.json()
      setInvoices(data)
    } catch (error) {
      console.error("Error fetching invoices:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`هل أنت متأكد من حذف الفاتورة ${invoiceNumber}؟\nهذه العملية لا يمكن التراجع عنها.`)) {
      return
    }

    setDeleting(invoiceId)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errorData = await res.json()
        alert(errorData.error || "فشل حذف الفاتورة")
        return
      }

      // إعادة جلب القائمة
      fetchInvoices()
    } catch (error) {
      console.error("Error deleting invoice:", error)
      alert("حدث خطأ أثناء حذف الفاتورة")
    } finally {
      setDeleting(null)
    }
  }

  // تصفية الفواتير بناءً على البحث
  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    const invoiceNumber = invoice.invoiceNumber.toLowerCase()
    const clientName = invoice.client.name.toLowerCase()
    const membershipNumber = invoice.client.membershipNumber.toLowerCase()
    
    return (
      invoiceNumber.includes(query) ||
      clientName.includes(query) ||
      membershipNumber.includes(query)
    )
  })

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-yellow-100 text-yellow-800",
      PAID: "bg-green-100 text-green-800",
      PARTIAL: "bg-blue-100 text-blue-800",
      CANCELLED: "bg-red-100 text-red-800",
      REFUNDED: "bg-gray-100 text-gray-800",
    }
    const labels = {
      PENDING: "قيد الانتظار",
      PAID: "مدفوعة",
      PARTIAL: "مدفوعة جزئياً",
      CANCELLED: "ملغاة",
      REFUNDED: "مسترجعة",
    }
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">الفواتير</h1>
          <p className="mt-2 text-gray-600">عرض وإدارة جميع الفواتير</p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700"
        >
          <Plus className="h-5 w-5" />
          فاتورة جديدة
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن فاتورة (رقم الفاتورة، اسم العضو، رقم العضوية)..."
            className="w-full rounded-lg border border-gray-300 bg-white py-3 pr-12 pl-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
          />
        </div>
        
        {/* Filters */}
        <div className="flex gap-3">
          {["all", "PENDING", "PAID", "PARTIAL", "CANCELLED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === status
                  ? "bg-pink-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {status === "all"
                ? "الكل"
                : status === "PENDING"
                ? "قيد الانتظار"
                : status === "PAID"
                ? "مدفوعة"
                : status === "PARTIAL"
                ? "مدفوعة جزئياً"
                : "ملغاة"}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">رقم الفاتورة</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">العضوية</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">المبلغ</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">الحالة</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">التاريخ</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    جاري التحميل...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {searchQuery ? "لا توجد نتائج للبحث" : "لا توجد فواتير"}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          <p>{invoice.client.name}</p>
                          <p className="text-xs text-gray-500">{invoice.client.membershipNumber}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          <p className="font-medium">{invoice.total} ريال</p>
                          {invoice.status === "PARTIAL" && (
                            <p className="text-xs text-gray-500">
                              مدفوع: {paidAmount} ريال
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(invoice.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {format(new Date(invoice.createdAt), "yyyy-MM-dd", { locale: ar })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/dashboard/invoices/${invoice.id}`}
                            className="text-pink-600 hover:text-pink-700"
                            title="عرض التفاصيل"
                          >
                            <Eye className="h-5 w-5" />
                          </Link>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                              disabled={deleting === invoice.id}
                              className="text-red-600 hover:text-red-700 disabled:opacity-50"
                              title="حذف الفاتورة"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}






