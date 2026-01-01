/**
 * محول التواريخ من الهجري إلى الميلادي
 */

// @ts-ignore - hijri-date doesn't have TypeScript types
import HijriDateClass from "hijri-date"
const HijriDate = HijriDateClass.default || HijriDateClass

// أسماء الأشهر الهجرية
export const HIJRI_MONTHS = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
]

/**
 * تحويل التاريخ الهجري إلى ميلادي
 * @param day اليوم (1-30)
 * @param monthName اسم الشهر الهجري
 * @param year السنة الهجرية
 * @returns التاريخ الميلادي بصيغة YYYY-MM-DD
 */
export function hijriToGregorian(
  day: number,
  monthName: string,
  year: number
): string {
  // العثور على رقم الشهر
  const monthIndex = HIJRI_MONTHS.findIndex(
    (m) => m === monthName || m.includes(monthName)
  )

  if (monthIndex === -1) {
    throw new Error(`الشهر الهجري غير صحيح: ${monthName}`)
  }

  const month = monthIndex + 1

  try {
    // استخدام مكتبة hijri-date للتحويل الدقيق
    const hijriDate = new HijriDate(year, month, day)
    const gregorianDate = hijriDate.toGregorian()

    // تنسيق التاريخ بصيغة YYYY-MM-DD
    const yearStr = String(gregorianDate.getFullYear())
    const monthStr = String(gregorianDate.getMonth() + 1).padStart(2, "0")
    const dayStr = String(gregorianDate.getDate()).padStart(2, "0")

    return `${yearStr}-${monthStr}-${dayStr}`
  } catch (error) {
    console.error("Error converting hijri date:", error)
    throw error
  }
}

/**
 * تنسيق التاريخ بصيغة YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * تحليل نص التاريخ الهجري (مثل: "11 رجب 1447")
 * @param hijriText النص المدخل
 * @returns { day, monthName, year } أو null
 */
export function parseHijriDate(hijriText: string): {
  day: number
  monthName: string
  year: number
} | null {
  // إزالة المسافات الزائدة
  const cleaned = hijriText.trim().replace(/\s+/g, " ")

  // البحث عن نمط: يوم شهر سنة
  // أنماط محتملة:
  // "11 رجب 1447"
  // "11 رجب 1447 هـ"
  // "١١ رجب ١٤٤٧" (أرقام عربية)
  
  // تحويل الأرقام العربية إلى إنجليزية إذا لزم
  const arabicToEnglish = (str: string) => {
    const arabic = "٠١٢٣٤٥٦٧٨٩"
    const english = "0123456789"
    return str
      .split("")
      .map((char) => {
        const index = arabic.indexOf(char)
        return index !== -1 ? english[index] : char
      })
      .join("")
  }

  const normalized = arabicToEnglish(cleaned)

  // استخراج الأرقام والأشهر
  const parts = normalized.split(/\s+/)

  if (parts.length < 3) {
    return null
  }

  // اليوم (الأول)
  const dayStr = parts[0].replace(/[^0-9]/g, "")
  const day = parseInt(dayStr, 10)

  // الشهر (الثاني)
  const monthName = parts[1]

  // السنة (الثالث، قد يحتوي على "هـ")
  const yearStr = parts[2].replace(/[^0-9]/g, "")
  const year = parseInt(yearStr, 10)

  if (isNaN(day) || isNaN(year) || day < 1 || day > 30 || year < 1300) {
    return null
  }

  return { day, monthName, year }
}

/**
 * تحويل نص التاريخ الهجري إلى ميلادي مباشرة
 */
export function convertHijriTextToGregorian(hijriText: string): string | null {
  try {
    const parsed = parseHijriDate(hijriText)
    if (!parsed) {
      return null
    }
    return hijriToGregorian(parsed.day, parsed.monthName, parsed.year)
  } catch (error) {
    console.error("Error converting hijri date:", error)
    return null
  }
}

