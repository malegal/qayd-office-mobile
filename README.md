# Qayd Office

تطبيق Android مبني باستخدام **Expo** و**React Native** لإدارة العمليات اليومية في المكتب القانوني.

## الوظائف الحالية

- تسجيل الدخول عبر Supabase Auth.
- عرض القضايا والملفات المهنية والجلسات.
- ترحيل جلسة جديدة بسرعة.
- تسجيل المصروفات.
- إنشاء رسوم وأتعاب للقضايا.
- تسجيل الدفعات المقبوضة وتحديث المتبقي.
- العمل دون اتصال على Android عبر SQLite.
- مزامنة تلقائية عند عودة الإنترنت مع منع تكرار العمليات ومعالجة تعارضات التعديل.
- حماية البيانات عبر RLS وعضوية المكتب.

## التشغيل محليًا

```bash
pnpm install
pnpm start
```

لتشغيل معاينة Expo على الويب:

```bash
pnpm dev:metro
```

ولتطبيق Android باستخدام Expo:

```bash
pnpm android
```

## متغيرات البيئة

يحتاج التطبيق إلى متغيري Supabase التاليين في ملف `.env` المحلي، ولا يجب رفع ملف `.env` إلى GitHub. أنشئ الملف يدويًا بالقيم المناسبة:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
```

## التحقق

```bash
pnpm check
pnpm vitest run
pnpm exec expo export --platform web
```

## ملاحظات أمنية

يجب عدم وضع مفاتيح الخدمة ذات الصلاحيات المرتفعة داخل تطبيق الهاتف. يستخدم التطبيق مفتاح Supabase العام فقط، بينما تفرض قاعدة البيانات الصلاحيات عبر RLS ودوال RPC الآمنة.
