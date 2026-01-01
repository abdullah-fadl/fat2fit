"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Edit, Trash2, Calendar, Percent, DollarSign, Tag, X } from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface Coupon {
  id: string
  code: string
  name: string
  description: string | null
  discountType: string
  discountValue: number
  minPurchase: number | null
  maxDiscount: number | null
  validFrom: Date
  validUntil: Date
  maxUses: number | null
  currentUses: number
  isActive: boolean
  createdAt: Date
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    minPurchase: "",
    maxDiscount: "",
    validFrom: "",
    validUntil: "",
    maxUses: "",
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const validFromInputRef = useRef<HTMLInputElement>(null)
  const validUntilInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    try {
      const res = await fetch("/api/coupons")
      const data = await res.json()
      setCoupons(data)
    } catch (error) {
      console.error("Error fetching coupons:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon)
      setFormData({
        code: coupon.code,
        name: coupon.name,
        description: coupon.description || "",
        discountType: coupon.discountType,
        discountValue: coupon.discountValue.toString(),
        minPurchase: coupon.minPurchase?.toString() || "",
        maxDiscount: coupon.maxDiscount?.toString() || "",
        validFrom: format(new Date(coupon.validFrom), "yyyy-MM-dd"),
        validUntil: format(new Date(coupon.validUntil), "yyyy-MM-dd"),
        maxUses: coupon.maxUses?.toString() || "",
        isActive: coupon.isActive,
      })
    } else {
      setEditingCoupon(null)
      setFormData({
        code: "",
        name: "",
        description: "",
        discountType: "PERCENTAGE",
        discountValue: "",
        minPurchase: "",
        maxDiscount: "",
        validFrom: "",
        validUntil: "",
        maxUses: "",
        isActive: true,
      })
    }
    setShowModal(true)
    setError("")
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCoupon(null)
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = editingCoupon
        ? `/api/coupons/${editingCoupon.id}`
        : "/api/coupons"
      const method = editingCoupon ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        setError(errorData.error || "حدث خطأ")
        return
      }

      handleCloseModal()
      fetchCoupons()
    } catch (err) {
      console.error("Error saving coupon:", err)
      setError("حدث خطأ أثناء الحفظ")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الكوبون؟")) {
      return
    }

    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        alert("حدث خطأ أثناء الحذف")
        return
      }

      fetchCoupons()
    } catch (error) {
      console.error("Error deleting coupon:", error)
      alert("حدث خطأ أثناء الحذف")
    }
  }

  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date()
    const isExpired = now > new Date(coupon.validUntil)
    const isNotStarted = now < new Date(coupon.validFrom)
    const isMaxedOut = coupon.maxUses && coupon.currentUses >= coupon.maxUses

    if (!coupon.isActive) {
      return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">غير نشط</span>
    }
    if (isExpired) {
      return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">منتهي</span>
    }
    if (isNotStarted) {
      return <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">لم يبدأ</span>
    }
    if (isMaxedOut) {
      return <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800">مستنفد</span>
    }
    return <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">نشط</span>
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">الكوبونات والعروض</h1>
          <p className="mt-2 text-gray-600">إدارة كوبونات الخصم والعروض الخاصة</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700"
        >
          <Plus className="h-5 w-5" />
          إضافة كوبون
        </button>
      </div>

      {/* Coupons Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">الكود</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">الاسم</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">نوع الخصم</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">قيمة الخصم</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">صالح من</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">صالح حتى</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">الاستخدام</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">الحالة</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    جاري التحميل...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    لا توجد كوبونات
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-pink-600">{coupon.code}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{coupon.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {coupon.discountType === "PERCENTAGE" ? (
                        <span className="flex items-center gap-1">
                          <Percent className="h-4 w-4" />
                          نسبة
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          مبلغ ثابت
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {coupon.discountType === "PERCENTAGE"
                        ? `${coupon.discountValue}%`
                        : `${coupon.discountValue} ريال`}
                      {coupon.maxDiscount && coupon.discountType === "PERCENTAGE" && (
                        <span className="block text-xs text-gray-500">
                          (حد أقصى: {coupon.maxDiscount} ريال)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(new Date(coupon.validFrom), "yyyy-MM-dd", { locale: ar })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(new Date(coupon.validUntil), "yyyy-MM-dd", { locale: ar })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {coupon.currentUses} {coupon.maxUses ? `/ ${coupon.maxUses}` : ""}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(coupon)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(coupon)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingCoupon ? "تعديل كوبون" : "إضافة كوبون جديد"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    كود الكوبون <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                    placeholder="WINTER2024"
                    required
                    disabled={!!editingCoupon}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {editingCoupon ? "لا يمكن تعديل الكود" : "سيتم تحويله إلى أحرف كبيرة"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم الكوبون <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                    placeholder="عرض الشتاء"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الوصف
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                    placeholder="وصف الكوبون..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نوع الخصم <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({ ...formData, discountType: e.target.value })
                    }
                    className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                    required
                  >
                    <option value="PERCENTAGE">نسبة مئوية (%)</option>
                    <option value="FIXED">مبلغ ثابت (ريال)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.discountType === "PERCENTAGE"
                      ? "نسبة الخصم (%)"
                      : "قيمة الخصم (ريال)"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={formData.discountType === "PERCENTAGE" ? "100" : undefined}
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData({ ...formData, discountValue: e.target.value })
                    }
                    className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                    placeholder="0"
                    required
                  />
                </div>

                {formData.discountType === "PERCENTAGE" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الحد الأقصى للخصم (ريال)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.maxDiscount}
                      onChange={(e) =>
                        setFormData({ ...formData, maxDiscount: e.target.value })
                      }
                      className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                      placeholder="اختياري"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحد الأدنى للشراء (ريال)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minPurchase}
                    onChange={(e) =>
                      setFormData({ ...formData, minPurchase: e.target.value })
                    }
                    className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                    placeholder="اختياري"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    صالح من <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={validFromInputRef}
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) =>
                        setFormData({ ...formData, validFrom: e.target.value })
                      }
                      className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pl-14 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        validFromInputRef.current?.showPicker?.() || validFromInputRef.current?.click()
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-pink-600 transition-all"
                      title="انقر لاختيار التاريخ"
                    >
                      <Calendar className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    صالح حتى <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={validUntilInputRef}
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) =>
                        setFormData({ ...formData, validUntil: e.target.value })
                      }
                      className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pl-14 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        validUntilInputRef.current?.showPicker?.() || validUntilInputRef.current?.click()
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-pink-600 transition-all"
                      title="انقر لاختيار التاريخ"
                    >
                      <Calendar className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحد الأقصى لعدد الاستخدامات
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxUses}
                    onChange={(e) =>
                      setFormData({ ...formData, maxUses: e.target.value })
                    }
                    className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                    placeholder="لا يوجد حد"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                  <label htmlFor="isActive" className="mr-2 text-sm font-medium text-gray-700">
                    نشط
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
                >
                  {saving ? "جاري الحفظ..." : editingCoupon ? "حفظ التعديلات" : "إضافة كوبون"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}







