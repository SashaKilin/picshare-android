import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Capacitor } from '@capacitor/core';
import { Bell, Image as ImageIcon, X, ArrowRight, UserCheck } from 'lucide-react';

export function NotificationToast({ onOpenRequests, onSelectFriend, onSelectGroup }) {
  const { notification, clearNotification } = useSocket();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        clearNotification();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // На Android нативном приложении системные уведомления приходят в шторку,
  // поэтому всплывающий внизу экрана тост не отображается
  if (Capacitor.isNativePlatform()) return null;

  if (!notification) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 border border-indigo-500/40 rounded-2xl p-4 shadow-2xl shadow-indigo-950/60 animate-bounce-short">
      <div className="flex items-start gap-3">
        
        {/* Иконка */}
        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
          {notification.type === 'new_image' && <ImageIcon className="w-5 h-5" />}
          {notification.type === 'friend_request' && <Bell className="w-5 h-5 text-rose-400" />}
          {notification.type === 'friend_accepted' && <UserCheck className="w-5 h-5 text-emerald-400" />}
        </div>

        {/* Текст */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">
            {notification.title}
          </p>
          <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
            {notification.message}
          </p>

          {/* Кнопка действия */}
          {notification.type === 'friend_request' && (
            <button
              onClick={() => {
                clearNotification();
                onOpenRequests();
              }}
              className="mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>Посмотреть заявку</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {notification.type === 'new_image' && (
            <button
              onClick={() => {
                clearNotification();
                if (notification.image.group_id && onSelectGroup) {
                  onSelectGroup(notification.image.group_id);
                } else if (onSelectFriend) {
                  onSelectFriend({
                    id: notification.image.sender_id,
                    username: notification.image.sender_username,
                    avatar: notification.image.sender_avatar
                  });
                }
              }}
              className="mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>Открыть {notification.image.group_id ? 'группу' : 'диалог'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Закрыть */}
        <button
          onClick={clearNotification}
          className="text-slate-500 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}
