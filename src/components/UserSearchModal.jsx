import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { X, Search, UserPlus, Check, Clock, UserCheck, MessageSquare, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export function UserSearchModal({ isOpen, onClose, onSelectFriend, onOpenProfile }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.searchUsers(query.trim());
        setResults(data.users || []);
      } catch (err) {
        setError(err.message || 'Ошибка поиска');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  async function handleSendRequest(targetUser) {
    try {
      const res = await api.sendFriendRequest(targetUser.id);
      setActionMessage(res.message);

      if (res.status === 'accepted') {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      }

      setResults(prev => prev.map(u => {
        if (u.id === targetUser.id) {
          return {
            ...u,
            relationship: res.status === 'accepted' ? 'friends' : 'outgoing_request'
          };
        }
        return u;
      }));
    } catch (err) {
      setError(err.message || 'Не удалось отправить заявку');
    }
  }

  async function handleAccept(user) {
    try {
      await api.acceptFriendRequest(user.requestId, user.id);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setActionMessage(`Вы и ${user.username} теперь друзья!`);
      setResults(prev => prev.map(u => u.id === user.id ? { ...u, relationship: 'friends' } : u));
    } catch (err) {
      setError(err.message || 'Ошибка принятия заявки');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-backdrop-fade">
      <div className="relative w-full max-w-lg liquid-glass-modal border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92dvh] flex flex-col animate-modal-spring">
        
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full liquid-glass-pill text-neutral-400 hover:text-white border border-white/10 hover:border-white/20 transition active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Заголовок */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-white" />
            <span>Поиск друзей</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Найдите пользователя по никнейму или email адресу, чтобы обмениваться картинками
          </p>
        </div>

        {/* Поле поиска */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите никнейм или почту..."
            className="w-full bg-neutral-900/60 border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition"
          />
        </div>

        {/* Информационные сообщения */}
        {actionMessage && (
          <div className="mb-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Результаты поиска */}
        <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {loading && (
            <div className="text-center py-8 text-xs text-neutral-400 animate-pulse">
              Поиск пользователей...
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-neutral-400 text-xs">
              Пользователи по запросу «{query}» не найдены
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="text-center py-8 text-neutral-500 text-xs">
              Введите хотя бы 2 символа для начала поиска
            </div>
          )}

          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-2xl liquid-glass-subtle border border-white/10 hover:border-white/20 transition"
            >
              <div 
                onClick={() => {
                  if (onOpenProfile) {
                    onOpenProfile(user.id);
                  }
                }}
                className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-85 transition group"
                title="Посмотреть профиль"
              >
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                  alt={user.username}
                  className="w-10 h-10 rounded-full border border-white/15 object-cover bg-neutral-900 shrink-0 group-hover:border-white/40"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-neutral-100 truncate group-hover:text-white">
                    {user.username}
                  </div>
                  <div className="text-xs text-neutral-400 truncate">
                    {user.email}
                  </div>
                </div>
              </div>

              {/* Кнопки действий по статусу */}
              <div className="shrink-0 ml-3">
                {user.relationship === 'friends' && (
                  <button
                    onClick={() => {
                      onSelectFriend(user);
                      onClose();
                    }}
                    className="x-btn-secondary flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Чат</span>
                  </button>
                )}

                {user.relationship === 'outgoing_request' && (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-full liquid-glass text-neutral-400 text-xs font-medium border border-white/10">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Отправлена</span>
                  </span>
                )}

                {user.relationship === 'incoming_request' && (
                  <button
                    onClick={() => handleAccept(user)}
                    className="x-btn-primary flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Принять</span>
                  </button>
                )}

                {user.relationship === 'none' && (
                  <button
                    onClick={() => handleSendRequest(user)}
                    className="x-btn-primary flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Добавить</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
