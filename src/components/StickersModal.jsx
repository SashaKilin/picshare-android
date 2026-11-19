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
      // Обновляем списки локально
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
    if (!newTitle.trim()) {
      setError('Введите название стикерпака');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', newTitle.trim());
      if (newCoverFile) {
        formData.append('cover', newCoverFile);
      }
      const res = await api.createStickerPack(formData);
      setNewTitle('');
      setNewCoverFile(null);
      setNewCoverPreview(null);
      await loadData();
      if (onStickersUpdated) onStickersUpdated();
      // Сразу переходим к наполнению пака
      setEditingPack(res.pack);
      setActiveTab('my');
    } catch (err) {
      console.error('Ошибка создания:', err);
      setError('Не удалось создать стикерпак');
    } finally {
      setCreating(false);
    }
  }

  async function handleAddStickerToPack(e) {
    e.preventDefault();
    if (!editingPack || !newStickerFile) {
      setError('Выберите файл для стикера');
      return;
    }
    setAddingSticker(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('sticker', newStickerFile);
      formData.append('emoji', newStickerEmoji || '😊');
      const res = await api.addStickerToPack(editingPack.id, formData);
      setNewStickerFile(null);
      // Обновляем пак
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-modal-spring"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модального окна */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
              <Smile className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Стикеры PicShare 3.0</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm">
                  NEW
                </span>
              </h2>
              <p className="text-xs text-slate-400">Создавайте, делитесь и добавляйте стикерпаки</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition active:scale-95"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Навигация по табам */}
        <div className="flex border-b border-slate-800 px-4 pt-2 bg-slate-900/50 gap-2 shrink-0">
          <button
            onClick={() => { setActiveTab('store'); setEditingPack(null); setViewingPack(null); }}
            className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'store' && !editingPack && !viewingPack
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Магазин</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {storePacks.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('my'); setEditingPack(null); setViewingPack(null); }}
            className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'my' && !editingPack && !viewingPack
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderHeart className="w-4 h-4" />
            <span>Мои стикеры</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {myPacks.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('create'); setEditingPack(null); setViewingPack(null); }}
            className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'create' && !editingPack && !viewingPack
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Создать пак</span>
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
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
                  className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                >
                  ← Вернуться к моим пакам
                </button>
                <button
                  onClick={() => handleDeletePack(editingPack.id)}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Удалить весь пак</span>
                </button>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <img
                  src={editingPack.cover_url || (editingPack.stickers?.[0]?.file_url) || `https://api.dicebear.com/7.x/bottts/svg?seed=${editingPack.name}`}
                  alt={editingPack.title}
                  className="w-14 h-14 rounded-2xl object-cover bg-slate-800 border border-slate-700 shadow"
                />
                <div>
                  <h3 className="font-bold text-white text-base">{editingPack.title}</h3>
                  <p className="text-xs text-slate-400">
                    Стикеров в паке: {editingPack.stickers?.length || 0}
                  </p>
                </div>
              </div>

              {/* Форма добавления нового стикера */}
              <form onSubmit={handleAddStickerToPack} className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-3">
                <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Добавить стикер в пак</span>
                </h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewStickerFile(e.target.files[0])}
                    className="flex-1 text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newStickerEmoji}
                    onChange={(e) => setNewStickerEmoji(e.target.value)}
                    placeholder="Эмодзи (😊)"
                    maxLength={5}
                    className="w-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-center text-sm text-white"
                  />
                  <button
                    type="submit"
                    disabled={addingSticker || !newStickerFile}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow transition"
                  >
                    {addingSticker ? 'Загрузка...' : '+ Загрузить'}
                  </button>
                </div>
              </form>

              {/* Сетка существующих стикеров в паке */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 mb-2">Стикеры в паке:</h4>
                {editingPack.stickers && editingPack.stickers.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {editingPack.stickers.map((stk) => (
                      <div key={stk.id} className="relative group p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col items-center justify-center">
                        <img src={stk.file_url} alt="Sticker" className="w-16 h-16 object-contain" />
                        <span className="text-xs mt-1">{stk.emoji}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSticker(stk.id)}
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition hover:bg-rose-600"
                          title="Удалить стикер"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500">
                    В этом паке пока нет стикеров. Загрузите первый стикер выше!
                  </div>
                )}
              </div>
            </div>
          ) : viewingPack ? (
            /* Просмотр любого пака (с кнопкой Установить) */
            <div className="space-y-4 animate-fadeIn">
              <button
                onClick={() => setViewingPack(null)}
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
              >
                ← Назад к списку
              </button>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center gap-3">
                  <img
                    src={viewingPack.cover_url || (viewingPack.stickers?.[0]?.file_url) || `https://api.dicebear.com/7.x/bottts/svg?seed=${viewingPack.name}`}
                    alt={viewingPack.title}
                    className="w-14 h-14 rounded-2xl object-cover bg-slate-800 border border-slate-700 shadow"
                  />
                  <div>
                    <h3 className="font-bold text-white text-base">{viewingPack.title}</h3>
                    <p className="text-xs text-slate-400">
                      Автор: {viewingPack.creator_username || 'Официальный'} • {viewingPack.stickers?.length || 0} стикеров
                    </p>
                  </div>
                </div>

                {viewingPack.is_installed ? (
                  <button
                    onClick={() => handleUninstall(viewingPack.id)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-semibold border border-slate-700 transition"
                  >
                    Удалить из моих
                  </button>
                ) : (
                  <button
                    onClick={() => handleInstall(viewingPack.id)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white text-xs font-semibold shadow-md transition"
                  >
                    + Добавить стикерпак
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {(viewingPack.stickers || []).map((stk) => (
                  <div key={stk.id} className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40 flex flex-col items-center justify-center hover:scale-105 transition-transform">
                    <img src={stk.file_url} alt="Sticker" className="w-16 h-16 object-contain" />
                    <span className="text-xs mt-1">{stk.emoji}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'store' ? (
            /* Таб 1: Магазин стикеров */
            <div className="space-y-4">
              {/* Поиск */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по стикерпакам..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-800/70 border border-slate-700/70 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
                  Загрузка каталога стикеров...
                </div>
              ) : filteredStore.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Стикерпаков не найдено
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStore.map((pack) => (
                    <div
                      key={pack.id}
                      className="p-3.5 sm:p-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={pack.cover_url || (pack.samples?.[0]?.file_url) || `https://api.dicebear.com/7.x/bottts/svg?seed=${pack.name}`}
                          alt={pack.title}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-800 border border-slate-700 shrink-0 shadow"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-white truncate">{pack.title}</h3>
                            {pack.is_official && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold shrink-0">
                                Официальный
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
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
                              className="w-9 h-9 object-contain p-0.5 rounded-lg bg-slate-800/80 border border-slate-700/40 shrink-0"
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
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition"
                          title="Посмотреть все стикеры"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          <span>Просмотр</span>
                        </button>

                        {pack.is_installed ? (
                          <button
                            onClick={() => handleUninstall(pack.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition"
                            title="Нажмите чтобы удалить"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Добавлено</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleInstall(pack.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white text-xs font-semibold shadow transition active:scale-95"
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
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">У вас пока нет стикерпаков</p>
                  <p className="text-xs text-slate-500">
                    Перейдите во вкладку «Магазин» или создайте свой первый пак!
                  </p>
                  <button
                    onClick={() => setActiveTab('store')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow hover:bg-indigo-500 transition"
                  >
                    Перейти в магазин
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myPacks.map((pack) => (
                    <div
                      key={pack.id}
                      className="p-3.5 sm:p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={pack.cover_url || (pack.stickers?.[0]?.file_url) || `https://api.dicebear.com/7.x/bottts/svg?seed=${pack.name}`}
                          alt={pack.title}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-800 border border-slate-700 shrink-0 shadow"
                        />
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-white truncate">{pack.title}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {pack.stickers?.length || 0} {getStickersWord(pack.stickers?.length || 0)}
                            {pack.is_mine && <span className="text-purple-400 font-medium ml-1.5">(Ваш пак)</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {pack.is_mine && (
                          <button
                            onClick={() => setEditingPack(pack)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition"
                          >
                            Редактировать
                          </button>
                        )}
                        <button
                          onClick={() => handleUninstall(pack.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
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
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-purple-600/25">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Создайте свой стикерпак</h3>
                <p className="text-xs text-slate-400">
                  Он появится в вашем аккаунте и станет доступен в магазине для всех пользователей!
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Название стикерпака *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Например: Мои крутые мемы"
                  maxLength={40}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
                {newCoverPreview && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={newCoverPreview} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-slate-700" />
                    <span className="text-xs text-emerald-400">Обложка выбрана</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={creating || !newTitle.trim()}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-600/30 transition transform active:scale-95"
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
