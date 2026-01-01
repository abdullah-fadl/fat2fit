# استكشاف أخطاء Odoo

## المشكلة: "فشل الاتصال بـ Odoo"

إذا ظهرت هذه الرسالة، تحقق من التالي:

### 1. التحقق من اسم قاعدة البيانات

في Odoo Cloud، اسم قاعدة البيانات عادة يكون:
- **ليس** `bperformance-scop.odoo.com`
- **بل** `bperformance-scop` فقط

**كيف تعرف الاسم الصحيح:**
1. افتح Odoo Cloud في المتصفح
2. اضغط على أيقونة قاعدة البيانات (Database) في الأعلى (إذا ظهرت)
3. أو في صفحة تسجيل الدخول، إذا ظهرت قائمة اختيار قاعدة البيانات، هذا هو الاسم
4. أو في Odoo: Settings → Preferences → Database

### 2. التحقق من البيانات

تأكد من:
- ✅ URL صحيح: `https://bperformance-scop.odoo.com` (مع https)
- ✅ Database: `bperformance-scop` (بدون .odoo.com)
- ✅ Username: `admin` (أو اسم المستخدم الصحيح)
- ✅ API Key: كلمة المرور صحيحة

### 3. التحقق من الصلاحيات

تأكد أن المستخدم `admin` لديه:
- صلاحيات Administrator (مدير)
- تفعيل API Access

### 4. التحقق من XML-RPC

Odoo Cloud يدعم XML-RPC افتراضياً، لكن تأكد من:
- أن الموقع لا يحتاج VPN أو IP Whitelist
- أن Firewall لا يمنع الاتصال

### 5. تجربة يدوية

يمكنك تجربة الاتصال يدوياً باستخدام curl:

```bash
curl -X POST https://bperformance-scop.odoo.com/xmlrpc/2/common \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "authenticate",
    "params": ["bperformance-scop", "admin", "D@EdsqdQW!23", {}],
    "id": 1
  }'
```

إذا رجع رقم (مثل `5` أو `2`)، يعني الاتصال ناجح.
إذا رجع `false`، يعني اسم المستخدم أو كلمة المرور غير صحيحة.

### 6. بدائل لاسم قاعدة البيانات

إذا لم يعمل مع `bperformance-scop`، جرّب:
- `bperformance_scop` (بشرطة سفلية)
- `bperformance` (بدون -scop)
- أو اسأل مدير Odoo Cloud

### 7. الاتصال بمدير Odoo Cloud

إذا لم يعمل أي شيء، اتصل بمدير Odoo Cloud واطلب:
- اسم قاعدة البيانات الصحيح
- التأكد من تفعيل XML-RPC
- التأكد من صلاحيات المستخدم






