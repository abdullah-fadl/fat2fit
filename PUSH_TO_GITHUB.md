# رفع المشروع على GitHub

## المشروع جاهز للرفع! ✅

تم تحضير جميع الملفات وإعداد Git. الآن تحتاج فقط للمصادقة ورفع الكود.

## الطريقة 1: استخدام GitHub CLI (الأسهل)

```bash
# تثبيت GitHub CLI إذا لم يكن مثبتاً
brew install gh

# تسجيل الدخول
gh auth login

# رفع الكود
git push -u origin main
```

## الطريقة 2: استخدام Personal Access Token

### خطوات:
1. اذهب إلى: https://github.com/settings/tokens
2. انقر على "Generate new token" → "Generate new token (classic)"
3. اختر الصلاحيات:
   - ✅ `repo` (Full control of private repositories)
4. انسخ الـ Token

### استخدام الـ Token:
```bash
# عند السؤال عن Username: أدخل اسمك على GitHub
# عند السؤال عن Password: أدخل الـ Token (وليس كلمة المرور)

git push -u origin main
```

## الطريقة 3: استخدام SSH Key

```bash
# توليد SSH key (إذا لم يكن لديك)
ssh-keygen -t ed25519 -C "your_email@example.com"

# إضافة المفتاح إلى ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# نسخ المفتاح العام
cat ~/.ssh/id_ed25519.pub

# ثم أضف المفتاح في: https://github.com/settings/keys
# بعدها غير remote إلى SSH:
git remote set-url origin git@github.com:abdullah-fadl/fat2fit.git
git push -u origin main
```

## الحالة الحالية:
✅ Repository: https://github.com/abdullah-fadl/fat2fit.git  
✅ Remote: تم إضافته  
✅ Commits: جاهزة للرفع (109 ملفات)  
⏳ المطلوب: المصادقة ثم `git push -u origin main`

## بعد الرفع:
ستكون المشروع متاحاً على:
**https://github.com/abdullah-fadl/fat2fit**

