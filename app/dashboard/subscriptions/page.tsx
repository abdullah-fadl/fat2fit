"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { CreditCard, Plus, Eye, Snowflake, RotateCcw, Calendar, Trash2, Search } from "lucide-react"
import { hasPermission, PERMISSIONS, Role } from "@/lib/permissions"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface Subscription {
  id: string
  startDate: Date
  endDate: Date
  status: string
  finalPrice: number
  isFrozen: boolean
  frozenReason?: string | null
  frozenDays?: number
  frozenStartDate?: Date | null
  frozenEndDate?: Date | null
  client: {
    id: string
    name: string
    membershipNumber: string
  }
  package: {
    nameAr: string
    type: string
  }
}

export default function SubscriptionsPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role as Role
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [freezeModal, setFreezeModal] = useState<{
    open: boolean
    subscription: Subscription | null
  }>({ open: false, subscription: null })
  const [freezeForm, setFreezeForm] = useState({
    frozenReason: "",
    frozenDays: "",
    frozenEndDate: "",
  })
  const [extendModal, setExtendModal] = useState<{
    open: boolean
    subscription: Subscription | null
  }>({ open: false, subscription: null })
  const [extendForm, setExtendForm] = useState({
    additionalDays: "",
    reason: "",
  })
  const [processing, setProcessing] = useState(false)
  const [deletingSubscription, setDeletingSubscription] = useState<string | null>(null)
  const frozenEndDateInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSubscriptions()
  }, [filter])

  const handleDeleteSubscription = async (subscriptionId: string, clientName: string, packageName: string) => {
    if (!confirm(`هل أنت متأكد من حذف الاشتراك للعميلة "${clientName}" - الباقة "${packageName}"؟\nسيتم حذف الاشتراك بشكل نهائي.`)) {
      return
    }

    setDeletingSubscription(subscriptionId)
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || "حدث خطأ أثناء حذف الاشتراك")
        return
      }

      // إعادة جلب القائمة
      fetchSubscriptions()
    } catch (error) {
      console.error("Error deleting subscription:", error)
      alert("حدث خطأ أثناء حذف الاشتراك")
    } finally {
      setDeletingSubscription(null)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      const url = filter !== "all" ? `/api/subscriptions?status=${filter}` : "/api/subscriptions"
      const res = await fetch(url)
      const data = await res.json()
      setSubscriptions(data)
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFreeze = async () => {
    if (!freezeModal.subscription) return

    if (!freezeForm.frozenReason.trim()) {
      alert("يجب إدخال سبب التجميد")
      return
    }

    if (!freezeForm.frozenDays && !freezeForm.frozenEndDate) {
      alert("يجب تحديد مدة التجميد أو تاريخ انتهاء التجميد")
      return
    }

    setProcessing(true)
    try {
      const res = await fetch(`/api/subscriptions/${freezeModal.subscription.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "freeze",
          frozenReason: freezeForm.frozenReason,
          frozenDays: freezeForm.frozenDays || undefined,
          frozenEndDate: freezeForm.frozenEndDate || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || "حدث خطأ أثناء تجميد الاشتراك")
        return
      }

      setFreezeModal({ open: false, subscription: null })
      setFreezeForm({ frozenReason: "", frozenDays: "", frozenEndDate: "" })
      fetchSubscriptions()
    } catch (error) {
      console.error("Error freezing subscription:", error)
      alert("حدث خطأ أثناء تجميد الاشتراك")
    } finally {
      setProcessing(false)
    }
  }

  const handleUnfreeze = async (subscriptionId: string) => {
    if (!confirm("هل أنت متأكد من إلغاء تجميد هذا الاشتراك؟")) {
      return
    }

    setProcessing(true)
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unfreeze",
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || "حدث خطأ أثناء إلغاء تجميد الاشتراك")
        return
      }

      fetchSubscriptions()
    } catch (error) {
      console.error("Error unfreezing subscription:", error)
      alert("حدث خطأ أثناء إلغاء تجميد الاشتراك")
    } finally {
      setProcessing(false)
    }
  }

  const handleExtend = async () => {
    if (!extendModal.subscription) return

    if (!extendForm.additionalDays || parseInt(extendForm.additionalDays) <= 0) {
      alert("يجب إدخال عدد الأيام المراد إضافتها (أكبر من صفر)")
      return
    }

    setProcessing(true)
    try {
      const res = await fetch(`/api/subscriptions/${extendModal.subscription.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extend",
          additionalDays: parseInt(extendForm.additionalDays),
          reason: extendForm.reason || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || "حدث خطأ أثناء إضافة المدة")
        return
      }

      setExtendModal({ open: false, subscription: null })
      setExtendForm({ additionalDays: "", reason: "" })
      fetchSubscriptions()
      alert("تم إضافة المدة بنجاح")
    } catch (error) {
      console.error("Error extending subscription:", error)
      alert("حدث خطأ أثناء إضافة المدة")
    } finally {
      setProcessing(false)
    }
  }

  // تصفية الاشتراكات بناءً على البحث
  const filteredSubscriptions = subscriptions.filter((subscription) => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    const clientName = subscription.client.name.toLowerCase()
    const membershipNumber = subscription.client.membershipNumber.toLowerCase()
    const packageName = subscription.package.nameAr.toLowerCase()
    
    return (
      clientName.includes(query) ||
      membershipNumber.includes(query) ||
      packageName.includes(query)
    )
  })

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: "bg-green-100 text-green-800",
      EXPIRED: "bg-red-100 text-red-800",
      FROZEN: "bg-yellow-100 text-yellow-800",
      CANCELLED: "bg-gray-100 text-gray-800",
    }
    const labels = {
      ACTIVE: "نشط",
      EXPIRED: "منتهي",
      FROZEN: "مجمّد",
      CANCELLED: "ملغي",
    }
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">الاشتراكات</h1>
          <p className="mt-2 text-gray-600">عرض وإدارة جميع الاشتراكات</p>
        </div>
        <Link
          href="/dashboard/subscriptions/new"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700"
        >
          <Plus className="h-5 w-5" />
          اشتراك جديد
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن اشتراك (اسم العميلة، رقم العضوية، اسم الباقة)..."
            className="w-full rounded-lg border border-gray-300 bg-white py-3 pr-12 pl-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
          />
        </div>
        
        {/* Filters */}
        <div className="flex gap-3">
          {["all", "ACTIVE", "EXPIRED", "FROZEN"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === status
                  ? "bg-pink-500 text-white"
                  : "bg-white text-gray-700 shadow hover:bg-gray-50"
              }`}
            >
              {status === "all"
                ? "الكل"
                : status === "ACTIVE"
                ? "نشطة"
                : status === "EXPIRED"
                ? "منتهية"
                : "مجمدة"}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">العميلة</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">الباقة</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">تاريخ البداية</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">تاريخ الانتهاء</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">السعر</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">الحالة</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    جاري التحميل...
                  </td>
                </tr>
              ) : filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {searchQuery ? "لا توجد نتائج للبحث" : "لا توجد اشتراكات"}
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <p className="font-medium">{subscription.client.name}</p>
                        <p className="text-xs text-gray-500">{subscription.client.membershipNumber}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{subscription.package.nameAr}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(new Date(subscription.startDate), "yyyy-MM-dd", { locale: ar })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(new Date(subscription.endDate), "yyyy-MM-dd", { locale: ar })}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {subscription.finalPrice} ريال
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        {getStatusBadge(subscription.status)}
                        {subscription.isFrozen && subscription.frozenReason && (
                          <p className="text-xs text-gray-500 mt-1">
                            السبب: {subscription.frozenReason}
                          </p>
                        )}
                        {subscription.isFrozen && subscription.frozenDays && (
                          <p className="text-xs text-gray-500">
                            مدة التجميد: {subscription.frozenDays} يوم
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/clients/${subscription.client.id}`}
                          className="flex items-center gap-1 text-pink-600 hover:text-pink-700 text-sm font-medium"
                        >
                          <Eye className="h-4 w-4" />
                          عرض
                        </Link>
                        {subscription.status === "ACTIVE" && !subscription.isFrozen && (
                          <button
                            onClick={() => setFreezeModal({ open: true, subscription })}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                            disabled={processing}
                          >
                            <Snowflake className="h-4 w-4" />
                            تجميد
                          </button>
                        )}
                        {subscription.isFrozen && (
                          <button
                            onClick={() => handleUnfreeze(subscription.id)}
                            className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium"
                            disabled={processing}
                          >
                            <RotateCcw className="h-4 w-4" />
                            إلغاء تجميد
                          </button>
                        )}
                        {hasPermission(userRole, PERMISSIONS.SUBSCRIPTIONS_EXTEND) && (
                          <button
                            onClick={() => setExtendModal({ open: true, subscription })}
                            className="flex items-center gap-1 text-purple-600 hover:text-purple-700 text-sm font-medium"
                            disabled={processing}
                          >
                            <Calendar className="h-4 w-4" />
                            إضافة مدة
                          </button>
                        )}
                        {hasPermission(userRole, PERMISSIONS.SUBSCRIPTIONS_CANCEL) && (
                          <button
                            onClick={() => handleDeleteSubscription(subscription.id, subscription.client.name, subscription.package.nameAr)}
                            disabled={deletingSubscription === subscription.id}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingSubscription === subscription.id ? "جاري الحذف..." : "حذف"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Freeze Modal */}
      {freezeModal.open && freezeModal.subscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-xl">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              تجميد الاشتراك
            </h2>
            <div className="mb-4 rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">العميلة:</p>
              <p className="font-semibold text-gray-900">
                {freezeModal.subscription.client.name}
              </p>
              <p className="mt-2 text-sm text-gray-600">الباقة:</p>
              <p className="font-semibold text-gray-900">
                {freezeModal.subscription.package.nameAr}
              </p>
              <p className="mt-2 text-sm text-gray-600">تاريخ الانتهاء الحالي:</p>
              <p className="font-semibold text-gray-900">
                {format(new Date(freezeModal.subscription.endDate), "yyyy-MM-dd", { locale: ar })}
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  سبب التجميد <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={freezeForm.frozenReason}
                  onChange={(e) =>
                    setFreezeForm({ ...freezeForm, frozenReason: e.target.value })
                  }
                  rows={3}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                  placeholder="مثال: سفر، مرض، ظروف خاصة..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    عدد أيام التجميد
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={freezeForm.frozenDays}
                    onChange={(e) => {
                      setFreezeForm({
                        ...freezeForm,
                        frozenDays: e.target.value,
                        frozenEndDate: "",
                      })
                    }}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                    placeholder="مثال: 30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    أو تاريخ انتهاء التجميد
                  </label>
                  <div className="relative">
                    <input
                      ref={frozenEndDateInputRef}
                      type="date"
                      value={freezeForm.frozenEndDate}
                      onChange={(e) => {
                        setFreezeForm({
                          ...freezeForm,
                          frozenEndDate: e.target.value,
                          frozenDays: "",
                        })
                      }}
                      className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pl-14 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        frozenEndDateInputRef.current?.showPicker?.() || frozenEndDateInputRef.current?.click()
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-pink-600 transition-all"
                      title="انقر لاختيار التاريخ"
                    >
                      <Calendar className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>

              {freezeForm.frozenDays && (
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    سيتم تمديد تاريخ الانتهاء من{" "}
                    {format(new Date(freezeModal.subscription.endDate), "yyyy-MM-dd", { locale: ar })}{" "}
                    إلى{" "}
                    {(() => {
                      const newDate = new Date(freezeModal.subscription.endDate)
                      newDate.setDate(newDate.getDate() + parseInt(freezeForm.frozenDays))
                      return format(newDate, "yyyy-MM-dd", { locale: ar })
                    })()}
                  </p>
                </div>
              )}

              {freezeForm.frozenEndDate && (
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    سيتم تمديد تاريخ الانتهاء حتى{" "}
                    {format(new Date(freezeForm.frozenEndDate), "yyyy-MM-dd", { locale: ar })}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setFreezeModal({ open: false, subscription: null })
                  setFreezeForm({ frozenReason: "", frozenDays: "", frozenEndDate: "" })
                }}
                className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100"
                disabled={processing}
              >
                إلغاء
              </button>
              <button
                onClick={handleFreeze}
                disabled={processing}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-medium text-white transition-colors hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
              >
                {processing ? "جاري التجميد..." : "تجميد الاشتراك"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Modal */}
      {extendModal.open && extendModal.subscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-xl">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              إضافة مدة للاشتراك
            </h2>
            <div className="mb-4 rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">العضو:</p>
              <p className="text-lg font-semibold text-gray-900">
                {extendModal.subscription.client.name}
              </p>
              <p className="mt-2 text-sm text-gray-600">الباقة:</p>
              <p className="text-lg font-semibold text-gray-900">
                {extendModal.subscription.package.nameAr}
              </p>
              <p className="mt-2 text-sm text-gray-600">تاريخ انتهاء الحالي:</p>
              <p className="text-lg font-semibold text-gray-900">
                {format(new Date(extendModal.subscription.endDate), "yyyy-MM-dd", { locale: ar })}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  عدد الأيام المراد إضافتها <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={extendForm.additionalDays}
                  onChange={(e) =>
                    setExtendForm({ ...extendForm, additionalDays: e.target.value })
                  }
                  placeholder="مثال: 30"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                />
                {extendForm.additionalDays && parseInt(extendForm.additionalDays) > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    التاريخ الجديد:{" "}
                    {format(
                      new Date(
                        new Date(extendModal.subscription.endDate).getTime() +
                          parseInt(extendForm.additionalDays) * 24 * 60 * 60 * 1000
                      ),
                      "yyyy-MM-dd",
                      { locale: ar }
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  السبب (اختياري)
                </label>
                <textarea
                  value={extendForm.reason}
                  onChange={(e) =>
                    setExtendForm({ ...extendForm, reason: e.target.value })
                  }
                  rows={3}
                  placeholder="مثال: تعويض عن أيام التجميد"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setExtendModal({ open: false, subscription: null })
                  setExtendForm({ additionalDays: "", reason: "" })
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExtend}
                disabled={processing || !extendForm.additionalDays || parseInt(extendForm.additionalDays) <= 0}
                className="flex-1 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
              >
                {processing ? "جاري المعالجة..." : "إضافة المدة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}






