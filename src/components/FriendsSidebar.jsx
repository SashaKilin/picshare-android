import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { 
  Search, 
  UserPlus, 
  Image, 
  Users, 
  Sparkles, 
  Plus, 
  MessageSquare, 
  Crown
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'groups'
  const [filter, setFilter] = useState('');
  const { onlineUsers, unreadMap } = useSocket();

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(filter.toLowerCase()) ||
    (f.email && f.email.toLowerCase().includes(filter.toLowerCase()))
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(filter.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <aside className={`flex flex-col border-r border-slate-800 bg-slate-900/50 shrink-0 h-full ${className}`}>
      
      {/* Шапка сайдбара */}
      <div className="p-3 sm:p-4 border-b border-slate-800 shrink-0">
        
        {/* Вкладки: Друзья (Личные) / Группы */}
        <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3">
          <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all touch-manipulation active:scale-95 ${
                activeTab === 'friends'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Друзья</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'friends' ? 'bg-indigo-500/50 text-white' : 'bg-slate-700 text-slate-400'
              }`}>
                {friends.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all touch-manipulation active:scale-95 ${
                activeTab === 'groups'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Группы</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'groups' ? 'bg-indigo-500/50 text-white' : 'bg-slate-700 text-slate-400'
              }`}>
                {groups.length}
              </span>
            </button>
          </div>

          {/* Кнопка действия (в зависимости от активной вкладки) */}
          {activeTab === 'friends' ? (
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/20 text-xs font-semibold transition touch-manipulation active:scale-95"
              title="Найти новых друзей"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Найти</span>
            </button>
          ) : (
            <button
              onClick={onOpenCreateGroup}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition touch-manipulation active:scale-95"
              title="Создать новую группу"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать</span>
            </button>
          )}
        </div>

        {/* Поле поиска */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={activeTab === 'friends' ? 'Поиск по друзьям...' : 'Поиск по группам...'}
            className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl pl-9 pr-3 py-2 text-base sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      {/* Список: ДРУЗЬЯ */}
      {activeTab === 'friends' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loading && (
            <div className="p-6 text-center text-xs text-slate-500 animate-pulse">
              Загрузка списка друзей...
            </div>
          )}

          {!loading && friends.length === 0 && (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">Друзей пока нет</p>
                <p className="text-xs text-slate-500 mt-1">
                  Добавьте друзей, чтобы начать обмениваться картинками!
                </p>
              </div>
              <button
                onClick={onOpenSearch}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition touch-manipulation active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Найти первых друзей</span>
              </button>
            </div>
          )}

          {!loading && friends.length > 0 && filteredFriends.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">
              Никого не найдено
            </div>
          )}

          {filteredFriends.map((friend) => {
            const isSelected = selectedFriend?.id === friend.id && !selectedGroup;
            const isOnline = onlineUsers.has(Number(friend.id));
            const unreadCount = unreadMap?.[Number(friend.id)] || 0;

            return (
              <button
                key={friend.id}
                onClick={() => onSelectFriend(friend)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all touch-manipulation active:scale-[0.99] ${
                  isSelected
                    ? 'bg-indigo-600/20 border border-indigo-500/40 text-white shadow-sm'
                    : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
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
                    className="w-11 h-11 rounded-full border border-slate-700 object-cover bg-slate-800"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                      isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}
                    title={isOnline ? 'В сети' : 'Не в сети'}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-sm truncate text-slate-200">
                      {friend.username}
                    </span>

                    {unreadCount > 0 ? (
                      <span className="flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold text-white bg-indigo-500 rounded-full animate-bounce shadow-md">
                        +{unreadCount}
                      </span>
                    ) : friend.total_images > 0 ? (
                      <span className="flex items-center gap-0.5 text-[11px] text-slate-400 shrink-0">
                        <Image className="w-3 h-3 text-indigo-400" />
                        <span>{friend.total_images}</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {friend.email}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Список: ГРУППЫ */}
      {activeTab === 'groups' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {groups.length === 0 && (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">У вас пока нет групп</p>
                <p className="text-xs text-slate-500 mt-1">
                  Создайте свою группу, чтобы делиться картинками сразу со всеми друзьями!
                </p>
              </div>
              <button
                onClick={onOpenCreateGroup}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition touch-manipulation active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Создать первую группу</span>
              </button>
            </div>
          )}

          {groups.length > 0 && filteredGroups.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">
              Группы не найдены
            </div>
          )}

          {filteredGroups.map((grp) => {
            const isSelected = selectedGroup?.id === grp.id;

            return (
              <button
                key={grp.id}
                onClick={() => onSelectGroup(grp)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all touch-manipulation active:scale-[0.99] ${
                  isSelected
                    ? 'bg-indigo-600/20 border border-indigo-500/40 text-white shadow-sm'
                    : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={grp.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${grp.name}`}
                    alt={grp.name}
                    className="w-11 h-11 rounded-2xl border border-indigo-500/30 object-cover bg-slate-800 shadow-sm"
                  />
                  {grp.is_creator === 1 && (
                    <span 
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow"
                      title="Вы создатель этой группы"
                    >
                      <Crown className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-sm truncate text-slate-200">
                      {grp.name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                    <span className="text-indigo-400 font-medium">
                      {grp.members_count || 1} {getMembersWord(grp.members_count || 1)}
                    </span>
                    {grp.description && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-500 truncate">{grp.description}</span>
                      </>
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
