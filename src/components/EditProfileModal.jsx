import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  Upload, 
  Camera, 
  Image as ImageIcon, 
  User, 
  Calendar, 
  Sparkles, 
  Check, 
  AlertCircle,
  Palette,
  Bell,
  Lock
} from 'lucide-react';
import { 
  getNotificationPermission, 
  requestBrowserNotificationPermission, 
  sendBrowserNotification 
} from '../utils/browserNotifications';

const PRESET_GRADIENTS = [
  { id: 'monochrome', name: 'Монохром', value: 'linear-gradient(135deg, #262626 0%, #171717 50%, #000000 100%)' },
  { id: 'silver', name: 'Платина', value: 'linear-gradient(135deg, #52525b 0%, #27272a 50%, #09090b 100%)' },
  { id: 'cosmic', name: 'Космос', value: 'linear-gradient(135deg, #1e1e24 0%, #2e2836 50%, #111015 100%)' },
  { id: 'cyber', name: 'Светящийся', value: 'linear-gradient(135deg, #3f3f46 0%, #18181b 50%, #000000 100%)' },
  { id: 'midnight', name: 'Глубокая ночь', value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #090d16 100%)' },
  { id: 'carbon', name: 'Карбон', value: 'linear-gradient(135deg, #333333 0%, #1a1a1a 50%, #0d0d0d 100%)' },
];

const PRESET_BADGES = [
  '🎨 Художник',
  '📸 Фотограф',
  '🎮 Геймер',
  '✨ Мечтатель',
  '😂 Мемолог',
  '🎧 Меломан',
  '🐱 Кошатник',
  '🚀 Исследователь'
];

export function EditProfileModal({ isOpen, onClose, onProfileUpdated }) {
  const { user, updateUser } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [birthdate, setBirthdate] = useState(user?.birthdate || '');
  const [badge, setBadge] = useState(user?.badge || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [banner, setBanner] = useState(user?.banner || '');

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Google привязка
  const [googleClientId, setGoogleClientId] = useState('');
  const [linking, setLinking] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);

  // Браузерные уведомления
  const [browserPerm, setBrowserPerm] = useState('default');

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const googleLinkBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username || '');
      setBio(user.bio || '');
      setBirthdate(user.birthdate || '');
      setBadge(user.badge || '');
      setAvatar(user.avatar || '');
      setBanner(user.banner || '');
      setError('');
      setSuccessMsg('');
      setShowSetPassword(false);
      setNewPassword('');
      setBrowserPerm(getNotificationPermission());

      api.getHealth()
        .then(data => {
          if (data.googleClientId) setGoogleClientId(data.googleClientId);
        })
        .catch(() => {});
    }
  }, [isOpen, user]);

  async function handleToggleBrowserNotifications() {
    const res = await requestBrowserNotificationPermission();
    setBrowserPerm(res);
    if (res === 'granted') {
      sendBrowserNotification({
        title: 'Уведомления PicShare 🔔',
        body: 'Браузерные уведомления успешно включены!'
      });
      setSuccessMsg('Браузерные уведомления успешно включены!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  }

  const effectiveClientId = googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // Инициализация кнопки Google Identity Services
  useEffect(() => {
    if (!isOpen || user?.google_id) return;

    const setupGoogle = () => {
      if (window.google?.accounts?.id && effectiveClientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: effectiveClientId,
            callback: handleGoogleLinkResponse,
          });

          if (googleLinkBtnRef.current) {
            googleLinkBtnRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleLinkBtnRef.current, {
              theme: 'filled_black',
              size: 'medium',
              shape: 'pill',
              text: 'continue_with',
            });
          }
        } catch (e) {
          console.warn('Google GSI link init notice:', e);
        }
      }
    };

    setupGoogle();
    const timer = setTimeout(setupGoogle, 350);
    return () => clearTimeout(timer);
  }, [isOpen, effectiveClientId, user?.google_id]);

  if (!isOpen) return null;

  async function handleGoogleLinkResponse(response) {
    if (!response?.credential) return;
    setLinking(true);
    setError('');
    try {
      const data = await api.linkGoogle(response.credential);
      updateUser(data.user);
      setSuccessMsg('Google аккаунт успешно привязан!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Ошибка привязки Google');
    } finally {
      setLinking(false);
    }
  }

  async function handleDemoGoogleLink() {
    const email = prompt('Введите email Google-аккаунта для привязки:');
    if (!email) return;
    setLinking(true);
    setError('');
    try {
      const data = await api.linkGoogleDemo(email);
      updateUser(data.user);
      setSuccessMsg('Google аккаунт успешно привязан!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Ошибка привязки');
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlinkGoogle() {
    if (!confirm('Вы уверены, что хотите отвязать Google аккаунт?')) return;
    setLinking(true);
    setError('');
    try {
      const data = await api.unlinkGoogle();
      updateUser(data.user);
      setSuccessMsg('Google аккаунт отвязан');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Ошибка отвязки Google');
    } finally {
      setLinking(false);
    }
  }

  async function handleSetPassword(e) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }
    setSettingPassword(true);
    setError('');
    try {
      const data = await api.setPassword(newPassword);
      updateUser(data.user);
      setShowSetPassword(false);
      setNewPassword('');
      setSuccessMsg('Пароль успешно установлен!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Ошибка установки пароля');
    } finally {
      setSettingPassword(false);
    }
  }

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    setUploadingAvatar(true);
    setError('');
    try {
      const res = await api.uploadMedia(file);
      setAvatar(res.url);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки аватара');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (file) => {
    if (!file) return;
    setUploadingBanner(true);
    setError('');
    try {
      const res = await api.uploadMedia(file);
      setBanner(res.url);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки баннера');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleDicebearAvatar = () => {
    const random = Math.floor(Math.random() * 10000);
    setAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=user_${random}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Имя пользователя обязательно');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.updateProfile({
        username: username.trim(),
        bio: bio.trim(),
        birthdate: birthdate || null,
        badge: badge.trim() || null,
        avatar: avatar || null,
        banner: banner || null,
      });

      updateUser(res.user);
      onProfileUpdated && onProfileUpdated(res.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Не удалось обновить профиль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xl animate-backdrop-fade"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl liquid-glass-modal border border-white/15 rounded-3xl overflow-hidden shadow-2xl max-h-[94dvh] sm:max-h-[90dvh] flex flex-col animate-modal-spring"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Шапка модалки */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/40 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-white" />
            <h3 className="font-bold text-base sm:text-lg text-white">Редактирование профиля</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full liquid-glass-pill text-neutral-400 hover:text-white border border-white/10 hover:border-white/20 transition active:scale-90 touch-manipulation"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Форма редактирования со скроллом */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Превью Баннера и Аватара */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Баннер и Аватарка
            </label>

            {/* Контейнер баннера */}
            <div className="relative h-28 sm:h-36 rounded-2xl overflow-hidden bg-gradient-to-r from-neutral-900 via-neutral-950 to-black border border-white/10 group">
              {banner && banner.startsWith('linear-gradient(') ? (
                <div style={{ background: banner }} className="w-full h-full" />
              ) : banner ? (
                <img src={banner} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs font-medium">
                  Стандартный градиент
                </div>
              )}

              {/* Кнопка смены баннера */}
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-full liquid-glass-pill text-white text-[11px] sm:text-xs font-semibold border border-white/20 transition flex items-center gap-1.5 active:scale-95 touch-manipulation shadow-md"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{uploadingBanner ? 'Загрузка...' : 'Сменить баннер'}</span>
              </button>

              <input
                type="file"
                ref={bannerInputRef}
                onChange={(e) => handleBannerUpload(e.target.files[0])}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* Аватарка (наезжает на нижний край баннера) */}
            <div className="relative -mt-10 sm:-mt-12 ml-2 sm:ml-4 flex items-end gap-2.5 sm:gap-3 mb-3">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl overflow-hidden border-4 border-black bg-neutral-900 shadow-2xl group shrink-0">
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                  title="Загрузить аватарку"
                >
                  <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="x-btn-secondary px-3 py-1.5 rounded-full text-xs font-semibold"
                >
                  {uploadingAvatar ? 'Загрузка...' : 'Загрузить фото'}
                </button>
                <button
                  type="button"
                  onClick={handleDicebearAvatar}
                  className="liquid-glass-pill px-3 py-1.5 rounded-full text-white text-xs font-semibold border border-white/15 hover:bg-white/15 transition flex items-center gap-1 active:scale-95 touch-manipulation"
                >
                  <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Сгенерировать</span>
                </button>
              </div>

              <input
                type="file"
                ref={avatarInputRef}
                onChange={(e) => handleAvatarUpload(e.target.files[0])}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* Готовые пресеты градиентов для баннера */}
            <div className="p-2 sm:p-2.5 rounded-2xl liquid-glass-subtle border border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-medium text-neutral-400 shrink-0 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-neutral-300" />
                <span>Градиенты:</span>
              </span>
              {PRESET_GRADIENTS.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => setBanner(preset.value)}
                  style={{ background: preset.value }}
                  title={preset.name}
                  className={`w-9 h-6 sm:w-11 sm:h-7 rounded-lg shrink-0 border transition active:scale-95 touch-manipulation shadow-sm ${
                    banner === preset.value
                      ? 'border-white ring-2 ring-white/50 scale-105'
                      : 'border-white/20 hover:scale-105 hover:border-white/50'
                  }`}
                />
              ))}
              {banner && (
                <button
                  type="button"
                  onClick={() => setBanner('')}
                  className="text-[11px] font-medium text-neutral-400 hover:text-white ml-1 shrink-0 px-2 py-1 rounded-lg hover:bg-white/10 transition"
                >
                  Сбросить
                </button>
              )}
            </div>
          </div>

          {/* 2. Имя пользователя */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Имя пользователя (Никнейм)
            </label>
            <input
              type="text"
              required
              minLength={3}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-neutral-900/60 border border-white/10 rounded-2xl px-4 py-3 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition"
            />
          </div>

          {/* 3. Описание профиля (Bio) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                О себе (Описание)
              </label>
              <span className="text-[11px] text-neutral-500">
                {bio.length}/300
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={300}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Расскажите о себе, своих увлечениях или любимых артах..."
              className="w-full bg-neutral-900/60 border border-white/10 rounded-2xl p-3.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition resize-none"
            />
          </div>

          {/* 4. Дата рождения */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span>Дата рождения</span>
            </label>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className="w-full bg-neutral-900/60 border border-white/10 rounded-2xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition cursor-pointer"
            />
          </div>

          {/* 5. Статус-бейдж */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-neutral-400" />
              <span>Статус-бейдж</span>
            </label>
            <input
              type="text"
              maxLength={50}
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="Например: 🎨 Люблю рисовать"
              className="w-full bg-neutral-900/60 border border-white/10 rounded-2xl px-4 py-3 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition mb-2"
            />
            {/* Быстрые пресеты бейджей */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_BADGES.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => setBadge(b)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition active:scale-95 touch-manipulation ${
                    badge === b 
                      ? 'bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.3)]' 
                      : 'liquid-glass-pill text-neutral-300 border-white/10 hover:border-white/30'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Привязка Google аккаунта */}
          <div className="p-4 rounded-2xl liquid-glass-subtle border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="text-xs font-bold text-white">Google аккаунт</span>
              </div>

              {user?.google_id ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full liquid-glass-pill border border-emerald-400/30 text-emerald-400 text-xs font-semibold">
                  <Check className="w-3 h-3" />
                  <span>Привязан</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full liquid-glass-pill text-neutral-400 text-xs font-semibold border border-white/10">
                  Не привязан
                </span>
              )}
            </div>

            {user?.google_id ? (
              <div className="space-y-2 mt-2">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Ваш Google аккаунт привязан. Вы можете входить на сайт в 1 клик через Google.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleUnlinkGoogle}
                    disabled={linking}
                    className="px-3.5 py-1.5 rounded-full x-btn-secondary text-neutral-300 hover:text-rose-400 hover:border-rose-500/30 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
                  >
                    {linking ? 'Отвязка...' : 'Отвязать Google'}
                  </button>
                  {!user?.has_password && (
                    <button
                      type="button"
                      onClick={() => setShowSetPassword(!showSetPassword)}
                      className="px-3.5 py-1.5 rounded-full x-btn-secondary text-white text-xs font-semibold transition"
                    >
                      {showSetPassword ? 'Отмена' : 'Установить пароль'}
                    </button>
                  )}
                </div>

                {showSetPassword && (
                  <div className="mt-2.5 p-3 rounded-2xl liquid-glass border border-white/10 space-y-2">
                    <label className="block text-xs font-semibold text-neutral-300">
                      Установите пароль (от 6 символов), чтобы входить без Google:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Новый пароль..."
                        className="flex-1 bg-neutral-900/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/40"
                      />
                      <button
                        type="button"
                        onClick={handleSetPassword}
                        disabled={settingPassword || newPassword.length < 6}
                        className="x-btn-primary px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 transition"
                      >
                        {settingPassword ? '...' : 'Сохранить'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Привяжите аккаунт Google, чтобы моментально входить в свой профиль в один клик без ввода логина и пароля.
                </p>
                <div className="pt-1">
                  <div ref={googleLinkBtnRef} className={`flex justify-start min-h-[38px] ${effectiveClientId ? 'block' : 'hidden'}`}></div>
                  {!effectiveClientId && (
                    <button
                      type="button"
                      onClick={handleDemoGoogleLink}
                      disabled={linking}
                      className="x-btn-secondary px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>{linking ? 'Привязка...' : 'Привязать Google'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 7. Уведомления браузера */}
          <div className="p-4 rounded-2xl liquid-glass-subtle border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white">Уведомления браузера</span>
              </div>

              {browserPerm === 'granted' ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full liquid-glass-pill border border-emerald-400/30 text-emerald-400 text-xs font-semibold">
                  <Check className="w-3 h-3" />
                  <span>Включены</span>
                </span>
              ) : browserPerm === 'denied' ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full liquid-glass-pill border border-amber-400/30 text-amber-400 text-xs font-semibold">
                  <Lock className="w-3 h-3" />
                  <span>Заблокированы</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full liquid-glass-pill text-neutral-400 text-xs font-semibold border border-white/10">
                  Выключены
                </span>
              )}
            </div>

            {browserPerm === 'granted' ? (
              <div className="space-y-2 mt-2">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Браузерные уведомления включены. Вы будете получать системные оповещения о новых сообщениях и заявках в друзья.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    sendBrowserNotification({
                      title: 'Проверка уведомлений PicShare 🔔',
                      body: 'Всё работает отлично! Вы будете получать сообщения, даже когда вкладка свернута.'
                    });
                    try {
                      await api.testPush();
                    } catch (e) {}
                  }}
                  className="x-btn-secondary px-3.5 py-1.5 rounded-full text-xs font-semibold"
                >
                  Проверить уведомление
                </button>
              </div>
            ) : browserPerm === 'denied' ? (
              <div className="space-y-2 mt-2">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Уведомления заблокированы сайтом в вашем браузере.
                </p>
                <div className="p-3 rounded-2xl liquid-glass border border-white/10 text-xs text-neutral-300 space-y-1">
                  <p className="font-bold text-white">Как включить:</p>
                  <p>1. Нажмите на значок настроек/замка <b>🔒</b> слева от адреса сайта в строке браузера.</p>
                  <p>2. Переключите пункт <b>«Уведомления»</b> в положение <b>«Разрешить»</b>.</p>
                  <p>3. Обновите страницу сайта.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Включите уведомления, чтобы не пропускать важные сообщения и заявки в друзья, когда вкладка свернута.
                </p>
                <button
                  type="button"
                  onClick={handleToggleBrowserNotifications}
                  className="x-btn-primary px-4 py-2 rounded-full text-xs font-bold transition active:scale-95 flex items-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Включить уведомления</span>
                </button>
              </div>
            )}
          </div>

          {/* Кнопка сохранения */}
          <div className="pt-2 sticky bottom-0 bg-black/60 backdrop-blur-2xl -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 p-4 sm:p-6 border-t border-white/10">
            <button
              type="submit"
              disabled={loading || uploadingAvatar || uploadingBanner}
              className="x-btn-primary w-full py-3.5 rounded-full text-sm font-bold shadow-lg transition active:scale-98 disabled:opacity-50 touch-manipulation"
            >
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
