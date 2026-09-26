import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

/**
 * قشرة HTML المخصّصة لنسخة الويب (تُستخدم فقط عند تصدير الويب الثابت).
 * الهدف: توحيد مسار الصفحة قبل تشغيل الراوتر حتى يعمل التطبيق على أي رابط نشر
 * ينتهي بـ index.html أو اسم صفحة .html (بعض خدمات الاستضافة الثابتة لا تخدم
 * مجلد الجذر مباشرة)، مع تسجيل Service Worker يخدم قشرة التطبيق عند إعادة التحديث.
 */
const bootScript = `
(function () {
  try {
    var p = window.location.pathname;
    if (/\\.html$/.test(p)) {
      var np = p.replace(/\\/index\\.html$/, "/").replace(/\\.html$/, "");
      window.history.replaceState(null, "", np + window.location.search + window.location.hash);
    }
  } catch (e) {}

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#F4F7FB" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="قيد" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
