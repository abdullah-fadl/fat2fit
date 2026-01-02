# ⚡ إصلاح سريع لمشكلة SQLite على Render

## المشكلة:
```
Error code 14: Unable to open the database file
```

## ✅ الحل (خطوات سريعة):

### 1. إنشاء PostgreSQL على Render:
1. Render Dashboard → **New +** → **PostgreSQL**
2. Name: `fat2fit-db`
3. Plan: `Free` (للبداية)
4. **Create Database**

### 2. نسخ رابط الاتصال:
من صفحة قاعدة البيانات:
- انسخ **"Internal Database URL"**
- مثال: `postgresql://user:pass@dpg-xxx.oregon-postgres.render.com/fat2fit`

### 3. إضافة متغير البيئة:
في تطبيق Next.js على Render:
- **Environment** → أضف/عدّل:
  - Key: `DATABASE_URL`
  - Value: رابط PostgreSQL (اللي نسخته)

### 4. إعادة النشر:
- Render سيُعيد البناء تلقائياً
- أو اضغط **Manual Deploy** → **Deploy latest commit**

### 5. بعد النشر:
افتح:
```
https://your-app.onrender.com/api/setup
```

---

## ✅ تم تحديث الكود:

1. ✅ `prisma/schema.prisma` → تغيير إلى `postgresql`
2. ✅ `package.json` → إضافة `prisma migrate deploy` في build
3. ✅ `migration_lock.toml` → تغيير إلى `postgresql`

---

## 🔐 بيانات الدخول:

### تسجيل دخول فوري (ديمو):
- **Email:** `demo@fat2fit.com`
- **Password:** `123456`

### بعد تشغيل `/api/setup`:
- **Email:** `admin@fat2fit.com`
- **Password:** `admin123`

---

✅ **بعد إضافة DATABASE_URL على Render، سيُعاد البناء تلقائياً وسيعمل النظام!**


