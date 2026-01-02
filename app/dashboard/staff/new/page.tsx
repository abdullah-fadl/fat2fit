"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Save, Plus, X } from "lucide-react"

const DAYS_OF_WEEK = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
]

interface Schedule {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export default function NewStaffPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "RECEPTION",
    specialization: "",
    hourlyRate: "",
    bio: "",
  })
  const [schedules, setSchedules] = useState<Schedule[]>([])

  const handleAddSchedule = () => {
    setSchedules([...schedules, { dayOfWeek: 0, startTime: "09:00", endTime: "17:00" }])
  }

  const handleRemoveSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index))
  }

  const handleScheduleChange = (index: number, field: keyof Schedule, value: any) => {
    const updated = [...schedules]
    updated[index] = { ...updated[index], [field]: value }
    setSchedules(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
          schedules,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "حدث خطأ")
      }

      router.push("/dashboard/staff")
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء إنشاء الموظف")
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
        <h1 className="text-3xl font-bold text-gray-900">إضافة موظف/مدربة جديد</h1>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الاسم <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الجوال
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الصلاحية <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                required
              >
                <option value="RECEPTION">استقبال</option>
                <option value="TRAINER">مدربة</option>
                <option value="ADMIN">مديرة</option>
              </select>
            </div>

            {formData.role === "TRAINER" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    التخصص
                  </label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    placeholder="مثال: كارديو، حديد، يوغا"
                    className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    سعر الساعة (ريال)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              السيرة الذاتية
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            />
          </div>

          {/* جدول العمل */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                جدول العمل
              </label>
              <button
                type="button"
                onClick={handleAddSchedule}
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
              >
                <Plus className="h-4 w-4" />
                إضافة يوم
              </button>
            </div>

            <div className="space-y-3">
              {schedules.map((schedule, index) => (
                <div key={index} className="flex gap-3 rounded-lg border border-gray-200 p-3">
                  <select
                    value={schedule.dayOfWeek}
                    onChange={(e) => handleScheduleChange(index, "dayOfWeek", parseInt(e.target.value))}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm"
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={schedule.startTime}
                    onChange={(e) => handleScheduleChange(index, "startTime", e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm"
                  />
                  <span className="self-center text-gray-600">إلى</span>
                  <input
                    type="time"
                    value={schedule.endTime}
                    onChange={(e) => handleScheduleChange(index, "endTime", e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSchedule(index)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

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
              {loading ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}








