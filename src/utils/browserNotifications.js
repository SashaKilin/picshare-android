// Утилиты для работы с Browser Web Notifications API и Web Push
import { api } from '../api';

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
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestBrowserNotificationPermission() {
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

// Фоновая подписка на серверные Web Push уведомления (для полностью закрытого браузера)
export async function subscribeUserToPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }
  if (Notification.permission !== 'granted') {
    return null;
  }

  try {
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
  if (!isBrowserNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  const options = {
    body: body || '',
    icon: icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: tag || 'picshare_alert',
    renotify: true,
    data: data || {},
  };

  // 1. Для Android Chrome и современных браузеров — через Service Worker
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

  // 2. Стандартный веб-конструктор браузерных уведомлений (Desktop)
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
