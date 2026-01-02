"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Fingerprint, Save, ArrowRight } from "lucide-react"

export default function NewZKDevicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    ip: "",
    port: "4370",
    password: "",
    description: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch("/api/zk-devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          ip: formData.ip,
          port: parseInt(formData.port),
          password: formData.password || null,
          description: formData.description || null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: "success", text: "تم إضافة الجهاز بنجاح" })
        setTimeout(() => {
          router.push("/dashboard/zk-devices")
        }, 1500)
      } else {
        setMessage({ type: "error", text: data.error || "فشل إضافة الجهاز" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "حدث خطأ أثناء إضافة الجهاز" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowRight className="h-5 w-5" />
          العودة
        </button>
        <h1 className="text-3xl font-bold text-gray-900">إضافة جهاز بصمة ZK جديد</h1>
        <p className="mt-2 text-gray-600">أدخل بيانات جهاز البصمة للاتصال به</p>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-lg p-4 ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-8 shadow">
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                اسم الجهاز <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="مثل: جهاز البصمة الرئيسي"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label htmlFor="ip" className="block text-sm font-medium text-gray-700 mb-2">
                عنوان IP <span className="text-red-500">*</span>
              </label>
              <input
                id="ip"
                type="text"
                value={formData.ip}
                onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                required
                placeholder="192.168.1.100"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                العنوان IP للجهاز على الشبكة المحلية
              </p>
            </div>

            <div>
              <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-2">
                المنفذ (Port)
              </label>
              <input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                placeholder="4370"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-500"
              />
              <p className="mt-1 text-xs text-gray-500">المنفذ الافتراضي لـ ZKTeco: 4370</p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور (اختياري)
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="كلمة مرور الجهاز إن وجدت"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                الوصف (اختياري)
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="وصف الجهاز أو موقعه"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    حفظ الجهاز
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </form>

        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <h3 className="mb-3 font-semibold text-blue-900">💡 نصائح للإعداد:</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• تأكد من أن جهاز البصمة متصل بنفس الشبكة</li>
            <li>• يمكنك معرفة عنوان IP من إعدادات الجهاز (Comm. → Network)</li>
            <li>• المنفذ الافتراضي هو 4370</li>
            <li>• بعد الإضافة، استخدم "اختبار الاتصال" للتحقق</li>
          </ul>
        </div>
      </div>
    </div>
  )
}






