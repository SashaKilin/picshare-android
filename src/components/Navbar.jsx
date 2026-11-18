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
  Server
} from 'lucide-react';

export function Navbar({ 
  onOpenAuth, 
  onOpenSearch, 
  onOpenRequests, 
  onOpenProfile,
  onOpenServerSettings,
  requestsCount = 0,
  activeView, 
  setActiveView 
}) {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md safe-top">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Логотип */}
        <div 
          onClick={() => setActiveView('chat')} 
          className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none group shrink-0"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform shrink-0">
            <Images className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-bold text-base sm:text-lg tracking-tight text-white leading-tight">
              <span>PicShare</span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">Обмен картинками</p>
          </div>
        </div>

        {/* Действия и навигация */}
        {isAuthenticated ? (
          <div className="flex items-center gap-1.5 sm:gap-3">
            
            {/* Переключение Лента / Чат */}
            <div className="flex bg-slate-800/80 p-0.5 sm:p-1 rounded-xl border border-slate-700/60">
              <button
                onClick={() => setActiveView('chat')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeView === 'chat'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Диалоги"
              >
                <MessageSquareHeart className="w-4 h-4" />
                <span className="hidden md:inline">Диалоги</span>
              </button>
              <button
                onClick={() => setActiveView('feed')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeView === 'feed'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
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
              className="flex items-center justify-center w-9 h-9 sm:w-auto sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700 transition"
              title="Найти друзей"
            >
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span className="hidden lg:inline ml-1.5">Найти друзей</span>
            </button>

            {/* Заявки в друзья */}
            <button
              onClick={onOpenRequests}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Заявки в друзья"
            >
              <Bell className="w-4 h-4" />
              {requestsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 sm:min-w-5 sm:h-5 px-1 text-[10px] sm:text-[11px] font-bold text-white bg-rose-500 rounded-full animate-pulse shadow-md">
                  {requestsCount}
                </span>
              )}
            </button>

            {/* Профиль пользователя */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 pl-1 sm:pl-2 border-l border-slate-800">
              <button
                onClick={() => onOpenProfile && onOpenProfile(user?.id)}
                className="flex items-center gap-2 hover:opacity-85 transition group text-left cursor-pointer p-1 rounded-xl hover:bg-slate-800/50"
                title="Мой профиль"
              >
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`}
                  alt={user?.username}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-indigo-500/40 object-cover bg-slate-800 shrink-0 group-hover:border-indigo-400"
                />
                <div className="hidden xl:block text-left">
                  <div className="text-xs font-semibold text-slate-200 leading-tight group-hover:text-indigo-300">
                    {user?.username}
                  </div>
                  {user?.badge && (
                    <div className="text-[10px] text-indigo-400 truncate max-w-[100px]">
                      {user.badge}
                    </div>
                  )}
                </div>
              </button>

              {/* Настройки сервера */}
              {onOpenServerSettings && (
                <button
                  onClick={onOpenServerSettings}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
                  title="Настройки сервера"
                >
                  <Server className="w-4 h-4" />
                </button>
              )}

              {/* Кнопка выхода */}
              <button
                onClick={logout}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Выйти"
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
                className="p-2 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
                title="Настройки сервера"
              >
                <Server className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-semibold shadow-md transition"
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
