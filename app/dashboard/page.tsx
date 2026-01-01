"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, UserPlus, RefreshCw, Pause, CreditCard, LogIn, Users } from "lucide-react"
import { Client } from "@prisma/client"

interface ClientWithSub extends Client {
  subscriptions: Array<{
    status: string
    endDate: Date
  }>
}

export default function DashboardPage() {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")
  const [clients, setClients] = useState<ClientWithSub[]>([])
  const [loading, setLoading] = useState(true)

  // Ensure we're on the correct page - redirect if needed
  useEffect(() => {
    // Log current pathname for debugging
    console.log("Dashboard page pathname:", pathname)
    console.log("Current URL:", window.location.href)
    
    // If somehow we're on a different dashboard route, force redirect to main dashboard
    if (pathname && pathname !== "/dashboard" && pathname.startsWith("/dashboard")) {
      // Redirect any config/configuration routes to main dashboard
      if (pathname.includes("config") || pathname.includes("configuration") || pathname.includes("odoo")) {
        console.log("Redirecting from:", pathname, "to /dashboard")
        window.location.replace("/dashboard")
      }
    }
  }, [pathname])
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    frozen: 0,
    debt: 0,
  })

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
      calculateStats(data)
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

  const calculateStats = (clients: ClientWithSub[]) => {
    const stats = {
      total: clients.length,
      active: 0,
      expired: 0,
      frozen: 0,
      debt: 0,
    }

    clients.forEach((client) => {
      if (client.status === "ACTIVE") stats.active++
      if (client.status === "EXPIRED") stats.expired++
      if (client.status === "FROZEN") stats.frozen++
      if (client.status === "HAS_DEBT" || client.totalDebt > 0) stats.debt++
    })

    setStats(stats)
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">لوحة الاستقبال</h1>
        <p className="mt-2 text-gray-600">إدارة العميلات والاشتراكات</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي العميلات</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">نشطة</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">منتهية</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{stats.expired}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">مجمدة</p>
              <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.frozen}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">مديونية</p>
              <p className="mt-1 text-2xl font-bold text-orange-600">{stats.debt}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 flex flex-wrap gap-4">
        <Link
          href="/dashboard/clients/new"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700"
        >
          <UserPlus className="h-5 w-5" />
          تسجيل عميلة جديدة
        </Link>
        <Link
          href="/dashboard/checkin"
          className="flex items-center gap-2 rounded-lg bg-green-500 px-6 py-3 font-medium text-white transition-colors hover:bg-green-600"
        >
          <LogIn className="h-5 w-5" />
          تسجيل دخول
        </Link>
        <Link
          href="/dashboard/subscriptions/new"
          className="flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600"
        >
          <CreditCard className="h-5 w-5" />
          تجديد اشتراك
        </Link>
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
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="text-pink-600 hover:text-pink-700 text-sm font-medium"
                      >
                        عرض التفاصيل
                      </Link>
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






