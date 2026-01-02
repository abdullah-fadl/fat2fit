# إعداد قاعدة البيانات السحابية

## أنواع قواعد البيانات المدعومة

المشروع يدعم التحويل من SQLite إلى:

### 1. PostgreSQL (موصى به)
- **Supabase** (مجاني وممتاز)
- **Neon** (مجاني)
- **Railway** (مجاني)
- **Render** (مجاني)
- **Vercel Postgres** (مجاني)
- **AWS RDS PostgreSQL**
- **Azure Database for PostgreSQL**

### 2. MySQL
- **PlanetScale** (مجاني)
- **Railway MySQL**
- **AWS RDS MySQL**
- **Azure Database for MySQL**

### 3. SQL Server
- **Azure SQL Database**

---

## خطوات التحويل إلى PostgreSQL (Supabase مثال)

### الخطوة 1: إنشاء قاعدة بيانات على Supabase

1. افتح [Supabase](https://supabase.com)
2. سجل حساب جديد (مجاني)
3. أنشئ مشروع جديد
4. اذهب إلى Settings → Database
5. انسخ **Connection String** (سيكون مثل):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### الخطوة 2: تحديث schema.prisma

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### الخطوة 3: تحديث ملف .env

أضف connection string إلى ملف `.env`:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
```

### الخطوة 4: تشغيل Migration

```bash
npm run db:generate
npm run db:migrate
```

---

## خطوات التحويل إلى MySQL (PlanetScale مثال)

### الخطوة 1: إنشاء قاعدة بيانات على PlanetScale

1. افتح [PlanetScale](https://planetscale.com)
2. سجل حساب جديد (مجاني)
3. أنشئ database جديد
4. اذهب إلى Connect → Get connection strings
5. انسخ **Connection string**:
   ```
   mysql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslaccept=strict
   ```

### الخطوة 2: تحديث schema.prisma

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

**ملاحظة:** SQLite و MySQL لديهما بعض الاختلافات:
- MySQL لا يدعم `@default(uuid())` - يجب استخدام `@default(uuid())` أو حذفه
- بعض أنواع البيانات مختلفة

### الخطوة 3: تحديث ملف .env

```env
DATABASE_URL="mysql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslaccept=strict"
```

### الخطوة 4: تشغيل Migration

```bash
npm run db:generate
npm run db:migrate
```

---

## ملاحظات مهمة

### 1. نسخ البيانات من SQLite إلى السحابة

إذا كان لديك بيانات موجودة في SQLite وتريد نقلها:

```bash
# تصدير البيانات من SQLite
npx prisma db pull

# أو استخدام أداة مثل DB Browser for SQLite لتصدير البيانات
```

### 2. تحديث Prisma Schema

بعد تغيير نوع قاعدة البيانات، قد تحتاج لتعديل بعض الحقول:

#### PostgreSQL:
```prisma
// جيد - يعمل مع PostgreSQL
id String @id @default(uuid())
duration Int
price Float
```

#### MySQL:
```prisma
// جيد - يعمل مع MySQL
id String @id @default(uuid())
duration Int
price Decimal @db.Decimal(10, 2)  // بدلاً من Float
```

### 3. Environment Variables

تأكد من إضافة `.env` إلى `.gitignore`:

```gitignore
.env
.env.local
.env.production
```

---

## اختبار الاتصال

بعد الإعداد، اختبر الاتصال:

```bash
npm run db:studio
```

أو في الكود:

```typescript
import { prisma } from '@/lib/prisma'

// Test connection
const test = await prisma.user.findMany()
console.log('Database connected!', test.length)
```

---

## الدعم

إذا واجهت أي مشاكل:
1. تحقق من connection string
2. تأكد من تفعيل SSL للاتصالات السحابية
3. تحقق من جدار الحماية (Firewall) - قد تحتاج لإضافة IP
4. راجع logs في Prisma وخدمة قاعدة البيانات السحابية







