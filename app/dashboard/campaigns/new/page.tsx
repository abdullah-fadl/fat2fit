"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Save } from "lucide-react"

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "PROMOTIONAL",
    channel: "SMS",
    content: "",
    targetType: "ALL_CLIENTS",
    scheduledAt: "",
    sendImmediately: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          scheduledAt: formData.scheduledAt || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || "حدث خطأ أثناء إنشاء الحملة")
        return
      }

      router.push(`/dashboard/campaigns/${data.id}`)
    } catch (error) {
      console.error("Error creating campaign:", error)
      alert("حدث خطأ أثناء إنشاء الحملة")
    } finally {
      setLoading(false)
    }
  }

  const messageTemplates = {
    EXPIRY_REMINDER: "عزيزتي {name}، اشتراكك سينتهي في {days} يوم. يرجى التجديد قريباً.",
    WELCOME: "مرحباً {name}! شكراً لانضمامك إلى Fat2Fit 🎉",
    PROMOTIONAL: "عزيزتي {name}، لدينا عرض خاص! استفيدي من خصم {discount}% على جميع الباقات.",
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">حملة تسويقية جديدة</h1>
        <p className="mt-2 text-gray-600">أنشئ حملة تسويقية جديدة لإرسالها للعميلات</p>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 rounded-lg bg-white p-8 shadow">
        {/* Campaign Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            اسم الحملة <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
            placeholder="مثال: تذكير بانتهاء الاشتراك - يناير 2025"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            الوصف
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
            placeholder="وصف مختصر عن الحملة"
          />
        </div>

        {/* Type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            نوع الحملة <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.type}
            onChange={(e) => {
              setFormData({
                ...formData,
                type: e.target.value,
                content: messageTemplates[e.target.value as keyof typeof messageTemplates] || formData.content,
              })
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
          >
            <option value="PROMOTIONAL">تسويقية</option>
            <option value="EXPIRY_REMINDER">تذكير بانتهاء الاشتراك</option>
            <option value="WELCOME">ترحيب</option>
            <option value="REMINDER">تذكير عام</option>
          </select>
        </div>

        {/* Channel */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            القناة <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.channel}
            onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
          >
            <option value="SMS">رسالة نصية (SMS)</option>
            <option value="WHATSAPP">واتساب</option>
          </select>
        </div>

        {/* Target Type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            الفئة المستهدفة <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.targetType}
            onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
          >
            <option value="ALL_CLIENTS">جميع العميلات</option>
            <option value="ACTIVE_SUBSCRIPTIONS">الاشتراكات النشطة</option>
            <option value="EXPIRING_SUBSCRIPTIONS">الاشتراكات المنتهية قريباً</option>
          </select>
        </div>

        {/* Message Content */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            محتوى الرسالة <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={5}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
            placeholder="مثال: عزيزتي {name}، اشتراكك سينتهي في {days} يوم."
          />
          <p className="mt-2 text-sm text-gray-500">
            المتغيرات المتاحة: {"{name}"}, {"{membershipNumber}"}, {"{phone}"}, {"{days}"}, {"{packageName}"}
          </p>
        </div>

        {/* Send Options */}
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="sendImmediately"
              checked={formData.sendImmediately}
              onChange={(e) =>
                setFormData({ ...formData, sendImmediately: e.target.checked, scheduledAt: "" })
              }
              className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
            />
            <label htmlFor="sendImmediately" className="mr-2 text-sm font-medium text-gray-700">
              إرسال فوراً بعد الإنشاء
            </label>
          </div>

          {!formData.sendImmediately && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                الجدولة (اختياري)
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
              />
            </div>
          )}
        </div>

        {/* Actions */}
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
            {loading ? (
              "جاري الحفظ..."
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>حفظ الحملة</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}


