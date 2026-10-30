importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBLgtAXaBeKFWik1Hc0GpEZo8qMltLFT2k",
    authDomain: "masar-edu-control-system.firebaseapp.com",
    projectId: "masar-edu-control-system",
    storageBucket: "masar-edu-control-system.firebasestorage.app",
    messagingSenderId: "322216005890",
    appId: "1:322216005890:web:97771a5ffc62d3785b721b"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification ? payload.notification.title : "تنبيه جديد من السنتر التعليمي";
    const notificationOptions = {
        body: payload.notification ? payload.notification.body : "",
        icon: '/icon-192.png',
        badge: '/icon-192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
