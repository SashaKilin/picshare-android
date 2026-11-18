import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  X, 
  Users, 
  Crown, 
  UserPlus, 
  UserMinus, 
  LogOut, 
  Trash2, 
  Edit3, 
  Camera, 
  Sparkles, 
  Check, 
  AlertCircle,
  Search,
  ShieldCheck
} from 'lucide-react';

export function GroupInfoModal({
  isOpen,
  onClose,
  groupId,
  friends = [],
  onOpenProfile,
  onGroupUpdated,
  onGroupDeleted,
  onLeaveGroup
}) {
  const { user: currentUser } = useAuth();
  const { onlineUsers } = useSocket();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Режим редактирования
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Режим добавления участников
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [addingLoading, setAddingLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !groupId) {
      setGroup(null);
      setMembers([]);
      setIsEditing(false);
      setIsAddingMembers(false);
      return;
    }

    loadGroupDetails();
  }, [isOpen, groupId]);

  const loadGroupDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getGroup(groupId);
      setGroup(data.group);
      setMembers(data.group.members || []);
      setEditName(data.group.name || '');
      setEditDesc(data.group.description || '');
      setEditAvatar(data.group.avatar || '');
    } catch (err) {
      setError(err.message || 'Не удалось загрузить данные группы');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isCreator = group && currentUser && (Number(group.creator_id) === Number(currentUser.id));

  // Друзья, которых еще нет в группе
  const existingMemberIds = members.map(m => Number(m.id));
  const availableFriends = friends.filter(f => !existingMemberIds.includes(Number(f.id)));
  const filteredAvailableFriends = availableFriends.filter(f =>
    f.username.toLowerCase().includes(friendSearch.toLowerCase()) ||
    (f.email && f.email.toLowerCase().includes(friendSearch.toLowerCase()))
  );

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    setUploadingAvatar(true);
    setError('');
    try {
      const res = await api.uploadMedia(file);
      setEditAvatar(res.url);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки аватара');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDicebear = () => {
    const random = Math.floor(Math.random() * 10000);
    setEditAvatar(`https://api.dicebear.com/7.x/identicon/svg?seed=group_${random}`);
  };

  // Сохранить изменения группы
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setSavingEdit(true);
    setError('');
    try {
      const res = await api.updateGroup(groupId, {
        name: editName.trim(),
        description: editDesc.trim(),
        avatar: editAvatar
      });

      setGroup(prev => ({
        ...prev,
        ...res.group
      }));
      setIsEditing(false);
      onGroupUpdated && onGroupUpdated(res.group);
    } catch (err) {
      setError(err.message || 'Не удалось обновить группу');
    } finally {
      setSavingEdit(false);
    }
  };

  // Добавить участников (только создатель)
  const handleAddMembersSubmit = async () => {
    if (selectedFriendIds.length === 0) return;
    setAddingLoading(true);
    setError('');
    try {
      const res = await api.addGroupMembers(groupId, selectedFriendIds);
      setMembers(res.members || []);
      setGroup(prev => ({ ...prev, members_count: res.members?.length || prev.members_count }));
      setIsAddingMembers(false);
      setSelectedFriendIds([]);
      onGroupUpdated && onGroupUpdated({ ...group, members_count: res.members?.length });
    } catch (err) {
      setError(err.message || 'Не удалось добавить участников');
    } finally {
      setAddingLoading(false);
    }
  };

  // Удалить участника
  const handleRemoveMember = async (targetUserId, targetUsername) => {
    if (!confirm(`Исключить ${targetUsername} из группы?`)) return;
    try {
      await api.removeGroupMember(groupId, targetUserId);
      setMembers(prev => prev.filter(m => Number(m.id) !== Number(targetUserId)));
      setGroup(prev => ({ ...prev, members_count: Math.max(1, (prev.members_count || 1) - 1) }));
      onGroupUpdated && onGroupUpdated({ ...group, members_count: Math.max(1, (group.members_count || 1) - 1) });
    } catch (err) {
      alert(err.message || 'Ошибка исключения участника');
    }
  };

  // Выйти из группы
  const handleLeave = async () => {
    if (!confirm('Вы уверены, что хотите выйти из этой группы?')) return;
    try {
      await api.removeGroupMember(groupId, currentUser.id);
      onLeaveGroup && onLeaveGroup(groupId);
      onClose();
    } catch (err) {
      alert(err.message || 'Ошибка выхода из группы');
    }
  };

  // Удалить группу целиком
  const handleDeleteGroup = async () => {
    if (!confirm(`Вы действительно хотите безвозвратно удалить группу «${group.name}» и всю переписку?`)) return;
    try {
      await api.deleteGroup(groupId);
      onGroupDeleted && onGroupDeleted(groupId);
      onClose();
    } catch (err) {
      alert(err.message || 'Ошибка удаления группы');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl max-h-[94dvh] sm:max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-950/60 hover:bg-slate-950 text-white backdrop-blur border border-white/10 transition shadow-lg active:scale-90 touch-manipulation"
          title="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center animate-spin">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Загрузка информации...</span>
          </div>
        ) : error ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
              <X className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-rose-300">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Закрыть
            </button>
          </div>
        ) : group ? (
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            
            {/* РЕЖИМ 1: РЕДАКТИРОВАНИЕ ДАННЫХ ГРУППЫ (ТОЛЬКО СОЗДАТЕЛЬ) */}
            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-indigo-400" />
                    <span>Редактирование группы</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Отмена
                  </button>
                </div>

                {/* Аватарка */}
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-3xl overflow-hidden border-2 border-indigo-500/50 bg-slate-800 shrink-0 shadow-lg group">
                    <img src={editAvatar} alt="Group avatar" className="w-full h-full object-cover" />
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer text-white">
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
                      Фото группы
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer flex items-center gap-1.5 active:scale-95 touch-manipulation">
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

                {/* Название */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Название группы
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Описание */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Описание
                  </label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Описание группы..."
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-base sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit || !editName.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md active:scale-95 transition"
                  >
                    {savingEdit ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                </div>
              </form>
            ) : isAddingMembers ? (
              /* РЕЖИМ 2: ДОБАВЛЕНИЕ УЧАСТНИКОВ (ТОЛЬКО СОЗДАТЕЛЬ) */
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-indigo-400" />
                    <span>Добавить участников из друзей</span>
                  </h3>
                  <button
                    onClick={() => {
                      setIsAddingMembers(false);
                      setSelectedFriendIds([]);
                    }}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Назад
                  </button>
                </div>

                {availableFriends.length > 4 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      placeholder="Поиск по друзьям..."
                      className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto space-y-1.5 p-1 bg-slate-800/30 rounded-2xl border border-slate-800 custom-scrollbar">
                  {availableFriends.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Все ваши друзья уже состоят в этой группе!
                    </div>
                  ) : filteredAvailableFriends.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Никого не найдено
                    </div>
                  ) : (
                    filteredAvailableFriends.map((friend) => {
                      const isSelected = selectedFriendIds.includes(friend.id);
                      return (
                        <div
                          key={friend.id}
                          onClick={() => {
                            setSelectedFriendIds(prev =>
                              prev.includes(friend.id)
                                ? prev.filter(id => id !== friend.id)
                                : [...prev, friend.id]
                            );
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition touch-manipulation ${
                            isSelected 
                              ? 'bg-indigo-600/20 border border-indigo-500/40' 
                              : 'hover:bg-slate-800/60 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={friend.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.username}`}
                              alt={friend.username}
                              className="w-9 h-9 rounded-full border border-slate-700 object-cover shrink-0"
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

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setIsAddingMembers(false);
                      setSelectedFriendIds([]);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleAddMembersSubmit}
                    disabled={addingLoading || selectedFriendIds.length === 0}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md active:scale-95 transition disabled:opacity-50"
                  >
                    {addingLoading ? 'Добавление...' : `Добавить (${selectedFriendIds.length})`}
                  </button>
                </div>
              </div>
            ) : (
              /* РЕЖИМ 3: ПРОСМОТР ИНФОРМАЦИИ И СПИСКА УЧАСТНИКОВ */
              <div>
                {/* Карточка шапки группы */}
                <div className="p-5 sm:p-6 bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 border-b border-slate-800 text-center relative">
                  <div className="relative inline-block mb-3">
                    <img
                      src={group.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${group.name}`}
                      alt={group.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-3 border-indigo-500/50 object-cover bg-slate-800 shadow-xl mx-auto"
                    />
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {group.name}
                  </h2>

                  {group.description && (
                    <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed whitespace-pre-wrap">
                      {group.description}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <span className="font-semibold text-indigo-400">{members.length} участников</span>
                    <span>•</span>
                    <span>Создана {new Date(group.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>

                  {/* Кнопки действий создателя */}
                  {isCreator && (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 active:scale-95 transition touch-manipulation"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Редактировать</span>
                      </button>
                      <button
                        onClick={() => setIsAddingMembers(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 active:scale-95 transition touch-manipulation"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Добавить участника</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Список участников */}
                <div className="p-4 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Участники ({members.length})</span>
                    </h4>
                    {isCreator && (
                      <span className="text-[11px] text-indigo-400">
                        Вы — создатель группы
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {members.map((member) => {
                      const isOnline = onlineUsers ? onlineUsers.has(Number(member.id)) : false;
                      const isMemberCreator = Number(member.id) === Number(group.creator_id);
                      const isMe = Number(member.id) === Number(currentUser.id);

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 transition"
                        >
                          <div 
                            onClick={() => {
                              onClose();
                              onOpenProfile && onOpenProfile(member.id);
                            }}
                            className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-85 transition group"
                            title="Открыть профиль"
                          >
                            <div className="relative shrink-0">
                              <img
                                src={member.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.username}`}
                                alt={member.username}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-700 object-cover bg-slate-800 group-hover:border-indigo-400"
                              />
                              <span
                                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                                  isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                                }`}
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs sm:text-sm text-slate-200 truncate group-hover:text-indigo-300">
                                  {member.username}
                                </span>
                                {isMe && (
                                  <span className="text-[10px] text-slate-400 font-normal">(вы)</span>
                                )}
                                {isMemberCreator && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                                    <Crown className="w-3 h-3 text-amber-400" />
                                    <span>Создатель</span>
                                  </span>
                                )}
                              </div>
                              {member.badge && (
                                <div className="text-[10px] text-indigo-400 truncate mt-0.5">
                                  {member.badge}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Действия с участником */}
                          <div className="flex items-center gap-1">
                            {isCreator && !isMemberCreator && (
                              <button
                                onClick={() => handleRemoveMember(member.id, member.username)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition active:scale-95 touch-manipulation"
                                title="Исключить из группы"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Нижние опасные действия: Выйти или Удалить */}
                  <div className="pt-4 border-t border-slate-800/80 space-y-2">
                    {isCreator ? (
                      <button
                        onClick={handleDeleteGroup}
                        className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 flex items-center justify-center gap-1.5 transition active:scale-95 touch-manipulation"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Удалить группу</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleLeave}
                        className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 flex items-center justify-center gap-1.5 transition active:scale-95 touch-manipulation"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Покинуть группу</span>
                      </button>
                    )}
                  </div>

                </div>
              </div>
            )}

          </div>
        ) : null}

      </div>
    </div>
  );
}
