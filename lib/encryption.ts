// مكتبة التشفير لحماية البيانات الحساسة

import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const TAG_POSITION = SALT_LENGTH + IV_LENGTH
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH

// الحصول على مفتاح التشفير من متغيرات البيئة
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error("ENCRYPTION_KEY is not set in environment variables")
  }
  
  // إذا كان المفتاح نص، نحوله إلى buffer 32 bytes
  if (key.length === 64) {
    // hex encoded key
    return Buffer.from(key, "hex")
  } else if (key.length === 32) {
    // raw key
    return Buffer.from(key)
  } else {
    // derive key from password using PBKDF2
    return crypto.pbkdf2Sync(key, "fat2fit-salt", 100000, 32, "sha512")
  }
}

/**
 * تشفير بيانات حساسة (مثل أرقام الهواتف، الأسماء، إلخ)
 */
export function encryptData(text: string): string {
  if (!text) return text
  
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")
    const tag = cipher.getAuthTag()
    
    // دمج: salt + iv + tag + encrypted
    return Buffer.concat([
      iv,
      tag,
      Buffer.from(encrypted, "hex")
    ]).toString("base64")
  } catch (error) {
    console.error("Error encrypting data:", error)
    throw new Error("Failed to encrypt data")
  }
}

/**
 * فك تشفير البيانات
 */
export function decryptData(encryptedText: string): string {
  if (!encryptedText) return encryptedText
  
  try {
    const key = getEncryptionKey()
    const data = Buffer.from(encryptedText, "base64")
    
    // استخراج: iv, tag, encrypted
    const iv = data.subarray(0, IV_LENGTH)
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH)
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, undefined, "utf8")
    decrypted += decipher.final("utf8")
    
    return decrypted
  } catch (error) {
    console.error("Error decrypting data:", error)
    throw new Error("Failed to decrypt data")
  }
}

/**
 * Hash بيانات للبحث (بدون إمكانية فك التشفير)
 */
export function hashForSearch(text: string): string {
  if (!text) return ""
  return crypto.createHash("sha256").update(text).digest("hex")
}

/**
 * تشفير رقم هاتف للبحث
 */
export function encryptPhone(phone: string): string {
  return encryptData(phone)
}

/**
 * Hash رقم هاتف للبحث
 */
export function hashPhone(phone: string): string {
  return hashForSearch(phone)
}

/**
 * تشفير اسم العميلة
 */
export function encryptName(name: string): string {
  return encryptData(name)
}

/**
 * Masking للبيانات الحساسة في الـ logs
 */
export function maskSensitiveData(text: string): string {
  if (!text || text.length < 4) return "****"
  
  if (text.length <= 8) {
    return text.substring(0, 2) + "****" + text.substring(text.length - 2)
  }
  
  return text.substring(0, 2) + "****" + text.substring(text.length - 4)
}

/**
 * Masking رقم الهاتف
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return "****"
  return phone.substring(0, 3) + "****" + phone.substring(phone.length - 2)
}


