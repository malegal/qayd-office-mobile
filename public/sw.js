/*
 * Service Worker — قشرة تطبيق «مكتب جاد الرب للمحاماة».
 * الهدف: جعل التطبيق يعمل على أي رابط (بما فيه مجلد الجذر) وعند إعادة التحديث،
 * لأن خدمات الاستضافة الثابتة لا تخدم index.html عند طلب المجلد مباشرة.
 */
const CACHE = "qayd-shell-v3";
const INDEX_URL = new URL("index.html", self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(INDEX_URL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // طلبات التنقل بين الصفحات: جرّب الشبكة، وإن فشلت اخدم قشرة التطبيق.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res && res.status === 200) return res;
        } catch {
          // تجاهل الأخطاء وانتقل إلى القشرة المخزّنة.
        }
        const cache = await caches.open(CACHE);
        const cached = await cache.match(INDEX_URL);
        if (cached) return cached;
        return fetch(INDEX_URL);
      })(),
    );
  }
});
