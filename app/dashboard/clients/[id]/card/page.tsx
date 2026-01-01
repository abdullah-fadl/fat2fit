"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowRight, Printer, Download } from "lucide-react"
import * as QRCode from "qrcode"

interface Client {
  id: string
  name: string
  membershipNumber: string
  phone: string
  qrCode: string | null
}

export default function ClientCardPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const clientId = params?.id as string
    if (clientId) {
      fetchClientAndGenerateQR(clientId)
    }
  }, [params?.id])

  const fetchClientAndGenerateQR = async (clientId: string) => {
    try {
      setLoading(true)
      setError("")

      // Fetch client
      const clientRes = await fetch(`/api/clients/${clientId}`)
      if (!clientRes.ok) {
        setError("العميلة غير موجودة")
        return
      }

      const clientData = await clientRes.json()
      setClient(clientData)

      // Generate QR Code
      const qrData = clientData.membershipNumber || clientData.qrCode || `MEM-${clientData.id}`
      const qrCode = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
      setQrCodeUrl(qrCode)

      // Update client QR code if not exists
      if (!clientData.qrCode) {
        await fetch(`/api/clients/generate-qr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
        })
      }
    } catch (error) {
      console.error("Error fetching client:", error)
      setError("حدث خطأ أثناء جلب البيانات")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
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

  if (error || !client) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowRight className="h-5 w-5" />
          العودة
        </button>
        <div className="rounded-lg bg-red-50 p-4 text-red-800">
          {error || "العميلة غير موجودة"}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowRight className="h-5 w-5" />
          العودة
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600"
        >
          <Printer className="h-5 w-5" />
          طباعة
        </button>
      </div>

      {/* Membership Card */}
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 p-8 shadow-2xl print:shadow-none">
          {/* Card Header */}
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Fat2Fit</h1>
            <p className="text-pink-100 text-sm">بطاقة عضوية</p>
          </div>

          {/* Client Info */}
          <div className="mb-6 rounded-xl bg-white/95 p-6 backdrop-blur-sm">
            <div className="mb-4 text-center">
              <div className="mb-4 inline-block">
                <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {client.name.charAt(0)}
                  </span>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
              <p className="mt-1 text-lg text-gray-600">#{client.membershipNumber}</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="mb-6 rounded-xl bg-white/95 p-6 backdrop-blur-sm">
            <div className="flex flex-col items-center">
              {qrCodeUrl && (
                <div className="mb-4 rounded-lg bg-white p-4">
                  <img src={qrCodeUrl} alt="QR Code" className="h-48 w-48" />
                </div>
              )}
              <p className="text-center text-sm font-medium text-gray-700">
                رقم العضوية: {client.membershipNumber}
              </p>
              <p className="mt-1 text-center text-xs text-gray-500">
                استخدم هذا الرمز لتسجيل الدخول
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-pink-100">
              © {new Date().getFullYear()} Fat2Fit. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 50%;
            top: 0;
            transform: translateX(-50%);
            width: 100%;
            max-width: 400px;
          }
          button, a {
            display: none !important;
          }
          @page {
            margin: 0;
            size: A4 landscape;
          }
        }
      `}</style>
    </div>
  )
}

