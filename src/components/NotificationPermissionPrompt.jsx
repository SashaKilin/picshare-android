import React, { useState, useEffect } from 'react';
import { 
  getNotificationPermission, 
  requestBrowserNotificationPermission, 
  isBrowserNotificationSupported 
} from '../utils/browserNotifications';
import { Bell, X, Check, Lock, ChevronRight } from 'lucide-react';

export function NotificationPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [permission, setPermission] = useState('default');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!isBrowserNotificationSupported()) return;

    const currentPerm = getNotificationPermission();
    setPermission(currentPerm);

    // Если разрешение еще не спрашивалось ('default') и пользователь еще не закрывал окно
    const handled = localStorage.getItem('picshare_notif_prompt_handled');
    if (currentPerm === 'default' && !handled) {
      // Показываем с небольшой задержкой (1.5 сек), чтобы не шокировать при загрузке страницы
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('picshare_notif_prompt_handled', 'true');
    setVisible(false);
  };

  const handleEnable = async () => {
    const result = await requestBrowserNotificationPermission();
    setPermission(result);
    localStorage.setItem('picshare_notif_prompt_handled', 'true');

    if (result === 'granted') {
      setStatusMessage('granted');
      setTimeout(() => {
        setVisible(false);
      }, 2500);
    } else if (result === 'denied') {
      setStatusMessage('denied');
    } else {
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-slide-up">
      <div className="bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-indigo-950/60 text-white">
        
        {/* Состояние: успешно разрешено */}
        {statusMessage === 'granted' ? (
          <div className="flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Уведомления включены!</h4>
              <p className="text-xs text-slate-300 mt-0.5">Теперь вы не пропустите сообщения от друзей.</p>
            </div>
          </div>
        ) : statusMessage === 'denied' ? (
          /* Состояние: пользователь заблокировал */
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Уведомления заблокированы</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Браузер отклонил запрос</p>
                </div>
              </div>
              <button 
                onClick={handleDismiss} 
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              Вы можете включить их в любой момент: нажмите на значок настроек или замка <b>🔒</b> слева от адреса сайта в строке браузера и разрешите пункт <b>«Уведомления»</b>.
            </p>

            <button
              onClick={handleDismiss}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
            >
              Понятно
            </button>
          </div>
        ) : (
          /* Обычный запрос на включение */
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0 animate-bounce-short">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-snug">Включить уведомления?</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Будьте в курсе новых сообщений</p>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="text-slate-500 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
                title="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Получайте мгновенные уведомления о новых сообщениях, картинках и заявках в друзья, даже когда вкладка сайта свернута.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleEnable}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Включить уведомления</span>
              </button>

              <button
                onClick={handleDismiss}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition"
              >
                Не сейчас
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
