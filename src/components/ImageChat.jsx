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
  CheckCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

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
}) {
  const { user } = useAuth();
  const { socket, onlineUsers, markAsRead, setActiveFriendId, setActiveGroupId } = useSocket();

  const isGroup = Boolean(group);
  const targetId = isGroup ? group.id : friend?.id;
  const isSaved = Boolean(!isGroup && (friend?.isSaved || (friend && user && Number(friend.id) === Number(user.id))));

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

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

  const fileInputRef = useRef(null);
  const captionInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const latestImageIdRef = useRef(0);
  const isNearBottomRef = useRef(true);

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
      setImages((prev) => prev.filter((img) => img.id !== imageId));
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

  // Отправка (текст, фото или текст + фото)
  async function handleSendImage(e) {
    if (e) e.preventDefault();
    const currentInputVal = captionInputRef.current ? captionInputRef.current.value : caption;
    const textVal = (currentInputVal ?? '').trim();
    const hasText = Boolean(textVal);
    const hasFile = Boolean(selectedFile);

    if ((!hasText && !hasFile) || sending) return;

    setSending(true);
    setError('');

    const formData = new FormData();
    if (hasFile) {
      formData.append('image', selectedFile);
    }
    if (isGroup) {
      formData.append('groupId', group.id);
    } else {
      formData.append('receiverId', friend.id);
    }
    if (hasText) {
      formData.append('caption', textVal);
    }
    if (replyingTo) {
      formData.append('replyToId', replyingTo.id);
    }

    try {
      const res = await api.sendImage(formData);
      clearSelectedFile();
      setCaption('');
      if (captionInputRef.current) {
        captionInputRef.current.value = '';
      }
      setReplyingTo(null);

      if (res.image) {
        setImages((prev) => {
          if (prev.some((img) => img.id === res.image.id)) return prev;
          latestImageIdRef.current = Math.max(latestImageIdRef.current, res.image.id);
          return [...prev, res.image];
        });
      }
      scrollToBottom(true);
      if (hasFile) {
        confetti({ particleCount: 25, spread: 40, origin: { y: 0.85 } });
      }
    } catch (err) {
      setError(err.message || 'Не удалось отправить сообщение');
    } finally {
      setSending(false);
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
    try {
      await api.deleteImage(imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      alert(err.message || 'Ошибка удаления');
    }
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

      {/* 1. Шапка чата */}
      <div className="safe-top border-b border-slate-800 bg-slate-900/90 backdrop-blur-md shrink-0 z-20">
        <div className="h-14 sm:h-16 px-3 sm:px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition shrink-0"
              title="Назад к списку друзей"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {isGroup ? (
            /* Шапка для Группового чата */
            <div 
              onClick={() => onOpenGroupInfo && onOpenGroupInfo(group)}
              className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer hover:opacity-85 transition group"
              title="Информация о группе и участники"
            >
              <div className="relative shrink-0">
                <img
                  src={group?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${group?.name}`}
                  alt={group?.name}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl border border-indigo-500/40 object-cover bg-slate-800 shadow group-hover:border-indigo-400"
                />
              </div>

              <div className="min-w-0">
                <div className="font-bold text-sm text-slate-100 flex items-center gap-2 truncate">
                  <span className="truncate group-hover:text-indigo-300">{group?.name}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                  <span className="text-indigo-400 font-medium">{group?.members_count || 1} участников</span>
                  <span className="text-slate-600">•</span>
                  <span>Групповой чат</span>
                </div>
              </div>
            </div>
          ) : isSaved ? (
            /* Шапка для «Избранного» */
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 select-none">
              <div className="relative shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                  <Bookmark className="w-5 h-5 fill-white/20" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5 truncate">
                  <span className="truncate">Избранное</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                  <span className="text-indigo-400/90 font-medium">Ваше личное облако</span>
                  <span className="text-slate-600">•</span>
                  <span>Заметки и фото</span>
                </div>
              </div>
            </div>
          ) : (
            /* Шапка для диалога 1-на-1 */
            <div 
              onClick={() => onOpenProfile && onOpenProfile(friend?.id)}
              className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer hover:opacity-85 transition group"
              title="Открыть профиль пользователя"
            >
              <div className="relative shrink-0">
                <img
                  src={friend?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend?.username}`}
                  alt={friend?.username}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-700 object-cover bg-slate-800 group-hover:border-indigo-400"
                />
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 transition-colors ${
                    isOnline ? 'bg-emerald-500 animate-online-pulse' : 'bg-slate-600'
                  }`}
                />
              </div>

              <div className="min-w-0">
                <div className="font-bold text-sm text-slate-100 flex items-center gap-2 truncate">
                  <span className="truncate group-hover:text-indigo-300">{friend?.username}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                  <span>{isOnline ? 'В сети' : 'Не в сети'}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-indigo-400/80">Профиль и фото</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Меню действий */}
        <div className="relative shrink-0 flex items-center gap-1">
          {!isSaved && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}

          {showMenu && !isSaved && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-1 z-30">
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
      </div>
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
          const hasImage = Boolean(img.file_url && img.file_url.trim());
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
                className={`flex flex-col ${isMe ? 'items-end animate-msg-me' : 'items-start animate-msg-other'} group w-full`}
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
                    {isMe && !isGroup && (
                      Boolean(img.is_read) ? (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" title="Прочитано" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" title="Доставлено" />
                      )
                    )}
                  </span>
                </div>

                <SwipeableMessage onReply={() => handleStartReply(img)} isMe={isMe}>
                  {/* ВАРИАНТ 1: Карточка с изображением (+ опциональная подпись) */}
                  {hasImage ? (
                    <div className={`relative w-full max-w-[85%] sm:max-w-md rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl transition-all ${
                      highlightedMessageId === img.id ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 shadow-indigo-500/50 shadow-lg scale-[1.01]' : ''
                    }`}>
                      
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
                    <div className={`relative max-w-[85%] sm:max-w-md p-3 sm:p-3.5 rounded-2xl shadow-md transition-all ${
                      highlightedMessageId === img.id ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 shadow-indigo-500/50 shadow-lg scale-[1.01]' : ''
                    } ${
                      isMe
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-xs'
                        : 'bg-slate-800 text-slate-100 rounded-tl-xs border border-slate-700/60'
                    }`}>
                      
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

        <div ref={messagesEndRef} />
      </div>

      {/* Плавающая кнопка "Вниз" */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-16 sm:bottom-20 right-4 sm:right-6 z-30 flex items-center gap-2 px-3.5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xl shadow-indigo-950/80 transition transform hover:scale-105 active:scale-95 animate-bounce-short border border-indigo-400/30"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>{newUnreadCount > 0 ? `Новые (+${newUnreadCount})` : 'Вниз'}</span>
        </button>
      )}

      {/* Превью выбранного изображения перед отправкой */}
      {previewUrl && (
        <div className="p-2.5 sm:p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-3 shrink-0">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-indigo-500/50 shrink-0">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={clearSelectedFile}
              className="absolute top-1 right-1 p-0.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition"
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

      {/* Плашка ответа на сообщение (как в Telegram) */}
      {replyingTo && (
        <div className="px-3 sm:px-4 py-2 bg-slate-900 border-t border-indigo-500/30 flex items-center justify-between gap-3 shrink-0 animate-fadeIn">
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

      {/* 3. Панель ввода и отправки */}
      <form 
        onSubmit={handleSendImage}
        className="p-2 sm:p-3 bg-slate-900/95 border-t border-slate-800 flex items-center gap-2 safe-bottom shrink-0 z-20"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileSelect(e.target.files[0])}
          accept="image/*"
          className="hidden"
        />

        {/* Кнопка выбора фото/камеры */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-indigo-400 border border-slate-700/60 transition shrink-0 touch-manipulation"
          title="Прикрепить фото или сделать снимок"
        >
          <Camera className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>

        {/* Поле для ввода сообщения или подписи */}
        <div className="flex-1 relative">
          <input
            type="text"
            ref={captionInputRef}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onInput={(e) => setCaption(e.target.value)}
            onCompositionEnd={(e) => setCaption(e.target.value)}
            onFocus={() => {
              setTimeout(() => scrollToBottom(true), 80);
              setTimeout(() => scrollToBottom(true), 240);
            }}
            enterKeyHint="send"
            autoComplete="on"
            autoCorrect="on"
            spellCheck="true"
            inputMode="text"
            placeholder={
              replyingTo
                ? `Ответ для @${replyingTo.sender_username}...`
                : selectedFile
                ? 'Добавьте подпись к фото...'
                : isSaved
                ? 'Сохранить заметку или фото...'
                : 'Напишите сообщение...'
            }
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Кнопка отправки */}
        <button
          type="submit"
          disabled={sending}
          className={`p-2.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white font-semibold shadow-md transition-all duration-200 shrink-0 touch-manipulation active:scale-90 flex items-center gap-1.5 ${
            hasContentToSend ? 'opacity-100 shadow-indigo-600/30 scale-100' : 'opacity-40 scale-95 cursor-pointer'
          } ${sending ? 'animate-send-pop' : ''}`}
          title="Отправить (Enter)"
        >
          <Send className={`w-4 h-4 transition-transform duration-200 ${sending ? '-translate-y-0.5 translate-x-0.5' : ''}`} />
          <span className="hidden sm:inline text-xs">{sending ? 'Отправка...' : 'Отправить'}</span>
        </button>
      </form>

    </div>
  );
}
