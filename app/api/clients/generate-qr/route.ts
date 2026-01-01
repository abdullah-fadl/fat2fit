import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import * as QRCode from "qrcode"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const body = await req.json()
    const { clientId } = body

    if (!clientId) {
      return NextResponse.json({ error: "معرف العميلة مطلوب" }, { status: 400 })
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return NextResponse.json({ error: "العميلة غير موجودة" }, { status: 404 })
    }

    // Generate QR Code data (membership number)
    const qrData = client.membershipNumber

    // Generate QR Code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    // Update client with QR code if not exists
    if (!client.qrCode) {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          qrCode: qrData,
        },
      })
    }

    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      membershipNumber: client.membershipNumber,
      clientName: client.name,
    })
  } catch (error) {
    console.error("Error generating QR code:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء توليد QR Code" },
      { status: 500 }
    )
  }
}

