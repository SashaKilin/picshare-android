// picshare-android/src/config.js
// Универсальная конфигурация адреса бэкенд-сервера для Android и Web

const FALLBACK_SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://10.0.2.2:5000';

export const isCapacitorNative = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(window.Capacitor?.isNativePlatform && window.Capacitor.isNativePlatform());
};

export function getServerUrl() {
  if (typeof window === 'undefined') return FALLBACK_SERVER_URL;

  // 1. Проверяем, задан ли адрес сервера вручную пользователем в приложении
  const custom = localStorage.getItem('picshare_server_url');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }

  // 2. Если задан через переменную окружения сборки VITE_SERVER_URL
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL.replace(/\/+$/, '');
  }

  // 3. В веб-режиме разработки на порту 5173
  if (window.location.port === '5173') {
    return 'http://localhost:5000';
  }

  // 4. Внутри нативного приложения Android (Capacitor)
  // На Android эмуляторе 10.0.2.2 - это localhost компьютера разработчика
  if (isCapacitorNative() || window.location.protocol === 'capacitor:' || window.location.hostname === 'localhost') {
    return FALLBACK_SERVER_URL;
  }

  // 5. В обычном браузере на проде - адрес текущего хоста
  return window.location.origin;
}

export function setServerUrl(url) {
  if (url && url.trim()) {
    localStorage.setItem('picshare_server_url', url.trim().replace(/\/+$/, ''));
  } else {
    localStorage.removeItem('picshare_server_url');
  }
}

export function resolveMediaUrl(url) {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  const server = getServerUrl();
  return `${server}${url.startsWith('/') ? '' : '/'}${url}`;
}
