import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"
import { sendMessage, replaceVariables } from "@/lib/messaging"
import { logUpdate } from "@/lib/audit-log"

// POST - بدء إرسال حملة
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const campaign = await prisma.campaign.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!campaign) {
      return NextResponse.json({ error: "الحملة غير موجودة" }, { status: 404 })
    }

    if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "يمكن إرسال الحملة فقط إذا كانت في حالة مسودة أو مجدولة" },
        { status: 400 }
      )
    }

    // بدء إرسال الرسائل في الخلفية
    sendCampaignMessages(campaign.id).catch(console.error)

    const userId = (session.user as any)?.id || ""
    await logUpdate({
      userId,
      entityType: "Campaign",
      entityId: campaign.id,
      description: `تم بدء إرسال الحملة: ${campaign.name}`,
    })

    return NextResponse.json({ success: true, message: "تم بدء إرسال الحملة" })
  } catch (error: any) {
    console.error("Error starting campaign:", error)
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء بدء الحملة" },
      { status: 500 }
    )
  }
}

// دالة مساعدة لإرسال رسائل الحملة (نفس الدالة من campaigns/route.ts)
async function sendCampaignMessages(campaignId: string) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      throw new Error("Campaign not found")
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "RUNNING", startedAt: new Date() },
    })

    const recipients = await getCampaignRecipients(campaign)

    let sentCount = 0
    let failedCount = 0

    for (const recipient of recipients) {
      try {
        const content = replaceVariables(campaign.content, {
          name: recipient.name,
          membershipNumber: recipient.membershipNumber,
          phone: recipient.phone,
          days: recipient.daysUntilExpiry || "",
          packageName: recipient.packageName || "",
        })

        const result = await sendMessage({
          phoneNumber: recipient.phone,
          content,
          channel: campaign.channel as "SMS" | "WHATSAPP" | "EMAIL",
          recipientName: recipient.name,
        })

        await prisma.message.create({
          data: {
            campaignId: campaign.id,
            clientId: recipient.clientId,
            type: campaign.channel,
            channel: campaign.channel,
            content,
            status: result.status,
            errorMessage: result.error || null,
            phoneNumber: recipient.phone,
            recipientName: recipient.name,
            sentAt: result.success ? new Date() : null,
          },
        })

        if (result.success) {
          sentCount++
        } else {
          failedCount++
        }

        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error: any) {
        console.error(`Error sending message to ${recipient.phone}:`, error)
        failedCount++

        await prisma.message.create({
          data: {
            campaignId: campaign.id,
            clientId: recipient.clientId,
            type: campaign.channel,
            channel: campaign.channel,
            content: replaceVariables(campaign.content, {
              name: recipient.name,
              membershipNumber: recipient.membershipNumber,
              phone: recipient.phone,
            }),
            status: "FAILED",
            errorMessage: error.message,
            phoneNumber: recipient.phone,
            recipientName: recipient.name,
          },
        })
      }
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        totalRecipients: recipients.length,
        sentCount,
        failedCount,
        deliveredCount: sentCount,
      },
    })
  } catch (error: any) {
    console.error("Error sending campaign messages:", error)
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "CANCELLED",
      },
    })
  }
}

async function getCampaignRecipients(campaign: any): Promise<any[]> {
  const recipients: any[] = []

  switch (campaign.targetType) {
    case "ALL_CLIENTS":
      const allClients = await prisma.client.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          phone: true,
          membershipNumber: true,
        },
      })
      recipients.push(...allClients.map((c) => ({ ...c, clientId: c.id })))
      break

    case "ACTIVE_SUBSCRIPTIONS":
      const activeSubscriptions = await prisma.subscription.findMany({
        where: { status: "ACTIVE" },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              membershipNumber: true,
            },
          },
          package: {
            select: {
              nameAr: true,
            },
          },
        },
      })
      recipients.push(
        ...activeSubscriptions.map((sub) => ({
          clientId: sub.client.id,
          name: sub.client.name,
          phone: sub.client.phone,
          membershipNumber: sub.client.membershipNumber,
          packageName: sub.package.nameAr,
        }))
      )
      break

    case "EXPIRING_SUBSCRIPTIONS":
      const days = [7, 3, 1]
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const day of days) {
        const expiryDate = new Date(today)
        expiryDate.setDate(expiryDate.getDate() + day)

        const expiringSubs = await prisma.subscription.findMany({
          where: {
            status: "ACTIVE",
            endDate: {
              gte: new Date(expiryDate.getTime() - 86400000),
              lte: new Date(expiryDate.getTime() + 86400000),
            },
          },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                phone: true,
                membershipNumber: true,
              },
            },
            package: {
              select: {
                nameAr: true,
              },
            },
          },
        })

        recipients.push(
          ...expiringSubs.map((sub) => ({
            clientId: sub.client.id,
            name: sub.client.name,
            phone: sub.client.phone,
            membershipNumber: sub.client.membershipNumber,
            packageName: sub.package.nameAr,
            daysUntilExpiry: day,
          }))
        )
      }
      break

    case "SPECIFIC_CLIENTS":
      if (campaign.filters) {
        const filters = JSON.parse(campaign.filters)
        const clientIds = filters.clientIds || []
        const specificClients = await prisma.client.findMany({
          where: {
            id: { in: clientIds },
            status: "ACTIVE",
          },
          select: {
            id: true,
            name: true,
            phone: true,
            membershipNumber: true,
          },
        })
        recipients.push(...specificClients.map((c) => ({ ...c, clientId: c.id })))
      }
      break
  }

  const uniqueRecipients = Array.from(
    new Map(recipients.map((r) => [r.clientId, r])).values()
  )

  return uniqueRecipients
}


