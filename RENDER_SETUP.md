# 🚀 دليل إعداد النظام على Render

## خطوات إعداد PostgreSQL على Render

### 1. إنشاء قاعدة بيانات PostgreSQL على Render:

1. اذهب إلى [Render Dashboard](https://dashboard.render.com)
2. انقر على **"New +"** → اختر **"PostgreSQL"**
3. املأ المعلومات:
   - **Name:** `fat2fit-db` (أو أي اسم تفضله)
   - **Database:** `fat2fit`
   - **User:** `fat2fit_user` (أو اسم تلقائي)
   - **Region:** اختر الأقرب لك
   - **Plan:** `Free` (للبداية) أو `Starter` (للاستخدام الفعلي)
4. انقر على **"Create Database"**

### 2. نسخ رابط الاتصال:

بعد إنشاء قاعدة البيانات:
1. افتح قاعدة البيانات الجديدة
2. اذهب إلى قسم **"Connections"**
3. انسخ **"Internal Database URL"** (أو External Database URL حسب الحاجة)
4. مثال:
   ```
   postgresql://user:password@dpg-xxxxx-a.oregon-postgres.render.com/fat2fit
   ```

### 3. إضافة متغير البيئة في تطبيق Render:

1. اذهب إلى تطبيق Next.js على Render
2. انقر على **"Environment"**
3. أضف/عدّل متغير البيئة:
   - **Key:** `DATABASE_URL`
   - **Value:** رابط PostgreSQL الذي نسخته
4. انقر **"Save Changes"**

### 4. تحديث Prisma Schema:

تم تحديث `prisma/schema.prisma` لاستخدام PostgreSQL:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 5. تشغيل Migration على Render:

بعد تحديث متغير البيئة، ستحتاج إلى تشغيل:

**Option 1: عبر Render Shell**
1. اذهب إلى تطبيقك على Render
2. انقر على **"Shell"**
3. شغّل:
   ```bash
   npx prisma migrate deploy
   ```

**Option 2: Build Command في Render (موصى به) ✅**

تم تحديث `package.json` تلقائياً! الآن Build Command في Render:
```bash
npm install && npm run build
```

سيقوم بـ:
1. `postinstall` → `prisma generate` (تلقائياً)
2. `build` → `prisma generate && prisma migrate deploy && next build`

### 6. إنشاء البيانات الأولية:

بعد نشر التطبيق، افتح:
```
https://your-app.onrender.com/api/setup
```

سيتم إنشاء:
- المستخدمين الافتراضيين
- الباقات الافتراضية

---

## بيانات الدخول:

### 🔐 تسجيل دخول تجريبي (يعمل بدون قاعدة بيانات):
- **البريد:** `demo@fat2fit.com`
- **كلمة المرور:** `123456`

### 🔐 تسجيل دخول من قاعدة البيانات (بعد تشغيل /api/setup):
- **البريد:** `admin@fat2fit.com`
- **كلمة المرور:** `admin123`

---

## متغيرات البيئة المطلوبة على Render:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-app.onrender.com
NODE_ENV=production
```

---

## Build Settings على Render:

- **Build Command:** `npm install && npm run build`
  - سيتم تشغيل `prisma generate` تلقائياً (postinstall)
  - ثم `prisma migrate deploy` (ضمن build script)
- **Start Command:** `npm start`
- **Environment:** `Node`
- **Node Version:** `20` (أو أحدث)

---

## ملاحظات مهمة:

1. **PostgreSQL على Render Free:**
   - قاعدة البيانات تنام بعد 90 يوم من عدم الاستخدام
   - البيانات تُحذف بعد 90 يوم من النوم
   - للحفظ الدائم، استخدم خطة مدفوعة

2. **Security:**
   - استخدم Internal Database URL داخل Render (أكثر أماناً)
   - External Database URL للوصول من خارج Render

3. **Backup:**
   - احفظ نسخة احتياطية من DATABASE_URL
   - استخدم Render's Database Backup feature

---

## استكشاف الأخطاء:

### إذا فشل الاتصال:
- تأكد من استخدام Internal Database URL داخل Render
- تحقق من أن قاعدة البيانات نشطة (ليست نائمة)
- تحقق من متغيرات البيئة

### إذا فشلت Migration:
- تأكد من تشغيل `prisma generate` قبل `prisma migrate deploy`
- تحقق من الصلاحيات في قاعدة البيانات

---

✅ **بعد الانتهاء من الإعداد، النظام سيعمل بشكل كامل على Render!**

