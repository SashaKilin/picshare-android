import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Images, 
  UserPlus, 
  Bell, 
  LogOut, 
  LogIn, 
  LayoutGrid, 
  MessageSquareHeart,
  Server,
  Smile
} from 'lucide-react';

export function Navbar({ 
  onOpenAuth, 
  onOpenSearch, 
  onOpenRequests, 
  onOpenProfile,
  onOpenServerSettings,
  onOpenStickers,
  requestsCount = 0,
  activeView, 
  setActiveView 
}) {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/60 backdrop-blur-2xl safe-top">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-1 sm:gap-4">
        
        {/* Логотип */}
        <div 
          onClick={() => setActiveView('chat')} 
          className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer select-none group shrink-0"
        >
          <img 
            src="/favicon.svg" 
            alt="PicShare" 
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl shadow-md group-hover:scale-105 transition-transform shrink-0 object-contain" 
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1 font-bold text-sm sm:text-lg tracking-tight text-white leading-tight">
              <span>PicShare</span>
            </div>
            <p className="text-[10px] sm:text-xs text-neutral-400 hidden sm:block">Обмен картинками</p>
          </div>
        </div>

        {/* Действия и навигация */}
        {isAuthenticated ? (
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            
            {/* Переключение Лента / Чат (Сегментированный переключатель в стиле iOS / X) */}
            <div className="flex bg-neutral-900/80 p-0.5 rounded-2xl border border-white/10 shrink-0 backdrop-blur-xl">
              <button
                onClick={() => setActiveView('chat')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeView === 'chat'
                    ? 'bg-white text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Диалоги"
              >
                <MessageSquareHeart className="w-4 h-4" />
                <span className="hidden md:inline">Диалоги</span>
              </button>
              <button
                onClick={() => setActiveView('feed')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeView === 'feed'
                    ? 'bg-white text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Лента картинок"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden md:inline">Лента</span>
              </button>
            </div>

            {/* Найти друзей */}
            <button
              onClick={onOpenSearch}
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 sm:px-3 sm:py-1.5 rounded-2xl bg-neutral-900/70 hover:bg-neutral-800 text-neutral-200 text-xs sm:text-sm font-medium border border-white/10 hover:border-white/20 backdrop-blur-xl transition shrink-0"
              title="Найти друзей"
            >
              <UserPlus className="w-4 h-4 text-white" />
              <span className="hidden lg:inline ml-1.5">Найти друзей</span>
            </button>

            {/* Стикеры и магазин стикерпаков */}
            <button
              onClick={onOpenStickers}
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 sm:px-3 sm:py-1.5 rounded-2xl bg-neutral-900/70 hover:bg-neutral-800 text-white text-xs sm:text-sm font-medium border border-white/10 hover:border-white/20 backdrop-blur-xl transition active:scale-95 shrink-0"
              title="Стикеры и Магазин стикерпаков"
            >
              <Smile className="w-4 h-4 text-white" />
              <span className="hidden lg:inline ml-1.5">Стикеры</span>
            </button>

            {/* Заявки в друзья */}
            <button
              onClick={onOpenRequests}
              className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-neutral-900/70 hover:bg-neutral-800 text-white border border-white/10 hover:border-white/20 backdrop-blur-xl transition shrink-0"
              title="Заявки в друзья"
            >
              <Bell className="w-4 h-4 text-white" />
              {requestsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 sm:min-w-5 sm:h-5 px-1 text-[10px] sm:text-[11px] font-extrabold text-black bg-white rounded-full animate-pulse shadow-md">
                  {requestsCount}
                </span>
              )}
            </button>

            {/* Профиль пользователя */}
            <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-white/10 shrink-0 pr-0.5">
              <button
                onClick={() => onOpenProfile && onOpenProfile(user?.id)}
                className="flex items-center gap-1.5 hover:opacity-85 transition group text-left cursor-pointer p-0.5 sm:p-1 rounded-2xl hover:bg-white/5 shrink-0"
                title="Мой профиль"
              >
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`}
                  alt={user?.username}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/20 object-cover bg-neutral-900 shrink-0 group-hover:border-white/40"
                />
                <div className="hidden xl:block text-left">
                  <div className="text-xs font-semibold text-neutral-200 leading-tight group-hover:text-white">
                    {user?.username}
                  </div>
                  {user?.badge && (
                    <div className="text-[10px] text-neutral-400 truncate max-w-[100px]">
                      {user.badge}
                    </div>
                  )}
                </div>
              </button>

              {/* Настройки сервера (на мобильных доступны из профиля или экрана авторизации) */}
              {onOpenServerSettings && (
                <button
                  onClick={onOpenServerSettings}
                  className="hidden md:flex p-1.5 sm:p-2 rounded-2xl text-neutral-400 hover:text-white hover:bg-white/10 transition shrink-0"
                  title="Настройки сервера"
                >
                  <Server className="w-4 h-4" />
                </button>
              )}

              {/* Кнопка выхода */}
              <button
                onClick={logout}
                className="p-1.5 sm:p-2 rounded-2xl text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition shrink-0 flex items-center justify-center touch-manipulation active:scale-95"
                title="Выйти из аккаунта"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        ) : (
          <div className="flex items-center gap-2">
            {onOpenServerSettings && (
              <button
                onClick={onOpenServerSettings}
                className="p-2 rounded-2xl text-neutral-400 hover:text-white hover:bg-white/10 transition"
                title="Настройки сервера"
              >
                <Server className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full x-btn-primary text-xs sm:text-sm font-bold shadow-md transition"
            >
              <LogIn className="w-4 h-4" />
              <span>Войти</span>
            </button>
          </div>
        )}

      </div>
    </header>
  );
}
