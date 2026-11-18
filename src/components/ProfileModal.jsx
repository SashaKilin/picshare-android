import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  X, 
  Calendar, 
  User, 
  MessageSquare, 
  UserPlus, 
  UserCheck, 
  Clock, 
  Edit3, 
  Share2, 
  Check, 
  Sparkles, 
  Image as ImageIcon,
  Users,
  ShieldCheck,
  Cake,
  ExternalLink,
  LogOut
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Функция для вычисления возраста по дате рождения (ГГГГ-ММ-ДД)
function calculateAge(birthdateStr) {
  if (!birthdateStr) return null;
  const birthDate = new Date(birthdateStr);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

// Форматирование даты рождения
function formatBirthdate(birthdateStr) {
  if (!birthdateStr) return null;
  const date = new Date(birthdateStr);
  if (isNaN(date.getTime())) return birthdateStr;
  
  const formatted = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const age = calculateAge(birthdateStr);
  return age !== null ? `${formatted} (${age} ${getAgeWord(age)})` : formatted;
}

function getAgeWord(age) {
  const mod10 = age % 10;
  const mod100 = age % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'лет';
  if (mod10 === 1) return 'год';
  if (mod10 >= 2 && mod10 <= 4) return 'года';
  return 'лет';
}

function formatJoinDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric'
  });
}

