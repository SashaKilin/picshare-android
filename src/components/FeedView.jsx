import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { LayoutGrid, Download, Image as ImageIcon, MessageSquare } from 'lucide-react';

export function FeedView({ onSelectFriend, onOpenLightbox, onOpenProfile }) {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFeed();
  }, []);

  async function loadFeed() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getFeed();
      setFeed(data.feed || []);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки ленты');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-3 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto w-full">
        
        {/* Заголовок ленты */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
              <span>Общая галерея</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Все картинки от ваших друзей
            </p>
          </div>

          <button
            onClick={loadFeed}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition active:scale-95 touch-manipulation"
          >
            Обновить
          </button>
        </div>

        {loading && (
          <div className="py-16 text-center text-xs text-slate-500 animate-pulse">
            Загрузка галереи...
          </div>
        )}

        {!loading && feed.length === 0 && (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
              <ImageIcon className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-200 text-sm sm:text-base">В галерее пока пусто</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Отправьте картинку другу в диалоге, и она появится здесь!
            </p>
          </div>
        )}

        {/* Сетка картинок: на мобильном 2 колонки! */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {feed.map((img) => (
            <div
              key={img.id}
              className="group relative bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-md flex flex-col transition"
            >
              <div
                onClick={() => onOpenLightbox(img)}
                className="aspect-square bg-slate-950 overflow-hidden cursor-pointer relative active:opacity-90"
              >
                <img
                  src={img.file_url}
                  alt={img.original_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                  <a
                    href={img.file_url}
                    download={img.original_name}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded-lg bg-slate-900/80 text-white hover:bg-slate-800 transition"
                    title="Скачать"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="p-2 sm:p-2.5 flex items-center justify-between gap-1.5 border-t border-slate-800">
                <div 
                  onClick={() => onOpenProfile && onOpenProfile(img.sender_id)}
                  className="flex items-center gap-1.5 min-w-0 cursor-pointer hover:opacity-80 transition group"
                  title="Посмотреть профиль"
                >
                  <img
                    src={img.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${img.sender_username}`}
                    alt={img.sender_username}
                    className="w-5 h-5 rounded-full border border-slate-700 object-cover shrink-0 group-hover:border-indigo-400"
                  />
                  <div className="text-[11px] font-semibold text-slate-200 truncate group-hover:text-indigo-300">
                    {img.sender_username}
                  </div>
                </div>

                <button
                  onClick={() => onSelectFriend({ id: img.sender_id, username: img.sender_username, avatar: img.sender_avatar })}
                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition shrink-0"
                  title="В диалог"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
