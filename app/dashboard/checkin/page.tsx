"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, LogIn, CheckCircle, XCircle, User, QrCode } from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

interface Client {
  id: string
  membershipNumber: string
  name: string
  phone: string
  status: string
  subscriptions: Array<{
    id: string
    endDate: Date
    status: string
  }>
}

export default function CheckInPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [qrMode, setQrMode] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setClient(null)
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      // If QR mode, search by membership number directly
      const searchQuery = qrMode ? query.trim() : query
      const res = await fetch(`/api/clients/search?q=${encodeURIComponent(searchQuery)}`)
      const clients = await res.json()

      if (clients.length === 0) {
        setClient(null)
        setMessage({ type: "error", text: "لم يتم العثور على عميلة" })
        return
      }

      if (clients.length === 1) {
        setClient(clients[0])
        // Auto check-in if QR mode
        if (qrMode) {
          checkInClient(clients[0].id)
        }
      } else {
        // Multiple results - show first one or let user choose
        setClient(clients[0])
      }
    } catch (error) {
      console.error("Error searching:", error)
      setMessage({ type: "error", text: "حدث خطأ أثناء البحث" })
    } finally {
      setLoading(false)
    }
  }

  const handleQRScan = (qrData: string) => {
    // Extract membership number from QR code
    const membershipNumber = qrData.replace("FAT2FIT-", "").trim()
    setSearchQuery(membershipNumber)
    handleSearch(membershipNumber)
  }

  const checkInClient = async (clientId: string) => {
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          method: "PHONE",
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        setMessage({ type: "error", text: errorData.error || "فشل تسجيل الدخول" })
        return
      }

      const data = await res.json()
      setMessage({ type: "success", text: `تم تسجيل دخول ${data.client.name} بنجاح` })
      setSearchQuery("")
      setClient(null)

      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage(null)
        searchInputRef.current?.focus()
      }, 3000)
    } catch (error) {
      console.error("Error checking in:", error)
      setMessage({ type: "error", text: "حدث خطأ أثناء تسجيل الدخول" })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(searchQuery)
    }
  }

  const canCheckIn = (client: Client) => {
    const activeSubscription = client.subscriptions.find((s) => s.status === "ACTIVE")
    if (!activeSubscription) {
      return { allowed: false, reason: "لا يوجد اشتراك نشط" }
    }

    const endDate = new Date(activeSubscription.endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (endDate < today) {
      return { allowed: false, reason: "الاشتراك منتهي" }
    }

    return { allowed: true }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">تسجيل الدخول</h1>
        <p className="mt-2 text-gray-600">ابحث بالاسم، رقم الجوال، أو رقم العضوية</p>
      </div>

      <div className="mx-auto max-w-2xl">
        {/* Mode Toggle */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => {
              setQrMode(false)
              setSearchQuery("")
              setClient(null)
              setMessage(null)
            }}
            className={`flex-1 rounded-lg px-6 py-3 font-medium transition-colors ${
              !qrMode
                ? "bg-pink-500 text-white"
                : "bg-white text-gray-700 shadow hover:bg-gray-50"
            }`}
          >
            بحث يدوي
          </button>
          <button
            onClick={() => {
              setQrMode(true)
              setSearchQuery("")
              setClient(null)
              setMessage(null)
              searchInputRef.current?.focus()
            }}
            className={`flex-1 rounded-lg px-6 py-3 font-medium transition-colors ${
              qrMode
                ? "bg-pink-500 text-white"
                : "bg-white text-gray-700 shadow hover:bg-gray-50"
            }`}
          >
            <QrCode className="inline-block h-5 w-5 ml-2" />
            مسح QR Code
          </button>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            {qrMode ? (
              <QrCode className="absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400" />
            ) : (
              <Search className="absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400" />
            )}
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                qrMode
                  ? "أدخل رقم العضوية من QR Code أو امسحه مباشرة..."
                  : "ابحث بالاسم، رقم الجوال، أو رقم العضوية..."
              }
              className="w-full rounded-lg border-2 border-gray-300 bg-white py-4 pr-14 pl-4 text-lg text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500"
              autoFocus
            />
          </div>
          <button
            onClick={() => handleSearch(searchQuery)}
            disabled={loading || !searchQuery.trim()}
            className="mt-4 w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
          >
            {loading ? "جاري البحث..." : qrMode ? "تسجيل الدخول" : "بحث"}
          </button>
          {qrMode && (
            <p className="mt-2 text-center text-sm text-gray-600">
              💡 أدخل رقم العضوية يدوياً أو استخدم ماسح QR Code
            </p>
          )}
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 rounded-lg p-4 ${
              message.type === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <p>{message.text}</p>
            </div>
          </div>
        )}

        {/* Client Card */}
        {client && (
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100">
                  <User className="h-6 w-6 text-pink-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{client.name}</h2>
                  <p className="text-sm text-gray-600">
                    {client.membershipNumber} - {client.phone}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  client.status === "ACTIVE"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {client.status === "ACTIVE" ? "نشطة" : client.status}
              </span>
            </div>

            {client.subscriptions.length > 0 && (
              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <h3 className="mb-2 text-sm font-medium text-gray-700">الاشتراك النشط</h3>
                {client.subscriptions.map((sub) => (
                  <div key={sub.id} className="text-sm">
                    <p className="text-gray-600">
                      ينتهي في: {format(new Date(sub.endDate), "yyyy-MM-dd", { locale: ar })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {(() => {
              const checkInStatus = canCheckIn(client)
              return (
                <div>
                  {checkInStatus.allowed ? (
                    <button
                      onClick={() => checkInClient(client.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-6 py-3 font-medium text-white transition-colors hover:bg-green-600"
                    >
                      <LogIn className="h-5 w-5" />
                      تسجيل الدخول
                    </button>
                  ) : (
                    <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800">
                      <p className="font-medium">{checkInStatus.reason}</p>
                      <p className="mt-1 text-sm">
                        يرجى التواصل مع الإدارة لتجديد الاشتراك
                      </p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium">ملاحظات:</p>
          <ul className="mt-2 list-disc list-inside space-y-1">
            <li>يمكن البحث بالاسم الكامل أو جزئياً</li>
            <li>يمكن البحث برقم الجوال</li>
            <li>يمكن البحث برقم العضوية</li>
            <li>سيتم رفض الدخول إذا كان الاشتراك منتهياً</li>
          </ul>
        </div>
      </div>
    </div>
  )
}






