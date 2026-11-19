import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../api';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { 
  Send, 
  Trash2, 
  Download, 
  X, 
  MoreVertical, 
  UploadCloud, 
  AlertCircle,
  FileImage,
  UserMinus,
  ArrowLeft,
  Camera,
  ArrowDown,
  User,
  Reply,
  Users,
  Bookmark,
  Check,
  CheckCheck,
  Clock,
  Heart,
  Smile,
  Paperclip,
  Phone
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StickersPicker } from './StickersPicker';

// Вспомогательная функция для группировки по датам
function formatMessageDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Сегодня';
  if (isYesterday) return 'Вчера';

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

// Компонент для свайпа сообщения влево (как в Telegram)
function SwipeableMessage({ onReply, children, isMe }) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const hasTriggeredHapticRef = useRef(false);

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    hasTriggeredHapticRef.current = false;
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping || e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartRef.current.x;
    const deltaY = currentY - touchStartRef.current.y;

    // Если преобладает вертикальная прокрутка страницы, не перехватываем
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(offsetX) < 10) {
      return;
    }

    // Свайп влево
    if (deltaX < 0) {
      const clamped = Math.max(-65, deltaX * 0.65);
      setOffsetX(clamped);

      if (clamped <= -38 && !hasTriggeredHapticRef.current) {
        hasTriggeredHapticRef.current = true;
        if (navigator.vibrate) {
          try { navigator.vibrate(15); } catch (err) {}
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    if (offsetX <= -38) {
      onReply && onReply();
    }
    setOffsetX(0);
  };

  const replyOpacity = Math.min(1, Math.abs(offsetX) / 38);
  const replyScale = Math.min(1, Math.abs(offsetX) / 32);

  return (
    <div 
      className="relative w-full flex select-none touch-pan-y"
      style={{ justifyContent: isMe ? 'flex-end' : 'flex-start' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div 
        className="w-full flex"
        style={{
          justifyContent: isMe ? 'flex-end' : 'flex-start',
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
        }}
      >
        {children}
      </div>

      {/* Индикатор ответа при свайпе */}
      {offsetX < -8 && (
        <div 
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white shadow-lg pointer-events-none z-10"
          style={{
            opacity: replyOpacity,
            transform: `translateY(-50%) scale(${replyScale})`
          }}
        >
          <Reply className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

export function ImageChat({
  friend,
  group,
  onFriendRemoved,
  onOpenLightbox,
  onBack,
  onOpenProfile,
  onOpenGroupInfo,
  onOpenStickerStore,
}) {
  const { user } = useAuth();
  const { socket, onlineUsers, markAsRead, setActiveFriendId, setActiveGroupId, typingUsers, sendTyping, stopTyping } = useSocket();

  const isGroup = Boolean(group);
  const targetId = isGroup ? group.id : friend?.id;
  const isSaved = Boolean(!isGroup && (friend?.isSaved || (friend && user && Number(friend.id) === Number(user.id))));

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [isStickersOpen, setIsStickersOpen] = useState(false);

  // Состояние загрузки новой картинки
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Дополнительные возможности
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [newUnreadCount, setNewUnreadCount] = useState(0);
  const [reactions, setReactions] = useState({});

  // Ответ на сообщение (Reply)
  const [replyingTo, setReplyingTo] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  // Анимации удаления и двойного тапа
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [heartBurstId, setHeartBurstId] = useState(null);
  const lastTapRef = useRef({ time: 0, id: null });

  // Индикатор набора текста ("Печатает...")
  const typingTimeoutRef = useRef(null);
  const isTypingActiveRef = useRef(false);

  const isFriendTyping = !isGroup && !isSaved && Boolean(typingUsers && typingUsers[`direct_${friend?.id}`]);
  const groupTypingList = isGroup
    ? Object.values(typingUsers || {}).filter(
        (t) => Number(t.groupId) === Number(group?.id) && Number(t.userId) !== Number(user?.id)
      )
    : [];
  const isAnyGroupTyping = groupTypingList.length > 0;

  const fileInputRef = useRef(null);
  const captionInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const latestImageIdRef = useRef(0);
  const isNearBottomRef = useRef(true);

  // Сброс индикатора печати при уходе из чата
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTypingActiveRef.current) {
        isTypingActiveRef.current = false;
        if (!isSaved && targetId) {
          stopTyping(isGroup ? { groupId: group?.id } : { recipientId: friend?.id });
        }
      }
    };
  }, [targetId, isGroup]);

  // Автопрокрутка при появлении индикатора набора текста, если пользователь внизу
  useEffect(() => {
    if (isFriendTyping || isAnyGroupTyping) {
      if (!showScrollBottom) {
        scrollToBottom(false);
      }
    }
  }, [isFriendTyping, isAnyGroupTyping]);

  useEffect(() => {
    if (isGroup && group?.id) {
      setActiveGroupId(Number(group.id));
      setActiveFriendId(null);
    } else if (friend?.id) {
      setActiveFriendId(Number(friend.id));
      setActiveGroupId(null);
      markAsRead(Number(friend.id));
    }
    return () => {
      setActiveFriendId(null);
      setActiveGroupId(null);
    };
  }, [friend?.id, group?.id, isGroup]);

  useEffect(() => {
    if (!targetId) return;

    let mounted = true;
    setLoading(true);
    setError('');
    setNewUnreadCount(0);
    setReplyingTo(null);

    const loadAction = isGroup 
      ? api.getGroupChatImages(group.id)
      : api.getChatImages(friend.id);

    loadAction
      .then((data) => {
        if (mounted) {
          const loadedImages = data.images || [];
          setImages(loadedImages);
          if (loadedImages.length > 0) {
            latestImageIdRef.current = Math.max(...loadedImages.map((i) => i.id));
          }
          setLoading(false);
          scrollToBottom(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Не удалось загрузить историю сообщений');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [targetId, isGroup]);

  // Socket.IO
  useEffect(() => {
    if (!socket || !targetId) return;

    const handleNewImage = (newImg) => {
      const myId = Number(user.id);
      const isInputFocused = document.activeElement === captionInputRef.current;

      if (isGroup) {
        if (Number(newImg.group_id) === Number(group.id)) {
          setImages((prev) => {
            if (prev.some((img) => img.id === newImg.id)) return prev;
            latestImageIdRef.current = Math.max(latestImageIdRef.current, newImg.id);
            return [...prev, newImg];
          });

          if (isNearBottomRef.current || Number(newImg.sender_id) === myId || isInputFocused) {
            scrollToBottom(true);
          } else {
            setNewUnreadCount((c) => c + 1);
            setShowScrollBottom(true);
          }
        }
      } else {
        const sId = Number(newImg.sender_id);
        const rId = Number(newImg.receiver_id);
        const fId = Number(friend.id);

        if (!newImg.group_id && ((sId === fId && rId === myId) || (sId === myId && rId === fId))) {
          setImages((prev) => {
            if (prev.some((img) => img.id === newImg.id)) return prev;
            latestImageIdRef.current = Math.max(latestImageIdRef.current, newImg.id);
            return [...prev, newImg];
          });

          // Если чат открыт и сообщение входящее, сразу помечаем прочитанным
          if (sId === fId) {
            api.markChatRead(friend.id).catch(() => {});
          }

          if (isNearBottomRef.current || sId === myId || isInputFocused) {
            scrollToBottom(true);
          } else {
            setNewUnreadCount((c) => c + 1);
            setShowScrollBottom(true);
          }
        }
      }
    };

    const handleDeletedImage = ({ imageId }) => {
      triggerDeleteAnimation(imageId);
    };

    const handleMessagesRead = ({ readerId }) => {
      if (!isGroup && friend && Number(readerId) === Number(friend.id)) {
        setImages((prev) =>
          prev.map((msg) =>
            Number(msg.sender_id) === Number(user.id) ? { ...msg, is_read: true } : msg
          )
        );
      }
    };

    socket.on('new_image', handleNewImage);
    socket.on('image_deleted', handleDeletedImage);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('new_image', handleNewImage);
      socket.off('image_deleted', handleDeletedImage);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, friend?.id, user?.id]);

  // Polling fallback
  useEffect(() => {
    if (!friend?.id) return;

    const interval = setInterval(async () => {
      try {
        const data = await api.getChatImages(friend.id);
        const incomingImages = data.images || [];

        if (incomingImages.length > 0) {
          const maxId = Math.max(...incomingImages.map((i) => i.id));
          if (maxId > latestImageIdRef.current) {
            latestImageIdRef.current = maxId;
            setImages(incomingImages);
            if (isNearBottomRef.current) {
              scrollToBottom(true);
            }
          }
        }
      } catch (e) {}
    }, 2500);

    return () => clearInterval(interval);
  }, [friend?.id]);

  function handleScroll() {
    const el = chatContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceFromBottom < 160;
    isNearBottomRef.current = isNearBottom;

    if (isNearBottom) {
      setShowScrollBottom(false);
      setNewUnreadCount(0);
    } else if (distanceFromBottom > 280) {
      setShowScrollBottom(true);
    }
  }

  function scrollToBottom(smooth = true) {
    setTimeout(() => {
      const el = chatContainerRef.current;
      if (el) {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
      setShowScrollBottom(false);
      setNewUnreadCount(0);
    }, 40);
  }

  function handleFileSelect(file) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение (PNG, JPG, WebP, GIF)');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('Размер изображения не должен превышать 25 МБ');
      return;
    }

    setError('');
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  }

  useEffect(() => {
    function handlePaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          handleFileSelect(file);
          break;
        }
      }
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Автопрокрутка вниз при открытии клавиатуры на Android и мобильных экранах
  useEffect(() => {
    let removeKeyboardListener = null;

    if (Capacitor.isNativePlatform()) {
      try {
        const handleShow = () => {
          scrollToBottom(true);
          setTimeout(() => scrollToBottom(true), 100);
          setTimeout(() => scrollToBottom(true), 260);
        };
        const willShowPromise = Keyboard.addListener('keyboardWillShow', handleShow);
        const didShowPromise = Keyboard.addListener('keyboardDidShow', handleShow);
        removeKeyboardListener = () => {
          willShowPromise.then((h) => h?.remove?.()).catch(() => {});
          didShowPromise.then((h) => h?.remove?.()).catch(() => {});
        };
      } catch (e) {}
    }

    const handleVisualResize = () => {
      if (document.activeElement === captionInputRef.current) {
        scrollToBottom(true);
      }
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualResize);
    }

    return () => {
      if (removeKeyboardListener) removeKeyboardListener();
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualResize);
      }
    };
  }, []);

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  function clearSelectedFile() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  // Плавное удаление сообщения с анимацией схлопывания
  function triggerDeleteAnimation(imageId, onFinish) {
    setDeletingIds((prev) => new Set(prev).add(imageId));
    setTimeout(() => {
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
      if (onFinish) onFinish();
    }, 320);
  }

  // Двойной тап по сообщению для быстрой реакции (сердечко с анимацией всплеска)
  function handleMessageTap(msgId) {
    const now = Date.now();
    if (lastTapRef.current.id === msgId && now - lastTapRef.current.time < 350) {
      setHeartBurstId(msgId);
      handleAddReaction(msgId, '❤️');
      if (navigator.vibrate) {
        try { navigator.vibrate(20); } catch (e) {}
      }
      setTimeout(() => setHeartBurstId((curr) => curr === msgId ? null : curr), 650);
      lastTapRef.current = { time: 0, id: null };
    } else {
      lastTapRef.current = { time: now, id: msgId };
    }
  }

  // Отправка (текст, фото или текст + фото) с мгновенным оптимистичным отображением (0мс задержки)
  async function handleSendImage(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    const currentInputVal = captionInputRef.current ? captionInputRef.current.value : caption;
    const textVal = (currentInputVal ?? '').trim();
    const hasText = Boolean(textVal);
    const hasFile = Boolean(selectedFile);

    if (!hasText && !hasFile) return;

    // Сохраняем значения для асинхронной отправки
    const fileToSend = selectedFile;
    const previewToSend = previewUrl;
    const replyToSend = replyingTo;
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    // 1. МГНОВЕННО очищаем поле ввода и ответ, чтобы пользователь мог сразу печатать дальше!
    setCaption('');
    if (captionInputRef.current) {
      captionInputRef.current.value = '';
      captionInputRef.current.style.height = '42px';
    }
    setReplyingTo(null);
    clearSelectedFile();

    // Снимаем статус "печатает..." при отправке сообщения
    if (isTypingActiveRef.current) {
      isTypingActiveRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (!isSaved && targetId) {
        stopTyping(isGroup ? { groupId: group?.id } : { recipientId: friend?.id });
      }
    }

    // 2. Удерживаем клавиатуру открытой на Android!
    captionInputRef.current?.focus();

    // 3. Создаём оптимистичное сообщение со статусом отправки (часики как в Telegram)
    const optimisticMessage = {
      id: tempId,
      temp_id: tempId,
      sender_id: user.id,
      receiver_id: isGroup ? null : friend?.id,
      group_id: isGroup ? group?.id : null,
      file_url: previewToSend || '',
      original_name: fileToSend ? fileToSend.name : '',
      caption: textVal,
      reply_to: replyToSend ? {
        id: replyToSend.id,
        sender_username: replyToSend.sender_username,
        caption: replyToSend.caption,
        file_url: replyToSend.file_url
      } : null,
      reply_to_id: replyToSend ? replyToSend.id : null,
      created_at: new Date().toISOString(),
      sender_username: user.username,
      sender_avatar: user.avatar,
      is_pending: true, // Показывает часики!
      is_read: false
    };

    // 4. Мгновенно отображаем в чате и скроллим вниз
    setImages((prev) => [...prev, optimisticMessage]);
    scrollToBottom(true);

    if (hasFile) {
      confetti({ particleCount: 25, spread: 40, origin: { y: 0.85 } });
    }

    // 5. Формируем запрос на сервер
    const formData = new FormData();
    if (hasFile) {
      formData.append('image', fileToSend);
    }
    if (isGroup) {
      formData.append('groupId', group.id);
    } else {
      formData.append('receiverId', friend.id);
    }
    if (hasText) {
      formData.append('caption', textVal);
    }
    if (replyToSend) {
      formData.append('replyToId', replyToSend.id);
    }

    try {
      setSending(true);
      setError('');
      const res = await api.sendImage(formData);
      if (res.image) {
        latestImageIdRef.current = Math.max(latestImageIdRef.current, res.image.id);
        setImages((prev) => {
          const alreadyExists = prev.some((img) => img.id === res.image.id);
          if (alreadyExists) {
            return prev.filter((img) => img.id !== tempId);
          }
          return prev.map((img) =>
            img.id === tempId ? { ...res.image, is_pending: false } : img
          );
        });
      }
    } catch (err) {
      setError(err.message || 'Не удалось отправить сообщение');
      // Помечаем оптимистичное сообщение как ошибку отправки
      setImages((prev) =>
        prev.map((img) =>
          img.id === tempId ? { ...img, is_pending: false, is_failed: true } : img
        )
      );
    } finally {
      setSending(false);
      captionInputRef.current?.focus();
    }
  }

  // Мгновенная отправка стикера (как в Telegram)
  async function handleSendSticker(sticker) {
    if (!sticker || !sticker.file_url) return;
    const tempId = 'temp_stk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const replyToSend = replyingTo;
    setReplyingTo(null);

    const optimisticSticker = {
      id: tempId,
      temp_id: tempId,
      sender_id: user.id,
      receiver_id: isGroup ? null : friend?.id,
      group_id: isGroup ? group?.id : null,
      file_url: sticker.file_url,
      original_name: 'sticker.webp',
      caption: '',
      reply_to: replyToSend ? {
        id: replyToSend.id,
        sender_username: replyToSend.sender_username,
        caption: replyToSend.caption,
        file_url: replyToSend.file_url
      } : null,
      reply_to_id: replyToSend ? replyToSend.id : null,
      created_at: new Date().toISOString(),
      sender_username: user.username,
      sender_avatar: user.avatar,
      is_pending: true,
      is_sticker: true,
      is_read: false
    };

    setImages((prev) => [...prev, optimisticSticker]);
    scrollToBottom(true);

    try {
      const payload = {
        fileUrl: sticker.file_url,
        isSticker: true,
        receiverId: isGroup ? undefined : friend?.id,
        groupId: isGroup ? group?.id : undefined,
        replyToId: replyToSend ? replyToSend.id : undefined
      };
      const res = await api.sendSticker(payload);
      if (res.image) {
        setImages((prev) =>
          prev.map((img) => (img.id === tempId ? { ...res.image, is_pending: false, is_sticker: true } : img))
        );
      }
    } catch (err) {
      console.error('Ошибка отправки стикера:', err);
      setError('Не удалось отправить стикер');
      setImages((prev) => prev.filter((img) => img.id !== tempId));
    }
  }

  function handleStartReply(img) {
    const senderName = img.sender_username || (Number(img.sender_id) === Number(user.id) ? user.username : (isGroup ? 'Участник' : friend?.username));
    setReplyingTo({
      id: img.id,
      sender_id: img.sender_id,
      sender_username: senderName,
      caption: img.caption || '',
      file_url: img.file_url || ''
    });
    setTimeout(() => {
      captionInputRef.current?.focus();
    }, 60);
  }

  function scrollToMessage(messageId) {
    if (!messageId) return;
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId((curr) => (curr === messageId ? null : curr));
      }, 2000);
    }
  }

  async function handleDeleteImage(imageId) {
    if (!confirm('Удалить это сообщение?')) return;
    triggerDeleteAnimation(imageId, async () => {
      try {
        await api.deleteImage(imageId);
      } catch (err) {
        alert(err.message || 'Ошибка удаления');
      }
    });
  }

  async function handleRemoveFriend() {
    if (!confirm(`Удалить ${friend.username} из друзей?`)) return;
    try {
      await api.removeFriend(friend.id);
      if (onFriendRemoved) onFriendRemoved(friend.id);
    } catch (err) {
      alert(err.message || 'Ошибка удаления из друзей');
    }
  }

  function handleAddReaction(imageId, emoji) {
    setReactions((prev) => ({
      ...prev,
      [imageId]: prev[imageId] === emoji ? null : emoji
    }));
  }

  const isOnline = onlineUsers.has(Number(friend?.id));
  const hasContentToSend = Boolean(selectedFile || caption.trim());

  return (
    <div 
      className="flex-1 min-h-0 flex flex-col h-full bg-slate-950 relative overflow-hidden animate-chat-enter"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-30 bg-indigo-950/90 backdrop-blur-sm border-2 border-dashed border-indigo-400 flex flex-col items-center justify-center pointer-events-none animate-fadeIn">
          <div className="p-4 rounded-3xl bg-indigo-600/30 text-indigo-300 mb-3 animate-bounce">
            <UploadCloud className="w-12 h-12" />
          </div>
          <p className="text-base sm:text-lg font-bold text-white">Перетащите картинку сюда</p>
        </div>
      )}

      {/* 1. Шапка чата (Telegram-стиль пузырями со скриншота 3) */}
      <div className="safe-top px-2.5 py-2 sm:px-4 sm:py-2.5 shrink-0 z-20 flex items-center justify-between gap-2 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-full text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-800/80 shadow-md md:hidden transition shrink-0 active:scale-90"
              title="Назад к списку друзей"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {isGroup ? (
            /* Шапка для Группового чата (пузырь как в ТГ) */
            <div 
              onClick={() => onOpenGroupInfo && onOpenGroupInfo(group)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-850 border border-slate-800/80 shadow-md backdrop-blur-md cursor-pointer transition select-none group min-w-0 active:scale-[0.98]"
              title="Информация о группе и участники"
            >
              <div className="relative shrink-0">
                <img
                  src={group?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${group?.name}`}
                  alt={group?.name}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-indigo-500/40 object-cover bg-slate-800 shadow group-hover:border-indigo-400"
                />
              </div>

              <div className="min-w-0 pr-1">
                <div className="font-bold text-sm text-slate-100 flex items-center gap-2 truncate leading-tight">
                  <span className="truncate group-hover:text-indigo-300">{group?.name}</span>
                </div>
                {isAnyGroupTyping ? (
                  <div className="text-[11px] text-indigo-400 truncate flex items-center gap-1 font-medium mt-0.5 leading-tight">
                    <span className="truncate">
                      {groupTypingList.map((t) => t.username).join(', ')} {groupTypingList.length > 1 ? 'печатают' : 'печатает'}
                    </span>
                    <span className="inline-flex items-center gap-0.5 ml-0.5 shrink-0">
                      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-typing-dot-1" />
                      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-typing-dot-2" />
                      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-typing-dot-3" />
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5 leading-tight">
                    <span className="text-indigo-400 font-medium">{group?.members_count || 1} участников</span>
                  </div>
                )}
              </div>
            </div>
          ) : isSaved ? (
            /* Шапка для «Избранного» (пузырь как в ТГ) */
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800/80 shadow-md backdrop-blur-md select-none min-w-0">
              <div className="relative shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                  <Bookmark className="w-5 h-5 fill-white/20" />
                </div>
              </div>

              <div className="min-w-0 pr-1">
                <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5 truncate leading-tight">
                  <span className="truncate">Избранное</span>
                </div>
                <div className="text-[11px] text-indigo-400/90 font-medium truncate mt-0.5 leading-tight">
                  Сохранённые сообщения
                </div>
              </div>
            </div>
          ) : (
            /* Шапка для диалога 1-на-1 (пузырь как в ТГ, скрин 3) */
            <div 
              onClick={() => onOpenProfile && onOpenProfile(friend?.id)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-850 border border-slate-800/80 shadow-md backdrop-blur-md cursor-pointer transition select-none group min-w-0 active:scale-[0.98]"
              title="Открыть профиль пользователя"
            >
              <div className="relative shrink-0">
                <img
                  src={friend?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend?.username}`}
                  alt={friend?.username}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-700/80 object-cover bg-slate-800 group-hover:border-indigo-400"
                />
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 transition-colors ${
                    isOnline ? 'bg-emerald-500 animate-online-pulse' : 'bg-slate-600'
                  }`}
                />
              </div>

              <div className="min-w-0 pr-1">
                <div className="font-bold text-sm text-slate-100 flex items-center gap-2 truncate leading-tight">
                  <span className="truncate group-hover:text-indigo-300">{friend?.username}</span>
                </div>
                {isFriendTyping ? (
                  <div className="text-[11px] text-indigo-400 truncate flex items-center gap-1 font-medium mt-0.5 leading-tight">
                    <span>печатает</span>
                    <span className="inline-flex items-center gap-0.5 ml-0.5">
                      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-typing-dot-1" />
                      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-typing-dot-2" />
                      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-typing-dot-3" />
                    </span>
                  </div>
                ) : (
                  <div className={`text-[11px] truncate mt-0.5 leading-tight ${isOnline ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                    {isOnline ? 'в сети' : 'не в сети'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Правый пузырь действий (телефон/профиль + 3 точки, как в ТГ на скрине 3) */}
        {!isSaved && (
          <div className="relative shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800/80 shadow-md backdrop-blur-md">
            <button
              onClick={() => isGroup ? (onOpenGroupInfo && onOpenGroupInfo(group)) : (onOpenProfile && onOpenProfile(friend?.id))}
              className="p-1.5 rounded-full text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 transition active:scale-90"
              title={isGroup ? 'О группе' : 'Профиль'}
            >
              {isGroup ? <Users className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition active:scale-90"
              title="Меню чата"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-1 z-30 animate-scale-up">
              {isGroup ? (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenGroupInfo && onOpenGroupInfo(group);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition"
                >
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>О группе и участники</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenProfile && onOpenProfile(friend?.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition mb-1"
                  >
                    <User className="w-4 h-4 text-indigo-400" />
                    <span>Профиль</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleRemoveFriend();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>Удалить из друзей</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>

      {/* Ошибка */}
      {error && (
        <div className="p-2.5 mx-3 mt-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Область сообщений */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6 space-y-4 overscroll-contain"
      >
        {loading && (
          <div className="flex items-center justify-center h-full text-xs text-slate-500 animate-pulse">
            Загрузка сообщений...
          </div>
        )}

        {!loading && images.length === 0 && (
          isSaved ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 animate-fadeIn select-none">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10 animate-pop-scale">
                <Bookmark className="w-8 h-8 sm:w-10 sm:h-10 fill-indigo-400/20" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h4 className="font-bold text-slate-100 text-base sm:text-lg">Ваше «Избранное»</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Личное облако для важных заметок, ссылок и фотографий. Отправляйте сюда всё, что хотите сохранить — доступно только вам на любых ваших устройствах!
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <FileImage className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-200 text-sm sm:text-base">Начните общение!</h4>
                <p className="text-xs text-slate-400 max-w-xs sm:max-w-sm mt-1">
                  Напишите сообщение или отправьте картинку своему другу.
                </p>
              </div>
            </div>
          )
        )}

        {/* Сообщения (текстовые и с картинками) */}
        {images.map((img, index) => {
          const isMe = Number(img.sender_id) === Number(user.id);
          const isSticker = Boolean(img.is_sticker);
          const hasImage = Boolean(img.file_url && img.file_url.trim()) && !isSticker;
          const currentDate = formatMessageDate(img.created_at);
          const prevDate = index > 0 ? formatMessageDate(images[index - 1].created_at) : null;
          const showDateDivider = currentDate !== prevDate;
          const activeReaction = reactions[img.id];

          return (
            <React.Fragment key={img.id}>
              
              {/* Разделитель даты */}
              {showDateDivider && (
                <div className="flex items-center justify-center my-3 select-none">
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-full shadow-sm backdrop-blur">
                    {currentDate}
                  </span>
                </div>
              )}

              <div 
                id={`msg-${img.id}`}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${
                  deletingIds.has(img.id)
                    ? 'animate-msg-delete'
                    : isMe
                    ? 'animate-msg-me'
                    : 'animate-msg-other'
                } group w-full`}
              >
                
                <div 
                  onClick={() => (!isMe && onOpenProfile) && onOpenProfile(img.sender_id)}
                  className={`flex items-center gap-1.5 mb-1 px-1 ${(!isMe && isGroup) ? 'cursor-pointer hover:opacity-85 group/author' : ''}`}
                  title={!isMe && isGroup ? 'Посмотреть профиль автора' : undefined}
                >
                  {!isMe && isGroup && (
                    <img
                      src={img.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${img.sender_username}`}
                      alt={img.sender_username}
                      className="w-4 h-4 rounded-full border border-slate-700 object-cover"
                    />
                  )}
                  <span className={`text-[11px] sm:text-xs font-semibold ${!isMe && isGroup ? 'text-indigo-300 group-hover/author:underline' : 'text-slate-400'}`}>
                    {isMe ? 'Вы' : img.sender_username || (isGroup ? 'Участник' : friend?.username)}
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 select-none">
                    <span>{new Date(img.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMe && (
                      img.is_pending ? (
                        <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-spin-slow" title="Отправляется..." />
                      ) : img.is_failed ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" title="Не удалось отправить" />
                      ) : !isGroup && (
                        Boolean(img.is_read) ? (
                          <CheckCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" title="Прочитано" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" title="Доставлено" />
                        )
                      )
                    )}
                  </span>
                </div>

                <SwipeableMessage onReply={() => handleStartReply(img)} isMe={isMe}>
                  {isSticker ? (
                    /* ВАРИАНТ 0: Стикер (как в Telegram — чистый прозрачный, без рамок) */
                    <div 
                      onClick={() => handleMessageTap(img.id)}
                      className={`relative group/stk select-none my-1 transition-transform active:scale-95 touch-manipulation ${
                        highlightedMessageId === img.id ? 'ring-2 ring-indigo-400 rounded-2xl p-1 shadow-lg' : ''
                      }`}
                    >
                      {heartBurstId === img.id && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                          <span className="text-5xl animate-heart-burst drop-shadow-xl select-none">
                            ❤️
                          </span>
                        </div>
                      )}

                      {/* Цитата ответа (если есть) */}
                      {img.reply_to && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            scrollToMessage(img.reply_to.id);
                          }}
                          className="mb-1.5 p-1.5 rounded-xl bg-slate-900/80 border-l-3 border-indigo-400 flex items-center gap-2 cursor-pointer transition select-none group/quote max-w-[200px]"
                        >
                          <div className="min-w-0 flex-1 text-left">
                            <div className="text-[10px] font-bold text-indigo-300 truncate">
                              {img.reply_to.username || 'Пользователь'}
                            </div>
                            <div className="text-[9px] text-slate-300 truncate">
                              {img.reply_to.caption || (img.reply_to.file_url ? '📷 Стикер/фото' : 'Сообщение')}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="relative">
                        <img
                          src={img.file_url}
                          alt="Стикер"
                          className="w-32 h-32 sm:w-40 sm:h-40 object-contain filter drop-shadow-md hover:scale-105 transition-transform duration-150 cursor-pointer"
                          loading="lazy"
                          onClick={() => onOpenLightbox(img)}
                        />

                        {activeReaction && (
                          <span className="absolute -bottom-2 -right-2 text-base bg-slate-900/90 border border-slate-700/80 px-2 py-0.5 rounded-full shadow-lg animate-reaction-pop">
                            {activeReaction}
                          </span>
                        )}

                        <div className="absolute top-0 right-0 opacity-0 group-hover/stk:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900/80 backdrop-blur-sm rounded-lg p-1 border border-slate-700/60 shadow">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddReaction(img.id, '❤️'); }}
                            className="text-xs hover:scale-125 transition"
                          >
                            ❤️
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartReply(img); }}
                            className="text-slate-400 hover:text-white p-0.5"
                            title="Ответить"
                          >
                            <Reply className="w-3 h-3" />
                          </button>
                          {isMe && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteImage(img.id); }}
                              className="text-slate-400 hover:text-rose-400 p-0.5"
                              title="Удалить"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : hasImage ? (
                    <div 
                      onClick={() => handleMessageTap(img.id)}
                      className={`relative w-full max-w-[85%] sm:max-w-md rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl transition-all active:scale-[0.985] touch-manipulation ${
                        highlightedMessageId === img.id ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 shadow-indigo-500/50 shadow-lg scale-[1.01]' : ''
                      }`}
                    >
                      {/* Анимация всплеска сердечка при двойном тапе */}
                      {heartBurstId === img.id && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                          <span className="text-5xl animate-heart-burst drop-shadow-xl select-none">
                            ❤️
                          </span>
                        </div>
                      )}
                      
                      {/* Цитата ответа на предыдущее сообщение (если есть) */}
                      {img.reply_to && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            scrollToMessage(img.reply_to.id);
                          }}
                          className="m-2 p-2 rounded-xl bg-slate-950/70 hover:bg-slate-950 border-l-3 border-indigo-400 flex items-center gap-2 cursor-pointer transition select-none group/quote"
                          title="Перейти к цитируемому сообщению"
                        >
                          {img.reply_to.file_url && (
                            <img 
                              src={img.reply_to.file_url} 
                              alt="quote thumbnail" 
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover shrink-0 border border-slate-800" 
                            />
                          )}
                          <div className="min-w-0 flex-1 text-left">
                            <div className="text-[11px] font-bold text-indigo-300 group-hover/quote:underline truncate">
                              {img.reply_to.username || 'Пользователь'}
                            </div>
                            <div className="text-[10px] text-slate-300 truncate">
                              {img.reply_to.caption || (img.reply_to.file_url ? '📷 Фотография' : 'Сообщение')}
                            </div>
                          </div>
                        </div>
                      )}

                      <div 
                        className="cursor-pointer overflow-hidden bg-slate-950 max-h-[350px] sm:max-h-[420px] flex items-center justify-center relative active:opacity-90"
                        onClick={() => onOpenLightbox(img)}
                      >
                        <img
                          src={img.file_url}
                          alt={img.original_name || 'Фотография'}
                          className="w-full h-auto max-h-[350px] sm:max-h-[420px] object-cover"
                          loading="lazy"
                        />

                        {activeReaction && (
                          <span className="absolute bottom-2 right-2 text-base bg-slate-900/90 border border-slate-700/80 px-2 py-0.5 rounded-full shadow-lg animate-reaction-pop">
                            {activeReaction}
                          </span>
                        )}
                      </div>

                      {img.caption && (
                        <div className="p-2.5 sm:p-3 bg-slate-900/95 border-t border-slate-800 text-xs sm:text-sm text-slate-200 break-words">
                          {img.caption}
                        </div>
                      )}

                      <div className="px-2.5 sm:px-3 py-1.5 bg-slate-900/90 border-t border-slate-800/60 flex items-center justify-between text-slate-400 text-xs">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAddReaction(img.id, '❤️')}
                            className={`p-1 rounded-lg hover:bg-slate-800 transition text-xs ${activeReaction === '❤️' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400 hover:text-rose-400'}`}
                            title="Нравится"
                          >
                            ❤️
                          </button>
                          <button
                            onClick={() => handleAddReaction(img.id, '🔥')}
                            className={`p-1 rounded-lg hover:bg-slate-800 transition text-xs ${activeReaction === '🔥' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-amber-400'}`}
                            title="Огонь"
                          >
                            🔥
                          </button>
                          <button
                            onClick={() => handleAddReaction(img.id, '😂')}
                            className={`p-1 rounded-lg hover:bg-slate-800 transition text-xs ${activeReaction === '😂' ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}`}
                            title="Смешно"
                          >
                            😂
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Кнопка ответа на сообщение */}
                          <button
                            onClick={() => handleStartReply(img)}
                            className="p-1.5 rounded-lg hover:text-indigo-300 hover:bg-slate-800 transition touch-manipulation"
                            title="Ответить"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={img.file_url}
                            download={img.original_name || 'image'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition touch-manipulation"
                            title="Скачать оригинал"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {isMe && (
                            <button
                              onClick={() => handleDeleteImage(img.id)}
                              className="p-1.5 rounded-lg hover:text-rose-400 hover:bg-rose-500/10 transition touch-manipulation"
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  ) : (
                    /* ВАРИАНТ 2: Обычное текстовое сообщение */
                    <div 
                      onClick={() => handleMessageTap(img.id)}
                      className={`relative max-w-[85%] sm:max-w-md p-3 sm:p-3.5 rounded-2xl shadow-md transition-all active:scale-[0.985] touch-manipulation ${
                        highlightedMessageId === img.id ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 shadow-indigo-500/50 shadow-lg scale-[1.01]' : ''
                      } ${
                        isMe
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-xs'
                          : 'bg-slate-800 text-slate-100 rounded-tl-xs border border-slate-700/60'
                      }`}
                    >
                      {/* Анимация всплеска сердечка при двойном тапе */}
                      {heartBurstId === img.id && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                          <span className="text-4xl animate-heart-burst drop-shadow-xl select-none">
                            ❤️
                          </span>
                        </div>
                      )}
                      
                      {/* Цитата ответа на предыдущее сообщение (если есть) */}
                      {img.reply_to && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            scrollToMessage(img.reply_to.id);
                          }}
                          className="mb-2 p-2 rounded-xl bg-black/25 hover:bg-black/40 border-l-3 border-indigo-300 flex items-center gap-2 cursor-pointer transition select-none group/quote"
                          title="Перейти к цитируемому сообщению"
                        >
                          {img.reply_to.file_url && (
                            <img 
                              src={img.reply_to.file_url} 
                              alt="quote thumbnail" 
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover shrink-0 border border-white/10" 
                            />
                          )}
                          <div className="min-w-0 flex-1 text-left">
                            <div className="text-[11px] font-bold text-indigo-200 group-hover/quote:underline truncate">
                              {img.reply_to.username || 'Пользователь'}
                            </div>
                            <div className="text-[10px] text-white/80 truncate">
                              {img.reply_to.caption || (img.reply_to.file_url ? '📷 Фотография' : 'Сообщение')}
                            </div>
                          </div>
                        </div>
                      )}

                      <p className="text-sm leading-relaxed break-words whitespace-pre-wrap select-text">
                        {img.caption}
                      </p>

                      {/* Подвал текстового сообщения */}
                      <div className="mt-2 flex items-center justify-between gap-3 pt-1 border-t border-white/10 text-[11px] text-white/70">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAddReaction(img.id, '❤️')}
                            className="hover:scale-125 active:scale-150 transition transform touch-manipulation"
                          >
                            ❤️
                          </button>
                          <button
                            onClick={() => handleAddReaction(img.id, '🔥')}
                            className="hover:scale-125 active:scale-150 transition transform touch-manipulation"
                          >
                            🔥
                          </button>
                          <button
                            onClick={() => handleAddReaction(img.id, '👍')}
                            className="hover:scale-125 active:scale-150 transition transform touch-manipulation"
                          >
                            👍
                          </button>
                          {activeReaction && (
                            <span className="ml-1 text-xs animate-reaction-pop inline-block">{activeReaction}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Кнопка ответа на сообщение */}
                          <button
                            onClick={() => handleStartReply(img)}
                            className="text-white/70 hover:text-white transition p-0.5"
                            title="Ответить"
                          >
                            <Reply className="w-3 h-3" />
                          </button>

                          {isMe && (
                            <button
                              onClick={() => handleDeleteImage(img.id)}
                              className="text-white/60 hover:text-rose-300 transition p-0.5"
                              title="Удалить сообщение"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </SwipeableMessage>

              </div>
            </React.Fragment>
          );
        })}

        {/* Анимированный бабл "печатает..." внизу ленты сообщений (как в Telegram) */}
        {(isFriendTyping || isAnyGroupTyping) && (
          <div className="flex items-center gap-2 mb-2 mt-1 px-1 animate-msg-appear">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl rounded-bl-sm bg-slate-800/90 border border-slate-700/60 shadow-lg shadow-black/20 backdrop-blur-sm">
              <span className="text-xs text-indigo-300 font-medium">
                {isGroup ? groupTypingList.map((t) => t.username).join(', ') : friend?.username}
              </span>
              <span className="text-[11px] text-slate-400">печатает</span>
              <div className="flex items-center gap-1 pl-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-typing-dot-1" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-typing-dot-2" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-typing-dot-3" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Плавающая кнопка "Вниз" */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-16 sm:bottom-20 right-4 sm:right-6 z-30 flex items-center gap-2 px-3.5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xl shadow-indigo-950/80 transition transform hover:scale-105 active:scale-95 animate-pop-scale border border-indigo-400/30 touch-manipulation"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>{newUnreadCount > 0 ? `Новые (+${newUnreadCount})` : 'Вниз'}</span>
        </button>
      )}

      {/* Превью выбранного изображения перед отправкой (плавающий пузырь как в ТГ) */}
      {previewUrl && (
        <div className="mx-2 sm:mx-3 mb-1.5 p-2 bg-slate-900/95 border border-slate-750/80 rounded-2xl flex items-center gap-3 shrink-0 shadow-xl backdrop-blur-md animate-fadeIn z-20">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-indigo-500/50 shrink-0">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={clearSelectedFile}
              className="absolute top-0.5 right-0.5 p-0.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition shadow"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {selectedFile?.name}
            </p>
            <p className="text-[10px] text-slate-400">
              Прикреплено фото (можно добавить подпись ниже)
            </p>
          </div>
        </div>
      )}

      {/* Плашка ответа на сообщение (плавающий пузырь как в Telegram) */}
      {replyingTo && (
        <div className="mx-2 sm:mx-3 mb-1.5 px-3 py-2 bg-slate-900/95 border border-indigo-500/40 rounded-2xl flex items-center justify-between gap-3 shrink-0 shadow-xl backdrop-blur-md animate-fadeIn z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-1 self-stretch bg-indigo-500 rounded-full shrink-0" />
            <Reply className="w-4 h-4 text-indigo-400 shrink-0" />

            {replyingTo.file_url && (
              <img 
                src={replyingTo.file_url} 
                alt="reply thumbnail" 
                className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-700" 
              />
            )}

            <div className="min-w-0 text-left">
              <div className="text-xs font-bold text-indigo-300 truncate">
                Ответ для @{replyingTo.sender_username}
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                {replyingTo.caption || (replyingTo.file_url ? '📷 Фотография' : 'Сообщение')}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0 active:scale-95 touch-manipulation"
            title="Отменить ответ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Панель ввода и отправки пузырями (Telegram-стиль со скриншота 4) */}
      <div 
        className="p-2 sm:p-3 pb-2.5 sm:pb-3 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex items-end gap-2 safe-bottom shrink-0 z-20"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileSelect(e.target.files[0])}
          accept="image/*"
          className="hidden"
        />

        {/* Telegram-стильный пикер стикеров */}
        <StickersPicker
          isOpen={isStickersOpen}
          onClose={() => setIsStickersOpen(false)}
          onSelectSticker={handleSendSticker}
          onOpenStore={() => {
            setIsStickersOpen(false);
            if (onOpenStickerStore) onOpenStickerStore();
          }}
        />

        {/* Основной пузырь ввода сообщения: [ 😊 | Сообщение... | 📎 ] */}
        <div className="flex-1 min-w-0 flex items-end bg-slate-900/90 border border-slate-750/80 rounded-[24px] sm:rounded-full px-1.5 py-1 shadow-lg backdrop-blur-md transition-all focus-within:border-indigo-500/60 focus-within:shadow-[0_0_15px_rgba(99,102,241,0.25)]">
          
          {/* Кнопка стикеров слева внутри пузыря */}
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => setIsStickersOpen((prev) => !prev)}
            className={`p-2 rounded-full transition-all shrink-0 touch-manipulation mb-0.5 ${
              isStickersOpen
                ? 'bg-purple-600/30 text-purple-300 scale-105'
                : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800/60 active:scale-90'
            }`}
            title="Стикеры"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Бесшовное поле ввода сообщения без рамок */}
          <div className="flex-1 min-w-0 px-2 py-0.5">
            <textarea
              ref={captionInputRef}
              rows={1}
              value={caption}
              onChange={(e) => {
                const val = e.target.value;
                setCaption(val);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

                // Отправка события "печатает..."
                if (!isSaved && targetId) {
                  const targetPayload = isGroup ? { groupId: group?.id } : { recipientId: friend?.id };
                  if (val.trim().length > 0) {
                    if (!isTypingActiveRef.current) {
                      isTypingActiveRef.current = true;
                      sendTyping(targetPayload);
                    }
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                      isTypingActiveRef.current = false;
                      stopTyping(targetPayload);
                    }, 3000);
                  } else {
                    if (isTypingActiveRef.current) {
                      isTypingActiveRef.current = false;
                      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                      stopTyping(targetPayload);
                    }
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendImage();
                }
              }}
              onFocus={() => {
                setTimeout(() => scrollToBottom(true), 80);
                setTimeout(() => scrollToBottom(true), 240);
              }}
              enterKeyHint="send"
              autoComplete="on"
              autoCorrect="on"
              spellCheck="true"
              placeholder={
                replyingTo
                  ? `Ответ для @${replyingTo.sender_username}...`
                  : selectedFile
                  ? 'Добавьте подпись...'
                  : isSaved
                  ? 'Сохранить заметку...'
                  : 'Сообщение'
              }
              className="w-full bg-transparent border-0 text-[15px] text-white placeholder-slate-500 focus:outline-none resize-none max-h-28 overflow-y-auto no-scrollbar leading-relaxed py-1"
              style={{ minHeight: '26px', height: '26px', maxHeight: '110px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            />
          </div>

          {/* Кнопка скрепки справа внутри пузыря (выбор фото) */}
          <button
            type="button"
            tabIndex={-1}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-full transition-all shrink-0 touch-manipulation mb-0.5 ${
              selectedFile
                ? 'text-indigo-400 bg-indigo-500/20'
                : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800/60 active:scale-90'
            }`}
            title="Прикрепить фото"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>

        {/* Отдельный круглый пузырь справа: Кнопка Отправки (или Камера когда пусто) */}
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={(e) => {
            // КРИТИЧНО ДЛЯ ANDROID: onPointerDown preventDefault полностью блокирует снятие фокуса с поля ввода
            e.preventDefault();
          }}
          onClick={(e) => {
            e.preventDefault();
            if (hasContentToSend) {
              handleSendImage();
            } else {
              fileInputRef.current?.click();
            }
          }}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 shadow-lg touch-manipulation transition-all duration-200 active:scale-90 mb-0.5 ${
            hasContentToSend
              ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 text-white shadow-indigo-600/40 scale-100'
              : 'bg-slate-900/90 hover:bg-slate-800 text-indigo-400 border border-slate-750/80 shadow-md hover:text-white'
          } ${sending ? 'animate-send-pop' : ''}`}
          title={hasContentToSend ? 'Отправить (Enter)' : 'Сделать фото / выбрать из галереи'}
        >
          {hasContentToSend ? (
            <Send className="w-5 h-5 translate-x-0.5" />
          ) : (
            <Camera className="w-5 h-5" />
          )}
        </button>
      </div>

    </div>
  );
}
