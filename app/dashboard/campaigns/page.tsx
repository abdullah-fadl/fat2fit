"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Send, Eye, Trash2, Search, Filter, Calendar } from "lucide-react"
import { hasPermission, PERMISSIONS, Role } from "@/lib/permissions"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface Campaign {
  id: string
  name: string
  description: string | null
  type: string
  channel: string
  status: string
  targetType: string
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  totalRecipients: number
  sentCount: number
  deliveredCount: number
  failedCount: number
  createdAt: string
  _count: {
    messages: number
  }
}

export default function CampaignsPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role as Role
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")

  useEffect(() => {
    fetchCampaigns()
  }, [statusFilter])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append("status", statusFilter)

      const res = await fetch(`/api/campaigns?${params.toString()}`)
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch (error) {
      console.error("Error fetching campaigns:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendCampaign = async (campaignId: string) => {
    if (!confirm("هل أنت متأكد من بدء إرسال هذه الحملة؟")) {
      return
    }

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: "POST",
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || "حدث خطأ أثناء بدء إرسال الحملة")
        return
      }

      alert("تم بدء إرسال الحملة بنجاح")
      fetchCampaigns()
    } catch (error) {
      console.error("Error sending campaign:", error)
      alert("حدث خطأ أثناء إرسال الحملة")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800"
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800"
      case "RUNNING":
        return "bg-yellow-100 text-yellow-800"
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      case "CANCELLED":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "مسودة"
      case "SCHEDULED":
        return "مجدولة"
      case "RUNNING":
        return "قيد الإرسال"
      case "COMPLETED":
        return "مكتملة"
      case "CANCELLED":
        return "ملغاة"
      default:
        return status
    }
  }

  const getChannelText = (channel: string) => {
    switch (channel) {
      case "SMS":
        return "رسالة نصية"
      case "WHATSAPP":
        return "واتساب"
      case "EMAIL":
        return "بريد إلكتروني"
      case "ALL":
        return "جميع القنوات"
      default:
        return channel
    }
  }

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        campaign.name.toLowerCase().includes(query) ||
        campaign.description?.toLowerCase().includes(query)
      )
    }
    return true
  })

  const canManage = hasPermission(userRole, PERMISSIONS.CAMPAIGNS_MANAGE)
  const canCreate = hasPermission(userRole, PERMISSIONS.CAMPAIGNS_CREATE)

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">الحملات التسويقية</h1>
          <p className="mt-2 text-gray-600">
            إدارة وإرسال الحملات التسويقية للعميلات
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => router.push("/dashboard/campaigns/new")}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700"
          >
            <Plus className="h-5 w-5" />
            <span>حملة جديدة</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث في الحملات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pr-10 pl-4 text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
        >
          <option value="">جميع الحالات</option>
          <option value="DRAFT">مسودة</option>
          <option value="SCHEDULED">مجدولة</option>
          <option value="RUNNING">قيد الإرسال</option>
          <option value="COMPLETED">مكتملة</option>
          <option value="CANCELLED">ملغاة</option>
        </select>
      </div>

      {/* Campaigns List */}
      {loading ? (
        <div className="text-center text-gray-600">جاري التحميل...</div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <p className="text-gray-600">لا توجد حملات</p>
          {canCreate && (
            <button
              onClick={() => router.push("/dashboard/campaigns/new")}
              className="mt-4 text-pink-600 hover:text-pink-700"
            >
              إنشاء حملة جديدة
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{campaign.name}</h3>
                  {campaign.description && (
                    <p className="mt-1 text-gray-600">{campaign.description}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(
                    campaign.status
                  )}`}
                >
                  {getStatusText(campaign.status)}
                </span>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm text-gray-600">القناة</p>
                  <p className="font-medium text-gray-900">
                    {getChannelText(campaign.channel)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">المستلمين</p>
                  <p className="font-medium text-gray-900">
                    {campaign.totalRecipients}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">تم الإرسال</p>
                  <p className="font-medium text-gray-900">
                    {campaign.sentCount} / {campaign.totalRecipients}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">الفاشلة</p>
                  <p className="font-medium text-red-600">{campaign.failedCount}</p>
                </div>
              </div>

              {campaign.scheduledAt && (
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    مجدولة لـ:{" "}
                    {format(new Date(campaign.scheduledAt), "yyyy-MM-dd HH:mm", {
                      locale: ar,
                    })}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                {campaign.status === "DRAFT" && canManage && (
                  <button
                    onClick={() => handleSendCampaign(campaign.id)}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                  >
                    <Send className="h-4 w-4" />
                    <span>بدء الإرسال</span>
                  </button>
                )}
                <button
                  onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                >
                  <Eye className="h-4 w-4" />
                  <span>عرض التفاصيل</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


