import React, { useState } from 'react';
import { api } from '../api';
import { 
  X, 
  Users, 
  Camera, 
  Sparkles, 
  Search, 
  Check, 
  AlertCircle,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function CreateGroupModal({ isOpen, onClose, friends = [], onGroupCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [friendSearch, setFriendSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const currentAvatar = avatar || (name.trim() 
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim())}`
    : 'https://api.dicebear.com/7.x/identicon/svg?seed=new_group');

  const handleDicebear = () => {
    const random = Math.floor(Math.random() * 10000);
    setAvatar(`https://api.dicebear.com/7.x/identicon/svg?seed=group_${random}`);
  };

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    setUploadingAvatar(true);
    setError('');
    try {
      const res = await api.uploadMedia(file);
      setAvatar(res.url);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки аватара группы');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleFriend = (friendId) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(friendSearch.toLowerCase()) ||
    (f.email && f.email.toLowerCase().includes(friendSearch.toLowerCase()))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Введите название группы');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.createGroup({
        name: name.trim(),
        description: description.trim(),
        avatar: currentAvatar,
        memberIds: selectedFriendIds
      });

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      onGroupCreated && onGroupCreated(res.group);
      onClose();
      // Сброс полей
      setName('');
      setDescription('');
      setAvatar('');
      setSelectedFriendIds([]);
    } catch (err) {
      setError(err.message || 'Не удалось создать группу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl max-h-[94dvh] sm:max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Шапка модалки */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base sm:text-lg text-white">Создание новой группы</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-90 touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Аватарка группы */}
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-indigo-500/40 bg-slate-800 shrink-0 shadow-lg group">
              <img src={currentAvatar} alt="Group avatar" className="w-full h-full object-cover" />
              <label 
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer text-white"
                title="Загрузить фото группы"
              >
                <Camera className="w-6 h-6" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAvatarUpload(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-200">
                Аватарка группы
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer active:scale-95 touch-manipulation flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{uploadingAvatar ? 'Загрузка...' : 'Загрузить фото'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleAvatarUpload(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleDicebear}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium border border-indigo-500/30 transition flex items-center gap-1.5 active:scale-95 touch-manipulation"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Сгенерировать</span>
                </button>
              </div>
            </div>
          </div>

          {/* Название группы */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Название группы <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Друзья по играм, Мемы или Проект"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Описание группы */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Описание (тема группы)
            </label>
            <textarea
              rows={2}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="О чем эта группа? (необязательно)"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition resize-none"
            />
          </div>

          {/* Выбор участников из друзей */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Добавить участников (только вы сможете добавлять участников)
              </label>
              <span className="text-[11px] text-indigo-400 font-medium">
                Выбрано: {selectedFriendIds.length}
              </span>
            </div>

            {friends.length > 5 && (
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  placeholder="Поиск по друзьям..."
                  className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            <div className="max-h-44 overflow-y-auto space-y-1 p-1 bg-slate-800/30 rounded-2xl border border-slate-800/80 custom-scrollbar">
              {friends.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  У вас пока нет друзей для добавления в группу. Вы сможете пригласить их позже!
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Никого не найдено
                </div>
              ) : (
                filteredFriends.map((friend) => {
                  const isSelected = selectedFriendIds.includes(friend.id);
                  return (
                    <div
                      key={friend.id}
                      onClick={() => toggleFriend(friend.id)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition touch-manipulation ${
                        isSelected 
                          ? 'bg-indigo-600/20 border border-indigo-500/40' 
                          : 'hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={friend.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.username}`}
                          alt={friend.username}
                          className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
                        />
                        <div className="min-w-0 text-left">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {friend.username}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {friend.email}
                          </div>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition shrink-0 ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-500 text-white' 
                          : 'border-slate-700 bg-slate-800 text-transparent'
                      }`}>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Кнопка создания */}
          <div className="pt-2 sticky bottom-0 bg-slate-900/90 backdrop-blur-sm -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 p-4 sm:p-6 border-t border-slate-800">
            <button
              type="submit"
              disabled={loading || uploadingAvatar || !name.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition active:scale-98 disabled:opacity-50 touch-manipulation flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'Создание...' : 'Создать группу'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
