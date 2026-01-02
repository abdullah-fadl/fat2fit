import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    // Create default admin user
    const hashedPassword = await bcrypt.hash("admin123", 10)
    
    const admin = await prisma.user.upsert({
      where: { email: "admin@fat2fit.com" },
      update: {},
      create: {
        name: "مديرة النظام",
        email: "admin@fat2fit.com",
        password: hashedPassword,
        role: "ADMIN",
        isActive: true,
      },
    })

    // Create reception user
    const receptionPassword = await bcrypt.hash("reception123", 10)
    
    const reception = await prisma.user.upsert({
      where: { email: "reception@fat2fit.com" },
      update: {},
      create: {
        name: "موظفة الاستقبال",
        email: "reception@fat2fit.com",
        password: receptionPassword,
        role: "RECEPTION",
        isActive: true,
      },
    })

    // Create subscription packages
    const packages = [
      {
        name: "Monthly",
        nameAr: "اشتراك شهري",
        type: "MONTHLY",
        duration: 30,
        price: 500,
        visits: null,
        isVIP: false,
        description: "اشتراك لمدة شهر واحد",
      },
      {
        name: "Quarterly",
        nameAr: "اشتراك ربع سنوي",
        type: "QUARTERLY",
        duration: 90,
        price: 1350,
        visits: null,
        isVIP: false,
        description: "اشتراك لمدة 3 أشهر - خصم 10%",
      },
      {
        name: "Yearly",
        nameAr: "اشتراك سنوي",
        type: "YEARLY",
        duration: 365,
        price: 5000,
        visits: null,
        isVIP: false,
        description: "اشتراك لمدة سنة كاملة - خصم 20%",
      },
      {
        name: "VIP Monthly",
        nameAr: "اشتراك VIP شهري",
        type: "VIP",
        duration: 30,
        price: 1000,
        visits: null,
        isVIP: true,
        description: "اشتراك VIP شامل جميع الخدمات",
      },
      {
        name: "10 Visits",
        nameAr: "باقة 10 زيارات",
        type: "VISIT_BASED",
        duration: 60,
        price: 400,
        visits: 10,
        isVIP: false,
        description: "10 زيارات صالحة لمدة شهرين",
      },
    ]

    const createdPackages = []
    for (const pkg of packages) {
      const existing = await prisma.subscriptionPackage.findFirst({
        where: { name: pkg.name },
      })

      if (!existing) {
        const created = await prisma.subscriptionPackage.create({
          data: pkg,
        })
        createdPackages.push(created.nameAr)
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم إنشاء المستخدمين والباقات بنجاح",
      users: {
        admin: admin.email,
        reception: reception.email,
      },
      packages: createdPackages,
    })
  } catch (error: any) {
    console.error("Error setting up:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "حدث خطأ أثناء الإعداد",
      },
      { status: 500 }
    )
  }
}













