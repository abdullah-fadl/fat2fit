"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, User, Phone, Mail, Calendar, CreditCard, FileText, LogIn, Plus, Edit, Save, TrendingUp, QrCode, Fingerprint } from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface Client {
  id: string
  membershipNumber: string
  name: string
  phone: string
  email: string | null
  dateOfBirth: Date | null
  height: number | null
  weight: number | null
  healthStatus: string | null
  notes: string | null
  image: string | null
  status: string
  totalDebt: number
  referredBy?: string | null
  subscriptions: Array<{
    id: string
    startDate: Date
    endDate: Date
    status: string
    finalPrice: number
    package: {
      nameAr: string
      type: string
    }
  }>
  payments: Array<{
    id: string
    amount: number
    paymentMethod: string
    paymentDate: Date
  }>
  invoices: Array<{
    id: string
    invoiceNumber: string
    total: number
    status: string
    createdAt: Date
  }>
  checkIns: Array<{
    id: string
    checkInDate: Date
  }>
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    height: "",
    weight: "",
    healthStatus: "",
    notes: "",
    referredBy: "",
  })
  const [saving, setSaving] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [zkDevices, setZkDevices] = useState<Array<{ id: string; name: string }>>([])
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState("")
  const [enrollMessage, setEnrollMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const dateOfBirthInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // جلب قائمة أجهزة ZK
    fetch("/api/zk-devices")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setZkDevices(data.filter((d: any) => d.isActive))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const clientId = params?.id as string
    if (clientId) {
      fetchClient(clientId)
    } else {
      setLoading(false)
      setError("معرف العميلة غير موجود")
    }
  }, [params?.id])

  const fetchClient = async (clientId: string) => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch(`/api/clients/${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setClient(data)
        // Initialize edit form with current data
        setEditForm({
          name: data.name || "",
          phone: data.phone || "",
          email: data.email || "",
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split("T")[0] : "",
          height: data.height?.toString() || "",
          weight: data.weight?.toString() || "",
          healthStatus: data.healthStatus || "",
          notes: data.notes || "",
          referredBy: data.referredBy || "",
        })
      } else {
        const errorData = await res.json()
        setError(errorData.error || "العميلة غير موجودة")
      }
    } catch (error) {
      console.error("Error fetching client:", error)
      setError("حدث خطأ أثناء جلب البيانات")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!client) return

    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })

      if (res.ok) {
        const updatedClient = await res.json()
        setClient(updatedClient)
        setIsEditing(false)
      } else {
        const errorData = await res.json()
        setError(errorData.error || "حدث خطأ أثناء التحديث")
      }
    } catch (error) {
      console.error("Error updating client:", error)
      setError("حدث خطأ أثناء التحديث")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (client) {
      setEditForm({
        name: client.name || "",
        phone: client.phone || "",
        email: client.email || "",
        dateOfBirth: client.dateOfBirth ? new Date(client.dateOfBirth).toISOString().split("T")[0] : "",
        height: client.height?.toString() || "",
        weight: client.weight?.toString() || "",
        healthStatus: client.healthStatus || "",
        notes: client.notes || "",
        referredBy: client.referredBy || "",
      })
    }
    setIsEditing(false)
  }

  const handleEnrollFingerprint = async () => {
    if (!selectedDevice) {
      setEnrollMessage({ type: "error", text: "يرجى اختيار جهاز" })
      return
    }

    setEnrolling(true)
    setEnrollMessage(null)

    try {
      const res = await fetch(`/api/zk-devices/${selectedDevice}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client!.id }),
      })

      const data = await res.json()

      if (res.ok) {
        setEnrollMessage({ type: "success", text: data.message || "تم تسجيل البصمة بنجاح" })
        fetchClient(client!.id) // تحديث بيانات العميلة
        setTimeout(() => {
          setShowEnrollModal(false)
          setEnrollMessage(null)
        }, 2000)
      } else {
        setEnrollMessage({ type: "error", text: data.error || "فشل تسجيل البصمة" })
      }
    } catch (error) {
      setEnrollMessage({ type: "error", text: "حدث خطأ أثناء تسجيل البصمة" })
    } finally {
      setEnrolling(false)
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

  if (error || !client) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowRight className="h-5 w-5" />
          العودة
        </button>
        <div className="rounded-lg bg-red-50 p-4 text-red-800">
          {error || "العميلة غير موجودة"}
        </div>
      </div>
    )
  }

  const activeSubscription = client.subscriptions.find((s) => s.status === "ACTIVE")

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowRight className="h-5 w-5" />
          العودة
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
            <p className="mt-2 text-gray-600">رقم العضوية: {client.membershipNumber}</p>
          </div>
          <div className="flex gap-3">
            {!isEditing ? (
              <>
                {zkDevices.length > 0 && (
                  <button
                    onClick={() => setShowEnrollModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-purple-500 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-600"
                  >
                    <Fingerprint className="h-5 w-5" />
                    تسجيل البصمة
                  </button>
                )}
                <Link
                  href={`/dashboard/clients/${client.id}/card`}
                  className="flex items-center gap-2 rounded-lg bg-green-500 px-6 py-3 font-medium text-white transition-colors hover:bg-green-600"
                >
                  <QrCode className="h-5 w-5" />
                  بطاقة العضوية
                </Link>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600"
                >
                  <Edit className="h-5 w-5" />
                  تعديل البيانات
                </button>
                <Link
                  href={`/dashboard/subscriptions/new?clientId=${client.id}`}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700"
                >
                  <Plus className="h-5 w-5" />
                  اشتراك جديد
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-green-500 px-6 py-3 font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                >
                  <Save className="h-5 w-5" />
                  {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Client Info Card */}
        <div className="lg:col-span-1">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">معلومات العميلة</h2>
            
            {!isEditing ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 mb-1">الاسم</p>
                    <p className="text-base font-semibold text-gray-900">{client.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 mb-1">رقم الجوال</p>
                    <p className="text-base font-semibold text-gray-900">{client.phone}</p>
                  </div>
                </div>
                {client.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</p>
                      <p className="text-base font-semibold text-gray-900">{client.email}</p>
                    </div>
                  </div>
                )}
                {client.dateOfBirth && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 mb-1">تاريخ الميلاد</p>
                      <p className="text-base font-semibold text-gray-900">
                        {format(new Date(client.dateOfBirth), "yyyy-MM-dd", { locale: ar })}
                      </p>
                    </div>
                  </div>
                )}
                {(client.height || client.weight) && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">القياسات</p>
                    <p className="text-base font-semibold text-gray-900">
                      {client.height && `الطول: ${client.height} سم`}
                      {client.height && client.weight && " - "}
                      {client.weight && `الوزن: ${client.weight} كجم`}
                    </p>
                  </div>
                )}
                {client.healthStatus && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">الحالة الصحية</p>
                    <p className="text-base font-semibold text-gray-900">{client.healthStatus}</p>
                  </div>
                )}
                {client.referredBy && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">جهة معرفة</p>
                    <p className="text-base font-semibold text-gray-900">{client.referredBy}</p>
                  </div>
                )}
                {client.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">ملاحظات</p>
                    <p className="text-base font-semibold text-gray-900">{client.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">الاسم *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">رقم الجوال *</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الميلاد</label>
                  <div className="relative">
                    <input
                      ref={dateOfBirthInputRef}
                      type="date"
                      value={editForm.dateOfBirth}
                      onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الطول (سم)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editForm.height}
                      onChange={(e) => setEditForm({ ...editForm, height: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الوزن (كجم)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editForm.weight}
                      onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">الحالة الصحية</label>
                  <textarea
                    value={editForm.healthStatus}
                    onChange={(e) => setEditForm({ ...editForm, healthStatus: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">جهة معرفة</label>
                  <input
                    type="text"
                    value={editForm.referredBy}
                    onChange={(e) => setEditForm({ ...editForm, referredBy: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ملاحظات</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>
              </div>
            )}

            {client.totalDebt > 0 && (
              <div className="mt-6 rounded-lg bg-orange-50 p-4">
                <p className="text-sm font-medium text-orange-800">
                  المديونية: {client.totalDebt} ريال
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Subscription */}
          {activeSubscription && (
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">الاشتراك النشط</h2>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/subscriptions/renew?subscriptionId=${activeSubscription.id}`}
                    className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                  >
                    <TrendingUp className="h-4 w-4" />
                    تجديد/ترقية
                  </Link>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                    نشط
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">نوع الاشتراك</p>
                  <p className="text-base font-bold text-gray-900">{activeSubscription.package.nameAr}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">تاريخ البداية</p>
                  <p className="text-base font-bold text-gray-900">
                    {format(new Date(activeSubscription.startDate), "yyyy-MM-dd", { locale: ar })}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">تاريخ الانتهاء</p>
                  <p className="text-base font-bold text-gray-900">
                    {format(new Date(activeSubscription.endDate), "yyyy-MM-dd", { locale: ar })}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">السعر</p>
                  <p className="text-base font-bold text-gray-900">{activeSubscription.finalPrice} ريال</p>
                </div>
              </div>
            </div>
          )}

          {/* Subscriptions History */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">سجل الاشتراكات</h2>
            <div className="space-y-4">
              {client.subscriptions.length === 0 ? (
                <p className="text-gray-500">لا توجد اشتراكات</p>
              ) : (
                client.subscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="flex items-center justify-between border-b border-gray-200 pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-base font-bold text-gray-900">{subscription.package.nameAr}</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(subscription.startDate), "yyyy-MM-dd", { locale: ar })} -{" "}
                        {format(new Date(subscription.endDate), "yyyy-MM-dd", { locale: ar })}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-base font-bold text-gray-900">{subscription.finalPrice} ريال</p>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          subscription.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : subscription.status === "EXPIRED"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {subscription.status === "ACTIVE"
                          ? "نشط"
                          : subscription.status === "EXPIRED"
                          ? "منتهي"
                          : subscription.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">المدفوعات الأخيرة</h2>
            <div className="space-y-4">
              {client.payments.length === 0 ? (
                <p className="text-gray-500">لا توجد مدفوعات</p>
              ) : (
                client.payments.slice(0, 5).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between border-b border-gray-200 pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{payment.amount} ريال</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(payment.paymentDate), "yyyy-MM-dd", { locale: ar })}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">{payment.paymentMethod}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Check-ins */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">سجل الدخول</h2>
            <div className="space-y-2">
              {client.checkIns.length === 0 ? (
                <p className="text-gray-500">لا توجد زيارات</p>
              ) : (
                client.checkIns.slice(0, 10).map((checkIn) => (
                  <div
                    key={checkIn.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600">
                      {format(new Date(checkIn.checkInDate), "yyyy-MM-dd HH:mm", { locale: ar })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal لتسجيل البصمة */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">تسجيل بصمة العميلة</h2>
            
            {enrollMessage && (
              <div
                className={`mb-4 rounded-lg p-3 ${
                  enrollMessage.type === "success"
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {enrollMessage.text}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اختر الجهاز <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-500"
              >
                <option value="">-- اختر الجهاز --</option>
                {zkDevices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-medium mb-2">⚠️ خطوات التسجيل:</p>
              <ol className="list-decimal list-inside space-y-1 mr-2">
                <li>اضغط "بدء التسجيل"</li>
                <li>اطلب من العميلة <strong>الضغط على البصمة</strong> على الجهاز</li>
                <li>انتظر حتى يتم حفظ البصمة</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEnrollModal(false)
                  setSelectedDevice("")
                  setEnrollMessage(null)
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleEnrollFingerprint}
                disabled={enrolling || !selectedDevice}
                className="flex-1 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
              >
                {enrolling ? "جاري التسجيل..." : "بدء التسجيل"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}






