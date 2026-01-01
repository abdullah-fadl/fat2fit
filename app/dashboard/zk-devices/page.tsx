"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Settings, Trash2, RefreshCw, CheckCircle, XCircle, Fingerprint } from "lucide-react"

interface ZKDevice {
  id: string
  name: string
  ip: string
  port: number
  isActive: boolean
  lastSync: string | null
  description: string | null
}

export default function ZKDevicesPage() {
  const [devices, setDevices] = useState<ZKDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/zk-devices")
      const data = await res.json()
      
      // التحقق من وجود error
      if (!res.ok) {
        if (data.error) {
          throw new Error(data.error)
        }
        throw new Error("فشل جلب البيانات")
      }
      
      // التأكد من أن data هو array
      setDevices(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching devices:", error)
      setMessage({ type: "error", text: "حدث خطأ أثناء جلب البيانات" })
      setDevices([]) // تأكد من أن devices هو array حتى لو فشل الطلب
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async (deviceId: string) => {
    setTesting(deviceId)
    setMessage(null)

    try {
      const res = await fetch(`/api/zk-devices/${deviceId}/test`, {
        method: "POST",
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: "success", text: data.message })
        fetchDevices() // تحديث القائمة
      } else {
        setMessage({ type: "error", text: data.error || "فشل الاتصال" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "حدث خطأ أثناء اختبار الاتصال" })
    } finally {
      setTesting(null)
    }
  }

  const syncDevice = async (deviceId: string) => {
    setSyncing(deviceId)
    setMessage(null)

    try {
      const res = await fetch(`/api/zk-devices/${deviceId}/sync`, {
        method: "POST",
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({
          type: "success",
          text: data.message || `تم مزامنة ${data.synced} سجل دخول`,
        })
        fetchDevices()
      } else {
        setMessage({ type: "error", text: data.error || "فشل المزامنة" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "حدث خطأ أثناء المزامنة" })
    } finally {
      setSyncing(null)
    }
  }

  const handleDelete = async (deviceId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الجهاز؟")) return

    try {
      const res = await fetch(`/api/zk-devices/${deviceId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setMessage({ type: "success", text: "تم حذف الجهاز بنجاح" })
        fetchDevices()
      } else {
        const errorData = await res.json()
        setMessage({ type: "error", text: errorData.error || "فشل الحذف" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "حدث خطأ أثناء الحذف" })
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

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">أجهزة البصمة ZK</h1>
          <p className="mt-2 text-gray-600">إدارة أجهزة البصمة ومزامنة البيانات</p>
        </div>
        <Link
          href="/dashboard/zk-devices/new"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700"
        >
          <Plus className="h-5 w-5" />
          إضافة جهاز جديد
        </Link>
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {devices.map((device) => (
          <div
            key={device.id}
            className={`rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg ${
              !device.isActive ? "opacity-60" : ""
            }`}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500">
                  <Fingerprint className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{device.name}</h3>
                  <p className="text-sm text-gray-600">{device.ip}:{device.port}</p>
                </div>
              </div>
              <div className={`h-3 w-3 rounded-full ${device.isActive ? "bg-green-500" : "bg-gray-400"}`}></div>
            </div>

            {device.description && (
              <p className="mb-4 text-sm text-gray-600">{device.description}</p>
            )}

            {device.lastSync && (
              <p className="mb-4 text-xs text-gray-500">
                آخر مزامنة: {new Date(device.lastSync).toLocaleString("ar-SA")}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => testConnection(device.id)}
                disabled={testing === device.id}
                className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
              >
                {testing === device.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    جاري الاختبار...
                  </span>
                ) : (
                  "اختبار الاتصال"
                )}
              </button>

              <button
                onClick={() => syncDevice(device.id)}
                disabled={syncing === device.id}
                className="flex-1 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50"
              >
                {syncing === device.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    جاري المزامنة...
                  </span>
                ) : (
                  "مزامنة البيانات"
                )}
              </button>

              <Link
                href={`/dashboard/zk-devices/${device.id}`}
                className="rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
              >
                <Settings className="h-4 w-4" />
              </Link>

              <button
                onClick={() => handleDelete(device.id)}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {devices.length === 0 && (
        <div className="rounded-lg bg-gray-50 p-12 text-center">
          <Fingerprint className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">لا توجد أجهزة بصمة مسجلة</p>
          <Link
            href="/dashboard/zk-devices/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-pink-500 px-6 py-3 font-medium text-white transition-colors hover:bg-pink-600"
          >
            <Plus className="h-5 w-5" />
            إضافة أول جهاز
          </Link>
        </div>
      )}
    </div>
  )
}

