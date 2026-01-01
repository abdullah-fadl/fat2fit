const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 بدء إنشاء المستخدمين...')

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fat2fit.com' },
    update: {},
    create: {
      name: 'مديرة النظام',
      email: 'admin@fat2fit.com',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log('✅ تم إنشاء المستخدم الافتراضي:', admin.email, '(كلمة المرور: admin123)')

  // Create reception user
  const receptionPassword = await bcrypt.hash('reception123', 10)
  
  const reception = await prisma.user.upsert({
    where: { email: 'reception@fat2fit.com' },
    update: {},
    create: {
      name: 'موظفة الاستقبال',
      email: 'reception@fat2fit.com',
      password: receptionPassword,
      role: 'RECEPTION',
      isActive: true,
    },
  })

  console.log('✅ تم إنشاء موظفة الاستقبال:', reception.email, '(كلمة المرور: reception123)')

  // Create subscription packages
  const packages = [
    {
      name: 'Monthly',
      nameAr: 'اشتراك شهري',
      type: 'MONTHLY',
      duration: 30,
      price: 500,
      visits: null,
      isVIP: false,
      description: 'اشتراك لمدة شهر واحد',
    },
    {
      name: 'Quarterly',
      nameAr: 'اشتراك ربع سنوي',
      type: 'QUARTERLY',
      duration: 90,
      price: 1350,
      visits: null,
      isVIP: false,
      description: 'اشتراك لمدة 3 أشهر - خصم 10%',
    },
    {
      name: 'Yearly',
      nameAr: 'اشتراك سنوي',
      type: 'YEARLY',
      duration: 365,
      price: 5000,
      visits: null,
      isVIP: false,
      description: 'اشتراك لمدة سنة كاملة - خصم 20%',
    },
    {
      name: 'VIP Monthly',
      nameAr: 'اشتراك VIP شهري',
      type: 'VIP',
      duration: 30,
      price: 1000,
      visits: null,
      isVIP: true,
      description: 'اشتراك VIP شامل جميع الخدمات',
    },
    {
      name: '10 Visits',
      nameAr: 'باقة 10 زيارات',
      type: 'VISIT_BASED',
      duration: 60,
      price: 400,
      visits: 10,
      isVIP: false,
      description: '10 زيارات صالحة لمدة شهرين',
    },
  ]

  for (const pkg of packages) {
    const existing = await prisma.subscriptionPackage.findFirst({
      where: { name: pkg.name },
    })

    if (!existing) {
      await prisma.subscriptionPackage.create({
        data: pkg,
      })
      console.log(`✅ تم إنشاء الباقة: ${pkg.nameAr}`)
    }
  }

  console.log('✨ تم الانتهاء!')
}

main()
  .catch((e) => {
    console.error('❌ خطأ أثناء التهيئة:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })












