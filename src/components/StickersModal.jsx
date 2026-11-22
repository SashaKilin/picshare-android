import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShoppingBag, 
  FolderHeart, 
  PlusCircle, 
  Check, 
  Trash2, 
  Upload, 
  Sparkles, 
  Search, 
  Layers, 
  AlertCircle,
  Eye,
  Smile
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export function StickersModal({ isOpen, onClose, onStickersUpdated, initialTab = 'store' }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab); // 'store' | 'my' | 'create'
  const [storePacks, setStorePacks] = useState([]);
  const [myPacks, setMyPacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Для создания пака
  const [newTitle, setNewTitle] = useState('');
  const [newCoverFile, setNewCoverFile] = useState(null);
  const [newCoverPreview, setNewCoverPreview] = useState(null);
  const [creating, setCreating] = useState(false);

  // Для редактирования пака
  const [editingPack, setEditingPack] = useState(null);
  const [newStickerFile, setNewStickerFile] = useState(null);
  const [newStickerEmoji, setNewStickerEmoji] = useState('😊');
  const [addingSticker, setAddingSticker] = useState(false);

  // Просмотр пака
  const [viewingPack, setViewingPack] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadData();
    } else {
      setEditingPack(null);
      setViewingPack(null);
      setError('');
    }
  }, [isOpen, initialTab]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [storeRes, myRes] = await Promise.all([
        api.getStickerStore(),
        api.getMyStickers()
      ]);
      setStorePacks(storeRes.packs || []);
      setMyPacks(myRes.packs || []);
    } catch (err) {
      console.error('Ошибка загрузки стикеров:', err);
      setError('Не удалось загрузить данные стикеров');
    } finally {
      setLoading(false);
    }
  }

  async function handleInstall(packId) {
    try {
      await api.installStickerPack(packId);
      setStorePacks((prev) =>
        prev.map((p) => (p.id === packId ? { ...p, is_installed: true } : p))
      );
      const myRes = await api.getMyStickers();
      setMyPacks(myRes.packs || []);
      if (onStickersUpdated) onStickersUpdated();
    } catch (err) {
      console.error('Ошибка установки пака:', err);
    }
  }

  async function handleUninstall(packId) {
    try {
      await api.uninstallStickerPack(packId);
      setStorePacks((prev) =>
        prev.map((p) => (p.id === packId ? { ...p, is_installed: false } : p))
      );
      setMyPacks((prev) => prev.filter((p) => p.id !== packId));
      if (onStickersUpdated) onStickersUpdated();
    } catch (err) {
      console.error('Ошибка удаления пака:', err);
    }
  }

  async function handleCreatePack(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await api.createStickerPack({
        title: newTitle.trim(),
        coverFile: newCoverFile
      });
      setNewTitle('');
      setNewCoverFile(null);
      setNewCoverPreview(null);
      await loadData();
      if (onStickersUpdated) onStickersUpdated();
      if (res.pack) {
        setEditingPack(res.pack);
      }
    } catch (err) {
      console.error('Ошибка создания пака:', err);
      setError(err.message || 'Ошибка создания пака');
    } finally {
      setCreating(false);
    }
  }

  async function handleAddStickerToPack(e) {
    e.preventDefault();
    if (!newStickerFile || !editingPack) return;
    setAddingSticker(true);
    setError('');
    try {
      const res = await api.addStickerToPack(editingPack.id, {
        file: newStickerFile,
        emoji: newStickerEmoji || '😊'
      });
      setNewStickerFile(null);
      setEditingPack((prev) => ({
        ...prev,
        stickers: [...(prev.stickers || []), res.sticker]
      }));
      await loadData();
      if (onStickersUpdated) onStickersUpdated();
    } catch (err) {
      console.error('Ошибка добавления стикера:', err);
      setError('Не удалось добавить стикер');
    } finally {
      setAddingSticker(false);
    }
  }

  async function handleDeleteSticker(stickerId) {
    try {
      await api.deleteSticker(stickerId);
      setEditingPack((prev) => ({
        ...prev,
        stickers: (prev.stickers || []).filter((s) => s.id !== stickerId)
      }));
      await loadData();
      if (onStickersUpdated) onStickersUpdated();
    } catch (err) {
      console.error('Ошибка удаления стикера:', err);
    }
  }

  async function handleDeletePack(packId) {
    if (!confirm('Вы уверены, что хотите удалить этот стикерпак?')) return;
    try {
      await api.deleteStickerPack(packId);
      setEditingPack(null);
      await loadData();
      if (onStickersUpdated) onStickersUpdated();
    } catch (err) {
      console.error('Ошибка удаления пака:', err);
    }
  }

  if (!isOpen) return null;

  const filteredStore = storePacks.filter((p) =>
    (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-2xl animate-fadeIn">
      <div 
        className="w-full max-w-2xl max-h-[90vh] liquid-glass-modal border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-modal-spring backdrop-blur-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модального окна */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-neutral-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl liquid-glass border border-white/20 flex items-center justify-center text-white shadow-md">
              <Smile className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Стикеры PicShare 4.0</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white text-black shadow-sm">
                  v4.0
                </span>
              </h2>
              <p className="text-xs text-neutral-400">Создавайте, делитесь и добавляйте стикерпаки</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition active:scale-95"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Навигация по табам */}
        <div className="flex border-b border-white/10 px-2 sm:px-4 pt-1.5 sm:pt-2 bg-neutral-900/60 gap-1 sm:gap-2 shrink-0 overflow-x-auto no-scrollbar scroll-smooth">
          <button
            onClick={() => { setActiveTab('store'); setEditingPack(null); setViewingPack(null); }}
            className={`flex items-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2.5 sm:px-3.5 border-b-2 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'store' && !editingPack && !viewingPack
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Магазин</span>
            <span className="text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-300">
              {storePacks.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('my'); setEditingPack(null); setViewingPack(null); }}
            className={`flex items-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2.5 sm:px-3.5 border-b-2 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'my' && !editingPack && !viewingPack
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <FolderHeart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Мои стикеры</span>
            <span className="text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-300">
              {myPacks.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('create'); setEditingPack(null); setViewingPack(null); }}
            className={`flex items-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2.5 sm:px-3.5 border-b-2 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'create' && !editingPack && !viewingPack
                ? 'border-white text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Создать пак</span>
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Тело модалки */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar min-h-0">
          
          {/* Режим: Редактирование стикерпака */}
          {editingPack ? (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setEditingPack(null)}
                  className="text-xs text-white hover:underline flex items-center gap-1"
                >
                  ← Вернуться к моим пакам
                </button>
                <button
                  onClick={() => handleDeletePack(editingPack.id)}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-rose-500/10 border border-rose-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Удалить весь пак</span>
                </button>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-3xl liquid-glass-subtle border border-white/10">
                <img
                  src={editingPack.cover_url || (editingPack.stickers?.[0]?.file_url) || `https://api.dicebear.com/7.x/bottts/svg?seed=${editingPack.name}`}
                  alt={editingPack.title}
                  className="w-14 h-14 rounded-2xl object-cover bg-neutral-900 border border-white/15 shadow"
                />
                <div>
                  <h3 className="font-bold text-white text-base">{editingPack.title}</h3>
                  <p className="text-xs text-neutral-400">
                    Стикеров в паке: {editingPack.stickers?.length || 0}
                  </p>
                </div>
              </div>

              {/* Форма добавления нового стикера */}
              <form onSubmit={handleAddStickerToPack} className="p-4 rounded-3xl liquid-glass-subtle border border-white/10 space-y-3">
                <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-white" />
                  <span>Добавить стикер в пак</span>
                </h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewStickerFile(e.target.files[0])}
                    className="flex-1 text-xs text-neutral-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white file:text-black hover:file:bg-neutral-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newStickerEmoji}
                    onChange={(e) => setNewStickerEmoji(e.target.value)}
                    placeholder="Эмодзи (😊)"
                    maxLength={5}
                    className="w-24 px-3 py-2 bg-neutral-900/70 border border-white/10 rounded-2xl text-center text-sm text-white"
                  />
                  <button
                    type="submit"
                    disabled={addingSticker || !newStickerFile}
                    className="px-4 py-2 x-btn-primary disabled:opacity-50 text-black rounded-2xl text-xs font-bold shadow transition"
                  >
                    {addingSticker ? 'Загрузка...' : '+ Загрузить'}
                  </button>
                </div>
              </form>

              {/* Сетка существующих стикеров в паке */}
              <div>
                <h4 className="text-xs font-semibold text-neutral-400 mb-2">Стикеры в паке:</h4>
                {editingPack.stickers && editingPack.stickers.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {editingPack.stickers.map((stk) => (
                      <div key={stk.id} className="relative group p-2 rounded-2xl liquid-glass-subtle border border-white/10 flex flex-col items-center justify-center">
                        <img src={stk.file_url} alt="Sticker" className="w-16 h-16 object-contain" />
                        <span className="text-xs mt-1 text-white">{stk.emoji}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSticker(stk.id)}
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-neutral-900 text-rose-400 border border-white/20 flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition hover:bg-black"
                          title="Удалить стикер"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-neutral-500">
                    В этом паке пока нет стикеров. Загрузите первый стикер выше!
                  </div>
                )}
              </div>
            </div>
          ) : viewingPack ? (
            /* Просмотр любого пака */
            <div className="space-y-4 animate-fadeIn">
              <button
                onClick={() => setViewingPack(null)}
                className="text-xs text-white hover:underline flex items-center gap-1"
              >
                ← Назад к списку
              </button>

              <div className="flex items-center justify-between p-4 rounded-3xl liquid-glass-subtle border border-white/10">
                <div className="flex items-center gap-3">
                  <img
                    src={viewingPack.cover_url || (viewingPack.stickers?.[0]?.file_url) || `https://api.dicebear.com/7.x/bottts/svg?seed=${viewingPack.name}`}
                    alt={viewingPack.title}
                    className="w-14 h-14 rounded-2xl object-cover bg-neutral-900 border border-white/15 shadow"
                  />
                  <div>
                    <h3 className="font-bold text-white text-base">{viewingPack.title}</h3>
                    <p className="text-xs text-neutral-400">
                      Автор: {viewingPack.creator_username || 'Официальный'} • {viewingPack.stickers?.length || 0} стикеров
                    </p>
                  </div>
                </div>

                {viewingPack.is_installed ? (
                  <button
                    onClick={() => handleUninstall(viewingPack.id)}
                    className="px-4 py-2 rounded-2xl bg-neutral-800 hover:bg-rose-500/20 text-neutral-300 hover:text-rose-300 text-xs font-semibold border border-white/10 transition"
                  >
                    Удалить из моих
                  </button>
                ) : (
                  <button
                    onClick={() => handleInstall(viewingPack.id)}
                    className="px-4 py-2 rounded-2xl x-btn-primary text-black text-xs font-bold shadow-md transition"
                  >
                    + Добавить стикерпак
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {(viewingPack.stickers || []).map((stk) => (
                  <div key={stk.id} className="p-3 rounded-2xl liquid-glass-subtle border border-white/10 flex flex-col items-center justify-center hover:scale-105 transition-transform">
                    <img src={stk.file_url} alt="Sticker" className="w-16 h-16 object-contain" />
                    <span className="text-xs mt-1 text-white">{stk.emoji}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'store' ? (
            /* Таб 1: Магазин стикеров */
            <div className="space-y-4">
              {/* Поиск */}
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по стикерпакам..."
                  className="w-full pl-9 pr-4 py-2.5 bg-neutral-900/60 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition"
                />
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-neutral-500 animate-pulse">
                  Загрузка каталога стикеров...
                </div>
              ) : filteredStore.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-500">
                  Стикерпаков не найдено
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStore.map((pack) => (
                    <div
                      key={pack.id}
                      className="p-3.5 sm:p-4 rounded-3xl liquid-glass-subtle hover:bg-white/[0.07] border border-white/10 hover:border-white/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={pack.cover_url || (pack.samples?.[0]?.file_url) || `https://api.dicebear.com/7.x/bottts/svg?seed=${pack.name}`}
                          alt={pack.title}
                          className="w-12 h-12 rounded-2xl object-cover bg-neutral-900 border border-white/15 shrink-0 shadow"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-white truncate">{pack.title}</h3>
                            {pack.is_official && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white font-semibold shrink-0 border border-white/15">
                                Официальный
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {pack.stickers_count} {getStickersWord(pack.stickers_count)}
                            {pack.creator_username && ` • Автор: ${pack.creator_username}`}
                          </p>
                        </div>
                      </div>

                      {/* Превью стикеров */}
                      {pack.samples && pack.samples.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {pack.samples.slice(0, 4).map((s) => (
                            <img
                              key={s.id}
                              src={s.file_url}
                              alt="Sample"
                              className="w-9 h-9 object-contain p-0.5 rounded-xl bg-neutral-900/80 border border-white/10 shrink-0"
                            />
                          ))}
                        </div>
                      )}

                      {/* Кнопки действия */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={async () => {
                            const detail = await api.getStickerPack(pack.id);
                            setViewingPack(detail.pack);
                          }}
                          className="px-3 py-1.5 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium border border-white/10 transition"
                          title="Посмотреть все стикеры"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          <span>Просмотр</span>
                        </button>

                        {pack.is_installed ? (
                          <button
                            onClick={() => handleUninstall(pack.id)}
                            className="px-3.5 py-1.5 rounded-2xl bg-white/15 text-white border border-white/20 text-xs font-semibold flex items-center gap-1 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition"
                            title="Нажмите чтобы удалить"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Добавлено</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleInstall(pack.id)}
                            className="px-3.5 py-1.5 rounded-2xl x-btn-primary text-black text-xs font-bold shadow transition active:scale-95"
                          >
                            + Добавить
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'my' ? (
            /* Таб 2: Мои стикерпаки */
            <div className="space-y-4">
              {myPacks.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl liquid-glass text-white border border-white/15 mx-auto flex items-center justify-center shadow-lg">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-neutral-200">У вас пока нет стикерпаков</p>
                  <p className="text-xs text-neutral-400">
                    Перейдите во вкладку «Магазин» или создайте свой первый пак!
                  </p>
                  <button
                    onClick={() => setActiveTab('store')}
                    className="px-4 py-2 x-btn-primary text-black rounded-2xl text-xs font-bold shadow transition"
                  >
                    Перейти в магазин
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myPacks.map((pack) => (
                    <div
                      key={pack.id}
                      onClick={() => setViewingPack(pack)}
                      className="p-3.5 sm:p-4 rounded-3xl liquid-glass-subtle hover:bg-white/[0.07] border border-white/10 flex items-center justify-between gap-3 cursor-pointer transition active:scale-[0.99]"
                      title="Нажмите, чтобы просмотреть все стикеры"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={pack.cover_url || (pack.stickers?.[0]?.file_url) || `https://api.dicebear.com/7.x/bottts/svg?seed=${pack.name}`}
                          alt={pack.title}
                          className="w-12 h-12 rounded-2xl object-cover bg-neutral-900 border border-white/15 shrink-0 shadow"
                        />
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-white truncate">{pack.title}</h3>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {pack.stickers?.length || 0} {getStickersWord(pack.stickers?.length || 0)}
                            {pack.is_mine && <span className="text-white font-medium ml-1.5">(Ваш пак)</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {pack.is_mine && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPack(pack);
                            }}
                            className="px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition"
                          >
                            Редактировать
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUninstall(pack.id);
                          }}
                          className="p-2 rounded-2xl text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Удалить из моих стикеров"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Таб 3: Создание стикерпака */
            <form onSubmit={handleCreatePack} className="max-w-md mx-auto space-y-4 py-2">
              <div className="text-center space-y-1 mb-4">
                <div className="w-12 h-12 rounded-2xl liquid-glass text-white border border-white/20 mx-auto flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Создайте свой стикерпак</h3>
                <p className="text-xs text-neutral-400">
                  Он появится в вашем аккаунте и станет доступен в магазине для всех пользователей!
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Название стикерпака *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Например: Мои крутые мемы"
                  maxLength={40}
                  className="w-full px-3.5 py-2.5 bg-neutral-900/60 border border-white/10 rounded-2xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Обложка стикерпака (по желанию)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setNewCoverFile(file);
                    if (file) setNewCoverPreview(URL.createObjectURL(file));
                  }}
                  className="w-full text-xs text-neutral-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 cursor-pointer"
                />
                {newCoverPreview && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={newCoverPreview} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-white/15" />
                    <span className="text-xs text-white">Обложка выбрана</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={creating || !newTitle.trim()}
                className="w-full py-3 x-btn-primary disabled:opacity-50 text-black rounded-2xl text-sm font-bold shadow-lg transition transform active:scale-95"
              >
                {creating ? 'Создание...' : 'Создать и перейти к загрузке стикеров →'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

function getStickersWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'стикеров';
  if (mod10 === 1) return 'стикер';
  if (mod10 >= 2 && mod10 <= 4) return 'стикера';
  return 'стикеров';
}
