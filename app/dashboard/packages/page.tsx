"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Edit, Trash2, Package } from "lucide-react"

interface SubscriptionPackage {
  id: string
  name: string
  nameAr: string
  type: string
  duration: number
  price: number
  visits: number | null
  isVIP: boolean
  description: string | null
  isActive: boolean
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<SubscriptionPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<SubscriptionPackage | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    type: "MONTH",
    duration: 30,
    price: "",
    visits: "",
    isVIP: false,
    description: "",
  })

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    try {
      const res = await fetch("/api/packages")
      const data = await res.json()
      setPackages(data)
    } catch (error) {
      console.error("Error fetching packages:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingPackage 
        ? `/api/packages/${editingPackage.id}`
        : "/api/packages"
      
      const method = editingPackage ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          visits: formData.visits ? parseInt(formData.visits) : null,
          duration: parseInt(formData.duration.toString()),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert(errorData.error || "حدث خطأ")
        return
      }

      setShowModal(false)
      resetForm()
      fetchPackages()
    } catch (error) {
      console.error("Error saving package:", error)
      alert("حدث خطأ أثناء الحفظ")
    }
  }

  const handleEdit = (pkg: SubscriptionPackage) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      nameAr: pkg.nameAr,
      type: pkg.type,
      duration: pkg.duration,
      price: pkg.price.toString(),
      visits: pkg.visits?.toString() || "",
      isVIP: pkg.isVIP,
      description: pkg.description || "",
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الباقة؟")) return

    try {
      const response = await fetch(`/api/packages/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        alert("حدث خطأ أثناء الحذف")
        return
      }

      fetchPackages()
    } catch (error) {
      console.error("Error deleting package:", error)
      alert("حدث خطأ أثناء الحذف")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      nameAr: "",
      type: "MONTHLY",
      duration: 30,
      price: "",
      visits: "",
      isVIP: false,
      description: "",
    })
    setEditingPackage(null)
  }

  const getTypeLabel = (type: string, duration?: number) => {
    const types: { [key: string]: string } = {
      DAY: "يوم واحد",
      MONTH: "شهر واحد",
      "3_MONTHS": "3 أشهر",
      "6_MONTHS": "6 أشهر",
      YEAR: "سنة واحدة",
      MONTHLY: "شهري",
      QUARTERLY: "ربع سنوي",
      YEARLY: "سنوي",
      VISIT_BASED: "حسب الزيارات",
      VIP: "VIP",
      SEASONAL: "موسمي",
      CUSTOM: duration ? `${duration} يوم` : "مخصص",
    }
    return types[type] || type
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إدارة الباقات</h1>
          <p className="mt-2 text-gray-600">عرض وإدارة باقات الاشتراكات</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700"
        >
          <Plus className="h-5 w-5" />
          إضافة باقة جديدة
        </button>
      </div>

      {/* Packages Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-pink-500 border-t-transparent mx-auto"></div>
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-pink-100 p-3">
                    <Package className="h-6 w-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{pkg.nameAr}</h3>
                    <p className="text-sm text-gray-600">{pkg.name}</p>
                  </div>
                </div>
                {pkg.isVIP && (
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
                    VIP
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">النوع:</span>
                  <span className="font-medium">{getTypeLabel(pkg.type, pkg.duration)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">المدة:</span>
                  <span className="font-semibold text-gray-900">
                    {pkg.duration >= 365 
                      ? `${Math.round(pkg.duration / 30)} شهر • ${pkg.duration} يوم`
                      : pkg.duration >= 30
                      ? `${Math.round(pkg.duration / 30)} شهر • ${pkg.duration} يوم`
                      : `${pkg.duration} يوم`
                    }
                  </span>
                </div>
                {pkg.visits && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">عدد الزيارات:</span>
                    <span className="font-medium">{pkg.visits} زيارة</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-pink-600 mt-4 pt-4 border-t">
                  <span>السعر:</span>
                  <span>{pkg.price} ريال</span>
                </div>
                {pkg.description && (
                  <p className="text-sm text-gray-500 mt-2">{pkg.description}</p>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => handleEdit(pkg)}
                  className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                >
                  <Edit className="h-4 w-4 inline mr-1" />
                  تعديل
                </button>
                <button
                  onClick={() => handleDelete(pkg.id)}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              {editingPackage ? "تعديل الباقة" : "إضافة باقة جديدة"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-2">
                    الاسم بالإنجليزية <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1 block w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-4 text-lg font-bold text-gray-900 shadow-sm placeholder:text-gray-700 focus:border-pink-500 focus:ring-pink-500"
                    style={{ fontSize: '18px', fontWeight: '700' }}
                    placeholder="Winter Offer"
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-2">
                    الاسم بالعربية <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    required
                    className="mt-1 block w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-4 text-lg font-bold text-gray-900 shadow-sm placeholder:text-gray-700 focus:border-pink-500 focus:ring-pink-500"
                    style={{ fontSize: '18px', fontWeight: '700' }}
                    placeholder="عرض الشتاء"
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-2">
                    نوع الباقة / المدة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const selectedType = e.target.value
                      let days = 30
                      
                      // حساب المدة تلقائياً حسب النوع
                      switch(selectedType) {
                        case "DAY":
                          days = 1
                          break
                        case "MONTH":
                          days = 30
                          break
                        case "3_MONTHS":
                          days = 90
                          break
                        case "6_MONTHS":
                          days = 180
                          break
                        case "YEAR":
                          days = 365
                          break
                        default:
                          days = formData.duration
                      }
                      
                      setFormData({ ...formData, type: selectedType, duration: days })
                    }}
                    required
                    className="mt-1 block w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-4 text-lg font-bold text-gray-900 shadow-sm placeholder:text-gray-700 focus:border-pink-500 focus:ring-pink-500"
                    style={{ fontSize: '18px', fontWeight: '700' }}
                  >
                    <option value="DAY" style={{ fontSize: '18px', fontWeight: '700' }}>يوم واحد</option>
                    <option value="MONTH" style={{ fontSize: '18px', fontWeight: '700' }}>شهر واحد</option>
                    <option value="3_MONTHS" style={{ fontSize: '18px', fontWeight: '700' }}>3 أشهر</option>
                    <option value="6_MONTHS" style={{ fontSize: '18px', fontWeight: '700' }}>6 أشهر</option>
                    <option value="YEAR" style={{ fontSize: '18px', fontWeight: '700' }}>سنة واحدة</option>
                  </select>
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    سيتم حساب المدة تلقائياً: <span className="text-pink-600 font-bold">{formData.duration} يوم</span>
                  </p>
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-2">
                    المدة بالأيام (للتعديل اليدوي - اختياري)
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0, type: "CUSTOM" })}
                    min="1"
                    className="mt-1 block w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-4 text-lg font-bold text-gray-900 shadow-sm placeholder:text-gray-700 focus:border-pink-500 focus:ring-pink-500"
                    style={{ fontSize: '18px', fontWeight: '700' }}
                    placeholder={formData.duration?.toString() || "180"}
                  />
                  <p className="mt-2 text-sm text-gray-600">
                    يمكنك تعديل المدة يدوياً إذا أردت مدة مختلفة
                  </p>
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-2">
                    السعر (ريال) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-4 text-lg font-bold text-gray-900 shadow-sm placeholder:text-gray-700 focus:border-pink-500 focus:ring-pink-500"
                    style={{ fontSize: '18px', fontWeight: '700' }}
                    placeholder="1500"
                  />
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-2">
                    عدد الزيارات (اختياري)
                  </label>
                  <input
                    type="number"
                    value={formData.visits}
                    onChange={(e) => setFormData({ ...formData, visits: e.target.value })}
                    min="1"
                    className="mt-1 block w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-4 text-lg font-bold text-gray-900 shadow-sm placeholder:text-gray-700 focus:border-pink-500 focus:ring-pink-500"
                    style={{ fontSize: '18px', fontWeight: '700' }}
                    placeholder="اتركه فارغ للاشتراك المفتوح"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isVIP}
                    onChange={(e) => setFormData({ ...formData, isVIP: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                  <span className="text-sm font-medium text-gray-700">باقة VIP</span>
                </label>
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  الوصف (اختياري)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                    className="mt-1 block w-full rounded-lg border-2 border-gray-400 bg-white px-4 py-4 text-lg font-bold text-gray-900 shadow-sm placeholder:text-gray-700 focus:border-pink-500 focus:ring-pink-500"
                    style={{ fontSize: '18px', fontWeight: '700' }}
                  placeholder="وصف الباقة..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700"
                >
                  {editingPackage ? "حفظ التعديلات" : "إضافة الباقة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

