import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

/**
 * قشرة HTML المخصّصة لنسخة الويب (تُستخدم فقط عند تصدير الويب الثابت).
 * الهدف: توحيد مسار الصفحة قبل تشغيل الراوتر حتى يعمل التطبيق على أي رابط نشر
 * ينتهي بـ index.html أو اسم صفحة .html (بعض خدمات الاستضافة الثابتة لا تخدم
 * مجلد الجذر مباشرة).
 */
const normalizePathScript = `
(function () {
  try {
    var p = window.location.pathname;
    if (/\\.html$/.test(p)) {
      var np = p.replace(/\\/index\\.html$/, "/").replace(/\\.html$/, "");
      window.history.replaceState(null, "", np + window.location.search + window.location.hash);
    }
  } catch (e) {}
})();
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#0f172a" />
        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: normalizePathScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
