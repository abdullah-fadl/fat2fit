# وثائق REST API للربط مع Odoo

تم إنشاء REST API endpoints في Next.js للربط مع Odoo. يمكن لـ Odoo استدعاء هذه الـ endpoints لإرسال واستقبال البيانات.

## 🔐 المصادقة (Authentication)

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

## 📋 Endpoints المتاحة

### 1. العميلات (Clients)

#### GET `/api/webhooks/odoo/clients`
الحصول على قائمة جميع العميلات

**Response:**
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
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST `/api/webhooks/odoo/clients`
إنشاء أو تحديث عميلة من Odoo

**Request Body:**
```json
{
  "odoo_id": 123,
  "name": "اسم العميلة",
  "phone": "0501234567",
  "email": "email@example.com",
  "membership_number": "MEM001",
  "action": "create" // أو "update" أو "delete"
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم إنشاء العميلة",
  "client_id": "uuid"
}
```

---

### 2. الفواتير (Invoices)

#### POST `/api/webhooks/odoo/invoices`
إنشاء أو تحديث فاتورة من Odoo

**Request Body:**
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
  "action": "create" // أو "update" أو "delete"
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم إنشاء الفاتورة",
  "invoice_id": "uuid"
}
```

---

### 3. المدفوعات (Payments)

#### POST `/api/webhooks/odoo/payments`
إنشاء أو تحديث دفعة من Odoo

**Request Body:**
```json
{
  "odoo_id": 789,
  "client_odoo_id": 123,
  "invoice_number": "INV-001",
  "amount": 500,
  "payment_method": "CASH",
  "payment_date": "2024-01-01",
  "reference_number": "REF-001",
  "action": "create" // أو "update" أو "delete"
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم إنشاء الدفعة",
  "payment_id": "uuid"
}
```

---

## 🔧 كيفية الإعداد في Odoo

### 1. إنشاء Script في Odoo

في Odoo، يمكنك إنشاء Python script أو Automation Rule يستدعي هذه الـ endpoints:

```python
import requests
import json

# إعدادات API
API_URL = "https://your-domain.com/api/webhooks/odoo/clients"
API_KEY = "your-api-key-from-fat2fit-settings"

# إرسال بيانات عميل جديد
def sync_partner_to_fat2fit(partner):
    data = {
        "odoo_id": partner.id,
        "name": partner.name,
        "phone": partner.phone,
        "email": partner.email,
        "action": "create"
    }
    
    headers = {
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
    }
    
    response = requests.post(API_URL, json=data, headers=headers)
    return response.json()
```

### 2. إنشاء Automation Rule في Odoo

1. اذهب إلى Settings → Technical → Automation → Automated Actions
2. أنشئ Automated Action جديد
3. اختر Model: `res.partner` (للعملاء)
4. اختر Trigger: `On Create & Update`
5. في Python Code:

```python
api_url = "https://your-domain.com/api/webhooks/odoo/clients"
api_key = "your-api-key"

import requests
import json

data = {
    "odoo_id": record.id,
    "name": record.name,
    "phone": record.phone,
    "email": record.email,
    "action": "update" if record.create_date != record.write_date else "create"
}

headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}

requests.post(api_url, json=data, headers=headers)
```

---

## 📝 ملاحظات مهمة

1. **API Key**: يجب أن يكون نفس API Key المحفوظ في إعدادات Odoo في النظام
2. **Base URL**: استبدل `your-domain.com` بـ URL النظام الخاص بك
3. **HTTPS**: يُنصح باستخدام HTTPS في الإنتاج
4. **Error Handling**: جميع الـ endpoints ترجع رسائل خطأ واضحة في حالة الفشل

---

## 🔄 المزامنة الثنائية

يمكن أيضاً إعداد مزامنة ثنائية:
- من Odoo إلى Fat2Fit (عبر REST API المذكور أعلاه)
- من Fat2Fit إلى Odoo (عبر XML-RPC/JSON-RPC الموجود في `lib/odoo.ts`)

---

## 🧪 اختبار الـ API

يمكنك اختبار الـ endpoints باستخدام curl:

```bash
# اختبار GET clients
curl -X GET "http://localhost:3000/api/webhooks/odoo/clients" \
  -H "x-api-key: YOUR_API_KEY"

# اختبار POST client
curl -X POST "http://localhost:3000/api/webhooks/odoo/clients" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "odoo_id": 123,
    "name": "عميلة تجريبية",
    "phone": "0501234567",
    "action": "create"
  }'
```






