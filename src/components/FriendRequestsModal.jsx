import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { X, Bell, Check, Trash2, Clock, CheckCircle2, UserX } from 'lucide-react';
import confetti from 'canvas-confetti';

export function FriendRequestsModal({ isOpen, onClose, onFriendAccepted }) {
  const [tab, setTab] = useState('incoming'); // 'incoming' | 'outgoing'
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadRequests();
    }
  }, [isOpen]);

  async function loadRequests() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getFriendRequests();
      setIncoming(data.incoming || []);
      setOutgoing(data.outgoing || []);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить заявки');
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(req) {
    try {
      const res = await api.acceptFriendRequest(req.request_id, req.id);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setIncoming(prev => prev.filter(r => r.request_id !== req.request_id));
      if (onFriendAccepted) onFriendAccepted(res.friend || req);
    } catch (err) {
      setError(err.message || 'Ошибка принятия заявки');
    }
  }

  async function handleReject(req) {
    try {
      await api.rejectFriendRequest(req.request_id, req.id);
      setIncoming(prev => prev.filter(r => r.request_id !== req.request_id));
    } catch (err) {
      setError(err.message || 'Ошибка отклонения заявки');
    }
  }

  async function handleCancelOutgoing(req) {
    try {
      await api.rejectFriendRequest(req.request_id, req.id);
      setOutgoing(prev => prev.filter(r => r.request_id !== req.request_id));
    } catch (err) {
      setError(err.message || 'Ошибка отмены заявки');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl max-h-[92dvh] flex flex-col">
        
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Заголовок */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            <span>Заявки в друзья</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Управляйте входящими и исходящими запросами на добавление в друзья
          </p>
        </div>

        {/* Переключатель вкладок */}
        <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 mb-4">
          <button
            onClick={() => setTab('incoming')}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition ${
              tab === 'incoming'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Входящие</span>
            {incoming.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-rose-500 text-white rounded-full">
                {incoming.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('outgoing')}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition ${
              tab === 'outgoing'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Исходящие</span>
            {outgoing.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-slate-700 text-slate-300 rounded-full">
                {outgoing.length}
              </span>
            )}
          </button>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Список заявок */}
        <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
          {loading && (
            <div className="text-center py-8 text-xs text-slate-500 animate-pulse">
              Загрузка заявок...
            </div>
          )}

          {tab === 'incoming' && !loading && incoming.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">
              Нет входящих заявок в друзья
            </div>
          )}

          {tab === 'outgoing' && !loading && outgoing.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">
              Вы еще не отправляли заявок
            </div>
          )}

          {/* Входящие */}
          {tab === 'incoming' && incoming.map((req) => (
            <div
              key={req.request_id}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={req.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.username}`}
                  alt={req.username}
                  className="w-10 h-10 rounded-full border border-slate-700 object-cover bg-slate-800 shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-slate-200 truncate">
                    {req.username}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {req.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={() => handleAccept(req)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition"
                  title="Принять заявку"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Принять</span>
                </button>
                <button
                  onClick={() => handleReject(req)}
                  className="p-1.5 rounded-xl bg-slate-700/50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                  title="Отклонить"
                >
                  <UserX className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Исходящие */}
          {tab === 'outgoing' && outgoing.map((req) => (
            <div
              key={req.request_id}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={req.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.username}`}
                  alt={req.username}
                  className="w-10 h-10 rounded-full border border-slate-700 object-cover bg-slate-800 shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-slate-200 truncate">
                    {req.username}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Ожидает ответа</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleCancelOutgoing(req)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs font-medium transition"
              >
                Отменить
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
