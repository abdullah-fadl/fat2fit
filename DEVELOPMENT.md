# 🔧 دليل التطوير المحلي

## قاعدة البيانات

### للإنتاج (Render - PostgreSQL)
الـ schema مضبوط على PostgreSQL وهو الإعداد الافتراضي.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### للتطوير المحلي (SQLite - اختياري)

إذا كنت تريد استخدام SQLite للتطوير المحلي:

1. **غيّر الـ schema مؤقتاً:**
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

2. **في `.env` المحلي:**
```env
DATABASE_URL="file:./dev.db"
```

3. **استخدم `db push` بدلاً من `migrate`:**
```bash
npx prisma db push
```

⚠️ **مهم**: قبل الرفع على Render، أعد الـ schema إلى PostgreSQL!

---

## متغيرات البيئة المطلوبة

### للتطوير المحلي (`.env`):
```env
# Database (PostgreSQL أو SQLite للتطوير)
DATABASE_URL="postgresql://user:password@localhost:5432/fat2fit"
# أو للتطوير: DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:80"
NEXTAUTH_SECRET="your-secret-key"

# ZKTeco (disabled for demo)
ENABLE_ZKTECO=false

# Encryption Key
ENCRYPTION_KEY="your-32-character-encryption-key"
```

### للإنتاج (Render Environment Variables):
```env
DATABASE_URL="postgresql://..."  # من Render PostgreSQL
NEXTAUTH_URL="https://your-app.onrender.com"
NEXTAUTH_SECRET="production-secret-key"
ENABLE_ZKTECO=false
ENCRYPTION_KEY="production-encryption-key"
```

---

## الأوامر المفيدة

```bash
# توليد Prisma Client
npx prisma generate

# تطبيق migrations (PostgreSQL)
npx prisma migrate deploy

# تطبيق schema مباشرة (SQLite للتطوير)
npx prisma db push

# فتح Prisma Studio
npx prisma studio
```

---

## قبل الرفع على Render

✅ تأكد من:
1. `provider = "postgresql"` في `schema.prisma`
2. `DATABASE_URL` في Render Environment Variables يشير إلى PostgreSQL
3. جميع متغيرات البيئة موجودة في Render

