"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowRight, Save } from "lucide-react"

export default function EditStaffPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "RECEPTION",
    isActive: true,
  })

  useEffect(() => {
    const staffId = params?.id as string
    if (staffId) {
      fetchStaff(staffId)
    }
  }, [params?.id])

  const fetchStaff = async (id: string) => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch(`/api/staff/${id}`)
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        setError(errorData.error || `خطأ ${res.status}: ${res.statusText}`)
        return
      }

      const data = await res.json()
      setFormData({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        password: "", // لا نملأ كلمة المرور
        role: data.role || "RECEPTION",
        isActive: data.isActive !== undefined ? data.isActive : true,
      })
    } catch (error: any) {
      console.error("Error fetching staff:", error)
      setError(error.message || "حدث خطأ أثناء جلب البيانات. تأكد من الاتصال بالخادم.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        isActive: formData.isActive,
      }

      // إضافة كلمة المرور فقط إذا تم إدخالها
      if (formData.password.trim()) {
        updateData.password = formData.password
      }

      const res = await fetch(`/api/staff/${params?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "حدث خطأ")
      }

      router.push("/dashboard/staff")
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحديث الموظف")
    } finally {
      setSaving(false)
    }
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

  if (error && !formData.name) {
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
        </div>
        <div className="rounded-lg bg-red-50 p-6 text-red-800">
          {error}
        </div>
      </div>
    )
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
        <h1 className="text-3xl font-bold text-gray-900">تعديل موظف/مدربة</h1>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* البيانات الأساسية */}
          <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">البيانات الأساسية</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">رقم الجوال</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">الدور</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                >
                  <option value="RECEPTION">استقبال</option>
                  <option value="TRAINER">مدربة</option>
                  <option value="ADMIN">مديرة</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="اتركه فارغاً إذا كنت لا تريد تغيير كلمة المرور"
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  اتركه فارغاً إذا كنت لا تريد تغيير كلمة المرور
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                  <span className="text-sm font-medium text-gray-700">نشط</span>
                </label>
              </div>
            </div>
          </div>

          {/* أزرار الحفظ */}
          <div className="flex justify-end gap-4 border-t pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-2 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

