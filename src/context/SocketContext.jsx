import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getAuthToken, fixMediaUrls } from '../api';
import { sendBrowserNotification } from '../utils/browserNotifications';
import { getServerUrl } from '../config';

const SocketContext = createContext(null);

// Звуковое оповещение о новом сообщении (чистый Web Audio API, без внешних файлов)
function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Нота 1 (D5 - 587 Гц)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.2);

    // Нота 2 (A5 - 880 Гц) чуть позже
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime);
        gain2.gain.setValueAtTime(0.15, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.25);
      } catch (e) {}
    }, 90);
  } catch (e) {
    // В некоторых браузерах Web Audio требует первого клика пользователя по странице
  }
}

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [notification, setNotification] = useState(null);
  const [unreadMap, setUnreadMap] = useState({}); // { [friendId]: count }
  const [activeFriendId, setActiveFriendId] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);

  const activeFriendIdRef = useRef(null);
  const activeGroupIdRef = useRef(null);

  useEffect(() => {
    activeFriendIdRef.current = activeFriendId;
  }, [activeFriendId]);

  useEffect(() => {
    activeGroupIdRef.current = activeGroupId;
  }, [activeGroupId]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setUnreadMap({});
      return;
    }

    const token = getAuthToken();
    const serverUrl = getServerUrl();

    const newSocket = io(serverUrl, {
      auth: { token },
      query: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO успешно подключен! ID:', newSocket.id);
      if (token) {
        newSocket.emit('authenticate', token);
      }
    });

    newSocket.on('user_online', ({ userId }) => {
      setOnlineUsers((prev) => new Set(prev).add(Number(userId)));
    });

    newSocket.on('user_offline', ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(Number(userId));
        return next;
      });
    });

    newSocket.on('new_friend_request', ({ fromUser }) => {
      playNotificationSound();
      setNotification({
        type: 'friend_request',
        title: 'Новая заявка в друзья!',
        message: `${fromUser.username} хочет добавить вас в друзья`,
        user: fromUser
      });

      sendBrowserNotification({
        title: 'Новая заявка в друзья! 🔔',
        body: `${fromUser.username} хочет добавить вас в друзья`,
        icon: fromUser.avatar || '/favicon.svg',
        tag: `friend_req_${fromUser.id}`,
        data: { type: 'requests' },
        onClick: () => {
          window.focus();
          window.dispatchEvent(new CustomEvent('picshare_open_requests'));
        }
      });
    });

    newSocket.on('friend_request_accepted', ({ user: friend }) => {
      playNotificationSound();
      setNotification({
        type: 'friend_accepted',
        title: 'Заявка принята!',
        message: `${friend.username} теперь ваш друг! Теперь вы можете обмениваться картинками.`,
        user: friend
      });

      sendBrowserNotification({
        title: 'Заявка принята! 🎉',
        body: `${friend.username} теперь ваш друг! Теперь вы можете обмениваться картинками.`,
        icon: friend.avatar || '/favicon.svg',
        tag: `friend_acc_${friend.id}`,
        data: { type: 'friend', friend },
        onClick: () => {
          window.focus();
          window.dispatchEvent(new CustomEvent('picshare_open_friend', { detail: friend }));
        }
      });
    });

    newSocket.on('new_image', (rawImage) => {
      const image = fixMediaUrls(rawImage);
      const senderId = Number(image.sender_id);
      const isMe = senderId === Number(user.id);

      if (!isMe) {
        playNotificationSound();

        const isGroup = Boolean(image.group_id);
        const currentActiveFriend = activeFriendIdRef.current;
        const currentActiveGroup = activeGroupIdRef.current;

        const isChatCurrentlyOpen = isGroup
          ? Number(currentActiveGroup) === Number(image.group_id)
          : Number(currentActiveFriend) === senderId;

        // Всплывающий тост внутри сайта
        setNotification({
          type: 'new_image',
          title: isGroup 
            ? `Новое сообщение от ${image.sender_username}!`
            : `Новая картинка от ${image.sender_username}!`,
          message: image.caption || (image.image_url ? 'Прислал(а) изображение' : 'Новое сообщение'),
          image
        });

        // Браузерное Desktop/Push уведомление (когда вкладка свернута или открыт другой чат)
        if (document.hidden || !isChatCurrentlyOpen) {
          sendBrowserNotification({
            title: isGroup 
              ? `Группа: сообщение от ${image.sender_username}`
              : `Новое сообщение от ${image.sender_username}`,
            body: image.caption || (image.image_url ? 'Прислал(а) изображение' : 'Новое сообщение'),
            icon: image.sender_avatar || '/favicon.svg',
            tag: isGroup ? `group_${image.group_id}` : `friend_${senderId}`,
            data: isGroup 
              ? { type: 'group', groupId: image.group_id }
              : { type: 'friend', friend: { id: senderId, username: image.sender_username, avatar: image.sender_avatar } },
            onClick: () => {
              window.focus();
              if (isGroup) {
                window.dispatchEvent(new CustomEvent('picshare_open_group', { detail: { groupId: image.group_id } }));
              } else {
                window.dispatchEvent(new CustomEvent('picshare_open_friend', { 
                  detail: {
                    id: senderId,
                    username: image.sender_username,
                    avatar: image.sender_avatar
                  } 
                }));
              }
            }
          });
        }

        // Если сейчас открыт не диалог с этим другом, увеличиваем счетчик непрочитанных
        if (!isGroup && !isChatCurrentlyOpen) {
          setUnreadMap((prev) => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1
          }));
        }

        // Обновляем заголовок вкладки браузера
        if (document.hidden) {
          document.title = `(1) Новое сообщение от ${image.sender_username}!`;
        }
      }
    });

    setSocket(newSocket);

    // Сброс заголовка при возврате на вкладку
    const handleVisibility = () => {
      if (!document.hidden) {
        document.title = 'PicShare — Обмен картинками с друзьями';
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      newSocket.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.id]);

  const markAsRead = (friendId) => {
    if (!friendId) return;
    setUnreadMap((prev) => {
      const next = { ...prev };
      delete next[Number(friendId)];
      return next;
    });
  };

  const clearNotification = () => setNotification(null);

  return (
    <SocketContext.Provider value={{ 
      socket, 
      onlineUsers, 
      notification, 
      clearNotification,
      unreadMap,
      markAsRead,
      activeFriendId,
      setActiveFriendId,
      activeGroupId,
      setActiveGroupId
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
