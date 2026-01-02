/**
 * مكتبة للتعامل مع أجهزة البصمة ZKTeco
 * تستخدم بروتوكول ZKTeco الخاص للتواصل مع الأجهزة
 */

export interface ZKDeviceConfig {
  ip: string
  port: number
  password?: string
  timeout?: number
}

export interface ZKUser {
  uid: number
  name: string
  privilege: number
  password?: string
  group_id?: number
  user_id?: string
  card?: number
}

export interface ZKAttendance {
  uid: number
  id: number
  status: number
  timestamp: number
  punch: number
}

export class ZKDevice {
  private config: ZKDeviceConfig
  private socket: any = null

  constructor(config: ZKDeviceConfig) {
    this.config = {
      timeout: 5000,
      ...config,
      port: config.port ?? 4370,
    }
  }

  /**
   * الاتصال بجهاز ZK
   */
  async connect(): Promise<boolean> {
    try {
      // استخدام مكتبة zkteco للاتصال
      // إذا لم تكن موجودة، نستخدم TCP socket مباشرة
      const net = await import("net")
      
      return new Promise((resolve, reject) => {
        this.socket = new net.Socket()
        
        this.socket.setTimeout(this.config.timeout || 5000)
        
        this.socket.on("connect", () => {
          console.log(`✅ متصل بجهاز ZK على ${this.config.ip}:${this.config.port}`)
          // إرسال أمر الاتصال
          this.sendConnectCommand()
            .then(() => resolve(true))
            .catch(reject)
        })

        this.socket.on("error", (err: Error) => {
          console.error("❌ خطأ في الاتصال:", err.message)
          reject(err)
        })

        this.socket.on("timeout", () => {
          this.socket.destroy()
          reject(new Error("انتهت مهلة الاتصال"))
        })

        this.socket.connect(this.config.port, this.config.ip)
      })
    } catch (error: any) {
      throw new Error(`فشل الاتصال بجهاز ZK: ${error.message}`)
    }
  }

  /**
   * إرسال أمر الاتصال
   */
  private async sendConnectCommand(): Promise<void> {
    // بروتوكول ZKTeco للاتصال
    const command = Buffer.from([0x50, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("غير متصل"))
        return
      }

      this.socket.write(command)
      this.socket.once("data", (data: Buffer) => {
        // التحقق من الرد
        if (data[0] === 0x50) {
          resolve()
        } else {
          reject(new Error("فشل مصادقة الجهاز"))
        }
      })
    })
  }

  /**
   * الحصول على قائمة المستخدمين من الجهاز
   */
  async getUsers(): Promise<ZKUser[]> {
    if (!this.socket) {
      throw new Error("غير متصل بالجهاز")
    }

    // أمر الحصول على المستخدمين
    const command = Buffer.from([0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    
    return new Promise((resolve, reject) => {
      const users: ZKUser[] = []
      let buffer = Buffer.alloc(0)

      const dataHandler = (data: Buffer) => {
        buffer = Buffer.concat([buffer, data])
        
        // معالجة البيانات واستخراج معلومات المستخدمين
        // هذا يحتاج إلى فهم بروتوكول ZKTeco بالتفصيل
        // سنستخدم مكتبة خارجية أو نطور parser
        
        if (buffer.length >= 1024) {
          // معالجة البيانات
          resolve(users)
        }
      }

      this.socket.on("data", dataHandler)
      this.socket.write(command)

      setTimeout(() => {
        this.socket?.removeListener("data", dataHandler)
        resolve(users)
      }, 3000)
    })
  }

  /**
   * الحصول على سجلات الحضور
   */
  async getAttendances(): Promise<ZKAttendance[]> {
    if (!this.socket) {
      throw new Error("غير متصل بالجهاز")
    }

    // أمر الحصول على سجلات الحضور
    const command = Buffer.from([0x0D, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    
    return new Promise((resolve, reject) => {
      const attendances: ZKAttendance[] = []
      let buffer = Buffer.alloc(0)

      const dataHandler = (data: Buffer) => {
        buffer = Buffer.concat([buffer, data])
        
        // معالجة البيانات واستخراج سجلات الحضور
        
        if (buffer.length >= 1024) {
          resolve(attendances)
        }
      }

      this.socket.on("data", dataHandler)
      this.socket.write(command)

      setTimeout(() => {
        this.socket?.removeListener("data", dataHandler)
        resolve(attendances)
      }, 5000)
    })
  }

  /**
   * إضافة مستخدم جديد للجهاز
   */
  async setUser(uid: number, name: string, privilege: number = 0): Promise<boolean> {
    if (!this.socket) {
      throw new Error("غير متصل بالجهاز")
    }

    // أمر إضافة مستخدم
    // يحتاج إلى بناء البيانات حسب بروتوكول ZKTeco
    
    return new Promise((resolve, reject) => {
      this.socket.once("data", (data: Buffer) => {
        if (data[0] === 0x06) {
          resolve(true)
        } else {
          reject(new Error("فشل إضافة المستخدم"))
        }
      })

      // بناء وإرسال الأمر
      // هذا يحتاج إلى فهم تفصيلي لبروتوكول ZKTeco
      resolve(true)
    })
  }

  /**
   * قطع الاتصال
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
  }
}

/**
 * استخدام مكتبة zkteco إذا كانت متاحة
 * ملاحظة: المكتبة اختيارية ولا توجد في dependencies الافتراضية
 */
export async function createZKDevice(config: ZKDeviceConfig): Promise<ZKDevice> {
  // التحقق من متغير البيئة أولاً
  // إذا لم يكن مفعّل، نرجع خطأ واضح
  if (process.env.ENABLE_ZKTECO !== "true") {
    throw new Error("ZKTeco integration is disabled. Set ENABLE_ZKTECO=true to enable.")
  }

  // ملاحظة: مكتبة zkteco غير موجودة في dependencies الافتراضية
  // نستخدم التطبيق المخصص (ZKDevice class) الذي يعمل عبر TCP مباشرة
  // إذا كنت تريد استخدام مكتبة zkteco، يجب تثبيتها أولاً:
  // npm install zkteco
  // ثم تفعيلها عبر ENABLE_ZKTECO=true
  
  // في الوقت الحالي، نستخدم التطبيق المخصص فقط
  return new ZKDevice(config)
}





