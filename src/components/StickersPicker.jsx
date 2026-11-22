import React, { useState, useEffect } from 'react';
import { ShoppingBag, Sparkles, X, Plus } from 'lucide-react';
import { api } from '../api';

export function StickersPicker({ isOpen, onClose, onSelectSticker, onOpenStore }) {
  const [myPacks, setMyPacks] = useState([]);
  const [selectedPackId, setSelectedPackId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMyPacks();
    }
  }, [isOpen]);

  async function loadMyPacks() {
    setLoading(true);
    try {
      const res = await api.getMyStickers();
      const packs = res.packs || [];
      setMyPacks(packs);
      if (packs.length > 0 && !selectedPackId) {
        setSelectedPackId(packs[0].id);
      }
    } catch (err) {
      console.error('Ошибка загрузки стикеров для пикера:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const currentPack = myPacks.find((p) => p.id === selectedPackId) || myPacks[0];

  return (
    <>
      {/* Невидимый оверлей для закрытия пикера по тапу снаружи */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose} 
      />

      <div 
        className="absolute bottom-full left-2 right-2 sm:left-2 sm:right-auto sm:w-96 mb-3 liquid-glass-modal rounded-3xl border border-white/15 shadow-2xl z-50 flex flex-col overflow-hidden animate-modal-spring max-h-80 select-none backdrop-blur-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка пикера с названием пака и кнопкой закрытия */}
        <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between shrink-0 bg-neutral-900/60">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-white truncate">
              {currentPack ? currentPack.title : 'Стикеры'}
            </span>
            {currentPack && (
              <span className="text-[10px] text-neutral-400">
                ({currentPack.stickers?.length || 0})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenStore}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-semibold border border-white/15 transition active:scale-95"
              title="Открыть магазин стикеров"
            >
              <ShoppingBag className="w-3 h-3 text-white" />
              <span>Магазин</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Сетка стикеров выбранного пака */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar min-h-48">
          {loading ? (
            <div className="h-44 flex items-center justify-center text-xs text-neutral-500 animate-pulse">
              Загрузка стикеров...
            </div>
          ) : !currentPack || !currentPack.stickers || currentPack.stickers.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center p-4 space-y-2">
              <Sparkles className="w-6 h-6 text-white" />
              <p className="text-xs text-neutral-300 font-medium">В этом паке пока нет стикеров</p>
              <button
                type="button"
                onClick={onOpenStore}
                className="px-3 py-1.5 rounded-xl x-btn-primary text-xs font-bold shadow transition"
              >
                Добавить из магазина
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
              {currentPack.stickers.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={() => {
                    onSelectSticker(sticker);
                    onClose();
                  }}
                  className="p-1.5 rounded-2xl hover:bg-white/10 active:scale-90 transition-transform flex flex-col items-center justify-center group relative aspect-square"
                  title={sticker.emoji || 'Стикер'}
                >
                  <img
                    src={sticker.file_url}
                    alt="Sticker"
                    className="w-16 h-16 max-w-full max-h-full object-contain filter drop-shadow hover:scale-110 transition-transform duration-150"
                    loading="lazy"
                  />
                  {sticker.emoji && (
                    <span className="absolute bottom-1 right-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/90 rounded-md px-1 py-0.2 text-white">
                      {sticker.emoji}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Нижняя полоса переключения между стикерпаками */}
        <div className="p-1.5 border-t border-white/10 bg-black/80 flex items-center gap-1 overflow-x-auto custom-scrollbar shrink-0">
          {myPacks.map((pack) => {
            const isSelected = (currentPack && currentPack.id === pack.id);
            const iconUrl = pack.cover_url || (pack.stickers?.[0]?.file_url) || `https://api.dicebear.com/7.x/bottts/svg?seed=${pack.name}`;

            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => setSelectedPackId(pack.id)}
                className={`p-1.5 rounded-xl transition-all shrink-0 ${
                  isSelected
                    ? 'bg-white/20 border border-white/30 scale-105 shadow'
                    : 'hover:bg-white/10 opacity-60 hover:opacity-100'
                }`}
                title={pack.title}
              >
                <img
                  src={iconUrl}
                  alt={pack.title}
                  className="w-7 h-7 rounded-lg object-contain"
                />
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenStore}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition shrink-0 ml-auto"
            title="Открыть магазин стикеров"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </>
  );
}
