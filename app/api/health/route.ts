// @ts-nocheck - هذا الملف معطل مؤقتاً لأن Health models غير موجودة في schema
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/auth-utils"
import { PERMISSIONS } from "@/lib/permissions"

export async function GET(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.HEALTH_VIEW)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const clientId = searchParams.get("clientId")

    if (!clientId) {
      return NextResponse.json({ error: "معرف العميلة مطلوب" }, { status: 400 })
    }

    // هذه الميزة غير مفعلة حالياً - Health models غير موجودة في schema
    return NextResponse.json(
      { error: "ميزة التقييم الصحي غير مفعلة حالياً" },
      { status: 501 }
    )

    /* الكود أدناه معطل مؤقتاً
    const assessments = await prisma.healthAssessment.findMany({
      where: { clientId },
      orderBy: { assessmentDate: "desc" },
    })

    // @ts-ignore - Health models not in schema
    const measurements = await prisma.bodyMeasurement.findMany({
      where: { clientId },
      orderBy: { measurementDate: "desc" },
    })

    // @ts-ignore - Health models not in schema
    const goals = await prisma.goal.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    })

    // @ts-ignore - Health models not in schema
    const photos = await prisma.beforeAfterPhoto.findMany({
      where: { clientId },
      orderBy: { takenDate: "desc" },
    })

    return NextResponse.json({
      assessments,
      measurements,
      goals,
      photos,
    })
  } catch (error) {
    console.error("Error fetching health data:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب البيانات" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const permCheck = await requirePermission(PERMISSIONS.HEALTH_CREATE)
    if (permCheck.error) {
      return permCheck.response
    }

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const body = await req.json()
    const { type, clientId, data } = body

    // هذه الميزة غير مفعلة حالياً - Health models غير موجودة في schema
    return NextResponse.json(
      { error: "ميزة التقييم الصحي غير مفعلة حالياً" },
      { status: 501 }
    )

    /* الكود أدناه معطل مؤقتاً
    if (type === "assessment") {
      // @ts-ignore - Health models not in schema
      const assessment = await prisma.healthAssessment.create({
        data: {
          clientId,
          assessmentDate: data.assessmentDate ? new Date(data.assessmentDate) : new Date(),
          weight: data.weight ? parseFloat(data.weight) : null,
          bodyFatPercent: data.bodyFatPercent ? parseFloat(data.bodyFatPercent) : null,
          muscleMass: data.muscleMass ? parseFloat(data.muscleMass) : null,
          bmi: data.bmi ? parseFloat(data.bmi) : null,
          chest: data.chest ? parseFloat(data.chest) : null,
          waist: data.waist ? parseFloat(data.waist) : null,
          hips: data.hips ? parseFloat(data.hips) : null,
          arms: data.arms ? parseFloat(data.arms) : null,
          thighs: data.thighs ? parseFloat(data.thighs) : null,
          bloodPressure: data.bloodPressure || null,
          restingHeartRate: data.restingHeartRate ? parseInt(data.restingHeartRate) : null,
          notes: data.notes || null,
          assessedBy: (session.user as any)?.name || null,
        },
      })
      return NextResponse.json(assessment, { status: 201 })
    } else if (type === "measurement") {
      // @ts-ignore - Health models not in schema
      const measurement = await prisma.bodyMeasurement.create({
        data: {
          clientId,
          measurementDate: data.measurementDate ? new Date(data.measurementDate) : new Date(),
          weight: parseFloat(data.weight),
          bodyFatPercent: data.bodyFatPercent ? parseFloat(data.bodyFatPercent) : null,
          muscleMass: data.muscleMass ? parseFloat(data.muscleMass) : null,
          waterPercent: data.waterPercent ? parseFloat(data.waterPercent) : null,
          chest: data.chest ? parseFloat(data.chest) : null,
          waist: data.waist ? parseFloat(data.waist) : null,
          hips: data.hips ? parseFloat(data.hips) : null,
          arms: data.arms ? parseFloat(data.arms) : null,
          thighs: data.thighs ? parseFloat(data.thighs) : null,
          notes: data.notes || null,
        },
      })
      return NextResponse.json(measurement, { status: 201 })
    } else if (type === "goal") {
      // @ts-ignore - Health models not in schema
      const goal = await prisma.goal.create({
        data: {
          clientId,
          title: data.title,
          description: data.description || null,
          targetValue: data.targetValue ? parseFloat(data.targetValue) : null,
          currentValue: data.currentValue ? parseFloat(data.currentValue) : null,
          unit: data.unit || null,
          targetDate: data.targetDate ? new Date(data.targetDate) : null,
          category: data.category || null,
          status: "ACTIVE",
        },
      })
      return NextResponse.json(goal, { status: 201 })
    } else if (type === "photo") {
      // @ts-ignore - Health models not in schema
      const photo = await prisma.beforeAfterPhoto.create({
        data: {
          clientId,
          photoType: data.photoType,
          imageUrl: data.imageUrl,
          description: data.description || null,
          takenDate: data.takenDate ? new Date(data.takenDate) : new Date(),
        },
      })
      return NextResponse.json(photo, { status: 201 })
    }

    return NextResponse.json({ error: "نوع غير صحيح" }, { status: 400 })
    */
  } catch (error) {
    console.error("Error creating health data:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء حفظ البيانات" },
      { status: 500 }
    )
  }
}

