# إعداد رفع المشروع على GitHub

## الخطوات المتبقية:

### 1. إنشاء Repository جديد على GitHub
- اذهب إلى https://github.com/new
- اختر اسم للمشروع (مثل: `fat2fit` أو `gym-management-system`)
- اختر Public أو Private
- **لا** تضع checkmark على "Initialize this repository with a README"

### 2. إضافة Remote ورفع الكود

```bash
# إضافة remote (استبدل YOUR_USERNAME و REPO_NAME بالقيم الصحيحة)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# تغيير اسم الفرع إلى main (إذا لم يكن)
git branch -M main

# رفع الكود
git push -u origin main
```

### 3. مثال كامل:
```bash
git remote add origin https://github.com/abdullah/fat2fit.git
git branch -M main
git push -u origin main
```

## ملاحظات مهمة:

✅ **تم إعداد .gitignore بشكل صحيح** لحماية:
- ملفات `.env` (البيانات الحساسة)
- `node_modules/`
- `.next/` (ملفات البناء)
- قواعد البيانات المحلية `*.db`

⚠️ **تأكد من:**
- عدم رفع ملفات `.env` الحساسة
- عدم رفع قاعدة البيانات المحلية
- مراجعة الملفات قبل الرفع

## بعد الرفع:

يمكنك مشاركة المشروع عبر الرابط:
`https://github.com/YOUR_USERNAME/REPO_NAME`

