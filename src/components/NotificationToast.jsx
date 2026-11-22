import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
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

  if (!notification) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full liquid-glass-modal border border-white/20 rounded-3xl p-4 shadow-2xl backdrop-blur-2xl animate-modal-spring">
      <div className="flex items-start gap-3">
        
        {/* Иконка */}
        <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 text-white flex items-center justify-center shrink-0">
          {notification.type === 'new_image' && <ImageIcon className="w-5 h-5" />}
          {notification.type === 'friend_request' && <Bell className="w-5 h-5 text-white" />}
          {notification.type === 'friend_accepted' && <UserCheck className="w-5 h-5 text-emerald-400" />}
        </div>

        {/* Текст */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">
            {notification.title}
          </p>
          <p className="text-xs text-neutral-300 mt-0.5 line-clamp-2">
            {notification.message}
          </p>

          {/* Кнопка действия */}
          {notification.type === 'friend_request' && (
            <button
              onClick={() => {
                clearNotification();
                onOpenRequests();
              }}
              className="mt-2 text-xs font-bold text-white hover:text-neutral-300 flex items-center gap-1 transition"
            >
              <span>Посмотреть заявку</span>
              <ArrowRight className="w-3.5 h-3.5" />
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
              className="mt-2 text-xs font-bold text-white hover:text-neutral-300 flex items-center gap-1 transition"
            >
              <span>Открыть {notification.image.group_id ? 'группу' : 'диалог'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Закрыть */}
        <button
          onClick={clearNotification}
          className="text-neutral-400 hover:text-white p-1 rounded-full transition"
        >
          <X className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}
