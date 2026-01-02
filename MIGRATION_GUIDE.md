# 📦 دليل Migration للانتقال من SQLite إلى PostgreSQL

## ✅ تم تحديث الملفات:

1. ✅ `prisma/schema.prisma` → `provider = "postgresql"`
2. ✅ `prisma/migrations/migration_lock.toml` → `provider = "postgresql"`
3. ✅ `package.json` → Build script محدث

---

## 🚀 خطوات النشر على Render:

### 1. إنشاء PostgreSQL:
- Render Dashboard → New → PostgreSQL
- انسخ **Internal Database URL**

### 2. إضافة Environment Variable:
في تطبيق Next.js على Render:
- Key: `DATABASE_URL`
- Value: `postgresql://user:pass@host/database`

### 3. Build Command (موجود تلقائياً):
```bash
npm install && npm run build
```

سيقوم بـ:
- `prisma generate` (تلقائياً في postinstall)
- `prisma migrate deploy` (أو `prisma db push` إذا فشل)
- `next build`

---

## ⚠️ ملاحظة مهمة:

إذا فشل `prisma migrate deploy` (لأن migrations مكتوبة لـ SQLite)،
سيستخدم النظام `prisma db push` تلقائياً لإنشاء الجداول.

**بعد النشر الأول، يمكنك:**
- استخدام `prisma migrate deploy` فقط
- أو إنشاء migrations جديدة من PostgreSQL

---

## 🔄 إنشاء Migrations جديدة (اختياري):

إذا أردت migrations نظيفة لـ PostgreSQL:

```bash
# محلياً (بعد تحديث DATABASE_URL لـ PostgreSQL)
npx prisma migrate reset
npx prisma migrate dev --name init_postgresql
```

ثم ارفع migrations الجديدة إلى GitHub.

---

✅ **النظام جاهز للنشر! فقط أضف DATABASE_URL على Render.**


