"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Phone, MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface Message {
  id: string
  type: string
  channel: string
  content: string
  status: string
  errorMessage: string | null
  phoneNumber: string | null
  recipientName: string | null
  sentAt: string | null
  deliveredAt: string | null
  createdAt: string
  client: {
    id: string
    name: string
    membershipNumber: string
    phone: string
  } | null
  campaign: {
    id: string
    name: string
  } | null
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })

  useEffect(() => {
    fetchMessages()
  }, [statusFilter, pagination.page])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append("status", statusFilter)
      params.append("page", pagination.page.toString())
      params.append("limit", pagination.limit.toString())

      const res = await fetch(`/api/messages?${params.toString()}`)
      const data = await res.json()
      setMessages(data.messages || [])
      setPagination(data.pagination || pagination)
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SENT":
      case "DELIVERED":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "FAILED":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "PENDING":
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "SENT":
        return "تم الإرسال"
      case "DELIVERED":
        return "تم التسليم"
      case "FAILED":
        return "فشل"
      case "PENDING":
        return "قيد الانتظار"
      default:
        return status
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "SMS":
        return <MessageSquare className="h-4 w-4" />
      case "WHATSAPP":
        return <Phone className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const filteredMessages = messages.filter((message) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        message.recipientName?.toLowerCase().includes(query) ||
        message.phoneNumber?.includes(query) ||
        message.content.toLowerCase().includes(query)
      )
    }
    return true
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">الرسائل</h1>
        <p className="mt-2 text-gray-600">سجل جميع الرسائل المرسلة</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث في الرسائل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pr-10 pl-4 text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPagination({ ...pagination, page: 1 })
          }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
        >
          <option value="">جميع الحالات</option>
          <option value="PENDING">قيد الانتظار</option>
          <option value="SENT">تم الإرسال</option>
          <option value="DELIVERED">تم التسليم</option>
          <option value="FAILED">فشل</option>
        </select>
      </div>

      {/* Messages List */}
      {loading ? (
        <div className="text-center text-gray-600">جاري التحميل...</div>
      ) : filteredMessages.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <p className="text-gray-600">لا توجد رسائل</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    {getChannelIcon(message.channel)}
                    <span className="font-medium text-gray-900">
                      {message.recipientName || "مستلم غير معروف"}
                    </span>
                    {message.phoneNumber && (
                      <span className="text-sm text-gray-600">
                        ({message.phoneNumber})
                      </span>
                    )}
                  </div>
                  {message.client && (
                    <p className="text-sm text-gray-600">
                      العضوية: {message.client.membershipNumber}
                    </p>
                  )}
                  {message.campaign && (
                    <p className="mt-1 text-sm text-gray-600">
                      من حملة: {message.campaign.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(message.status)}
                  <span className="text-sm font-medium text-gray-700">
                    {getStatusText(message.status)}
                  </span>
                </div>
              </div>

              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <p className="text-gray-900">{message.content}</p>
              </div>

              {message.errorMessage && (
                <div className="mb-4 rounded-lg bg-red-50 p-3">
                  <p className="text-sm text-red-800">{message.errorMessage}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex gap-4">
                  {message.sentAt && (
                    <span>
                      أُرسلت:{" "}
                      {format(new Date(message.sentAt), "yyyy-MM-dd HH:mm", {
                        locale: ar,
                      })}
                    </span>
                  )}
                  {message.deliveredAt && (
                    <span>
                      وصلت:{" "}
                      {format(new Date(message.deliveredAt), "yyyy-MM-dd HH:mm", {
                        locale: ar,
                      })}
                    </span>
                  )}
                </div>
                <span>
                  {format(new Date(message.createdAt), "yyyy-MM-dd HH:mm", {
                    locale: ar,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() =>
              setPagination({ ...pagination, page: pagination.page - 1 })
            }
            disabled={pagination.page === 1}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 disabled:opacity-50"
          >
            السابق
          </button>
          <span className="text-gray-700">
            صفحة {pagination.page} من {pagination.totalPages}
          </span>
          <button
            onClick={() =>
              setPagination({ ...pagination, page: pagination.page + 1 })
            }
            disabled={pagination.page >= pagination.totalPages}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  )
}


