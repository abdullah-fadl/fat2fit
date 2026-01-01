"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowRight, Save, CreditCard, Calendar, Search, X } from "lucide-react"

// أسماء الأشهر الميلادية بالعربية
const GREGORIAN_MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
]

// دالة لتنسيق التاريخ الميلادي بالعربية
function formatGregorianDateArabic(date: Date): string {
  const day = date.getDate()
  const month = GREGORIAN_MONTHS_AR[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

const subscriptionSchema = z.object({
  clientId: z.string().min(1, "يجب اختيار عميلة"),
  packageId: z.string().min(1, "يجب اختيار باقة"),
  startDate: z.string().min(1, "يجب اختيار تاريخ البداية"),
  discountAmount: z.string().optional(),
  discountPercent: z.string().optional(),
  notes: z.string().optional(),
})

type SubscriptionFormData = z.infer<typeof subscriptionSchema>

interface Package {
  id: string
  nameAr: string
  type: string
  duration: number
  price: number
  visits: number | null
}

interface Client {
  id: string
  name: string
  membershipNumber: string
  phone: string
}

export default function NewSubscriptionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [packages, setPackages] = useState<Package[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [calculatedPrice, setCalculatedPrice] = useState(0)
  const [couponCode, setCouponCode] = useState("")
  const [couponDiscount, setCouponDiscount] = useState<{
    valid: boolean
    coupon: any
    discount: number
  } | null>(null)
  const [couponError, setCouponError] = useState("")
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [clientSearchQuery, setClientSearchQuery] = useState("")
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
  const [selectedClientForDisplay, setSelectedClientForDisplay] = useState<Client | null>(null)
  const clientSearchRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      clientId: searchParams.get("clientId") || "",
      startDate: new Date().toISOString().split("T")[0],
    },
  })

  const packageId = watch("packageId")
  const discountAmount = watch("discountAmount")
  const discountPercent = watch("discountPercent")
  const startDate = watch("startDate")

  useEffect(() => {
    fetchPackages()
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

  // تحديث العميلة المختارة عند تغيير clientId
  const clientId = watch("clientId")
  useEffect(() => {
    if (clientId) {
      const client = clients.find((c) => c.id === clientId)
      if (client) {
        setSelectedClientForDisplay(client)
        setClientSearchQuery("")
      }
    } else {
      setSelectedClientForDisplay(null)
    }
  }, [clientId, clients])

  // تحديد العميلة تلقائياً إذا كانت موجودة في URL
  useEffect(() => {
    const clientIdFromUrl = searchParams.get("clientId")
    if (clientIdFromUrl && clients.length > 0) {
      const clientExists = clients.find((c) => c.id === clientIdFromUrl)
      if (clientExists) {
        setValue("clientId", clientIdFromUrl)
      }
    }
  }, [clients, searchParams, setValue])

  useEffect(() => {
    if (packageId) {
      const pkg = packages.find((p) => p.id === packageId)
      setSelectedPackage(pkg || null)
      calculatePrice(pkg || null, discountAmount, discountPercent, couponDiscount)
    }
  }, [packageId, discountAmount, discountPercent, couponDiscount])

  useEffect(() => {
    if (packageId && selectedPackage) {
      calculatePrice(selectedPackage, discountAmount, discountPercent, couponDiscount)
    }
  }, [couponDiscount])

  const fetchPackages = async () => {
    try {
      const res = await fetch("/api/packages")
      const data = await res.json()
      setPackages(data)
    } catch (error) {
      console.error("Error fetching packages:", error)
    }
  }

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients")
      const data = await res.json()
      setClients(data)
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const calculatePrice = (
    pkg: Package | null,
    discountAmt: string | undefined,
    discountPct: string | undefined,
    coupon: typeof couponDiscount
  ) => {
    if (!pkg) {
      setCalculatedPrice(0)
      return
    }

    let price = pkg.price

    // Apply manual discount first
    if (discountPct) {
      const discount = (price * parseFloat(discountPct)) / 100
      price = price - discount
    } else if (discountAmt) {
      price = price - parseFloat(discountAmt)
    }

    // Apply coupon discount
    if (coupon?.valid && coupon?.discount) {
      price = price - coupon.discount
    }

    if (price < 0) price = 0
    setCalculatedPrice(price)
  }

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("يجب إدخال كود الكوبون")
      return
    }

    if (!selectedPackage) {
      setCouponError("يجب اختيار باقة أولاً")
      return
    }

    setValidatingCoupon(true)
    setCouponError("")

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
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
    } finally {
      setValidatingCoupon(false)
    }
  }

  const onSubmit = async (data: SubscriptionFormData) => {
    setLoading(true)
    setError("")

    try {
      // إنشاء اشتراك عادي (مفعل) - يتم إنشاء فاتورة تلقائياً
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          discountAmount: data.discountAmount ? parseFloat(data.discountAmount) : undefined,
          discountPercent: data.discountPercent ? parseFloat(data.discountPercent) : undefined,
          couponCode: couponDiscount?.valid ? couponCode : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "حدث خطأ")
      }

      const result = await response.json()
      // التوجيه إلى صفحة الفاتورة دائماً بعد إنشاء الاشتراك
      if (result.invoiceId) {
        router.push(`/dashboard/invoices/${result.invoiceId}`)
      } else {
        // في حالة عدم وجود invoiceId، نعود إلى صفحة العميلة
        router.push(`/dashboard/clients/${data.clientId}`)
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء العملية")
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
        <h1 className="text-3xl font-bold text-gray-900">اشتراك جديد / تجديد</h1>
        <p className="mt-2 text-gray-600">اختر العميلة والباقة</p>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Client Selection */}
          <div className="relative" ref={clientSearchRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              العميلة <span className="text-red-500">*</span>
            </label>
            {searchParams.get("clientId") && clients.length > 0 ? (
              // عرض العميلة المحددة بشكل read-only
              <div className="mt-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2">
                {(() => {
                  const selectedClient = clients.find(
                    (c) => c.id === searchParams.get("clientId")
                  )
                  return selectedClient ? (
                    <p className="text-gray-900">
                      {selectedClient.name} - {selectedClient.membershipNumber} - {selectedClient.phone}
                    </p>
                  ) : (
                    <p className="text-gray-500">جاري التحميل...</p>
                  )
                })()}
                <input type="hidden" {...register("clientId")} />
              </div>
            ) : (
              // حقل البحث
              <div className="relative">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={selectedClientForDisplay ? `${selectedClientForDisplay.name} - ${selectedClientForDisplay.membershipNumber} - ${selectedClientForDisplay.phone}` : clientSearchQuery}
                    onChange={(e) => {
                      setClientSearchQuery(e.target.value)
                      setIsClientDropdownOpen(true)
                      if (!e.target.value) {
                        setValue("clientId", "")
                        setSelectedClientForDisplay(null)
                      }
                    }}
                    onFocus={() => setIsClientDropdownOpen(true)}
                    placeholder="ابحث عن عميلة (الاسم، رقم العضوية، رقم الجوال)..."
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2 pr-10 pl-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                  />
                  {selectedClientForDisplay && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientForDisplay(null)
                        setClientSearchQuery("")
                        setValue("clientId", "")
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
                          setSelectedClientForDisplay(client)
                          setClientSearchQuery("")
                          setIsClientDropdownOpen(false)
                          setValue("clientId", client.id)
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
            )}
            {errors.clientId && (
              <p className="mt-1 text-sm text-red-600">{errors.clientId.message}</p>
            )}
          </div>

          {/* Package Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              الباقة <span className="text-red-500">*</span>
            </label>
            <select
              {...register("packageId")}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
            >
              <option value="">اختر باقة...</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.nameAr} - {pkg.price} ريال • {pkg.duration >= 30 ? `${Math.round(pkg.duration / 30)} شهر` : ""} {pkg.duration} يوم
                  {pkg.visits && ` - ${pkg.visits} زيارة`}
                </option>
              ))}
            </select>
            {errors.packageId && (
              <p className="mt-1 text-sm text-red-600">{errors.packageId.message}</p>
            )}
          </div>

          {/* Package Details */}
          {selectedPackage && (
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-3 text-base font-bold text-gray-900">تفاصيل الباقة</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">النوع</p>
                  <p className="text-base font-bold text-gray-900">{selectedPackage.nameAr}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">المدة</p>
                  <p className="text-base font-bold text-gray-900">
                    {selectedPackage.duration >= 30 
                      ? `${Math.round(selectedPackage.duration / 30)} شهر • ${selectedPackage.duration} يوم`
                      : `${selectedPackage.duration} يوم`
                    }
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">السعر الأصلي</p>
                  <p className="text-base font-bold text-gray-900">{selectedPackage.price} ريال</p>
                </div>
                {selectedPackage.visits && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">عدد الزيارات</p>
                    <p className="text-base font-bold text-gray-900">{selectedPackage.visits} زيارة</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تاريخ بداية الاشتراك <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                {...register("startDate")}
                ref={(e) => {
                  register("startDate").ref(e)
                  dateInputRef.current = e
                }}
                type="date"
                id="startDateInput"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pl-14 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
              />
              <button
                type="button"
                onClick={() => {
                  dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-pink-600 transition-all"
                title="انقر لاختيار التاريخ من التقويم"
              >
                <Calendar className="h-6 w-6" />
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              انقر على الأيقونة أو الحقل لاختيار التاريخ من التقويم
            </p>
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
            )}
            {startDate && selectedPackage && (
              <div className="mt-3 rounded-lg bg-blue-50 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">تاريخ البداية:</p>
                    <p className="mt-1 text-base font-semibold text-gray-900">
                      {formatGregorianDateArabic(new Date(startDate))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">تاريخ الانتهاء:</p>
                    <p className="mt-1 text-base font-semibold text-blue-600">
                      {(() => {
                        const start = new Date(startDate)
                        const end = new Date(start)
                        end.setDate(end.getDate() + selectedPackage.duration)
                        return formatGregorianDateArabic(end)
                      })()}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  المدة: {selectedPackage.duration >= 30 
                    ? `${Math.round(selectedPackage.duration / 30)} شهر • ${selectedPackage.duration} يوم`
                    : `${selectedPackage.duration} يوم`
                  }
                </p>
              </div>
            )}
          </div>

          {/* Coupon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كود الكوبون (اختياري)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase())
                  setCouponDiscount(null)
                  setCouponError("")
                }}
                placeholder="WINTER2024"
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
              />
              <button
                type="button"
                onClick={handleValidateCoupon}
                disabled={validatingCoupon || !couponCode.trim() || !selectedPackage}
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

          {/* Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                خصم (نسبة %)
              </label>
              <input
                {...register("discountPercent")}
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="0"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                onChange={(e) => {
                  setValue("discountPercent", e.target.value)
                  setValue("discountAmount", "")
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                خصم (مبلغ)
              </label>
              <input
                {...register("discountAmount")}
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                onChange={(e) => {
                  setValue("discountAmount", e.target.value)
                  setValue("discountPercent", "")
                }}
              />
            </div>
          </div>

          {/* Final Price */}
          {selectedPackage && (
            <div className="rounded-lg bg-pink-50 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">السعر النهائي (يشمل الضريبة):</span>
                  <span className="font-medium text-gray-900">
                    {calculatedPrice.toFixed(2)} ريال
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>السعر الأساسي (بدون ضريبة):</span>
                  <span>{(calculatedPrice / 1.15).toFixed(2)} ريال</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>الضريبة (15% من ضمن المبلغ):</span>
                  <span>{(calculatedPrice - (calculatedPrice / 1.15)).toFixed(2)} ريال</span>
                </div>
                <div className="flex items-center justify-between border-t border-pink-200 pt-2">
                  <span className="font-semibold text-gray-900">الإجمالي النهائي:</span>
                  <span className="text-2xl font-bold text-pink-600">
                    {calculatedPrice.toFixed(2)} ريال
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700">ملاحظات</label>
            <textarea
              {...register("notes")}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
            />
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
              {loading ? "جاري الحفظ..." : "إنشاء الاشتراك"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}






