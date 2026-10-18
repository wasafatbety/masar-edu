const CACHE_NAME = 'masar-edu-v4.0';

// نكتفي بتخزين الملفات المحلية الأساسية فقط لضمان نجاح التثبيت 100%
const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './192.png',
  './512.png'
];

// تثبيت الـ Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // استخدام Promise.allSettled لضمان عدم انهيار التثبيت لو فشل ملف واحد
      return Promise.allSettled(
        LOCAL_ASSETS.map(url => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

// تفعيل وتنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// استراتيجية التعامل مع الطلبات الشبكية
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // التجاهل التام لطلبات Firebase أو أي طلبات ليست GET (مثل POST و PUT)
  if (
    request.method !== 'GET' ||
    request.url.includes('firestore.googleapis.com') ||
    request.url.includes('identitytoolkit.googleapis.com') ||
    request.url.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  // معالجة طلبات GET العادية
  event.respondWith(
    fetch(request)
      .then((response) => {
        // تخزين الاستجابات الناجحة فقط (Status 200) ومن النوع العادي
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // عند انقطاع الإنترنت يتم استرجاع الملف من الـ Cache
        return caches.match(request);
      })
  );
});
