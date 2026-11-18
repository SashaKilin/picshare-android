// Утилиты для работы с Browser Web Notifications API, Web Push, LocalNotifications и FCM Push
import { api } from '../api';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

let channelCreated = false;
let listenersInitialized = false;
let fcmInitialized = false;

// Инициализация системного Firebase Cloud Messaging для закрытого приложения
export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform() || fcmInitialized) return;

  try {
    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      const requested = await PushNotifications.requestPermissions();
      if (requested.receive !== 'granted') return;
    } else if (permStatus.receive !== 'granted') {
      return;
    }

    fcmInitialized = true;

    // Регистрация токена устройства
    PushNotifications.addListener('registration', async (token) => {
      console.log('🔥 Получен FCM Push-токен устройства:', token.value);
      try {
        await api.saveFcmToken(token.value, 'Android Phone');
      } catch (err) {
        console.warn('Ошибка отправки FCM токена на сервер:', err);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('FCM registration error:', err.error);
    });

    // Обработка уведомления, если приложение открыто
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('FCM push получен в активном приложении:', notification);
    });

    // Обработка клика по системному пушу из шторки (когда приложение было закрыто)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification?.data;
      if (!data) return;

      if (data.type === 'requests') {
        window.dispatchEvent(new CustomEvent('picshare_open_requests'));
      } else if (data.type === 'group' && (data.groupId || data.target)) {
        window.dispatchEvent(new CustomEvent('picshare_open_group', {
          detail: { groupId: data.groupId || data.target }
        }));
      } else if (data.type === 'friend' && (data.friend || data.target)) {
        let friendObj = data.friend || data.target;
        if (typeof friendObj === 'string') {
          try { friendObj = JSON.parse(friendObj); } catch (e) {}
        }
        window.dispatchEvent(new CustomEvent('picshare_open_friend', { detail: friendObj }));
      }
    });

    await PushNotifications.register();
  } catch (err) {
    console.warn('PushNotifications warning (FCM):', err.message);
  }
}

// Создание системного канала уведомлений на Android 8.0+
export async function ensureNotificationChannel() {
  if (!Capacitor.isNativePlatform() || channelCreated) return;
  try {
    await LocalNotifications.createChannel({
      id: 'picshare_channel',
      name: 'Уведомления PicShare',
      description: 'Сообщения, заявки в друзья и события мессенджера',
      importance: 5, // High importance (heads-up banner with sound)
      visibility: 1, // Public on lockscreen
      sound: 'default',
      vibration: true,
      lights: true,
      lightColor: '#6366f1',
    });
    channelCreated = true;
  } catch (err) {
    console.warn('LocalNotifications.createChannel error:', err);
  }
}

// Инициализация слушателей нажатий на нативные уведомления Android
export function initLocalNotifications() {
  if (!Capacitor.isNativePlatform() || listenersInitialized) return;
  listenersInitialized = true;

  ensureNotificationChannel();

  // Если уведомления уже разрешены в приложении, уведомляем бэкенд,
  // чтобы сервер не присылал дубли в мобильный браузер на телефоне
  LocalNotifications.checkPermissions().then((status) => {
    if (status.display === 'granted') {
      api.setAppNotificationStatus(true).catch(() => {});
    }
  }).catch(() => {});

  try {
    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      console.log('Клик по нативному уведомлению PicShare:', action);
      const data = action.notification?.extra;
      if (!data) return;

      if (data.type === 'requests') {
        window.dispatchEvent(new CustomEvent('picshare_open_requests'));
      } else if (data.type === 'group' && (data.groupId || data.target)) {
        window.dispatchEvent(new CustomEvent('picshare_open_group', {
          detail: { groupId: data.groupId || data.target }
        }));
      } else if (data.type === 'friend' && (data.friend || data.target)) {
        window.dispatchEvent(new CustomEvent('picshare_open_friend', {
          detail: data.friend || data.target
        }));
      }
    });
  } catch (err) {
    console.warn('LocalNotifications addListener error:', err);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isBrowserNotificationSupported() {
  if (Capacitor.isNativePlatform()) return true;
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function getNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'default';
    } catch (e) {
      return 'default';
    }
  }

  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestBrowserNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureNotificationChannel();
      initPushNotifications().catch(() => {});
      const status = await LocalNotifications.requestPermissions();
      const granted = status.display === 'granted';
      if (granted) {
        api.setAppNotificationStatus(true).catch(console.warn);
        subscribeUserToPush().catch(console.warn);
      }
      return granted ? 'granted' : (status.display === 'denied' ? 'denied' : 'default');
    } catch (err) {
      console.error('Ошибка запроса разрешения нативных уведомлений:', err);
      return 'denied';
    }
  }

  if (!isBrowserNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      subscribeUserToPush().catch(console.warn);
    }
    return permission;
  } catch (err) {
    console.error('Ошибка запроса разрешения на уведомления браузера:', err);
    return Notification.permission;
  }
}

// Фоновая подписка на серверные Web Push уведомления (для полностью закрытого приложения/браузера)
export async function subscribeUserToPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  try {
    // В Capacitor статус проверяется через LocalNotifications или Notification
    const perm = await getNotificationPermission();
    if (perm !== 'granted') {
      return null;
    }

    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) return null;

    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      const { publicKey } = await api.getPushPublicKey();
      if (!publicKey) return null;

      const convertedKey = urlBase64ToUint8Array(publicKey);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    if (sub) {
      await api.subscribePush(sub.toJSON());
      return sub;
    }
  } catch (err) {
    console.warn('Ошибка регистрации Web Push:', err.message);
    return null;
  }
}

export async function sendBrowserNotification({ title, body, icon, tag, data, onClick }) {
  // 1. Нативное уведомление на Android через Capacitor LocalNotifications
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureNotificationChannel();
      // Числовой 32-bit ID (до 2^31 - 1)
      const notifId = Math.floor(Math.random() * 2147483647);
      
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: title || 'PicShare',
            body: body || '',
            channelId: 'picshare_channel',
            extra: data || {},
            sound: 'default',
            smallIcon: 'ic_launcher',
            actionTypeId: '',
          }
        ]
      });
      return true;
    } catch (nativeErr) {
      console.warn('Ошибка отправки нативного уведомления Capacitor:', nativeErr);
    }
  }

  // 2. Для стандартного браузера
  if (!isBrowserNotificationSupported()) return null;
  if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') return null;

  const options = {
    body: body || '',
    icon: icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: tag || 'picshare_alert',
    renotify: true,
    data: data || {},
  };

  // 2.1 Через Service Worker (Android Chrome и фоновый режим)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, options);
        return true;
      }
    } catch (swErr) {
      console.warn('SW showNotification warning:', swErr);
    }
  }

  // 2.2 Стандартный веб-конструктор браузерных уведомлений (Desktop)
  try {
    const notification = new Notification(title, options);

    notification.onclick = (e) => {
      e.preventDefault();
      try {
        window.focus();
      } catch (err) {}
      notification.close();
      if (typeof onClick === 'function') {
        onClick();
      }
    };

    // Автоматическое закрытие через 8 секунд
    setTimeout(() => {
      try {
        notification.close();
      } catch (err) {}
    }, 8000);

    return notification;
  } catch (err) {
    console.warn('Предупреждение при показе уведомления браузера:', err);
    return null;
  }
}
