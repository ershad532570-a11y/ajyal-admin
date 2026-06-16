// بوابة الحماية — تسجيل دخول حقيقي على مستوى الخادم (Netlify Edge Function)
// تطلب اسم مستخدم + كلمة مرور قبل فتح أي صفحة، على كل الأجهزة والمتصفّحات.
// كلمة المرور تُحفظ في متغيّر بيئة بإعدادات Netlify (ADMIN_CREDENTIALS) — لا داخل الكود.
// الصيغة: "user1:pass1,user2:pass2"  (يمكن أكثر من حساب)

export default async (request) => {
  const raw = (Netlify.env.get("ADMIN_CREDENTIALS") || "").trim();
  const allowed = raw.split(",").map((s) => s.trim()).filter(Boolean);

  const header = request.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch (_) {
      decoded = "";
    }
    // يفشل مغلقاً: إن لم تُضبط بيانات الدخول، لا يُسمح لأحد
    if (allowed.length > 0 && allowed.includes(decoded)) {
      return; // مصرّح — تابع لعرض الصفحة
    }
  }

  return new Response("🔒 يتطلب تسجيل الدخول — Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Ajyal Issuing Platform", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};

export const config = { path: "/*" };
