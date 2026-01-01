// مكتبة للتواصل مع Odoo API
import { prisma } from "./prisma"
import { XMLParser } from "fast-xml-parser"

export interface OdooConfig {
  url: string
  database: string
  username: string
  apiKey: string
}

export interface OdooPartner {
  name: string
  email?: string
  phone?: string
  mobile?: string
  customer_rank?: number
  supplier_rank?: number
  comment?: string
}

export interface OdooInvoice {
  partner_id: number
  invoice_date: string
  invoice_date_due?: string
  invoice_line_ids: Array<{
    name: string
    quantity: number
    price_unit: number
    account_id?: number
    product_id?: number
  }>
  amount_total: number
  amount_tax: number
  amount_untaxed: number
  invoice_origin?: string
  narration?: string
}

export interface OdooPayment {
  partner_id: number
  amount: number
  payment_date: string
  journal_id?: number
  payment_method_line_id?: number
  ref?: string
  communication?: string
}

class OdooClient {
  private url: string
  private database: string
  private username: string
  private password: string
  private uid: number | null = null

  constructor(config: OdooConfig) {
    this.url = config.url.replace(/\/$/, "") // Remove trailing slash
    this.database = config.database
    this.username = config.username
    this.password = config.apiKey
  }

  // تسجيل الدخول إلى Odoo - يجرب عدة طرق
  async authenticate(): Promise<number> {
    const errors: string[] = []
    
    // طريقة 1: JSON-RPC (الأفضل لـ Odoo Cloud)
    try {
      return await this.authenticateJSONRPC()
    } catch (error: any) {
      errors.push(`JSON-RPC: ${error.message}`)
      console.log("JSON-RPC failed, trying XML-RPC...", error.message)
    }
    
    // طريقة 2: XML-RPC (الطريقة التقليدية)
    try {
      return await this.authenticateXMLRPC()
    } catch (error: any) {
      errors.push(`XML-RPC: ${error.message}`)
      console.log("XML-RPC failed, trying REST API...", error.message)
    }
    
    // طريقة 3: REST API
    try {
      return await this.authenticateREST()
    } catch (error: any) {
      errors.push(`REST API: ${error.message}`)
      console.log("REST API failed", error.message)
    }
    
    // إذا فشلت جميع الطرق، نعرض جميع الأخطاء مع إرشادات واضحة
    const dbSuggestions = [
      "Production", "production", 
      "bperformance-scop", "bperformance_scop",
      "bperformance-scop-production", "bperformance_scop_production",
      "bperformance-scop-prod", "bperformance_scop_prod",
      "bperformance", "bperformance-scop-live"
    ]
    
    throw new Error(
      `❌ فشل جميع طرق الاتصال (3 طرق جُربت)\n\n` +
      `الأخطاء:\n${errors.map(e => `  • ${e}`).join("\n")}\n\n` +
      `🔍 المشكلة الأساسية: اسم قاعدة البيانات "${this.database}" غير صحيح.\n\n` +
      `✅ الحلول المقترحة:\n\n` +
      `1️⃣ الحصول على اسم قاعدة البيانات من Odoo.sh:\n` +
      `   • افتح: https://www.odoo.sh/project/bperformance-scop\n` +
      `   • اضغط "SQL"\n` +
      `   • نفّذ: SELECT current_database();\n` +
      `   • انسخ الاسم الحرفي\n\n` +
      `2️⃣ من داخل Odoo:\n` +
      `   • سجل دخول: ${this.url}\n` +
      `   • Settings → Technical → Parameters → System Parameters\n` +
      `   • ابحث عن "database_name"\n\n` +
      `3️⃣ جرّب هذه الأسماء المحتملة:\n` +
      dbSuggestions.map(db => `   • ${db}`).join("\n") +
      `\n\n📝 البيانات المستخدمة:\n` +
      `   • URL: ${this.url}\n` +
      `   • Database: ${this.database || "(غير محدد)"}\n` +
      `   • Username: ${this.username}\n` +
      `   • API Key: ${this.password ? "***محدد***" : "غير محدد"}`
    )
  }

