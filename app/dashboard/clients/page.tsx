"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Search, UserPlus, Eye, Trash2 } from "lucide-react"
import { Client } from "@prisma/client"
import { hasPermission, PERMISSIONS, Role } from "@/lib/permissions"

type ClientStatus = "ACTIVE" | "EXPIRED" | "FROZEN" | "HAS_DEBT" | "INACTIVE"

interface ClientWithSub extends Client {
  subscriptions: Array<{
    status: string
    endDate: Date
  }>
}

export default function ClientsPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role as Role
  const [searchQuery, setSearchQuery] = useState("")
  const [clients, setClients] = useState<ClientWithSub[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingClient, setDeletingClient] = useState<string | null>(null)

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      searchClients()
    } else {
      fetchClients()
    }
  }, [searchQuery])

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients")
      const data = await res.json()
      setClients(data)
    } catch (error) {
      console.error("Error fetching clients:", error)
    } finally {
      setLoading(false)
    }
  }

  const searchClients = async () => {
    try {
      const res = await fetch(`/api/clients/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setClients(data)
    } catch (error) {
      console.error("Error searching clients:", error)
    }
  }

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`هل أنت متأكد من حذف العميلة "${clientName}"؟\nسيتم حذف جميع البيانات المرتبطة بها (اشتراكات، فواتير، مدفوعات، إلخ).`)) {
      return
    }

    setDeletingClient(clientId)
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || "حدث خطأ أثناء حذف العميلة")
        return
      }

      // إعادة جلب القائمة
      fetchClients()
    } catch (error) {
      console.error("Error deleting client:", error)
      alert("حدث خطأ أثناء حذف العميلة")
    } finally {
      setDeletingClient(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: string } = {
      ACTIVE: "bg-green-100 text-green-800",
      EXPIRED: "bg-red-100 text-red-800",
      FROZEN: "bg-yellow-100 text-yellow-800",
      HAS_DEBT: "bg-orange-100 text-orange-800",
      INACTIVE: "bg-gray-100 text-gray-800",
    }
    const labels: { [key: string]: string } = {
      ACTIVE: "نشطة",
      EXPIRED: "منتهية",
      FROZEN: "مجمدة",
      HAS_DEBT: "مديونية",
      INACTIVE: "غير نشطة",
    }
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">العميلات</h1>
          <p className="mt-2 text-gray-600">عرض وإدارة جميع العميلات</p>
        </div>
        {hasPermission(userRole, PERMISSIONS.CLIENTS_CREATE) && (
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700"
          >
            <UserPlus className="h-5 w-5" />
            عميلة جديدة
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم، رقم الجوال، أو رقم العضوية..."
            className="w-full rounded-lg border border-gray-300 bg-white py-3 pr-12 pl-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">رقم العضوية</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">الاسم</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">رقم الجوال</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">الحالة</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">المديونية</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    جاري التحميل...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    لا توجد نتائج
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {client.membershipNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{client.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{client.phone}</td>
                    <td className="px-6 py-4">{getStatusBadge(client.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {client.totalDebt > 0 ? (
                        <span className="text-orange-600 font-medium">{client.totalDebt} ريال</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="flex items-center gap-1 text-pink-600 hover:text-pink-700 text-sm font-medium"
                        >
                          <Eye className="h-4 w-4" />
                          عرض
                        </Link>
                        {hasPermission(userRole, PERMISSIONS.CLIENTS_DELETE) && (
                          <button
                            onClick={() => handleDeleteClient(client.id, client.name)}
                            disabled={deletingClient === client.id}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingClient === client.id ? "جاري الحذف..." : "حذف"}
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
    </div>
  )
}






