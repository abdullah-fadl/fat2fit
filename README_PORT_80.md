# تشغيل النظام على المنفذ 80

## الطريقة 1: استخدام sudo (للتطوير)
```bash
npm run dev:sudo
```
أو:
```bash
sudo npm run dev
```

## الطريقة 2: استخدام port forwarding (مُوصى به)
إذا كان لديك Apache أو Nginx، يمكنك توجيه المنفذ 80 إلى 3000:

### باستخدام pfctl (macOS):
```bash
# إيقاف أي عملية على 80
sudo lsof -ti:80 | xargs kill -9

# توجيه المنفذ 80 إلى 3000
echo "rdr pass inet proto tcp from any to any port 80 -> 127.0.0.1 port 3000" | sudo pfctl -ef -
```

ثم شغل النظام على المنفذ 3000:
```bash
npm run dev
```

## الطريقة 3: تغيير back إلى 3000
إذا كنت تريد تشغيل بدون صلاحيات:
```bash
npm run dev
```
وسيعمل على http://localhost:3000

## ملاحظات:
- في macOS، المنافذ أقل من 1024 تحتاج صلاحيات root
- للإنتاج، استخدم reverse proxy (Nginx/Apache) بدلاً من تشغيل Node مباشرة على 80


