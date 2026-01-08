"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowRight, Printer, Download, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface Invoice {
  id: string
  invoiceNumber: string
  client: {
    id: string
    name: string
    membershipNumber: string
    phone: string
  }
  subscription: {
    id: string
    status: string
    package: {
      nameAr: string
    }
  } | null
  subscriptionType: string | null
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  status: string
  notes: string | null
  couponCode: string | null
  createdAt: Date
  paidAt: Date | null
  payments: Array<{
    id: string
    amount: number
    paymentMethod: string
    paymentDate: Date
    referenceNumber: string | null
  }>
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activating, setActivating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  
  const isAdmin = (session?.user as any)?.role === "ADMIN"

  useEffect(() => {
    const invoiceId = params?.id as string
    if (invoiceId) {
      fetchInvoice(invoiceId)
    } else {
      setLoading(false)
      setError("معرف الفاتورة غير موجود")
    }
  }, [params?.id])

  const fetchInvoice = async (invoiceId: string) => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch(`/api/invoices/${invoiceId}`)
      
      if (!res.ok) {
        const errorData = await res.json()
        setError(errorData.error || "الفاتورة غير موجودة")
        return
      }
      
      const data = await res.json()
      setInvoice(data)
    } catch (error) {
      console.error("Error fetching invoice:", error)
      setError("حدث خطأ أثناء جلب البيانات")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!invoice) return

    const statusLabels = {
      PENDING: "قيد الانتظار",
      PAID: "مدفوعة",
      PARTIAL: "مدفوعة جزئياً",
      CANCELLED: "ملغاة",
      REFUNDED: "مسترجعة",
    }

    if (!confirm(`هل تريد تغيير حالة الفاتورة إلى "${statusLabels[newStatus as keyof typeof statusLabels]}"؟`)) {
      return
    }

    setUpdatingStatus(true)
    setError("")
    setSuccessMessage("")

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "فشل تحديث حالة الفاتورة")
      }

      const updatedInvoice = await res.json()
      setInvoice(updatedInvoice)
      setSuccessMessage(`تم تغيير حالة الفاتورة إلى "${statusLabels[newStatus as keyof typeof statusLabels]}"`)
      
      // إخفاء الرسالة بعد 3 ثوان
      setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحديث حالة الفاتورة")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!invoice) return

    if (!confirm(`هل أنت متأكد من حذف الفاتورة ${invoice.invoiceNumber}؟\nهذه العملية لا يمكن التراجع عنها.`)) {
      return
    }

    setDeleting(true)
    setError("")
    setSuccessMessage("")

    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "فشل حذف الفاتورة")
      }

      // التوجيه إلى قائمة الفواتير بعد الحذف
      router.push("/dashboard/invoices")
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء حذف الفاتورة")
    } finally {
      setDeleting(false)
    }
  }

  const handleActivateSubscription = async () => {
    if (!invoice?.subscription || invoice.subscription.status === "ACTIVE") {
      return
    }

    setActivating(true)
    setError("")
    setSuccessMessage("")

    try {
      const res = await fetch(`/api/subscriptions/${invoice.subscription.id}/activate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "حدث خطأ أثناء تفعيل الاشتراك")
      }

      setSuccessMessage("تم تفعيل الاشتراك بنجاح")
      // إعادة جلب بيانات الفاتورة
      await fetchInvoice(invoice.id)
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تفعيل الاشتراك")
    } finally {
      setActivating(false)
    }
  }

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-pink-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowRight className="h-5 w-5" />
          العودة
        </button>
        <div className="rounded-lg bg-red-50 p-4 text-red-800">
          {error || "الفاتورة غير موجودة"}
        </div>
      </div>
    )
  }

  const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = invoice.total - paidAmount

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowRight className="h-5 w-5" />
            العودة
          </button>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600"
            >
              <Printer className="h-5 w-5" />
              طباعة
            </button>
            {invoice.subscription && invoice.subscription.status === "PENDING" && (
              <button
                onClick={handleActivateSubscription}
                disabled={activating}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 font-medium text-white transition-colors hover:from-green-600 hover:to-green-700 disabled:opacity-50"
              >
                {activating ? "جاري التفعيل..." : "تفعيل الاشتراك"}
              </button>
            )}
            {isAdmin && (
              <>
                {invoice.status !== "PAID" && (
                  <button
                    onClick={() => handleUpdateStatus("PAID")}
                    disabled={updatingStatus}
                    className="flex items-center gap-2 rounded-lg bg-green-500 px-6 py-3 font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                  >
                    {updatingStatus ? "جاري التحديث..." : "تغيير الحالة إلى مدفوعة"}
                  </button>
                )}
                {invoice.status !== "CANCELLED" && (
                  <button
                    onClick={() => handleUpdateStatus("CANCELLED")}
                    disabled={updatingStatus}
                    className="flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                  >
                    {updatingStatus ? "جاري التحديث..." : "إلغاء الفاتورة"}
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 rounded-lg bg-red-500 px-6 py-3 font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-5 w-5" />
                  {deleting ? "جاري الحذف..." : "حذف الفاتورة"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 rounded-lg bg-green-50 p-4 text-green-800">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}
      </div>

      {/* Invoice Content */}
      <div className="mx-auto max-w-4xl rounded-lg bg-white p-8 shadow print:shadow-none">
        {/* Invoice Header */}
        <div className="mb-8 border-b pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">فاتورة</h1>
              <p className="mt-2 text-gray-600">رقم الفاتورة: {invoice.invoiceNumber}</p>
            </div>
            <div className="text-left">
              {getStatusBadge(invoice.status)}
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-8 grid grid-cols-2 gap-8">
          <div>
            <h2 className="mb-4 text-lg font-bold text-gray-900">معلومات العضوية</h2>
            <div className="space-y-3 text-base">
              <p>
                <span className="text-sm font-medium text-gray-600">الاسم:</span>{" "}
                <span className="text-base font-bold text-gray-900">{invoice.client.name}</span>
              </p>
              <p>
                <span className="text-sm font-medium text-gray-600">رقم العضوية:</span>{" "}
                <span className="text-base font-bold text-gray-900">{invoice.client.membershipNumber}</span>
              </p>
              <p>
                <span className="text-sm font-medium text-gray-600">رقم الجوال:</span>{" "}
                <span className="text-base font-bold text-gray-900">{invoice.client.phone}</span>
              </p>
            </div>
          </div>
          <div>
            <h2 className="mb-4 text-lg font-bold text-gray-900">معلومات الفاتورة</h2>
            <div className="space-y-3 text-base">
              <p>
                <span className="text-sm font-medium text-gray-600">تاريخ الإنشاء:</span>{" "}
                <span className="text-base font-bold text-gray-900">
                  {format(new Date(invoice.createdAt), "dd MMMM yyyy", { locale: ar })}
                </span>
              </p>
              {invoice.paidAt && (
                <p>
                  <span className="text-sm font-medium text-gray-600">تاريخ الدفع:</span>{" "}
                  <span className="text-base font-bold text-gray-900">
                    {format(new Date(invoice.paidAt), "dd MMMM yyyy", { locale: ar })}
                  </span>
                </p>
              )}
              {invoice.subscriptionType && (
                <p>
                  <span className="text-sm font-medium text-gray-600">نوع الاشتراك:</span>{" "}
                  <span className="text-base font-bold text-gray-900">{invoice.subscriptionType}</span>
                </p>
              )}
              {invoice.subscription && (
                <p>
                  <span className="text-sm font-medium text-gray-600">حالة الاشتراك:</span>{" "}
                  <span className={`text-base font-bold ${
                    invoice.subscription.status === "ACTIVE" ? "text-green-600" : "text-yellow-600"
                  }`}>
                    {invoice.subscription.status === "ACTIVE" ? "مفعل" : "غير مفعل (بانتظار الدفع)"}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="mb-8">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الوصف</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {invoice.subscriptionType
                    ? `اشتراك: ${invoice.subscriptionType}`
                    : invoice.subscription
                    ? `اشتراك: ${invoice.subscription.package.nameAr}`
                    : "مبلغ الفاتورة"}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {invoice.subtotal.toFixed(2)} ريال
                </td>
              </tr>
              {invoice.discountAmount > 0 && (
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    خصم {invoice.couponCode ? `(كوبون: ${invoice.couponCode})` : ""}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600">
                    -{invoice.discountAmount.toFixed(2)} ريال
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="mb-8 border-t pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xl font-semibold text-gray-900">الإجمالي:</span>
            <span className="text-3xl font-bold text-pink-600">{invoice.total.toFixed(2)} ريال</span>
          </div>
          {invoice.taxAmount > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>الضريبة:</span>
              <span>{invoice.taxAmount.toFixed(2)} ريال</span>
            </div>
          )}
          {remaining > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-lg font-medium text-gray-700">المتبقي:</span>
              <span className="text-xl font-bold text-red-600">{remaining.toFixed(2)} ريال</span>
            </div>
          )}
        </div>

        {/* Payments */}
        {invoice.payments.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">المدفوعات</h2>
            <div className="space-y-3">
              {invoice.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">{payment.amount.toFixed(2)} ريال</p>
                    <p className="text-sm text-gray-600">{payment.paymentMethod}</p>
                    {payment.referenceNumber && (
                      <p className="text-xs text-gray-500">رقم المرجع: {payment.referenceNumber}</p>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {format(new Date(payment.paymentDate), "dd MMMM yyyy", { locale: ar })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-8 rounded-lg bg-gray-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">ملاحظات:</h3>
            <p className="text-sm text-gray-700">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 border-t pt-6 text-center text-xs text-gray-500">
          <p>شكراً لك على اختيارك Fat2Fit</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button, a {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

