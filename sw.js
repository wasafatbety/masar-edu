// تحديث اسم الإصدار لحث المتصفح على تحميل التحديثات الجديدة
const CACHE_NAME = 'masar-edu-v3.0';

// قائمة الأصول والملفات الأساسية المُراد تخزينها
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // المكتبات الخارجية والخطوط المستخدمة في الصفحة
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

// 1. حدث التثبيت (Install): التخزين المسبق للأصول الحيوية
self.addEventListener('install', (event) => {
  self.skipWaiting(); // التفعيل الفوري للنسخة الجديدة
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching Core Assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// 2. حدث التفعيل (Activate): تنظيف النسخ القديمة واستلام التحكم مباشرة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting Old Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // فرض السيطرة على كل التبويبات المفتوحة
  );
});

// 3. حدث الجلب (Fetch): إعطاء الأولوية للكاش مع جلب وتخزين الملفات الجديدة ديناميكيًا
self.addEventListener('fetch', (event) => {
  // يتجاهل طلبات السيرفر الخارجي للفيرايبس (Firebase Realtime/Firestore) لضمان دقة الحسابات والبيانات الحية
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('identitytoolkit.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // إرجاع الاستجابة المحفوظة فوراً إذا كانت موجودة
        return cachedResponse;
      }

      // طلب الملف من الشبكة وتخزينه لاستخدامه مستقبلاً
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // في حالة عدم وجود شبكة وعدم وجود الملف في الكاش (صفحة أوفلاين بديلة عند الحاجة)
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
