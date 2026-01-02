"use client"

import { useState, useEffect } from "react"
import { Save, Shield, Lock, Database, Eye, Trash2 } from "lucide-react"

interface SecuritySettings {
  id: string
  encryptionEnabled: boolean
  encryptPhoneNumbers: boolean
  encryptNames: boolean
  encryptEmails: boolean
  autoBackupEnabled: boolean
  backupIntervalHours: number
  backupRetentionDays: number
  requireStrongPassword: boolean
  sessionTimeoutMinutes: number
  maxLoginAttempts: number
  allowDataExport: boolean
  anonymizeLogs: boolean
  auditLogRetentionDays: number
  gdprCompliant: boolean
  dataRetentionDays: number | null
  rightToDelete: boolean
}

export default function SecurityPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SecuritySettings | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/security/settings")
      if (!res.ok) {
        throw new Error("فشل جلب الإعدادات")
      }
      const data = await res.json()
      setSettings(data)
    } catch (error) {
      console.error("Error fetching settings:", error)
      setMessage({ type: "error", text: "حدث خطأ أثناء جلب الإعدادات" })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    try {
      setSaving(true)
      const res = await fetch("/api/security/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "فشل حفظ الإعدادات")
      }

      setMessage({ type: "success", text: "تم حفظ الإعدادات بنجاح" })
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      console.error("Error saving settings:", error)
      setMessage({ type: "error", text: error.message || "حدث خطأ أثناء حفظ الإعدادات" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-600">جاري التحميل...</div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="p-8">
        <div className="text-center text-red-600">فشل تحميل الإعدادات</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">الأمان والخصوصية</h1>
        <p className="mt-2 text-gray-600">إعدادات حماية بيانات العضوات والخصوصية</p>
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

      <div className="space-y-6">
        {/* التشفير */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-6 flex items-center gap-3">
            <Lock className="h-6 w-6 text-pink-600" />
            <h2 className="text-xl font-bold text-gray-900">التشفير</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-700">تفعيل التشفير</span>
              <input
                type="checkbox"
                checked={settings.encryptionEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, encryptionEnabled: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-gray-700">تشفير أرقام الهواتف</span>
              <input
                type="checkbox"
                checked={settings.encryptPhoneNumbers}
                onChange={(e) =>
                  setSettings({ ...settings, encryptPhoneNumbers: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-gray-700">تشفير الأسماء</span>
              <input
                type="checkbox"
                checked={settings.encryptNames}
                onChange={(e) =>
                  setSettings({ ...settings, encryptNames: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-gray-700">تشفير البريد الإلكتروني</span>
              <input
                type="checkbox"
                checked={settings.encryptEmails}
                onChange={(e) =>
                  setSettings({ ...settings, encryptEmails: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </label>
          </div>
        </div>

        {/* النسخ الاحتياطي */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-6 flex items-center gap-3">
            <Database className="h-6 w-6 text-pink-600" />
            <h2 className="text-xl font-bold text-gray-900">النسخ الاحتياطي</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-700">نسخ احتياطي تلقائي</span>
              <input
                type="checkbox"
                checked={settings.autoBackupEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, autoBackupEnabled: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                فترة النسخ الاحتياطي (بالساعات)
              </label>
              <input
                type="number"
                value={settings.backupIntervalHours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    backupIntervalHours: parseInt(e.target.value) || 24,
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
                min={1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                الاحتفاظ بالنسخ (بالأيام)
              </label>
              <input
                type="number"
                value={settings.backupRetentionDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    backupRetentionDays: parseInt(e.target.value) || 30,
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
                min={1}
              />
            </div>
          </div>
        </div>

        {/* الأمان */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-6 flex items-center gap-3">
            <Shield className="h-6 w-6 text-pink-600" />
            <h2 className="text-xl font-bold text-gray-900">الأمان</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-700">طلب كلمة مرور قوية</span>
              <input
                type="checkbox"
                checked={settings.requireStrongPassword}
                onChange={(e) =>
                  setSettings({ ...settings, requireStrongPassword: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                انتهاء الجلسة (بالدقائق)
              </label>
              <input
                type="number"
                value={settings.sessionTimeoutMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    sessionTimeoutMinutes: parseInt(e.target.value) || 60,
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
                min={5}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                أقصى محاولات تسجيل دخول
              </label>
              <input
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxLoginAttempts: parseInt(e.target.value) || 5,
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
                min={3}
              />
            </div>
          </div>
        </div>

        {/* الخصوصية */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-6 flex items-center gap-3">
            <Eye className="h-6 w-6 text-pink-600" />
            <h2 className="text-xl font-bold text-gray-900">الخصوصية</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-700">السماح بتصدير البيانات</span>
              <input
                type="checkbox"
                checked={settings.allowDataExport}
                onChange={(e) =>
                  setSettings({ ...settings, allowDataExport: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-gray-700">إخفاء البيانات الحساسة في السجلات</span>
              <input
                type="checkbox"
                checked={settings.anonymizeLogs}
                onChange={(e) =>
                  setSettings({ ...settings, anonymizeLogs: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                الاحتفاظ بسجل الأنشطة (بالأيام)
              </label>
              <input
                type="number"
                value={settings.auditLogRetentionDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    auditLogRetentionDays: parseInt(e.target.value) || 365,
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
                min={30}
              />
            </div>

            <label className="flex items-center justify-between">
              <span className="text-gray-700">متوافق مع GDPR</span>
              <input
                type="checkbox"
                checked={settings.gdprCompliant}
                onChange={(e) =>
                  setSettings({ ...settings, gdprCompliant: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-gray-700">حق حذف البيانات</span>
              <input
                type="checkbox"
                checked={settings.rightToDelete}
                onChange={(e) =>
                  setSettings({ ...settings, rightToDelete: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                فترة الاحتفاظ بالبيانات (بالأيام) - اتركه فارغاً للاحتفاظ الدائم
              </label>
              <input
                type="number"
                value={settings.dataRetentionDays || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    dataRetentionDays: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500"
                placeholder="لا محدود"
                min={1}
              />
            </div>
          </div>
        </div>

        {/* حفظ */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}</span>
          </button>
        </div>
      </div>
    </div>
  )
}


