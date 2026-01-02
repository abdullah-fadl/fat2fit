"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Save, CreditCard } from "lucide-react"

interface Client {
  id: string
  name: string
  membershipNumber: string
  phone: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  total: number
  status: string
  payments: Array<{ amount: number }>
}

interface Subscription {
  id: string
  package: {
    nameAr: string
  }
  finalPrice: number
}

export default function NewPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [formData, setFormData] = useState({
    clientId: searchParams.get("clientId") || "",
    invoiceId: searchParams.get("invoiceId") || "",
    subscriptionId: "",
    amount: "",
    paymentMethod: "CASH",
    referenceNumber: "",
    notes: "",
    isPartial: false,
  })

  useEffect(() => {
    fetchClients()
    if (formData.clientId) {
      fetchInvoices(formData.clientId)
      fetchSubscriptions(formData.clientId)
    }
    if (formData.invoiceId) {
      fetchInvoiceDetails(formData.invoiceId)
    }
  }, [])

  useEffect(() => {
    if (formData.clientId) {
      fetchInvoices(formData.clientId)
      fetchSubscriptions(formData.clientId)
    } else {
      setInvoices([])
      setSubscriptions([])
      setSelectedInvoice(null)
    }
  }, [formData.clientId])

  useEffect(() => {
    if (formData.invoiceId && invoices.length > 0) {
      const invoice = invoices.find((i) => i.id === formData.invoiceId)
      if (invoice) {
        setSelectedInvoice(invoice)
        const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
        const remaining = invoice.total - paidAmount
        setFormData((prev) => ({
          ...prev,
          amount: remaining.toString(),
        }))
      }
    } else {
      setSelectedInvoice(null)
    }
  }, [formData.invoiceId, invoices])

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients")
      const data = await res.json()
      setClients(data)
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const fetchInvoices = async (clientId: string) => {
    try {
      const res = await fetch(`/api/invoices?clientId=${clientId}&status=PENDING`)
      const data = await res.json()
      setInvoices(data)
    } catch (error) {
      console.error("Error fetching invoices:", error)
    }
  }

  const fetchInvoiceDetails = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices`)
      const data = await res.json()
      const invoice = data.find((i: Invoice) => i.id === invoiceId)
      if (invoice) {
        setSelectedInvoice(invoice)
      }
    } catch (error) {
      console.error("Error fetching invoice details:", error)
    }
  }

  const fetchSubscriptions = async (clientId: string) => {
    try {
      const res = await fetch(`/api/subscriptions?clientId=${clientId}&status=ACTIVE`)
      const data = await res.json()
      setSubscriptions(data)
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
    }
  }

  const calculateRemaining = () => {
    if (selectedInvoice) {
      const paidAmount = selectedInvoice.payments.reduce((sum, p) => sum + p.amount, 0)
      const paid = parseFloat(formData.amount || "0")
      return selectedInvoice.total - paidAmount - paid
    }
    return 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const remaining = calculateRemaining()
      const isPartial = remaining > 0

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          isPartial,
          remainingAmount: isPartial ? remaining : null,
          invoiceId: formData.invoiceId || null,
          subscriptionId: formData.subscriptionId || null,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "حدث خطأ")
      }

      router.push(`/dashboard/clients/${formData.clientId}`)
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تسجيل الدفعة")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowRight className="h-5 w-5" />
          العودة
        </button>
        <h1 className="text-3xl font-bold text-gray-900">تسجيل دفعة</h1>
        <p className="mt-2 text-gray-600">تسجيل دفعة جديدة للعميلة</p>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              العميلة <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.clientId}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  clientId: e.target.value,
                  invoiceId: "",
                  subscriptionId: "",
                  amount: "",
                })
                setSelectedInvoice(null)
              }}
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
              required
            >
              <option value="">اختر عميلة...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} - {client.membershipNumber} - {client.phone}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Selection */}
          {formData.clientId && invoices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الفاتورة (اختياري)
              </label>
              <select
                value={formData.invoiceId}
                onChange={(e) => {
                  setFormData({ ...formData, invoiceId: e.target.value })
                }}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
              >
                <option value="">لا يوجد فاتورة</option>
                {invoices.map((invoice) => {
                  const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
                  const remaining = invoice.total - paidAmount
                  return (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} - المتبقي: {remaining.toFixed(2)} ريال
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          {/* Subscription Selection */}
          {formData.clientId && subscriptions.length > 0 && !formData.invoiceId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الاشتراك (اختياري)
              </label>
              <select
                value={formData.subscriptionId}
                onChange={(e) => setFormData({ ...formData, subscriptionId: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
              >
                <option value="">لا يوجد اشتراك</option>
                {subscriptions.map((subscription) => (
                  <option key={subscription.id} value={subscription.id}>
                    {subscription.package.nameAr} - {subscription.finalPrice} ريال
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Invoice Info */}
          {selectedInvoice && (
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm font-medium text-gray-700">معلومات الفاتورة:</p>
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <span className="text-gray-600">رقم الفاتورة:</span>{" "}
                  <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
                </p>
                <p>
                  <span className="text-gray-600">الإجمالي:</span>{" "}
                  <span className="font-medium">{selectedInvoice.total} ريال</span>
                </p>
                <p>
                  <span className="text-gray-600">المدفوع:</span>{" "}
                  <span className="font-medium">
                    {selectedInvoice.payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)} ريال
                  </span>
                </p>
                <p>
                  <span className="text-gray-600">المتبقي:</span>{" "}
                  <span className="font-medium text-red-600">
                    {(
                      selectedInvoice.total -
                      selectedInvoice.payments.reduce((sum, p) => sum + p.amount, 0)
                    ).toFixed(2)}{" "}
                    ريال
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المبلغ <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
              placeholder="0.00"
              required
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              طريقة الدفع <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
              required
            >
              <option value="CASH">نقدي</option>
              <option value="CREDIT_CARD">بطاقة ائتمان</option>
              <option value="DEBIT_CARD">بطاقة خصم</option>
              <option value="MADA">مدى</option>
              <option value="APPLE_PAY">Apple Pay</option>
              <option value="STC_PAY">STC Pay</option>
              <option value="BANK_TRANSFER">تحويل بنكي</option>
              <option value="OTHER">أخرى</option>
            </select>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم المرجع (اختياري)
            </label>
            <input
              type="text"
              value={formData.referenceNumber}
              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
              placeholder="رقم المرجع أو رقم المعاملة"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ملاحظات
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
              placeholder="ملاحظات إضافية..."
            />
          </div>

          {/* Remaining Amount Info */}
          {selectedInvoice && parseFloat(formData.amount || "0") > 0 && (
            <div className="rounded-lg bg-yellow-50 p-4">
              <p className="text-sm font-medium text-yellow-800">
                المبلغ المتبقي بعد هذه الدفعة: {calculateRemaining().toFixed(2)} ريال
              </p>
              {calculateRemaining() > 0 && (
                <p className="mt-1 text-xs text-yellow-700">
                  سيتم تسجيل هذه الدفعة كدفعة جزئية
                </p>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {loading ? "جاري الحفظ..." : "تسجيل الدفعة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}