  // تسجيل الدخول باستخدام JSON-RPC (الأفضل لـ Odoo Cloud)
  private async authenticateJSONRPC(): Promise<number> {
    try {
      const response = await fetch(`${this.url}/jsonrpc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "common",
            method: "authenticate",
            args: [this.database, this.username, this.password, {}],
          },
          id: Math.floor(Math.random() * 1000000),
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`)
      }

      const data = await response.json()
      
      if (data.error) {
        const errorMsg = data.error.message || JSON.stringify(data.error)
        
        // تحسين رسالة الخطأ
        if (errorMsg.includes("does not exist") || errorMsg.includes("KeyError")) {
          throw new Error(`❌ قاعدة البيانات "${this.database}" غير موجودة.\n\nجرّب هذه الأسماء:\n- Production\n- production\n- bperformance-scop\n- bperformance_scop_production`)
        }
        
        throw new Error(errorMsg)
      }

      if (data.result && typeof data.result === "number" && data.result > 0) {
        const uid = data.result
        this.uid = uid
        return uid
      }

      if (data.result === false || data.result === 0) {
        throw new Error("فشل تسجيل الدخول: اسم المستخدم أو كلمة المرور غير صحيحة")
      }

      throw new Error(`استجابة غير متوقعة: ${JSON.stringify(data.result)}`)
    } catch (error: any) {
      throw new Error(`JSON-RPC authentication failed: ${error.message}`)
    }
  }

  // تسجيل الدخول باستخدام REST API (Odoo 17.0+)
  private async authenticateREST(): Promise<number> {
    try {
      // أولاً: الحصول على session info
      const sessionRes = await fetch(`${this.url}/web/session/get_session_info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      // ثم: تسجيل الدخول
      const loginRes = await fetch(`${this.url}/web/session/authenticate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          jsonrpc: "2.0",
          params: {
            db: this.database || undefined, // قد لا يكون مطلوباً
            login: this.username,
            password: this.password,
          },
        }),
      })

      const data = await loginRes.json()
      if (data.result && data.result.uid) {
        const uid = data.result.uid
        if (typeof uid === "number" && uid > 0) {
          this.uid = uid
          return uid
        }
      }
      throw new Error("فشل تسجيل الدخول باستخدام REST API")
    } catch (error: any) {
      throw new Error(`REST API authentication failed: ${error.message}`)
    }
  }

  // تسجيل الدخول باستخدام Web Session (لا يحتاج اسم قاعدة البيانات في بعض الحالات)
  private async authenticateWebSession(): Promise<number> {
    try {
      // محاولة تسجيل الدخول بدون اسم قاعدة البيانات
      const loginRes = await fetch(`${this.url}/web/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        credentials: "include",
        body: new URLSearchParams({
          login: this.username,
          password: this.password,
          db: this.database || "",
        }),
        redirect: "manual",
      })

      // إذا نجح التحويل، يعني تسجيل الدخول نجح
      if (loginRes.status === 303 || loginRes.status === 200) {
        // الحصول على session info
        const sessionRes = await fetch(`${this.url}/web/session/get_session_info`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        })

        const sessionData = await sessionRes.json()
        if (sessionData.result && sessionData.result.uid) {
          const uid = sessionData.result.uid
          if (typeof uid === "number" && uid > 0) {
            this.uid = uid
            return uid
          }
        }
      }

      throw new Error("فشل تسجيل الدخول باستخدام Web Session")
    } catch (error: any) {
      throw new Error(`Web Session authentication failed: ${error.message}`)
    }
  }

  // تسجيل الدخول باستخدام XML-RPC (الأكثر شيوعاً في Odoo)
  private async authenticateXMLRPC(): Promise<number> {
    try {
      // إنشاء XML-RPC request
      const xmlRequest = `<?xml version="1.0"?>
<methodCall>
  <methodName>authenticate</methodName>
  <params>
    <param>
      <value><string>${this.database}</string></value>
    </param>
    <param>
      <value><string>${this.username}</string></value>
    </param>
    <param>
      <value><string>${this.password}</string></value>
    </param>
    <param>
      <value><struct></struct></value>
    </param>
  </params>
</methodCall>`

      const response = await fetch(`${this.url}/xmlrpc/2/common`, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "User-Agent": "Odoo-Client/1.0",
        },
        body: xmlRequest,
      })

      const responseText = await response.text()
      
      // التحقق من أن الرد XML وليس HTML
      if (!responseText.trim().startsWith("<?xml")) {
        console.error("Response is not XML:", responseText.substring(0, 500))
        
        // إذا كان الرد HTML (مثل CSRF error)، يعني أن endpoint غير صحيح
        if (responseText.includes("CSRF") || responseText.includes("<!doctype html>") || responseText.includes("Session expired")) {
          throw new Error(`❌ خطأ CSRF: Odoo Cloud يحاول معالجة الطلب كـ web session.\n\nقد يكون السبب:\n1. URL يحتاج إلى التأكد من أنه ${this.url}/xmlrpc/2/common\n2. Odoo Cloud قد يحتاج إلى تفعيل XML-RPC في الإعدادات\n3. تحقق من أن URL صحيح بدون مسافات أو أحرف إضافية`)
        }
        
        throw new Error(`❌ استجابة غير صالحة من Odoo (توقعنا XML لكن حصلنا على HTML).\n\nالرد: ${responseText.substring(0, 200)}`)
      }

      if (!response.ok) {
        console.error("Odoo XML-RPC error response:", responseText)
        throw new Error(`HTTP error! status: ${response.status}, message: ${responseText.substring(0, 200)}`)
      }

      const xmlText = responseText
      
      // Parse XML response
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      })
      const result = parser.parse(xmlText)
      
      // Check for XML-RPC fault
      if (result.methodResponse?.fault) {
        const faultValue = result.methodResponse.fault.value
        const faultString = faultValue?.struct?.member?.find((m: any) => m.name === "faultString")?.value?.string || 
                           faultValue?.string || 
                           "خطأ غير معروف"
        console.error("Odoo XML-RPC fault:", faultString)
        
        // تحسين رسالة الخطأ إذا كانت المشكلة في اسم قاعدة البيانات
        if (faultString.includes("does not exist") || faultString.includes("KeyError")) {
          throw new Error(`❌ قاعدة البيانات "${this.database}" غير موجودة.\n\nيرجى التحقق من اسم قاعدة البيانات في Odoo:\n1. سجل دخول إلى Odoo\n2. Settings → Preferences\n3. ابحث عن حقل "Database"\n4. انسخ الاسم الحرفي`)
        }
        
        throw new Error(`خطأ من Odoo: ${faultString}`)
      }

      // Get the result value
      const param = result.methodResponse?.params?.param
      if (!param) {
        throw new Error("استجابة غير صالحة من Odoo")
      }

      const value = param.value

      // Check if it's a boolean false (authentication failed)
      if (value.boolean === "0" || value.boolean === false) {
        throw new Error("فشل تسجيل الدخول: اسم المستخدم أو كلمة المرور غير صحيحة")
      }

      // Get integer (user ID)
      const uid = parseInt(value.i4 || value.int || value.integer || "0")
      if (uid > 0) {
        this.uid = uid
        return this.uid
      }

      throw new Error("فشل تسجيل الدخول: استجابة غير متوقعة من Odoo")
    } catch (error: any) {
      console.error("Odoo authentication error:", {
        url: this.url,
        database: this.database,
        username: this.username,
        error: error.message,
      })
      throw error
    }
  }

  // تحويل القيمة إلى XML-RPC format
  private valueToXML(value: any): string {
    if (value === null || value === undefined) {
      return "<value><nil/></value>"
    }
    if (typeof value === "boolean") {
      return `<value><boolean>${value ? "1" : "0"}</boolean></value>`
    }
    if (typeof value === "number") {
      return `<value><i4>${value}</i4></value>`
    }
    if (typeof value === "string") {
      // Escape XML special characters
      const escaped = value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")
      return `<value><string>${escaped}</string></value>`
    }
    if (Array.isArray(value)) {
      const items = value.map((item) => this.valueToXML(item)).join("")
      return `<value><array><data>${items}</data></array></value>`
    }
    if (typeof value === "object") {
      const members = Object.entries(value)
        .map(([key, val]) => `<member><name>${key}</name>${this.valueToXML(val)}</member>`)
        .join("")
      return `<value><struct>${members}</struct></value>`
    }
    return `<value><string>${String(value)}</string></value>`
  }

  // استدعاء API في Odoo
  private async callModel(
    model: string,
    method: string,
    args: any[] = [],
    kwargs: any = {}
  ): Promise<any> {
    if (!this.uid) {
      await this.authenticate()
    }

    try {
      // إنشاء XML-RPC request
      const paramsXml = [
        this.valueToXML(this.database),
        this.valueToXML(this.uid),
        this.valueToXML(this.password),
        this.valueToXML(model),
        this.valueToXML(method),
        this.valueToXML(args),
        this.valueToXML(kwargs),
      ].join("")

      const xmlRequest = `<?xml version="1.0"?>
<methodCall>
  <methodName>execute_kw</methodName>
  <params>
    ${paramsXml.split("</value>").map((p, i, arr) => i < arr.length - 1 ? `<param>${p}</value></param>` : "").join("")}
  </params>
</methodCall>`

      // Fix: Properly format params
      const paramsList = [
        this.database,
        this.uid,
        this.password,
        model,
        method,
        args,
        kwargs,
      ]
      const paramsXmlFixed = paramsList.map((p) => `<param>${this.valueToXML(p)}</param>`).join("")

      const xmlRequestFixed = `<?xml version="1.0"?>
<methodCall>
  <methodName>execute_kw</methodName>
  <params>
    ${paramsXmlFixed}
  </params>
</methodCall>`

      const response = await fetch(`${this.url}/xmlrpc/2/object`, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml",
        },
        body: xmlRequestFixed,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const xmlText = await response.text()
      
      // Parse XML response
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      })
      const result = parser.parse(xmlText)
      
      // Check for XML-RPC fault
      if (result.methodResponse?.fault) {
        const faultValue = result.methodResponse.fault.value
        const faultString = faultValue?.struct?.member?.find((m: any) => m.name === "faultString")?.value?.string || 
                           faultValue?.string || 
                           "خطأ غير معروف"
        throw new Error(`Odoo error: ${faultString}`)
      }

      // Get the result
      const param = result.methodResponse?.params?.param
      if (!param) {
        throw new Error("استجابة غير صالحة من Odoo")
      }

      return parseXMLValue(param.value)
    } catch (error: any) {
      console.error(`Odoo API call error (${model}.${method}):`, error)
      throw error
    }
  }

  // إنشاء أو البحث عن عميل (Partner)
  async createOrFindPartner(partnerData: OdooPartner): Promise<number> {
    try {
      // البحث عن العميل أولاً
      const existing = await this.callModel("res.partner", "search_read", [
        [
          ["name", "=", partnerData.name],
          "|",
          ["phone", "=", partnerData.phone || ""],
          ["mobile", "=", partnerData.mobile || partnerData.phone || ""],
        ],
        ["id", "name"],
      ])

      if (existing && existing.length > 0) {
        return existing[0].id
      }

      // إنشاء عميل جديد
      const partnerId = await this.callModel("res.partner", "create", [
        {
          name: partnerData.name,
          email: partnerData.email || false,
          phone: partnerData.phone || false,
          mobile: partnerData.mobile || partnerData.phone || false,
          customer_rank: partnerData.customer_rank || 1,
          supplier_rank: partnerData.supplier_rank || 0,
          comment: partnerData.comment || false,
        },
      ])

      return partnerId
    } catch (error: any) {
      console.error("Error creating/finding partner:", error)
      throw error
    }
  }

  // إنشاء فاتورة
  async createInvoice(invoiceData: OdooInvoice): Promise<number> {
    try {
      const invoiceId = await this.callModel("account.move", "create", [invoiceData])
      return invoiceId
    } catch (error: any) {
      console.error("Error creating invoice:", error)
      throw error
    }
  }

  // تأكيد/نشر فاتورة
  async confirmInvoice(invoiceId: number): Promise<boolean> {
    try {
      await this.callModel("account.move", "action_post", [[invoiceId]])
      return true
    } catch (error: any) {
      console.error("Error confirming invoice:", error)
      throw error
    }
  }

  // إنشاء دفعة
  async createPayment(paymentData: OdooPayment): Promise<number> {
    try {
      // إنشاء سجل دفعة في account.payment
      const paymentId = await this.callModel("account.payment", "create", [paymentData])
      return paymentId
    } catch (error: any) {
      console.error("Error creating payment:", error)
      throw error
    }
  }

  // تأكيد/نشر دفعة
  async confirmPayment(paymentId: number): Promise<boolean> {
    try {
      await this.callModel("account.payment", "action_post", [[paymentId]])
      return true
    } catch (error: any) {
      console.error("Error confirming payment:", error)
      throw error
    }
  }

  // ربط دفعة بفاتورة
  async linkPaymentToInvoice(
    paymentId: number,
    invoiceId: number
  ): Promise<boolean> {
    try {
      await this.callModel("account.payment", "write", [
        [paymentId],
        {
          invoice_ids: [[6, 0, [invoiceId]]],
        },
      ])
      return true
    } catch (error: any) {
      console.error("Error linking payment to invoice:", error)
      throw error
    }
  }

  // الحصول على معلومات فاتورة
  async getInvoice(invoiceId: number): Promise<any> {
    try {
      const invoice = await this.callModel("account.move", "read", [
        [invoiceId],
        ["id", "name", "amount_total", "state", "invoice_date"],
      ])
      return invoice && invoice.length > 0 ? invoice[0] : null
    } catch (error: any) {
      console.error("Error getting invoice:", error)
      throw error
    }
  }
}

// Helper function to parse XML-RPC value
function parseXMLValue(value: any): any {
  if (value.i4 !== undefined || value.int !== undefined || value.integer !== undefined) {
    return parseInt(value.i4 || value.int || value.integer || "0")
  }

  if (value.boolean !== undefined) {
    return value.boolean === "1" || value.boolean === true || value.boolean === 1
  }

  if (value.string !== undefined) {
    return value.string || ""
  }

  if (value.array) {
    const data = value.array.data || []
    const values = Array.isArray(data.value) ? data.value : (data.value ? [data.value] : [])
    return values.map((v: any) => parseXMLValue(v))
  }

  if (value.struct) {
    const result: any = {}
    const members = Array.isArray(value.struct.member) 
      ? value.struct.member 
      : (value.struct.member ? [value.struct.member] : [])
    
    members.forEach((member: any) => {
      const name = member.name
      const memberValue = member.value
      if (name && memberValue) {
        result[name] = parseXMLValue(memberValue)
      }
    })
    return result
  }

  return value || null
}

// الحصول على قائمة قواعد البيانات المتاحة من Odoo
export async function getAvailableDatabases(url: string): Promise<string[]> {
  try {
    const xmlRequest = `<?xml version="1.0"?>
<methodCall>
  <methodName>list</methodName>
  <params></params>
</methodCall>`

    const response = await fetch(`${url}/xmlrpc/2/db`, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
      },
      body: xmlRequest,
    })

    if (!response.ok) {
      return []
    }

    const xmlText = await response.text()
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    })
    const result = parser.parse(xmlText)

    const param = result.methodResponse?.params?.param
    if (!param) {
      return []
    }

    const databases = parseXMLValue(param.value)
    return Array.isArray(databases) ? databases : []
  } catch (error: any) {
    console.error("Error getting databases:", error)
    return []
  }
}

// الحصول على إعدادات Odoo من قاعدة البيانات
export async function getOdooConfig(allowInactive: boolean = false): Promise<OdooConfig | null> {
  const whereClause = allowInactive ? {} : { isActive: true }
  
  const settings = await prisma.odooSettings.findFirst({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  })

  if (!settings) {
    return null
  }

  // التحقق من وجود البيانات المطلوبة
  if (!settings.url || !settings.database || !settings.username || !settings.apiKey) {
    return null
  }

  return {
    url: settings.url,
    database: settings.database,
    username: settings.username,
    apiKey: settings.apiKey,
  }
}

// إنشاء عميل Odoo
export async function getOdooClient(allowInactive: boolean = false): Promise<{ client: OdooClient | null; error?: string }> {
  const config = await getOdooConfig(allowInactive)
  if (!config) {
    return { client: null, error: "لم يتم العثور على إعدادات Odoo أو البيانات ناقصة" }
  }

  const client = new OdooClient(config)
  try {
    await client.authenticate()
    return { client }
  } catch (error: any) {
    console.error("Failed to create Odoo client:", error)
    return { client: null, error: error.message || "فشل الاتصال بـ Odoo" }
  }
}

export { OdooClient }


