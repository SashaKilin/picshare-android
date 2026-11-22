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
    <div className="flex-1 flex flex-col h-full bg-black overflow-y-auto p-3 sm:p-6 lg:p-8 custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full">
        
        {/* Заголовок ленты */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              <span>Общая галерея</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Все картинки от ваших друзей
            </p>
          </div>

          <button
            onClick={loadFeed}
            className="x-btn-secondary px-3.5 py-1.5 rounded-full text-xs font-semibold"
          >
            Обновить
          </button>
        </div>

        {loading && (
          <div className="py-16 text-center text-xs text-neutral-400 animate-pulse">
            Загрузка галереи...
          </div>
        )}

        {!loading && feed.length === 0 && (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-white/10 border border-white/15 text-white mx-auto flex items-center justify-center">
              <ImageIcon className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base">В галерее пока пусто</h3>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              Отправьте картинку другу в диалоге, и она появится здесь!
            </p>
          </div>
        )}

        {/* Сетка картинок */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {feed.map((img) => (
            <div
              key={img.id}
              className="group relative liquid-glass-subtle border border-white/10 hover:border-white/30 rounded-3xl overflow-hidden shadow-lg flex flex-col transition"
            >
              <div
                onClick={() => onOpenLightbox(img)}
                className="aspect-square bg-black overflow-hidden cursor-pointer relative active:opacity-90"
              >
                <img
                  src={img.file_url}
                  alt={img.original_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
                  <a
                    href={img.file_url}
                    download={img.original_name}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-full liquid-glass-pill text-white hover:bg-white/20 border border-white/20 transition"
                    title="Скачать"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="p-2 sm:p-2.5 flex items-center justify-between gap-1.5 border-t border-white/10 bg-black/40 backdrop-blur-md">
                <div 
                  onClick={() => onOpenProfile && onOpenProfile(img.sender_id)}
                  className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-80 transition group"
                  title="Посмотреть профиль"
                >
                  <img
                    src={img.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${img.sender_username}`}
                    alt={img.sender_username}
                    className="w-6 h-6 rounded-full border border-white/15 object-cover shrink-0 group-hover:border-white/40"
                  />
                  <div className="text-xs font-semibold text-neutral-200 truncate group-hover:text-white">
                    {img.sender_username}
                  </div>
                </div>

                <button
                  onClick={() => onSelectFriend({ id: img.sender_id, username: img.sender_username, avatar: img.sender_avatar })}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition shrink-0"
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
