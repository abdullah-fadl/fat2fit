# دليل REST API للربط مع Odoo

تم إنشاء REST API endpoints في Next.js للربط مع Odoo. يمكن لـ Odoo استدعاء هذه الـ endpoints لإرسال واستقبال البيانات.

## 🔐 المصادقة

جميع الـ endpoints تتطلب API Key في Header:

```
x-api-key: YOUR_API_KEY
```

أو:

```
Authorization: Bearer YOUR_API_KEY
```

**ملاحظة:** API Key هو نفس الـ API Key المحفوظ في إعدادات Odoo في النظام.

---

## 📋 الـ Endpoints المتاحة

### 1. العميلات `/api/webhooks/odoo/clients`

#### GET - الحصول على قائمة العميلات
```
GET /api/webhooks/odoo/clients
Headers: x-api-key: YOUR_API_KEY
```

**الرد:**
```json
{
  "clients": [
    {
      "id": "uuid",
      "name": "اسم العميلة",
      "phone": "0501234567",
      "email": "email@example.com",
      "membershipNumber": "MEM001",
      "odooPartnerId": "123",
      "status": "ACTIVE"
    }
  ]
}
```

#### POST - إنشاء/تحديث عميلة
```
POST /api/webhooks/odoo/clients
Headers: 
  x-api-key: YOUR_API_KEY
  Content-Type: application/json
```

**المعطيات:**
```json
{
  "odoo_id": 123,
  "name": "اسم العميلة",
  "phone": "0501234567",
  "email": "email@example.com",
  "membership_number": "MEM001",
  "action": "create"  // أو "update" أو "delete"
}
```

**الرد:**
```json
{
  "success": true,
  "message": "تم إنشاء العميلة",
  "client_id": "uuid"
}
```

---

### 2. الفواتير `/api/webhooks/odoo/invoices`

#### POST - إنشاء/تحديث فاتورة
```
POST /api/webhooks/odoo/invoices
Headers: 
  x-api-key: YOUR_API_KEY
  Content-Type: application/json
```

**المعطيات:**
```json
{
  "odoo_id": 456,
  "client_odoo_id": 123,
  "invoice_number": "INV-001",
  "subtotal": 1000,
  "discount_amount": 100,
  "tax_amount": 150,
  "total": 1050,
  "invoice_date": "2024-01-01",
  "status": "PENDING",
  "action": "create"
}
```

---

### 3. المدفوعات `/api/webhooks/odoo/payments`

#### POST - إنشاء/تحديث دفعة
```
POST /api/webhooks/odoo/payments
Headers: 
  x-api-key: YOUR_API_KEY
  Content-Type: application/json
```

**المعطيات:**
```json
{
  "odoo_id": 789,
  "client_odoo_id": 123,
  "invoice_number": "INV-001",
  "amount": 500,
  "payment_method": "CASH",
  "payment_date": "2024-01-01",
  "reference_number": "REF-001",
  "action": "create"
}
```

---

## 🔧 كيفية الإعداد في Odoo

### الطريقة 1: Automation Rule (الأسهل)

1. في Odoo، اذهب إلى: **Settings → Technical → Automation → Automated Actions**
2. اضغط **Create**
3. املأ البيانات:
   - **Name**: مزامنة العملاء مع Fat2Fit
   - **Model**: `res.partner`
   - **Trigger**: `On Create & Update`
4. في تبويب **Python Code**، ضع الكود التالي:

```python
api_url = "https://your-domain.com/api/webhooks/odoo/clients"
api_key = "YOUR_API_KEY_FROM_FAT2FIT"

import requests
import json

# بيانات العميل
data = {
    "odoo_id": record.id,
    "name": record.name,
    "phone": record.phone if record.phone else "",
    "email": record.email if record.email else "",
    "action": "update" if record.create_date != record.write_date else "create"
}

headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}

try:
    response = requests.post(api_url, json=data, headers=headers)
    if response.status_code == 201 or response.status_code == 200:
        # تم بنجاح
        pass
    else:
        # خطأ
        raise Exception(response.text)
except Exception as e:
    raise Exception(f"خطأ في المزامنة: {str(e)}")
```

5. احفظ وقم بتفعيل Automation Rule

### الطريقة 2: Custom Module في Odoo

يمكنك إنشاء Odoo module خاص يستدعي API عند إنشاء/تحديث البيانات:

```python
# models/res_partner.py
from odoo import models, api
import requests
import json

class ResPartner(models.Model):
    _inherit = 'res.partner'

    @api.model
    def create(self, vals):
        partner = super().create(vals)
        self.sync_to_fat2fit(partner, 'create')
        return partner

    def write(self, vals):
        result = super().write(vals)
        for partner in self:
            self.sync_to_fat2fit(partner, 'update')
        return result

    def sync_to_fat2fit(self, partner, action):
        api_url = "https://your-domain.com/api/webhooks/odoo/clients"
        api_key = "YOUR_API_KEY"
        
        data = {
            "odoo_id": partner.id,
            "name": partner.name,
            "phone": partner.phone or "",
            "email": partner.email or "",
            "action": action
        }
        
        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json"
        }
        
        try:
            requests.post(api_url, json=data, headers=headers, timeout=10)
        except:
            pass  # تجاهل الأخطاء لتجنب تعطيل Odoo
```

---

## 📝 خطوات الإعداد

1. **في Fat2Fit:**
   - افتح صفحة "إعدادات Odoo"
   - احفظ API Key (سيكون هذا هو API Key المستخدم في Odoo)

2. **في Odoo:**
   - أنشئ Automation Rule أو Custom Module
   - ضع API Key المحفوظ من Fat2Fit
   - ضع URL النظام (مثل: `https://your-domain.com`)

3. **اختبار:**
   - أنشئ عميل جديد في Odoo
   - تحقق من ظهوره في Fat2Fit

---

## 🔗 الـ URLs الكاملة

- **العميلات:** `https://your-domain.com/api/webhooks/odoo/clients`
- **الفواتير:** `https://your-domain.com/api/webhooks/odoo/invoices`
- **المدفوعات:** `https://your-domain.com/api/webhooks/odoo/payments`

---

## ⚠️ ملاحظات مهمة

1. استبدل `your-domain.com` بـ URL النظام الخاص بك
2. API Key يجب أن يكون نفس المحفوظ في إعدادات Odoo
3. يُنصح باستخدام HTTPS في الإنتاج
4. يمكنك اختبار الـ API باستخدام Postman أو curl

---

## 🧪 مثال للاختبار (curl)

```bash
# اختبار إنشاء عميل
curl -X POST "https://your-domain.com/api/webhooks/odoo/clients" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "odoo_id": 123,
    "name": "عميلة تجريبية",
    "phone": "0501234567",
    "action": "create"
  }'
```





