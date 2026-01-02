# حل سريع لتشغيل النظام

## المشكلة
Prisma Client يتم توليده كـ TypeScript files، وNext.js يحتاج إلى ملفات JavaScript صحيحة.

## الحل

### 1. إعادة تثبيت Prisma Client
```bash
rm -rf node_modules/@prisma node_modules/.prisma .next
npm install
npm run db:generate
```

### 2. إنشاء المستخدمين عبر المتصفح
بعد تشغيل النظام، افتح في المتصفح:
```
http://localhost:3000/api/setup
```

سيتم إنشاء:
- المستخدمين (admin@fat2fit.com / admin123)
- الباقات الافتراضية

### 3. تسجيل الدخول
استخدم:
- البريد: `admin@fat2fit.com`
- كلمة المرور: `admin123`

## تشغيل النظام
```bash
npm run dev
```

ثم افتح: `http://localhost:3000`













