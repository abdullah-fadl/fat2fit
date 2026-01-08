"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Save, CreditCard, Tag, X, Search, ChevronDown } from "lucide-react"

interface Client {
  id: string
  name: string
  membershipNumber: string
  phone: string
}

interface Subscription {
  id: string
  startDate: Date
  endDate: Date
  finalPrice: number
  status: string
  package: {
    nameAr: string
  }
}

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [clients, setClients] = useState<Client[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    clientId: searchParams.get("clientId") || "",
    subscriptionId: searchParams.get("subscriptionId") || "",
    subtotal: "",
    discountAmount: "",
    couponCode: "",
    notes: "",
  })
  const [couponDiscount, setCouponDiscount] = useState<{
    valid: boolean
    coupon: any
    discount: number
  } | null>(null)
  const [couponError, setCouponError] = useState("")
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [clientSearchQuery, setClientSearchQuery] = useState("")
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
  const clientSearchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchClients()
  }, [])

  // إغلاق القائمة المنسدلة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // تصفية العملاء بناءً على البحث
  const filteredClients = clients.filter((client) => {
    if (!clientSearchQuery.trim()) return true
    
    const query = clientSearchQuery.toLowerCase()
    const name = client.name.toLowerCase()
    const membershipNumber = client.membershipNumber.toLowerCase()
    const phone = client.phone.toLowerCase()
    
    return (
      name.includes(query) ||
      membershipNumber.includes(query) ||
      phone.includes(query)
    )
  })

  useEffect(() => {
    if (formData.clientId) {
      fetchSubscriptions(formData.clientId)
      const client = clients.find((c) => c.id === formData.clientId)
      if (client) setSelectedClient(client)
    } else {
      setSubscriptions([])
      setSelectedClient(null)
    }
  }, [formData.clientId])


  useEffect(() => {
    if (formData.subscriptionId && subscriptions.length > 0) {
      const subscription = subscriptions.find((s) => s.id === formData.subscriptionId)
      if (subscription) {
        setFormData((prev) => ({
          ...prev,
          subtotal: subscription.finalPrice.toString(),
        }))
      }
    }
  }, [formData.subscriptionId, subscriptions])

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients")
      const data = await res.json()
      setClients(data)
      if (formData.clientId) {
        const client = data.find((c: Client) => c.id === formData.clientId)
        if (client) setSelectedClient(client)
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const fetchSubscriptions = async (clientId: string) => {
    try {
      const res = await fetch(`/api/subscriptions?clientId=${clientId}&status=ACTIVE`)
      const data = await res.json()
      setSubscriptions(data)
      // اختيار الاشتراك النشط تلقائياً إذا كان موجوداً
      if (data.length > 0 && !formData.subscriptionId) {
        const activeSubscription = data.find((s: Subscription) => s.status === "ACTIVE")
        if (activeSubscription) {
          setFormData((prev) => ({
            ...prev,
            subscriptionId: activeSubscription.id,
            subtotal: activeSubscription.finalPrice.toString(),
          }))
        }
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
    }
  }

  const handleValidateCoupon = async () => {
    if (!formData.couponCode.trim()) {
      setCouponError("يجب إدخال كود الكوبون")
      return
    }

    if (!formData.subtotal || parseFloat(formData.subtotal) <= 0) {
      setCouponError("يجب إدخال المبلغ الإجمالي أولاً")
      return
    }

    setValidatingCoupon(true)
    setCouponError("")

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.couponCode,
          amount: parseFloat(formData.subtotal),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setCouponError(data.error || "كود الكوبون غير صحيح")
        setCouponDiscount(null)
        return
      }

      setCouponDiscount(data)
      setCouponError("")
    } catch (error) {
      console.error("Error validating coupon:", error)
      setCouponError("حدث خطأ أثناء التحقق من الكوبون")
      setCouponDiscount(null)
    } finally {
      setValidatingCoupon(false)
    }
  }

  // حساب الضريبة من ضمن المبلغ (السعر المعروض يحتوي على الضريبة)
  // إذا كان المبلغ 1000 ريال (يحتوي على الضريبة)، فإن:
  // السعر الأصلي = 1000 / 1.15 = 869.57
  // الضريبة = 1000 - 869.57 = 130.43 (أو 869.57 * 0.15)
  const calculateTax = () => {
    const subtotal = parseFloat(formData.subtotal) || 0
    const discount = couponDiscount?.discount || parseFloat(formData.discountAmount) || 0
    const amountAfterDiscount = subtotal - discount
    // الضريبة = (المبلغ بعد الخصم / 1.15) * 0.15
    // أو بشكل أبسط: الضريبة = المبلغ - (المبلغ / 1.15)
    return amountAfterDiscount - (amountAfterDiscount / 1.15)
  }

  const calculateBasePrice = () => {
    const subtotal = parseFloat(formData.subtotal) || 0
    const discount = couponDiscount?.discount || parseFloat(formData.discountAmount) || 0
    const amountAfterDiscount = subtotal - discount
    // السعر الأصلي (بدون ضريبة) = المبلغ / 1.15
    return amountAfterDiscount / 1.15
  }

  const calculateTotal = () => {
    const subtotal = parseFloat(formData.subtotal) || 0
    const discount = couponDiscount?.discount || parseFloat(formData.discountAmount) || 0
    // الإجمالي = المبلغ بعد الخصم (يحتوي على الضريبة)
    return subtotal - discount
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          discountAmount: couponDiscount?.discount || formData.discountAmount || 0,
          taxAmount: calculateTax(), // إرسال الضريبة المحسوبة تلقائياً
          couponCode: couponDiscount?.valid ? formData.couponCode : undefined,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error("Error response:", errorData)
        throw new Error(errorData.error || "حدث خطأ أثناء إنشاء الفاتورة")
      }

      const invoice = await res.json()
      router.push(`/dashboard/invoices/${invoice.id}`)
    } catch (err: any) {
      console.error("Error creating invoice:", err)
      setError(err.message || "حدث خطأ أثناء إنشاء الفاتورة")
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
        <h1 className="text-3xl font-bold text-gray-900">فاتورة جديدة</h1>
        <p className="mt-2 text-gray-600">إنشاء فاتورة جديدة للعضوية</p>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <div className="relative" ref={clientSearchRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              العضوية <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={selectedClient ? `${selectedClient.name} - ${selectedClient.membershipNumber} - ${selectedClient.phone}` : clientSearchQuery}
                  onChange={(e) => {
                    setClientSearchQuery(e.target.value)
                    setIsClientDropdownOpen(true)
                    if (!e.target.value) {
                      setFormData({
                        ...formData,
                        clientId: "",
                        subscriptionId: "",
                        subtotal: "",
                      })
                      setSelectedClient(null)
                      setCouponDiscount(null)
                    }
                  }}
                  onFocus={() => setIsClientDropdownOpen(true)}
                  placeholder="ابحث عن عضو (الاسم، رقم العضوية، رقم الجوال)..."
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2 pr-10 pl-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                  required={!formData.clientId}
                />
                {selectedClient && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null)
                      setClientSearchQuery("")
                      setFormData({
                        ...formData,
                        clientId: "",
                        subscriptionId: "",
                        subtotal: "",
                      })
                      setCouponDiscount(null)
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {isClientDropdownOpen && filteredClients.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setSelectedClient(client)
                        setClientSearchQuery("")
                        setIsClientDropdownOpen(false)
                        setFormData({
                          ...formData,
                          clientId: client.id,
                          subscriptionId: "",
                          subtotal: "",
                        })
                        setCouponDiscount(null)
                      }}
                      className="w-full px-4 py-3 text-right text-sm text-gray-900 hover:bg-pink-50 transition-colors"
                    >
                      <div className="font-medium">{client.name}</div>
                      <div className="text-xs text-gray-500">
                        {client.membershipNumber} - {client.phone}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {isClientDropdownOpen && clientSearchQuery && filteredClients.length === 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-300 bg-white p-4 text-center text-sm text-gray-500 shadow-lg">
                  لا توجد نتائج
                </div>
              )}
            </div>
            {!formData.clientId && (
              <input type="hidden" value="" required />
            )}
          </div>

          {/* Subscription Selection */}
          {formData.clientId && subscriptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الاشتراك (اختياري)
              </label>
              <select
                value={formData.subscriptionId}
                onChange={(e) => {
                  setFormData({ ...formData, subscriptionId: e.target.value })
                  const subscription = subscriptions.find((s) => s.id === e.target.value)
                  if (subscription) {
                    setFormData((prev) => ({
                      ...prev,
                      subtotal: subscription.finalPrice.toString(),
                    }))
                  }
                }}
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

          {/* Subtotal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المبلغ الإجمالي (قبل الخصم) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.subtotal}
              onChange={(e) => {
                setFormData({ ...formData, subtotal: e.target.value })
                setCouponDiscount(null)
              }}
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
              placeholder="0.00"
              required
            />
          </div>

          {/* Coupon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كود الكوبون (اختياري)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.couponCode}
                onChange={(e) => {
                  setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })
                  setCouponDiscount(null)
                  setCouponError("")
                }}
                placeholder="WINTER2024"
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
              />
              <button
                type="button"
                onClick={handleValidateCoupon}
                disabled={validatingCoupon || !formData.couponCode.trim() || !formData.subtotal}
                className="rounded-lg bg-blue-500 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
              >
                {validatingCoupon ? "جاري التحقق..." : "تطبيق"}
              </button>
            </div>
            {couponError && (
              <p className="mt-2 text-sm text-red-600">{couponError}</p>
            )}
            {couponDiscount?.valid && (
              <div className="mt-2 rounded-lg bg-green-50 p-3">
                <p className="text-sm font-medium text-green-800">
                  ✓ تم تطبيق الكوبون: {couponDiscount.coupon.name}
                </p>
                <p className="text-sm text-green-700">
                  الخصم: {couponDiscount.discount.toFixed(2)} ريال
                </p>
              </div>
            )}
          </div>

          {/* Manual Discount */}
          {!couponDiscount?.valid && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                خصم يدوي (ريال)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.discountAmount}
                onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                placeholder="0.00"
              />
            </div>
          )}

          {/* Tax - محسوبة تلقائياً 15% من ضمن المبلغ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الضريبة (15% من ضمن المبلغ) <span className="text-xs text-gray-500">محسوبة تلقائياً</span>
            </label>
            <input
              type="text"
              value={calculateTax().toFixed(2)}
              readOnly
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 shadow-sm cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              الضريبة محسوبة من ضمن المبلغ المعروض (15%)
            </p>
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

          {/* Total Summary */}
          <div className="rounded-lg bg-pink-50 p-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">المبلغ الإجمالي (يشمل الضريبة):</span>
                <span className="font-medium text-gray-900">
                  {parseFloat(formData.subtotal || "0").toFixed(2)} ريال
                </span>
              </div>
              {(couponDiscount?.discount || parseFloat(formData.discountAmount || "0")) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">الخصم:</span>
                  <span className="font-medium text-red-600">
                    -{(couponDiscount?.discount || parseFloat(formData.discountAmount || "0")).toFixed(2)} ريال
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs text-gray-500">
                <span>السعر الأساسي (بدون ضريبة):</span>
                <span>{calculateBasePrice().toFixed(2)} ريال</span>
              </div>
              {calculateTax() > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>الضريبة (15% من ضمن المبلغ):</span>
                  <span>{calculateTax().toFixed(2)} ريال</span>
                </div>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-pink-200 pt-4">
                <span className="text-lg font-semibold text-gray-900">الإجمالي النهائي:</span>
                <span className="text-2xl font-bold text-pink-600">
                  {calculateTotal().toFixed(2)} ريال
                </span>
              </div>
            </div>
          </div>

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
              {loading ? "جاري الحفظ..." : "إنشاء الفاتورة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}





