"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowRight, Save, Calendar } from "lucide-react"

const clientSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون أكثر من حرفين"),
  phone: z.string().min(10, "رقم الجوال غير صحيح"),
  idNumber: z.string().min(10, "رقم الهوية يجب أن يكون 10 أرقام على الأقل").optional().or(z.literal("")),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  healthStatus: z.string().optional(),
  notes: z.string().optional(),
  referredBy: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const dateOfBirthInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  })

  const onSubmit = async (data: ClientFormData) => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "حدث خطأ")
      }

      const client = await response.json()
      router.push(`/dashboard/clients/${client.id}`)
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء إنشاء العضوية")
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
        <h1 className="text-3xl font-bold text-gray-900">إنشاء عضوية جديدة</h1>
        <p className="mt-2 text-gray-600">أدخل بيانات العضو/العضوة الجديدة</p>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* البيانات الأساسية */}
          <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">البيانات الأساسية</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("name")}
                  type="text"
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  رقم الجوال <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("phone")}
                  type="tel"
                  placeholder="05xxxxxxxx"
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  رقم الهوية <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("idNumber")}
                  type="text"
                  placeholder="10 أرقام"
                  maxLength={10}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                />
                {errors.idNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.idNumber.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  البريد الإلكتروني
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ الميلاد
                </label>
                <div className="relative">
                  <input
                    {...register("dateOfBirth")}
                    ref={(e) => {
                      register("dateOfBirth").ref(e)
                      dateOfBirthInputRef.current = e
                    }}
                    type="date"
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pl-14 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      dateOfBirthInputRef.current?.showPicker?.() || dateOfBirthInputRef.current?.click()
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-pink-600 transition-all"
                    title="انقر لاختيار التاريخ من التقويم"
                  >
                    <Calendar className="h-6 w-6" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  انقر على الأيقونة أو الحقل لاختيار التاريخ
                </p>
              </div>
            </div>
          </div>

          {/* بيانات إضافية */}
          <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">بيانات إضافية (اختياري)</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  الطول (سم)
                </label>
                <input
                  {...register("height")}
                  type="number"
                  step="0.1"
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  الوزن (كيلو)
                </label>
                <input
                  {...register("weight")}
                  type="number"
                  step="0.1"
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  حالة صحية / ملاحظات
                </label>
                <textarea
                  {...register("healthStatus")}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                  placeholder="أي حالات صحية أو ملاحظات مهمة..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  ملاحظات إضافية
                </label>
                <textarea
                  {...register("notes")}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  جهة معرفة / إحالة
                </label>
                <input
                  {...register("referredBy")}
                  type="text"
                  placeholder="كيف عرفت عن النادي؟"
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                />
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
              {loading ? "جاري الحفظ..." : "حفظ العضوية"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}






