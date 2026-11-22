import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  UserPlus, 
  Image as ImageIcon, 
  Users, 
  Sparkles, 
  Plus, 
  MessageSquare, 
  Crown,
  Pin,
  Bookmark,
  Check,
  CheckCheck
} from 'lucide-react';

function formatChatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Вчера';
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function FriendsSidebar({
  friends = [],
  groups = [],
  selectedFriend,
  selectedGroup,
  onSelectFriend,
  onSelectGroup,
  onOpenSearch,
  onOpenCreateGroup,
  onOpenProfile,
  loading = false,
  className = '',
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'groups'
  const [filter, setFilter] = useState('');
  const { onlineUsers, unreadMap, typingUsers } = useSocket();

  // Состояние закреплённых диалогов (сохраняется в localStorage)
  const [pinnedChats, setPinnedChats] = useState(() => {
    try {
      const saved = localStorage.getItem('picshare_pinned_chats');
      return saved ? JSON.parse(saved) : { friends: [], groups: [] };
    } catch (e) {
      return { friends: [], groups: [] };
    }
  });

  const togglePin = (type, id, e) => {
    e.stopPropagation();
    setPinnedChats((prev) => {
      const currentList = prev[type] || [];
      const numId = Number(id);
      const isPinned = currentList.includes(numId);
      const nextList = isPinned ? currentList.filter((x) => x !== numId) : [numId, ...currentList];
      const updated = { ...prev, [type]: nextList };
      try {
        localStorage.setItem('picshare_pinned_chats', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  };

  const isFriendPinned = (id) => (pinnedChats.friends || []).includes(Number(id));
  const isGroupPinned = (id) => (pinnedChats.groups || []).includes(Number(id));

  // Фильтрация друзей
  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(filter.toLowerCase()) ||
    (f.email && f.email.toLowerCase().includes(filter.toLowerCase()))
  );

  // Сортировка друзей: сначала закреплённые, затем по дате последнего сообщения (новые выше)
  const sortedFriends = [...filteredFriends].sort((a, b) => {
    const aPin = isFriendPinned(a.id);
    const bPin = isFriendPinned(b.id);
    if (aPin && !bPin) return -1;
    if (!aPin && bPin) return 1;

    const timeA = a.last_image_at ? new Date(a.last_image_at).getTime() : 0;
    const timeB = b.last_image_at ? new Date(b.last_image_at).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;

    const sinceA = a.friends_since ? new Date(a.friends_since).getTime() : 0;
    const sinceB = b.friends_since ? new Date(b.friends_since).getTime() : 0;
    return sinceB - sinceA;
  });

  // Фильтрация и сортировка групп
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(filter.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(filter.toLowerCase()))
  );

  const sortedGroups = [...filteredGroups].sort((a, b) => {
    const aPin = isGroupPinned(a.id);
    const bPin = isGroupPinned(b.id);
    if (aPin && !bPin) return -1;
    if (!aPin && bPin) return 1;

    const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
    const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
    return timeB - timeA;
  });

  const isSavedSelected = Boolean(
    !selectedGroup && 
    (selectedFriend?.isSaved || (selectedFriend && user && Number(selectedFriend.id) === Number(user.id)))
  );

  return (
    <aside className={`flex flex-col border-r border-white/10 bg-black/40 backdrop-blur-2xl shrink-0 h-full ${className}`}>
      
      {/* Шапка сайдбара */}
      <div className="p-3 sm:p-4 border-b border-white/10 shrink-0">
        
        {/* Вкладки: Друзья (Личные) / Группы */}
        <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3">
          <div className="flex bg-neutral-900/80 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all touch-manipulation active:scale-95 ${
                activeTab === 'friends'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Чаты</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'friends' ? 'bg-black/15 text-black font-bold' : 'bg-neutral-800 text-neutral-400'
              }`}>
                {friends.length + 1}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all touch-manipulation active:scale-95 ${
                activeTab === 'groups'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Группы</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'groups' ? 'bg-black/15 text-black font-bold' : 'bg-neutral-800 text-neutral-400'
              }`}>
                {groups.length}
              </span>
            </button>
          </div>

          {/* Кнопка действия */}
          {activeTab === 'friends' ? (
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold transition backdrop-blur-xl touch-manipulation active:scale-95"
              title="Найти новых друзей"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Найти</span>
            </button>
          ) : (
            <button
              onClick={onOpenCreateGroup}
              className="flex items-center gap-1 px-3 py-1.5 rounded-2xl x-btn-primary text-xs font-bold shadow-md transition touch-manipulation active:scale-95"
              title="Создать новую группу"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать</span>
            </button>
          )}
        </div>

        {/* Поле поиска */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={activeTab === 'friends' ? 'Поиск по чатам...' : 'Поиск по группам...'}
            className="w-full bg-neutral-900/60 border border-white/10 rounded-2xl pl-9 pr-3 py-2 text-base sm:text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition"
          />
        </div>
      </div>

      {/* Список: ДРУЗЬЯ И ИЗБРАННОЕ */}
      {activeTab === 'friends' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar animate-tab-slide">
          
          {/* КАРТОЧКА: «ИЗБРАННОЕ» (Чат с самим собой как в Telegram) */}
          {(!filter || 'избранное'.includes(filter.toLowerCase())) && user && (
            <button
              onClick={() => {
                onSelectFriend({
                  id: user.id,
                  username: 'Избранное',
                  email: user.email || '',
                  avatar: null,
                  isSaved: true
                });
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all touch-manipulation active:scale-[0.99] group ${
                isSavedSelected
                  ? 'liquid-glass-highlight bg-white/10 border border-white/25 text-white shadow-sm'
                  : 'liquid-glass-subtle hover:bg-white/10 border border-white/10 text-neutral-300'
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-neutral-200 via-white to-neutral-400 flex items-center justify-center text-black shadow-md">
                  <Bookmark className="w-5 h-5 fill-black/20" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-sm truncate text-white flex items-center gap-1.5">
                    <span>Избранное</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-white/15 text-white">
                      Вы
                    </span>
                  </span>
                  <span className="text-[10px] font-medium text-neutral-400 shrink-0">
                    Облако
                  </span>
                </div>
                <div className="text-xs text-neutral-400 truncate mt-0.5">
                  Сохранённые сообщения и заметки
                </div>
              </div>
            </button>
          )}

          {loading && (
            <div className="p-6 text-center text-xs text-neutral-500 animate-pulse">
              Загрузка списка друзей...
            </div>
          )}

          {!loading && friends.length === 0 && !filter && (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl liquid-glass text-white border border-white/15 mx-auto flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-200">Друзей пока нет</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Добавьте друзей, чтобы начать обмениваться картинками!
                </p>
              </div>
              <button
                onClick={onOpenSearch}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl x-btn-primary text-xs font-bold shadow-md transition touch-manipulation active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Найти первых друзей</span>
              </button>
            </div>
          )}

          {!loading && friends.length > 0 && filteredFriends.length === 0 && (
            <div className="p-6 text-center text-xs text-neutral-500">
              Никого не найдено
            </div>
          )}

          {/* Список взаимных друзей (отсортированный: закреплённые сверху, затем свежие) */}
          {sortedFriends.map((friend) => {
            const isSelected = selectedFriend?.id === friend.id && !selectedGroup && !selectedFriend?.isSaved;
            const isOnline = onlineUsers.has(Number(friend.id));
            const unreadCount = unreadMap?.[Number(friend.id)] !== undefined 
              ? unreadMap[Number(friend.id)] 
              : (Number(friend.unread_count) || 0);
            const isPinned = isFriendPinned(friend.id);
            const chatTime = formatChatTime(friend.last_image_at);
            const isLastMsgFromMe = Number(friend.last_sender_id) === Number(user?.id);

            return (
              <button
                key={friend.id}
                onClick={() => onSelectFriend(friend)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all touch-manipulation active:scale-[0.99] group ${
                  isSelected
                    ? 'liquid-glass-highlight bg-white/10 border border-white/20 text-white shadow-sm'
                    : isPinned
                    ? 'bg-neutral-900/60 hover:bg-neutral-900/90 border border-white/10 text-neutral-300'
                    : 'hover:bg-neutral-900/40 border border-transparent text-neutral-300'
                }`}
              >
                <div 
                  onClick={(e) => {
                    if (onOpenProfile) {
                      e.stopPropagation();
                      onOpenProfile(friend.id);
                    }
                  }}
                  className="relative shrink-0 cursor-pointer hover:opacity-80 transition"
                  title="Посмотреть профиль"
                >
                  <img
                    src={friend.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.username}`}
                    alt={friend.username}
                    className="w-11 h-11 rounded-full border border-white/15 object-cover bg-neutral-900"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black transition-colors ${
                      isOnline ? 'bg-emerald-500 animate-online-pulse' : 'bg-neutral-600'
                    }`}
                    title={isOnline ? 'В сети' : 'Не в сети'}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-sm truncate text-neutral-100">
                      {friend.username}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {chatTime && (
                        <span className="text-[10px] text-neutral-500">
                          {chatTime}
                        </span>
                      )}

                      {/* Кнопка закрепления */}
                      <button
                        type="button"
                        onClick={(e) => togglePin('friends', friend.id, e)}
                        className={`p-1 rounded-lg transition touch-manipulation active:scale-90 ${
                          isPinned 
                            ? 'text-white bg-white/15' 
                            : 'text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800'
                        }`}
                        title={isPinned ? 'Открепить чат' : 'Закрепить чат'}
                      >
                        <Pin className={`w-3.5 h-3.5 rotate-45 ${isPinned ? 'fill-white' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <div className="text-xs text-neutral-400 truncate flex-1 flex items-center gap-1 min-w-0">
                      {typingUsers && typingUsers[`direct_${friend.id}`] ? (
                        <span className="text-white font-medium flex items-center gap-1">
                          <span>печатает</span>
                          <span className="inline-flex items-center gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-white animate-typing-dot-1" />
                            <span className="w-1 h-1 rounded-full bg-white animate-typing-dot-2" />
                            <span className="w-1 h-1 rounded-full bg-white animate-typing-dot-3" />
                          </span>
                        </span>
                      ) : friend.last_caption || friend.last_file_url ? (
                        <>
                          {isLastMsgFromMe && (
                            <span className="flex items-center gap-0.5 text-neutral-400 shrink-0 font-medium text-[11px]">
                              {Boolean(friend.last_is_read) ? (
                                <CheckCheck className="w-3.5 h-3.5 text-white shrink-0" title="Прочитано" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-neutral-500 shrink-0" title="Доставлено" />
                              )}
                              <span>Вы:</span>
                            </span>
                          )}

                          {friend.last_caption ? (
                            <span className="text-neutral-300 truncate">{friend.last_caption}</span>
                          ) : (
                            <span className="text-neutral-300 flex items-center gap-1 truncate">
                              <ImageIcon className="w-3 h-3 inline shrink-0" />
                              <span>Фотография</span>
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-neutral-500 italic text-[11px]">Пока нет сообщений</span>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <span className="flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-extrabold text-black bg-white rounded-full shadow-md shrink-0 animate-badge-pop">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Список: ГРУППЫ */}
      {activeTab === 'groups' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar animate-tab-slide">
          {groups.length === 0 && (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl liquid-glass text-white border border-white/15 mx-auto flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-200">У вас пока нет групп</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Создайте свою группу, чтобы делиться картинками сразу со всеми друзьями!
                </p>
              </div>
              <button
                onClick={onOpenCreateGroup}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl x-btn-primary text-xs font-bold shadow-md transition touch-manipulation active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Создать первую группу</span>
              </button>
            </div>
          )}

          {groups.length > 0 && filteredGroups.length === 0 && (
            <div className="p-6 text-center text-xs text-neutral-500">
              Группы не найдены
            </div>
          )}

          {sortedGroups.map((grp) => {
            const isSelected = selectedGroup?.id === grp.id;
            const isPinned = isGroupPinned(grp.id);
            const chatTime = formatChatTime(grp.last_message_at);

            return (
              <button
                key={grp.id}
                onClick={() => onSelectGroup(grp)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all touch-manipulation active:scale-[0.99] group ${
                  isSelected
                    ? 'liquid-glass-highlight bg-white/10 border border-white/20 text-white shadow-sm'
                    : isPinned
                    ? 'bg-neutral-900/60 hover:bg-neutral-900/90 border border-white/10 text-neutral-300'
                    : 'hover:bg-neutral-900/40 border border-transparent text-neutral-300'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={grp.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${grp.name}`}
                    alt={grp.name}
                    className="w-11 h-11 rounded-2xl border border-white/15 object-cover bg-neutral-900 shadow-sm"
                  />
                  {grp.is_creator === 1 && (
                    <span 
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center shadow font-bold"
                      title="Вы создатель этой группы"
                    >
                      <Crown className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-sm truncate text-neutral-100">
                      {grp.name}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {chatTime && (
                        <span className="text-[10px] text-neutral-500">
                          {chatTime}
                        </span>
                      )}

                      {/* Кнопка закрепления */}
                      <button
                        type="button"
                        onClick={(e) => togglePin('groups', grp.id, e)}
                        className={`p-1 rounded-lg transition touch-manipulation active:scale-90 ${
                          isPinned 
                            ? 'text-white bg-white/15' 
                            : 'text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800'
                        }`}
                        title={isPinned ? 'Открепить группу' : 'Закрепить группу'}
                      >
                        <Pin className={`w-3.5 h-3.5 rotate-45 ${isPinned ? 'fill-white' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-neutral-400 truncate mt-0.5 flex items-center gap-1.5 min-w-0">
                    {Object.values(typingUsers || {}).some(
                      (t) => Number(t.groupId) === Number(grp.id) && Number(t.userId) !== Number(user?.id)
                    ) ? (
                      <span className="text-white font-medium flex items-center gap-1">
                        <span>печатает</span>
                        <span className="inline-flex items-center gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-white animate-typing-dot-1" />
                          <span className="w-1 h-1 rounded-full bg-white animate-typing-dot-2" />
                          <span className="w-1 h-1 rounded-full bg-white animate-typing-dot-3" />
                        </span>
                      </span>
                    ) : grp.last_caption || grp.last_file_url ? (
                      <div className="flex items-center gap-1 min-w-0 truncate">
                        {Number(grp.last_sender_id) === Number(user?.id) ? (
                          <span className="text-white font-medium text-[11px] shrink-0">Вы:</span>
                        ) : grp.last_sender_username ? (
                          <span className="text-neutral-300 font-medium text-[11px] shrink-0">{grp.last_sender_username}:</span>
                        ) : null}

                        {grp.last_caption ? (
                          <span className="text-neutral-300 truncate">{grp.last_caption}</span>
                        ) : (
                          <span className="text-neutral-300 flex items-center gap-1 truncate">
                            <ImageIcon className="w-3 h-3 inline shrink-0" />
                            <span>Фотография</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-neutral-500 text-[11px] truncate">
                        <span>{grp.members_count || 1} {getMembersWord(grp.members_count || 1)}</span>
                        <span>•</span>
                        <span className="italic">Пока нет сообщений</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

    </aside>
  );
}

function getMembersWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'участников';
  if (mod10 === 1) return 'участник';
  if (mod10 >= 2 && mod10 <= 4) return 'участника';
  return 'участников';
}
