"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Save, Calendar, TrendingUp, Tag } from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface Package {
  id: string
  nameAr: string
  type: string
  duration: number
  price: number
  visits: number | null
}

interface Subscription {
  id: string
  startDate: Date
  endDate: Date
  status: string
  finalPrice: number
  package: {
    id: string
    nameAr: string
    duration: number
    price: number
  }
  client: {
    id: string
    name: string
  }
}

export default function RenewSubscriptionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const subscriptionId = searchParams.get("subscriptionId")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [formData, setFormData] = useState({
    newPackageId: "",
    startDate: "",
    discountAmount: "",
    discountPercent: "",
    couponCode: "",
    notes: "",
  })
  const [couponDiscount, setCouponDiscount] = useState<{
    valid: boolean
    coupon: any
    discount: number
  } | null>(null)
  const [couponError, setCouponError] = useState("")
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  const [isUpgrade, setIsUpgrade] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (subscriptionId) {
      fetchSubscription()
      fetchPackages()
    }
  }, [subscriptionId])

  useEffect(() => {
    if (selectedPackage && formData.startDate) {
      calculatePrice()
    }
  }, [selectedPackage, formData.discountAmount, formData.discountPercent, couponDiscount, formData.startDate])

  const fetchSubscription = async () => {
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}`)
      if (res.ok) {
        const data = await res.json()
        setSubscription(data)
        setFormData((prev) => ({
          ...prev,
          newPackageId: data.package.id,
          startDate: format(new Date(data.endDate), "yyyy-MM-dd"),
        }))
        setSelectedPackage(data.package)
      }
    } catch (error) {
      console.error("Error fetching subscription:", error)
    }
  }

  const fetchPackages = async () => {
    try {
      const res = await fetch("/api/packages")
      const data = await res.json()
      setPackages(data)
    } catch (error) {
      console.error("Error fetching packages:", error)
    }
  }

  const calculatePrice = () => {
    if (!selectedPackage) return

    let price = selectedPackage.price

    if (couponDiscount?.valid && couponDiscount?.discount) {
      price = price - couponDiscount.discount
    } else if (formData.discountPercent) {
      const discount = (price * parseFloat(formData.discountPercent)) / 100
      price = price - discount
    } else if (formData.discountAmount) {
      price = price - parseFloat(formData.discountAmount)
    }

    if (price < 0) price = 0
    setCalculatedPrice(price)
  }

  const handleValidateCoupon = async () => {
    if (!formData.couponCode.trim() || !selectedPackage) {
      setCouponError("يجب إدخال كود الكوبون واختيار باقة")
      return
    }

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.couponCode,
          amount: selectedPackage.price,
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
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const action = isUpgrade ? "upgrade" : "renew"
      const res = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          newPackageId: formData.newPackageId !== subscription?.package.id ? formData.newPackageId : undefined,
          startDate: formData.startDate || undefined,
          discountAmount: couponDiscount?.discount || formData.discountAmount || undefined,
          discountPercent: formData.discountPercent || undefined,
          couponCode: couponDiscount?.valid ? formData.couponCode : undefined,
          notes: formData.notes || undefined,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "حدث خطأ")
      }

      const result = await res.json()
      router.push(`/dashboard/clients/${subscription?.client.id}`)
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تجديد الاشتراك")
    } finally {
      setLoading(false)
    }
  }

  if (!subscription) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-pink-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  const isDifferentPackage = formData.newPackageId !== subscription.package.id

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
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-pink-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isDifferentPackage ? "ترقية الاشتراك" : "تجديد الاشتراك"}
            </h1>
            <p className="mt-2 text-gray-600">
              {subscription.client.name} - الباقة الحالية: {subscription.package.nameAr}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Current Subscription Info */}
        <div className="mb-6 rounded-lg bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-gray-900">الاشتراك الحالي</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">الباقة:</p>
              <p className="font-medium">{subscription.package.nameAr}</p>
            </div>
            <div>
              <p className="text-gray-600">تاريخ الانتهاء:</p>
              <p className="font-medium">
                {format(new Date(subscription.endDate), "yyyy-MM-dd", { locale: ar })}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Package Selection */}
          <div>
            <label className="block text-base font-semibold text-gray-900 mb-2">
              {isDifferentPackage ? "الباقة الجديدة" : "الباقة"} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.newPackageId}
              onChange={(e) => {
                const pkg = packages.find((p) => p.id === e.target.value)
                setFormData({ ...formData, newPackageId: e.target.value })
                setSelectedPackage(pkg || null)
                setIsUpgrade(pkg?.id !== subscription.package.id)
              }}
              className="block w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-4 text-lg font-bold text-gray-900 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              style={{ fontSize: '18px', fontWeight: '700' }}
              required
            >
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.nameAr} - {pkg.price} ريال • {pkg.duration >= 30 ? `${Math.round(pkg.duration / 30)} شهر` : ""} {pkg.duration} يوم
                </option>
              ))}
            </select>
            {isDifferentPackage && (
              <p className="mt-2 text-sm font-medium text-blue-600">
                ⬆️ ترقية من {subscription.package.nameAr} إلى{" "}
                {selectedPackage?.nameAr}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-base font-semibold text-gray-900 mb-2">
              تاريخ بداية الاشتراك <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={dateInputRef}
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="block w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-4 pl-14 text-lg font-bold text-gray-900 shadow-sm placeholder:text-gray-700 focus:border-pink-500 focus:ring-pink-500"
                style={{ fontSize: '18px', fontWeight: '700' }}
                required
              />
              <button
                type="button"
                onClick={() => {
                  dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-pink-600 transition-all"
              >
                <Calendar className="h-6 w-6" />
              </button>
            </div>
            {formData.startDate && selectedPackage && (
              <div className="mt-3 rounded-lg bg-blue-50 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">تاريخ البداية:</p>
                    <p className="mt-1 text-base font-semibold text-gray-900">
                      {format(new Date(formData.startDate), "yyyy-MM-dd", { locale: ar })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">تاريخ الانتهاء:</p>
                    <p className="mt-1 text-base font-semibold text-blue-600">
                      {(() => {
                        const start = new Date(formData.startDate)
                        const end = new Date(start)
                        end.setDate(end.getDate() + selectedPackage.duration)
                        return format(end, "yyyy-MM-dd", { locale: ar })
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Coupon */}
          <div>
            <label className="block text-base font-semibold text-gray-900 mb-2">
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
                className="flex-1 rounded-lg border-2 border-gray-400 bg-white px-4 py-3 text-lg font-bold text-gray-900 shadow-sm placeholder:text-gray-700 focus:border-pink-500 focus:ring-pink-500"
                style={{ fontSize: '18px', fontWeight: '700' }}
              />
              <button
                type="button"
                onClick={handleValidateCoupon}
                disabled={!formData.couponCode.trim() || !selectedPackage}
                className="rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
              >
                تطبيق
              </button>
            </div>
            {couponError && <p className="mt-2 text-sm text-red-600">{couponError}</p>}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  خصم (نسبة %)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.discountPercent}
                  onChange={(e) => {
                    setFormData({ ...formData, discountPercent: e.target.value, discountAmount: "" })
                  }}
                  className="block w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-4 text-lg font-bold text-gray-900 shadow-sm placeholder:text-gray-700 focus:border-pink-500 focus:ring-pink-500"
                  style={{ fontSize: '18px', fontWeight: '700' }}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  خصم (مبلغ)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discountAmount}
                  onChange={(e) => {
                    setFormData({ ...formData, discountAmount: e.target.value, discountPercent: "" })
                  }}
                  className="block w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-4 text-lg font-bold text-gray-900 shadow-sm placeholder:text-gray-700 focus:border-pink-500 focus:ring-pink-500"
                  style={{ fontSize: '18px', fontWeight: '700' }}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-base font-semibold text-gray-900 mb-2">
              ملاحظات
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="block w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-4 text-lg font-bold text-gray-900 shadow-sm placeholder:text-gray-700 focus:border-pink-500 focus:ring-pink-500"
              style={{ fontSize: '18px', fontWeight: '700' }}
              placeholder="ملاحظات إضافية..."
            />
          </div>

          {/* Final Price */}
          {selectedPackage && (
            <div className="rounded-lg bg-pink-50 p-6">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">السعر النهائي:</span>
                <span className="text-2xl font-bold text-pink-600">
                  {calculatedPrice.toFixed(2)} ريال
                </span>
              </div>
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
              {loading
                ? "جاري الحفظ..."
                : isDifferentPackage
                ? "ترقية الاشتراك"
                : "تجديد الاشتراك"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


