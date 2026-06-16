# بوابة الإصدار المحميّة (Netlify + GitHub)

لوحة إصدار شهادات أجيال، محميّة بتسجيل دخول حقيقي على مستوى الخادم
(اسم مستخدم + كلمة مرور) يعمل من أي متصفّح أو جهاز.

## المحتوى
- `index.html` — لوحة الإصدار (رابط الـbackend مدمج).
- `cert-engine.js` — محرّك توليد الشهادات.
- `netlify/edge-functions/auth.js` — بوابة المصادقة.
- `netlify.toml` — إعداد Netlify.

## خطوات النشر (مرة واحدة)
1. ارفع كل هذه الملفات (مع مجلد `netlify`) إلى مستودع على GitHub.
2. في Netlify: Add new site → Import an existing project → GitHub → اختر المستودع → Deploy.
3. في إعدادات الموقع → Environment variables → أضف متغيّراً:
   - **Key:** `ADMIN_CREDENTIALS`
   - **Value:** `username:password`  (مثال: `abumalik:كلمة-سر-قوية`)
   - لعدّة حسابات: `admin:pass1,user2:pass2`
4. أعد النشر (Trigger deploy) ليُفعَّل المتغيّر.
5. افتح رابط الموقع → سيطلب المتصفّح اسم المستخدم وكلمة المرور.

> كلمة المرور تُحفظ في إعدادات Netlify فقط — ليست في الكود ولا في الصفحة.
> إن لم يُضبط `ADMIN_CREDENTIALS` يبقى الموقع مغلقاً للجميع (يفشل مغلقاً).