export function ProfileModal({
  isOpen,
  onClose,
  userIdOrUsername,
  onOpenEditProfile,
  onSelectFriend,
  onOpenLightbox
}) {
  const { user: currentUser, logout } = useAuth();
  const { onlineUsers } = useSocket();

  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!isOpen || !userIdOrUsername) {
      setProfileUser(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError('');

    api.getUserProfile(userIdOrUsername)
      .then((data) => {
        if (isMounted) {
          setProfileUser(data.user);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Не удалось загрузить профиль пользователя');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, userIdOrUsername]);

  if (!isOpen) return null;

  const isSelf = profileUser && currentUser && (Number(profileUser.id) === Number(currentUser.id));
  const isOnline = profileUser && onlineUsers ? onlineUsers.has(Number(profileUser.id)) : false;

  const handleCopyLink = () => {
    if (!profileUser) return;
    const shareUrl = `${window.location.origin}/#profile/${profileUser.username}`;
    navigator.clipboard?.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendFriendRequest = async () => {
    if (!profileUser) return;
    setActionLoading(true);
    try {
      const res = await api.sendFriendRequest(profileUser.id);
      if (res.status === 'accepted') {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        setProfileUser(prev => ({
          ...prev,
          relationship: 'friends',
          friends_count: (prev.friends_count || 0) + 1
        }));
      } else {
        setProfileUser(prev => ({
          ...prev,
          relationship: 'outgoing_request'
        }));
      }
    } catch (err) {
      alert(err.message || 'Ошибка отправки заявки');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!profileUser || !profileUser.requestId) return;
    setActionLoading(true);
    try {
      await api.acceptFriendRequest(profileUser.requestId, profileUser.id);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setProfileUser(prev => ({
        ...prev,
        relationship: 'friends',
        friends_count: (prev.friends_count || 0) + 1
      }));
    } catch (err) {
      alert(err.message || 'Ошибка принятия заявки');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl max-h-[94dvh] sm:max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 p-2.5 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white backdrop-blur-md border border-white/10 transition shadow-lg active:scale-90 touch-manipulation"
          title="Закрыть"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center animate-spin">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Загрузка профиля...</span>
          </div>
        ) : error ? (
          <div className="p-10 sm:p-12 text-center space-y-4">
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
        ) : profileUser ? (
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            
            {/* 1. БАННЕР ПРОФИЛЯ */}
            <div className="relative h-28 sm:h-44 w-full bg-slate-950 overflow-hidden">
              {profileUser.banner && profileUser.banner.startsWith('linear-gradient(') ? (
                <div style={{ background: profileUser.banner }} className="w-full h-full" />
              ) : profileUser.banner ? (
                <img
                  src={profileUser.banner}
                  alt="Баннер профиля"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 relative">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
              
              {/* Кнопка поделиться ссылкой на профиль */}
              <button
                onClick={handleCopyLink}
                className="absolute top-3 left-3 p-2 sm:py-1.5 sm:px-3 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white backdrop-blur-md border border-white/10 transition shadow-lg flex items-center gap-1.5 text-xs font-medium active:scale-95 touch-manipulation"
                title="Скопировать ссылку на профиль"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Скопировано!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-slate-300" />
                    <span className="hidden sm:inline text-slate-300">Поделиться</span>
                  </>
                )}
              </button>
            </div>

            {/* 2. АВАТАРКА И ОСНОВНАЯ ИНФОРМАЦИЯ */}
            <div className="px-4 sm:px-6 pb-6 relative -mt-10 sm:-mt-16">
              
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-4">
                {/* Аватарка с индикатором онлайна */}
                <div className="relative inline-block self-start">
                  <img
                    src={profileUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${profileUser.username}`}
                    alt={profileUser.username}
                    className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl border-4 border-slate-900 object-cover bg-slate-800 shadow-xl"
                  />
                  <span
                    className={`absolute bottom-1 right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-3 sm:border-4 border-slate-900 ${
                      isOnline ? 'bg-emerald-500 ring-2 ring-emerald-500/30' : 'bg-slate-600'
                    }`}
                    title={isOnline ? 'В сети' : 'Не в сети'}
                  />
                </div>

                {/* Кнопки действий (на мобильном на всю ширину для удобства пальца) */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {isSelf ? (
                    <>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenEditProfile && onOpenEditProfile();
                        }}
                        className="flex-1 sm:flex-initial justify-center flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 active:scale-95 touch-manipulation"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Редактировать профиль</span>
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          logout();
                        }}
                        className="flex-1 sm:flex-initial justify-center flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs sm:text-sm font-semibold transition transform hover:-translate-y-0.5 active:scale-95 touch-manipulation"
                        title="Выйти из текущего аккаунта"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Выйти</span>
                      </button>
                    </>
                  ) : profileUser.relationship === 'friends' ? (
                    <button
                      onClick={() => {
                        onClose();
                        onSelectFriend && onSelectFriend(profileUser);
                      }}
                      className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 active:scale-95 touch-manipulation"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Открыть чат</span>
                    </button>
                  ) : profileUser.relationship === 'incoming_request' ? (
                    <button
                      onClick={handleAcceptFriendRequest}
                      disabled={actionLoading}
                      className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5 active:scale-95 touch-manipulation"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Принять заявку</span>
                    </button>
                  ) : profileUser.relationship === 'outgoing_request' ? (
                    <button
                      disabled
                      className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 text-slate-400 text-xs sm:text-sm font-medium border border-slate-700/60 cursor-default"
                    >
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Заявка отправлена</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSendFriendRequest}
                      disabled={actionLoading}
                      className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 active:scale-95 touch-manipulation"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Добавить в друзья</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Имя, бейдж и почта */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {profileUser.username}
                  </h2>
                  
                  {/* Бейдж статуса */}
                  {profileUser.badge && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                      {profileUser.badge}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  {profileUser.email}
                </p>
              </div>

              {/* Описание (Bio) */}
              {profileUser.bio && (
                <div className="mt-3.5 sm:mt-4 p-3 sm:p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 text-slate-300 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                  {profileUser.bio}
                </div>
              )}

              {/* Дата рождения и дата регистрации */}
              <div className="mt-3.5 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                {profileUser.birthdate && (
                  <div className="flex items-center gap-1.5">
                    <Cake className="w-4 h-4 text-pink-400 shrink-0" />
                    <span>День рождения: <strong className="text-slate-200">{formatBirthdate(profileUser.birthdate)}</strong></span>
                  </div>
                )}
                
                {profileUser.created_at && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>В PicShare с <strong className="text-slate-200">{formatJoinDate(profileUser.created_at)}</strong></span>
                  </div>
                )}
              </div>

              {/* Статистика */}
              <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 flex items-center gap-2.5 sm:gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-bold text-white leading-tight">
                      {profileUser.friends_count || 0}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-400">Друзей</div>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 flex items-center gap-2.5 sm:gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-bold text-white leading-tight">
                      {profileUser.images_count || 0}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-400">Картинок отправлено</div>
                  </div>
                </div>
              </div>

              {/* Блок общих картинок (если друзья) */}
              {profileUser.relationship === 'friends' && profileUser.sharedImages && profileUser.sharedImages.length > 0 && (
                <div className="mt-4 sm:mt-5 border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Совместные фото и картинки</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Недавние
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {profileUser.sharedImages.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => {
                          onClose();
                          onOpenLightbox && onOpenLightbox(img);
                        }}
                        className="aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-indigo-500 cursor-pointer relative group transition active:opacity-80 touch-manipulation"
                      >
                        <img
                          src={img.file_url}
                          alt={img.original_name || 'shared'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
}
