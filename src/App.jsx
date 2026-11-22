import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { api } from './api';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { UserSearchModal } from './components/UserSearchModal';
import { FriendRequestsModal } from './components/FriendRequestsModal';
import { FriendsSidebar } from './components/FriendsSidebar';
import { ImageChat } from './components/ImageChat';
import { FeedView } from './components/FeedView';
import { LightboxModal } from './components/LightboxModal';
import { NotificationToast } from './components/NotificationToast';
import { ProfileModal } from './components/ProfileModal';
import { EditProfileModal } from './components/EditProfileModal';
import { CreateGroupModal } from './components/CreateGroupModal';
import { GroupInfoModal } from './components/GroupInfoModal';
import { ServerSettingsModal } from './components/ServerSettingsModal';
import { NotificationPermissionPrompt } from './components/NotificationPermissionPrompt';
import { UpdateModal } from './components/UpdateModal';
import { StickersModal } from './components/StickersModal';
import { subscribeUserToPush, initLocalNotifications, initPushNotifications } from './utils/browserNotifications';
import { checkAppUpdate } from './utils/appUpdater';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { 
  Images, 
  UserPlus, 
  Zap, 
  Sparkles, 
  ArrowRight,
  FileImage,
  Users
} from 'lucide-react';

function MainApp() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { socket } = useSocket();

  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'feed'
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [requestsCount, setRequestsCount] = useState(0);

  // Модальные окна
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupInfoModalId, setGroupInfoModalId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isStickersOpen, setIsStickersOpen] = useState(false);

  const selectedFriendRef = useRef(selectedFriend);
  useEffect(() => {
    selectedFriendRef.current = selectedFriend;
  }, [selectedFriend]);

  const handleSelectFriend = (friend) => {
    setSelectedGroup(null);
    setSelectedFriend(friend);
    if (friend?.id) {
      setFriends((prev) =>
        prev.map((f) => (Number(f.id) === Number(friend.id) ? { ...f, unread_count: 0 } : f))
      );
    }
  };

  // Слушатель для моментального сброса счетчика непрочитанных сообщений при открытии чата
  useEffect(() => {
    const handleFriendRead = (e) => {
      const friendId = e.detail?.friendId;
      if (friendId) {
        setFriends((prev) =>
          prev.map((f) => (Number(f.id) === Number(friendId) ? { ...f, unread_count: 0 } : f))
        );
      }
    };
    window.addEventListener('picshare_friend_read', handleFriendRead);
    return () => window.removeEventListener('picshare_friend_read', handleFriendRead);
  }, []);

  // Инициализация локальных и системных FCM push-уведомлений на Android и проверка обновлений
  useEffect(() => {
    initLocalNotifications();
    initPushNotifications().catch(() => {});
    checkAppUpdate().then((res) => {
      if (res?.hasUpdate) {
        setUpdateInfo(res);
        setIsUpdateOpen(true);
      }
    }).catch(() => {});

    // Настройка системного StatusBar на Android (отключаем наложение WebView на системную шторку)
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#0f172a' }).catch(() => {});
    }
  }, []);

  // Поддержка системной кнопки "Назад" на Android (Hardware Back Button)
  useEffect(() => {
    let listener = null;
    try {
      CapApp.addListener('backButton', () => {
        if (lightboxImage) {
          setLightboxImage(null);
          return;
        }
        if (isUpdateOpen) {
          setIsUpdateOpen(false);
          return;
        }
        if (isEditProfileOpen) {
          setIsEditProfileOpen(false);
          return;
        }
        if (profileUserId) {
          setProfileUserId(null);
          return;
        }
        if (groupInfoModalId) {
          setGroupInfoModalId(null);
          return;
        }
        if (isCreateGroupOpen) {
          setIsCreateGroupOpen(false);
          return;
        }
        if (isRequestsOpen) {
          setIsRequestsOpen(false);
          return;
        }
        if (isSearchOpen) {
          setIsSearchOpen(false);
          return;
        }
        if (isServerSettingsOpen) {
          setIsServerSettingsOpen(false);
          return;
        }
        if (isAuthOpen) {
          setIsAuthOpen(false);
          return;
        }
        if (selectedFriend || selectedGroup) {
          setSelectedFriend(null);
          setSelectedGroup(null);
          return;
        }
        // Если ничего не открыто, сворачиваем/закрываем приложение
        CapApp.exitApp();
      }).then((handle) => {
        listener = handle;
      }).catch(() => {});
    } catch (e) {}

    return () => {
      if (listener?.remove) listener.remove();
    };
  }, [
    lightboxImage,
    isEditProfileOpen,
    profileUserId,
    groupInfoModalId,
    isCreateGroupOpen,
    isRequestsOpen,
    isSearchOpen,
    isServerSettingsOpen,
    isAuthOpen,
    selectedFriend,
    selectedGroup
  ]);

  // Прямое открытие профиля по ссылке #profile/username
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#profile/')) {
        const username = decodeURIComponent(hash.replace('#profile/', ''));
        if (username) setProfileUserId(username);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Гарантированный сброс скролла окна при переключении диалогов и видов
  useEffect(() => {
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [selectedFriend, selectedGroup, activeView]);

  // Обработка клика по системным браузерным уведомлениям
  useEffect(() => {
    const handleOpenGroup = (e) => {
      const { groupId } = e.detail;
      const targetGroup = groups.find((g) => g.id === Number(groupId));
      if (targetGroup) {
        setSelectedFriend(null);
        setSelectedGroup(targetGroup);
        setActiveView('chat');
      } else {
        api.getGroup(groupId).then((res) => {
          if (res.group) {
            setSelectedFriend(null);
            setSelectedGroup(res.group);
            setActiveView('chat');
          }
        }).catch(console.error);
      }
    };

    const handleOpenFriend = (e) => {
      const friendData = e.detail;
      if (!friendData) return;
      const friendId = Number(friendData.id || friendData);
      const targetFriend = friends.find((f) => f.id === friendId) || friendData;
      setSelectedGroup(null);
      setSelectedFriend(targetFriend);
      setActiveView('chat');
    };

    const handleOpenRequests = () => {
      setIsRequestsOpen(true);
    };

    window.addEventListener('picshare_open_group', handleOpenGroup);
    window.addEventListener('picshare_open_friend', handleOpenFriend);
    window.addEventListener('picshare_open_requests', handleOpenRequests);

    // Обработка клика по системному уведомлению из Service Worker (на мобильных)
    const handleSwMessage = (event) => {
      if (event.data?.type === 'PICSHARE_NOTIFICATION_CLICK') {
        const { target, type, groupId, friend } = event.data.data || {};
        if (type === 'group' || groupId) {
          handleOpenGroup({ detail: { groupId: groupId || target } });
        } else if (type === 'friend' || friend) {
          handleOpenFriend({ detail: friend || target });
        } else if (type === 'requests') {
          handleOpenRequests();
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      window.removeEventListener('picshare_open_group', handleOpenGroup);
      window.removeEventListener('picshare_open_friend', handleOpenFriend);
      window.removeEventListener('picshare_open_requests', handleOpenRequests);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [groups, friends]);

  useEffect(() => {
    if (isAuthenticated) {
      loadFriends();
      loadGroups();
      loadRequestsCount();
      subscribeUserToPush().catch(() => {});
      initPushNotifications().catch(() => {});
    } else {
      setFriends([]);
      setGroups([]);
      setSelectedFriend(null);
      setSelectedGroup(null);
      setRequestsCount(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleReq = () => {
      loadRequestsCount();
    };

    const handleAccepted = () => {
      loadFriends();
      loadRequestsCount();
    };

    const handleRemoved = () => {
      loadFriends();
      setSelectedFriend(null);
    };

    const handleGroupCreated = (newGrp) => {
      setGroups((prev) => {
        if (prev.some((g) => g.id === newGrp.id)) return prev;
        return [newGrp, ...prev];
      });
    };

    const handleGroupUpdated = (updatedGrp) => {
      setGroups((prev) => prev.map((g) => (g.id === updatedGrp.id ? { ...g, ...updatedGrp } : g)));
      setSelectedGroup((prev) => (prev?.id === updatedGrp.id ? { ...prev, ...updatedGrp } : prev));
    };

    const handleGroupDeleted = ({ groupId }) => {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setSelectedGroup((prev) => (prev?.id === groupId ? null : prev));
    };

    const handleRemovedFromGroup = ({ groupId }) => {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setSelectedGroup((prev) => (prev?.id === groupId ? null : prev));
    };

    const handleNewImage = (newImg) => {
      if (!newImg) return;
      if (newImg.group_id) {
        setGroups((prev) => {
          const idx = prev.findIndex((g) => g.id === Number(newImg.group_id));
          if (idx === -1) return prev;
          const updated = {
            ...prev[idx],
            last_message_at: newImg.created_at,
            last_caption: newImg.caption,
            last_file_url: newImg.file_url,
            last_sender_id: newImg.sender_id,
            last_sender_username: newImg.sender_username
          };
          const next = [...prev];
          next.splice(idx, 1);
          return [updated, ...next];
        });
      } else {
        const isMyMsg = Number(newImg.sender_id) === Number(user?.id);
        const otherId = isMyMsg
          ? Number(newImg.receiver_id)
          : Number(newImg.sender_id);

        const isCurrentOpen = Number(selectedFriendRef.current?.id) === otherId;
        setFriends((prev) => {
          const idx = prev.findIndex((f) => Number(f.id) === otherId);
          if (idx === -1) return prev;
          const updated = {
            ...prev[idx],
            last_image_at: newImg.created_at,
            last_caption: newImg.caption,
            last_file_url: newImg.file_url,
            last_sender_id: newImg.sender_id,
            last_is_read: newImg.is_read || (isMyMsg ? 0 : 1),
            unread_count: (isMyMsg || isCurrentOpen) ? 0 : ((prev[idx].unread_count || 0) + 1),
            total_images: (prev[idx].total_images || 0) + (newImg.file_url ? 1 : 0)
          };
          const next = [...prev];
          next.splice(idx, 1);
          return [updated, ...next];
        });
      }
    };

    const handleMessagesRead = ({ readerId }) => {
      setFriends((prev) =>
        prev.map((f) =>
          Number(f.id) === Number(readerId) ? { ...f, last_is_read: 1 } : f
        )
      );
    };

    socket.on('new_image', handleNewImage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('new_friend_request', handleReq);
    socket.on('friend_request_accepted', handleAccepted);
    socket.on('friend_removed', handleRemoved);
    socket.on('group_created', handleGroupCreated);
    socket.on('group_updated', handleGroupUpdated);
    socket.on('group_members_updated', ({ groupId, members }) => {
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, members_count: members.length } : g)));
      setSelectedGroup((prev) => (prev?.id === groupId ? { ...prev, members_count: members.length } : prev));
    });
    socket.on('group_deleted', handleGroupDeleted);
    socket.on('removed_from_group', handleRemovedFromGroup);

    return () => {
      socket.off('new_image', handleNewImage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('new_friend_request', handleReq);
      socket.off('friend_request_accepted', handleAccepted);
      socket.off('friend_removed', handleRemoved);
      socket.off('group_created', handleGroupCreated);
      socket.off('group_updated', handleGroupUpdated);
      socket.off('group_deleted', handleGroupDeleted);
      socket.off('removed_from_group', handleRemovedFromGroup);
    };
  }, [socket, isAuthenticated]);

  async function loadGroups() {
    try {
      const data = await api.getGroups();
      setGroups(data.groups || []);
    } catch (err) {
      console.error('Ошибка загрузки групп:', err);
    }
  }

  async function loadFriends() {
    setLoadingFriends(true);
    try {
      const data = await api.getFriends();
      setFriends(data.friends || []);
      if (window.innerWidth >= 768 && data.friends?.length > 0 && !selectedFriend) {
        setSelectedFriend(data.friends[0]);
      }
    } catch (err) {
      console.error('Ошибка загрузки друзей:', err);
    } finally {
      setLoadingFriends(false);
    }
  }

  async function loadRequestsCount() {
    try {
      const data = await api.getFriendRequests();
      setRequestsCount(data.incoming?.length || 0);
    } catch (err) {
      console.error('Ошибка подсчета заявок:', err);
    }
  }

  function handleFriendAccepted(friend) {
    loadFriends();
    loadRequestsCount();
    if (friend) {
      setSelectedGroup(null);
      setSelectedFriend(friend);
      setActiveView('chat');
    }
  }

  function handleFriendRemoved(friendId) {
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
    if (selectedFriend?.id === friendId) {
      setSelectedFriend(null);
    }
  }

  if (authLoading) {
    return (
      <div className="fixed inset-0 w-full h-full bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center animate-spin">
            <Images className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-slate-400 font-medium">Загрузка PicShare...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col bg-black text-neutral-100 font-sans overflow-hidden select-none">
      <div className="liquid-ambient-bg" />
      
      {/* Навигационная панель (Шапка сайта):
          - На компьютерах видна всегда
          - На мобильных в списке друзей и ленте видна ВСЕГДА
          - Внутри открытого чата скрывается для максимизации области переписки, 
            но при возврате назад (←) гарантированно восстанавливается на 100%! */}
      <div className={`shrink-0 z-40 ${(selectedFriend || selectedGroup) && activeView === 'chat' ? 'hidden md:block' : 'block'}`}>
        <Navbar
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenRequests={() => setIsRequestsOpen(true)}
          onOpenProfile={(id) => setProfileUserId(id)}
          onOpenServerSettings={() => setIsServerSettingsOpen(true)}
          onOpenStickers={() => setIsStickersOpen(true)}
          requestsCount={requestsCount}
          activeView={activeView}
          setActiveView={setActiveView}
        />
      </div>

      {/* Основной контент */}
      {isAuthenticated ? (
        <main className="flex-1 min-h-0 flex overflow-hidden w-full relative">
          {activeView === 'feed' ? (
            <FeedView
              onSelectFriend={(friend) => {
                handleSelectFriend(friend);
                setActiveView('chat');
              }}
              onOpenLightbox={(img) => setLightboxImage(img)}
              onOpenProfile={(id) => setProfileUserId(id)}
            />
          ) : (
            <>
              {/* Сайдбар со списком друзей и групп */}
              <FriendsSidebar
                friends={friends}
                groups={groups}
                selectedFriend={selectedFriend}
                selectedGroup={selectedGroup}
                onSelectFriend={handleSelectFriend}
                onSelectGroup={(grp) => {
                  setSelectedFriend(null);
                  setSelectedGroup(grp);
                }}
                onOpenSearch={() => setIsSearchOpen(true)}
                onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
                onOpenProfile={(id) => setProfileUserId(id)}
                loading={loadingFriends}
                className={`${
                  (selectedFriend || selectedGroup) ? 'hidden md:flex' : 'flex w-full'
                } md:w-80 lg:w-96 min-h-0 h-full overflow-hidden shrink-0`}
              />

              {/* Окно диалога с независимой прокруткой сообщений */}
              {selectedFriend || selectedGroup ? (
                <div className={`flex-1 min-h-0 flex flex-col h-full overflow-hidden ${(selectedFriend || selectedGroup) ? 'flex' : 'hidden md:flex'}`}>
                  <ImageChat
                    friend={selectedFriend}
                    group={selectedGroup}
                    onFriendRemoved={handleFriendRemoved}
                    onOpenLightbox={(img) => setLightboxImage(img)}
                    onOpenProfile={(id) => setProfileUserId(id)}
                    onOpenGroupInfo={(grp) => setGroupInfoModalId(grp.id)}
                    onOpenStickerStore={() => setIsStickersOpen(true)}
                    onBack={() => {
                      setSelectedFriend(null);
                      setSelectedGroup(null);
                      window.scrollTo(0, 0);
                      if (document.documentElement) document.documentElement.scrollTop = 0;
                      if (document.body) document.body.scrollTop = 0;
                    }}
                  />
                </div>
              ) : (
                <div className="flex-1 min-h-0 hidden md:flex flex-col items-center justify-center text-center p-8 bg-black h-full overflow-hidden">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl liquid-glass text-white flex items-center justify-center mb-4 border border-white/15 shadow-xl">
                    <Images className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Выберите чат или группу</h3>
                  <p className="text-xs text-neutral-400 max-w-md mt-2">
                    Выберите друга или группу из списка слева, либо создайте новую группу для совместного общения.
                  </p>
                  <div className="flex items-center gap-3 mt-6">
                    <button
                      onClick={() => setIsSearchOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl x-btn-secondary font-semibold text-xs transition"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Найти друзей</span>
                    </button>
                    <button
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl x-btn-primary font-bold text-xs transition active:scale-95"
                    >
                      <Users className="w-4 h-4" />
                      <span>Создать группу</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      ) : (
        /* Приветственный лендинг */
        <main className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-4xl w-full text-center py-6 sm:py-12 px-2 sm:px-4">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass-pill text-white text-xs font-semibold mb-6 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              <span>Безопасный обмен фото и картинками</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
              Делитесь картинками <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                только со своими друзьями
              </span>
            </h1>

            <p className="mt-4 text-sm sm:text-lg text-neutral-400 max-w-2xl mx-auto px-2">
              Никаких публичных лент и спама. Добавляйте друг друга в друзья и отправляйте картинки, мемы и арты в приватных диалогах.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setIsAuthOpen(true)}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl x-btn-primary font-bold text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Начать прямо сейчас</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Карточки фич */}
            <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-left">
              <div className="p-5 sm:p-6 rounded-3xl liquid-glass-subtle border border-white/10 hover:border-white/20 transition">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl liquid-glass text-white flex items-center justify-center mb-3 sm:mb-4 border border-white/15">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="font-bold text-white text-sm sm:text-base">Быстрый старт</h3>
                <p className="text-xs text-neutral-400 mt-1 sm:mt-2 leading-relaxed">
                  Регистрация по почте без кодов подтверждения или вход в один клик через Google аккаунт.
                </p>
              </div>

              <div className="p-5 sm:p-6 rounded-3xl liquid-glass-subtle border border-white/10 hover:border-white/20 transition">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl liquid-glass text-white flex items-center justify-center mb-3 sm:mb-4 border border-white/15">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="font-bold text-white text-sm sm:text-base">Взаимная дружба</h3>
                <p className="text-xs text-neutral-400 mt-1 sm:mt-2 leading-relaxed">
                  Отправлять и получать картинки можно строго после обоюдного согласия и добавления в друзья.
                </p>
              </div>

              <div className="p-5 sm:p-6 rounded-3xl liquid-glass-subtle border border-white/10 hover:border-white/20 transition">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl liquid-glass text-white flex items-center justify-center mb-3 sm:mb-4 border border-white/15">
                  <FileImage className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="font-bold text-white text-sm sm:text-base">Удобный обмен</h3>
                <p className="text-xs text-neutral-400 mt-1 sm:mt-2 leading-relaxed">
                  Съемка с камеры телефона, Drag & Drop, полноэкранный Lightbox и моментальная доставка картинок.
                </p>
              </div>
            </div>

          </div>
        </main>
      )}

      {/* Модальные окна */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <UserSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenProfile={(id) => setProfileUserId(id)}
        onSelectFriend={(friend) => {
          handleSelectFriend(friend);
          setActiveView('chat');
        }}
      />

      <FriendRequestsModal
        isOpen={isRequestsOpen}
        onClose={() => setIsRequestsOpen(false)}
        onFriendAccepted={handleFriendAccepted}
      />

      <LightboxModal
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {/* Создание группы */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        friends={friends}
        onGroupCreated={(newGrp) => {
          setGroups((prev) => [newGrp, ...prev]);
          setSelectedFriend(null);
          setSelectedGroup(newGrp);
          setActiveView('chat');
        }}
      />

      {/* Инфо/управление группой */}
      <GroupInfoModal
        isOpen={Boolean(groupInfoModalId)}
        groupId={groupInfoModalId}
        onClose={() => setGroupInfoModalId(null)}
        friends={friends}
        onOpenProfile={(id) => setProfileUserId(id)}
        onGroupUpdated={(updatedGrp) => {
          setGroups((prev) => prev.map((g) => (g.id === updatedGrp.id ? { ...g, ...updatedGrp } : g)));
          if (selectedGroup?.id === updatedGrp.id) {
            setSelectedGroup((prev) => ({ ...prev, ...updatedGrp }));
          }
        }}
        onGroupDeleted={(deletedId) => {
          setGroups((prev) => prev.filter((g) => g.id !== deletedId));
          if (selectedGroup?.id === deletedId) setSelectedGroup(null);
        }}
        onLeaveGroup={(leftId) => {
          setGroups((prev) => prev.filter((g) => g.id !== leftId));
          if (selectedGroup?.id === leftId) setSelectedGroup(null);
        }}
      />

      {/* Просмотр публичного/своего профиля */}
      <ProfileModal
        isOpen={Boolean(profileUserId)}
        onClose={() => {
          setProfileUserId(null);
          if (window.location.hash.startsWith('#profile/')) {
            history.replaceState(null, '', ' ');
          }
        }}
        userIdOrUsername={profileUserId}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        onSelectFriend={(friend) => {
          handleSelectFriend(friend);
          setActiveView('chat');
        }}
        onOpenLightbox={(img) => setLightboxImage(img)}
      />

      {/* Редактирование своего профиля */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onProfileUpdated={(updatedUser) => {
          // Обновляем список друзей если текущий пользователь изменил имя/аватар
          loadFriends();
        }}
      />

      {/* Всплывающие уведомления */}
      <NotificationToast
        onOpenRequests={() => setIsRequestsOpen(true)}
        onSelectFriend={(friend) => {
          handleSelectFriend(friend);
          setActiveView('chat');
        }}
        onSelectGroup={(groupId) => {
          const targetGroup = groups.find((g) => g.id === Number(groupId));
          if (targetGroup) {
            setSelectedFriend(null);
            setSelectedGroup(targetGroup);
            setActiveView('chat');
          } else {
            api.getGroup(groupId).then((res) => {
              if (res.group) {
                setSelectedFriend(null);
                setSelectedGroup(res.group);
                setActiveView('chat');
              }
            }).catch(console.error);
          }
        }}
      />

      {/* Настройки сервера PicShare */}
      <ServerSettingsModal
        isOpen={isServerSettingsOpen}
        onClose={() => setIsServerSettingsOpen(false)}
        onShowUpdate={(info) => {
          setUpdateInfo(info);
          setIsUpdateOpen(true);
        }}
      />

      {/* Окно обновления приложения */}
      <UpdateModal
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        updateInfo={updateInfo}
      />

      {/* Каталог и редактор стикеров (Telegram-style v3.0) */}
      <StickersModal
        isOpen={isStickersOpen}
        onClose={() => setIsStickersOpen(false)}
      />

      {/* Однократный запрос на включение браузерных уведомлений */}
      {isAuthenticated && <NotificationPermissionPrompt />}

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </AuthProvider>
  );
}
