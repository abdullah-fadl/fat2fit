"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Settings, Save, TestTube, RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { hasPermission, PERMISSIONS, Role } from "@/lib/permissions"

interface OdooSettings {
  id?: string
  url: string
  database: string
  username: string
  hasApiKey: boolean
  isActive: boolean
  syncClients: boolean
  syncInvoices: boolean
  syncPayments: boolean
  lastSyncAt?: string
  lastSyncStatus?: string
  notes?: string
}

export default function OdooSettingsPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role as Role

  const [settings, setSettings] = useState<OdooSettings>({
    url: "",
    database: "",
    username: "",
    hasApiKey: false,
    isActive: false,
    syncClients: true,
    syncInvoices: true,
    syncPayments: true,
  })
  const [apiKey, setApiKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testingDatabases, setTestingDatabases] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/odoo/settings")
      const data = await res.json()
      if (data && data.url) {
        setSettings(data)
      } else {
        // لا توجد إعدادات محفوظة - استخدام القيم الافتراضية
        setSettings({
          url: "",
          database: "",
          username: "",
          hasApiKey: false,
          isActive: false,
          syncClients: true,
          syncInvoices: true,
          syncPayments: true,
        })
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setMessage(null)

    // التحقق من البيانات المطلوبة
    if (!settings.url || !settings.database || !settings.username) {
      setMessage({ 
        type: "error", 
        text: "يرجى إدخال عنوان Odoo وقاعدة البيانات واسم المستخدم" 
      })
      setLoading(false)
      return
    }

    if (!apiKey && !settings.hasApiKey) {
      setMessage({ 
        type: "error", 
        text: "يرجى إدخال API Key / كلمة المرور" 
      })
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/odoo/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          apiKey: apiKey || undefined,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        const successMessage = apiKey 
          ? "تم حفظ الإعدادات بنجاح ✅ (تم حفظ API Key)" 
          : "تم حفظ الإعدادات بنجاح ✅"
        setMessage({ type: "success", text: successMessage })
        setSettings({ ...data, hasApiKey: true })
        setApiKey("") // مسح API Key بعد الحفظ (لأسباب أمنية)
        // إعادة جلب الإعدادات للتأكد
        await fetchSettings()
      } else {
        setMessage({ type: "error", text: data.error || "حدث خطأ أثناء حفظ الإعدادات" })
      }
    } catch (error: any) {
      console.error("Error saving settings:", error)
      setMessage({ type: "error", text: `حدث خطأ أثناء حفظ الإعدادات: ${error.message || "خطأ غير معروف"}` })
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setMessage(null)

    try {
      const res = await fetch("/api/odoo/sync")
      const data = await res.json()

      if (data.success) {
        let message = "الاتصال مع Odoo ناجح ✅"
        if (data.availableDatabases && data.availableDatabases.length > 0) {
          message += `\n\nقواعد البيانات المتاحة:\n${data.availableDatabases.map((db: string) => `- ${db}`).join("\n")}`
        }
        setMessage({ type: "success", text: message })
      } else {
        let errorMessage = data.error || "فشل الاتصال مع Odoo"
        
        // إذا كان الخطأ بسبب قاعدة البيانات غير موجودة، اقترح أسماء محتملة
        if (errorMessage.includes("does not exist") || errorMessage.includes("KeyError")) {
          errorMessage += "\n\n💡 جرّب هذه الأسماء لقاعدة البيانات:\n"
          const suggestions = [
            "bperformance-scop-prod",
            "bperformance-scop",
            "bperformance_scop_production",
            "bperformance_scop_prod",
            "bperformance_scop",
            "bperformance",
          ]
          errorMessage += suggestions.map((s) => `  • ${s}`).join("\n")
          errorMessage += "\n\nأو:\n"
          errorMessage += "1. سجل دخول إلى Odoo Cloud\n"
          errorMessage += "2. اضغط على أيقونة المستخدم (في الأعلى يمين)\n"
          errorMessage += "3. اضغط على 'Preferences'\n"
          errorMessage += "4. ابحث عن 'Database' - ستجد الاسم هناك"
        }
        
        setMessage({ type: "error", text: errorMessage })
      }
    } catch (error) {
      setMessage({ type: "error", text: "حدث خطأ أثناء اختبار الاتصال" })
    } finally {
      setTesting(false)
    }
  }

  const handleAutoTestDatabases = async () => {
    if (!settings.url || !settings.username || !apiKey) {
      setMessage({ type: "error", text: "يرجى إدخال URL واسم المستخدم و API Key أولاً" })
      return
    }

    setTestingDatabases(true)
    setMessage(null)

    // أولاً: محاولة جلب قائمة قواعد البيانات من Odoo
    setMessage({ 
      type: "error", 
      text: "جاري البحث عن قواعد البيانات المتاحة من Odoo..." 
    })

    try {
      const dbListRes = await fetch("/api/odoo/get-databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: settings.url,
        }),
      })

      const dbListData = await dbListRes.json()
      if (dbListData.success && dbListData.databases && dbListData.databases.length > 0) {
        setMessage({ 
          type: "success", 
          text: `✅ تم العثور على قواعد البيانات المتاحة:\n${dbListData.databases.map((db: string) => `  • ${db}`).join("\n")}\n\nجاري اختبارها...` 
        })

        // اختبار كل قاعدة بيانات
        for (const dbName of dbListData.databases) {
          try {
            const res = await fetch("/api/odoo/test-database", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: settings.url,
                database: dbName,
                username: settings.username,
                apiKey: apiKey,
              }),
            })

            const data = await res.json()
            if (data.success) {
              setSettings({ ...settings, database: dbName })
              setMessage({ 
                type: "success", 
                text: `✅ تم العثور على قاعدة البيانات الصحيحة!\nاسم قاعدة البيانات: ${dbName}\n\nيرجى الضغط على "حفظ الإعدادات" الآن.` 
              })
              setTestingDatabases(false)
              return
            }
          } catch (error) {
            // continue to next
          }
        }
      }
    } catch (error) {
      // إذا فشل جلب قائمة قواعد البيانات، جرب الأسماء المحتملة
      console.log("Failed to get database list, trying common names...")
    }

    // إذا لم يتم العثور على قواعد البيانات، جرب الأسماء الشائعة
    const databaseNames = [
      "bperformance-scop-prod",
      "bperformance-scop",
      "bperformance_scop_production",
      "bperformance_scop_prod",
      "bperformance_scop",
      "bperformance",
      "bperformance-scop-production",
      "bperformance_scop_production",
      "bperformance-scop-production-v2",
      "bperformance-scop-main",
      "bperformance-scop-live",
    ]

    let foundDatabase = null
    const tried = []

    for (const dbName of databaseNames) {
      tried.push(dbName)
      setMessage({ 
        type: "error", 
        text: `جاري التجربة...\nجربت: ${tried.join(", ")}\nالآن: ${dbName}` 
      })

      try {
        const res = await fetch("/api/odoo/test-database", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: settings.url,
            database: dbName,
            username: settings.username,
            apiKey: apiKey,
          }),
        })

        const data = await res.json()
        if (data.success) {
          foundDatabase = dbName
          setSettings({ ...settings, database: dbName })
          setMessage({ 
            type: "success", 
            text: `✅ تم العثور على قاعدة البيانات!\nاسم قاعدة البيانات الصحيح: ${dbName}\n\nيرجى الضغط على "حفظ الإعدادات" الآن.` 
          })
          break
        }
      } catch (error) {
        // continue to next
      }
    }

    if (!foundDatabase) {
      setMessage({ 
        type: "error", 
        text: `❌ لم يتم العثور على قاعدة البيانات بعد تجربة ${databaseNames.length} اسم.\n\n📋 **طريقة العثور على اسم قاعدة البيانات:**\n\n1. سجل دخول إلى Odoo Cloud (https://bperformance-scop.odoo.com)\n2. اضغط على اسم المستخدم في الأعلى (بجانب "Administrator")\n3. اضغط على "Preferences" أو "الإعدادات"\n4. ابحث عن حقل "Database" أو "قاعدة البيانات"\n5. انسخ الاسم الحرفي والصقه في حقل "قاعدة البيانات" أدناه\n\n💡 **ملاحظة:** اسم قاعدة البيانات عادة يكون مختلفاً عن اسم URL` 
      })
    }

    setTestingDatabases(false)
  }

  const handleSync = async (type: "all" | "client" | "invoice" | "payment") => {
    setSyncing(true)
    setMessage(null)

    try {
      const res = await fetch("/api/odoo/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })

      const data = await res.json()

      if (res.ok) {
        const successCount = data.success?.length || 0
        const failedCount = data.failed?.length || 0
        setMessage({
          type: failedCount === 0 ? "success" : "error",
          text: `تمت المزامنة: ${successCount} نجحت، ${failedCount} فشلت`,
        })
        await fetchSettings()
      } else {
        setMessage({ type: "error", text: data.error || "حدث خطأ أثناء المزامنة" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "حدث خطأ أثناء المزامنة" })
    } finally {
      setSyncing(false)
    }
  }

  if (!hasPermission(userRole, PERMISSIONS.STAFF_VIEW)) {
    return (
      <div className="p-8">
        <div className="rounded-lg bg-red-50 p-4 text-red-800">
          غير مصرح لك بالوصول إلى هذه الصفحة
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إعدادات Odoo</h1>
          <p className="mt-2 text-gray-600">ربط النظام مع Odoo المحاسبي</p>
        </div>
      </div>

      {/* دليل سريع */}
      <div className="mb-8 rounded-lg bg-blue-50 border border-blue-200 p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">📋 دليل سريع للحصول على المعلومات:</h2>
        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <strong>1. عنوان Odoo (URL):</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 mr-4">
              <li><strong>إذا كنت تستخدم Odoo Cloud:</strong> العنوان يكون مثل <code className="bg-blue-100 px-1 rounded">https://yourcompany.odoo.com</code></li>
              <li>افتح Odoo في المتصفح</li>
              <li>انسخ العنوان من شريط العنوان</li>
              <li>تأكد من إضافة <code className="bg-blue-100 px-1 rounded">https://</code> في البداية</li>
            </ul>
          </div>
          <div>
            <strong>2. قاعدة البيانات (Database):</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 mr-4">
              <li><strong>إذا كنت تستخدم Odoo Cloud:</strong> عادة يكون نفس اسم الشركة أو المشروع <strong>بدون</strong> ".odoo.com"</li>
              <li>مثال: إذا كان URL هو <code className="bg-blue-100 px-1 rounded">https://mycompany.odoo.com</code>، فقاعدة البيانات قد تكون <code className="bg-blue-100 px-1 rounded">mycompany</code> (وليس mycompany.odoo.com)</li>
              <li>يمكنك معرفته من صفحة تسجيل الدخول في Odoo - سيظهر اسم قاعدة البيانات في قائمة اختيار</li>
              <li><strong>ملاحظة:</strong> إذا لم يعمل، جرب اسم المشروع فقط (مثل: <code className="bg-blue-100 px-1 rounded">bperformance-scop</code>)</li>
            </ul>
          </div>
          <div>
            <strong>3. اسم المستخدم (Username):</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 mr-4">
              <li>هو اسم المستخدم الذي تسجل به دخول لـ Odoo</li>
              <li>عادة يكون <code className="bg-blue-100 px-1 rounded">admin</code> للمدير</li>
            </ul>
          </div>
          <div>
            <strong>4. API Key / كلمة المرور:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 mr-4">
              <li><strong>الطريقة الأسهل:</strong> استخدم كلمة المرور التي تستخدمها لتسجيل الدخول لـ Odoo</li>
              <li><strong>الطريقة الآمنة:</strong> في Odoo → Settings → Users → اختر المستخدم → Generate API Key</li>
            </ul>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-lg p-4 ${
            message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {!settings.url && (
        <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-yellow-800 text-sm">
            <strong>ملاحظة:</strong> لم يتم تكوين إعدادات Odoo بعد. يرجى إدخال بيانات الاتصال أدناه وحفظ الإعدادات.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* إعدادات الاتصال */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-6 flex items-center gap-3">
            <Settings className="h-6 w-6 text-pink-600" />
            <h2 className="text-xl font-bold text-gray-900">إعدادات الاتصال</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                عنوان Odoo (URL) *
              </label>
              <input
                type="text"
                value={settings.url}
                onChange={(e) => setSettings({ ...settings, url: e.target.value })}
                placeholder="https://odoo.example.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                قاعدة البيانات (Database) *
              </label>
              <input
                type="text"
                value={settings.database}
                onChange={(e) => setSettings({ ...settings, database: e.target.value })}
                placeholder="bperformance-scop-production"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
              />
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500">
                  💡 <strong>جرّب هذه الأسماء (بالترتيب):</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Production", "production", "bperformance-scop-prod", "bperformance-scop", "bperformance_scop_production", "bperformance_scop_prod", "bperformance"].map((dbName) => (
                    <button
                      key={dbName}
                      type="button"
                      onClick={() => setSettings({ ...settings, database: dbName })}
                      className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded cursor-pointer transition-colors"
                    >
                      {dbName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                اسم المستخدم (Username) *
              </label>
              <input
                type="text"
                value={settings.username}
                onChange={(e) => setSettings({ ...settings, username: e.target.value })}
                placeholder="admin"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                API Key / كلمة المرور *
                {settings.hasApiKey && (
                  <span className="mr-2 text-xs text-green-600 font-normal">
                    ✅ محفوظ
                  </span>
                )}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={settings.hasApiKey ? "اتركه فارغاً للاحتفاظ بالقيمة الحالية أو أدخل API Key جديد" : "أدخل API Key"}
                className={`w-full rounded-lg border ${settings.hasApiKey && !apiKey ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-white'} px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500`}
              />
              {settings.hasApiKey && !apiKey && (
                <p className="mt-1 text-xs text-green-600">
                  ✓ API Key محفوظ بنجاح. يمكنك تركه فارغاً للاحتفاظ بالقيمة الحالية، أو أدخل API Key جديد لتحديثه.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={settings.isActive}
                onChange={(e) => setSettings({ ...settings, isActive: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                تفعيل المزامنة مع Odoo
              </label>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {loading ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </button>

            <button
              onClick={handleTestConnection}
              disabled={testing || testingDatabases || !settings.isActive}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <TestTube className="h-5 w-5" />
              {testing ? "جاري الاختبار..." : "اختبار الاتصال"}
            </button>
          </div>

          {settings.url && settings.username && apiKey && (
            <div className="mt-4">
              <button
                onClick={handleAutoTestDatabases}
                disabled={testingDatabases || testing}
                className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-blue-500 bg-blue-50 px-6 py-3 font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
              >
                <TestTube className="h-5 w-5" />
                {testingDatabases ? "جاري البحث عن قاعدة البيانات..." : "🔍 البحث التلقائي عن اسم قاعدة البيانات"}
              </button>
              <p className="mt-2 text-xs text-gray-500 text-center">
                سيتم تجربة عدة أسماء تلقائياً للعثور على الاسم الصحيح
              </p>
            </div>
          )}
        </div>

        {/* إعدادات المزامنة */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-6 flex items-center gap-3">
            <RefreshCw className="h-6 w-6 text-pink-600" />
            <h2 className="text-xl font-bold text-gray-900">إعدادات المزامنة</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <label className="text-sm font-medium text-gray-700">مزامنة العملاء</label>
                <p className="mt-1 text-xs text-gray-500">مزامنة بيانات العملاء مع Odoo</p>
              </div>
              <input
                type="checkbox"
                checked={settings.syncClients}
                onChange={(e) => setSettings({ ...settings, syncClients: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <label className="text-sm font-medium text-gray-700">مزامنة الفواتير</label>
                <p className="mt-1 text-xs text-gray-500">إرسال الفواتير إلى Odoo تلقائياً</p>
              </div>
              <input
                type="checkbox"
                checked={settings.syncInvoices}
                onChange={(e) => setSettings({ ...settings, syncInvoices: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <label className="text-sm font-medium text-gray-700">مزامنة المدفوعات</label>
                <p className="mt-1 text-xs text-gray-500">إرسال المدفوعات إلى Odoo تلقائياً</p>
              </div>
              <input
                type="checkbox"
                checked={settings.syncPayments}
                onChange={(e) => setSettings({ ...settings, syncPayments: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* معلومات آخر مزامنة */}
          {settings.lastSyncAt && (
            <div className="mt-6 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2">
                {settings.lastSyncStatus === "SUCCESS" ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">آخر مزامنة</p>
                  <p className="text-xs text-gray-500">
                    {new Date(settings.lastSyncAt).toLocaleString("ar-SA")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* أزرار المزامنة */}
          <div className="mt-6 space-y-3">
            <button
              onClick={() => handleSync("all")}
              disabled={syncing || !settings.isActive}
              className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-medium text-white transition-colors hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
            >
              {syncing ? "جاري المزامنة..." : "مزامنة الكل"}
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleSync("client")}
                disabled={syncing || !settings.isActive || !settings.syncClients}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                عملاء
              </button>
              <button
                onClick={() => handleSync("invoice")}
                disabled={syncing || !settings.isActive || !settings.syncInvoices}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                فواتير
              </button>
              <button
                onClick={() => handleSync("payment")}
                disabled={syncing || !settings.isActive || !settings.syncPayments}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                مدفوعات
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ملاحظات */}
      {settings.notes && (
        <div className="mt-6 rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700">ملاحظات</h3>
          <p className="text-sm text-gray-600">{settings.notes}</p>
        </div>
      )}
    </div>
  )
}


