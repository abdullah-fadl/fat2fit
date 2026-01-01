"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Edit, Trash2, Calendar, User, Mail, Phone, Shield } from "lucide-react"

interface Staff {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string
  specialization?: string | null
  hourlyRate?: number | null
  bio?: string | null
  isActive: boolean
  staffSchedules?: Array<{
    id: string
    dayOfWeek: number
    startTime: string
    endTime: string
  }>
  _count: {
    auditLogs: number
    checkIns: number
    invoices: number
  }
}

const DAYS_OF_WEEK = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/staff")
      if (res.ok) {
        const data = await res.json()
        setStaff(data)
      } else {
        setError("حدث خطأ أثناء جلب البيانات")
      }
    } catch (error) {
      console.error("Error fetching staff:", error)
      setError("حدث خطأ أثناء جلب البيانات")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الموظف؟")) return

    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchStaff()
      } else {
        const errorData = await res.json()
        alert(errorData.error || "حدث خطأ")
      }
    } catch (error) {
      console.error("Error deleting staff:", error)
      alert("حدث خطأ أثناء الحذف")
    }
  }

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { text: string; color: string }> = {
      ADMIN: { text: "مديرة", color: "bg-purple-100 text-purple-800" },
      RECEPTION: { text: "استقبال", color: "bg-blue-100 text-blue-800" },
      TRAINER: { text: "مدربة", color: "bg-pink-100 text-pink-800" },
    }
    const roleInfo = roles[role] || { text: role, color: "bg-gray-100 text-gray-800" }
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${roleInfo.color}`}>
        {roleInfo.text}
      </span>
    )
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
          <h1 className="text-3xl font-bold text-gray-900">إدارة الموظفات والمدربات</h1>
          <p className="mt-2 text-gray-600">إدارة الموظفات والمدربات وجداول العمل</p>
        </div>
        <Link
          href="/dashboard/staff/new"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700"
        >
          <Plus className="h-5 w-5" />
          إضافة موظف/مدربة
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {staff.map((member) => (
          <div
            key={member.id}
            className={`rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg ${
              !member.isActive ? "opacity-60" : ""
            }`}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                  {getRoleBadge(member.role)}
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/staff/${member.id}`}
                  className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                >
                  <Edit className="h-5 w-5" />
                </Link>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {member.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{member.email}</span>
                </div>
              )}
              {member.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{member.phone}</span>
                </div>
              )}
              {member.specialization && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Shield className="h-4 w-4" />
                  <span>{member.specialization}</span>
                </div>
              )}
              {member.hourlyRate && (
                <div className="text-gray-600">
                  <span className="font-medium">سعر الساعة:</span> {member.hourlyRate} ريال
                </div>
              )}
              {member.staffSchedules && member.staffSchedules.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4" />
                    جدول العمل:
                  </div>
                  <div className="space-y-1">
                    {member.staffSchedules.map((schedule) => (
                      <div key={schedule.id} className="text-xs text-gray-600">
                        {DAYS_OF_WEEK[schedule.dayOfWeek]}: {schedule.startTime} - {schedule.endTime}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 pt-3 border-t flex justify-between text-xs text-gray-500">
                <span>سجلات التدقيق: {member._count.auditLogs}</span>
                <span>تسجيلات الدخول: {member._count.checkIns}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {staff.length === 0 && (
        <div className="rounded-lg bg-gray-50 p-12 text-center">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">لا يوجد موظفات أو مدربات مسجلة</p>
          <Link
            href="/dashboard/staff/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-pink-500 px-6 py-3 font-medium text-white transition-colors hover:bg-pink-600"
          >
            <Plus className="h-5 w-5" />
            إضافة أول موظف/مدربة
          </Link>
        </div>
      )}
    </div>
  )
}



