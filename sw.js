// استيراد سكربتات Firebase الخاصة بالخدمة في الخلفية
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBLgtAXaBeKFWik1Hc0GpEZo8qMltLFT2k",
  projectId: "masar-edu-control-system",
  messagingSenderId: "123456789012",
  appId: "1:322216005890:web:97771a5ffc62d3785b721b"
});

const messaging = firebase.messaging();

// التعامل مع الإشعارات الواردة في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log('تم استلام إشعار في الخلفية:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
