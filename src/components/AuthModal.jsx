import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { X, Mail, Lock, User, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export function AuthModal({ isOpen, onClose }) {
  const { login } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [emailOrLogin, setEmailOrLogin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleClientConfigured, setGoogleClientConfigured] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [showGoogleGuide, setShowGoogleGuide] = useState(false);

  const googleBtnRef = useRef(null);

  // Проверка статуса Google Auth на бэкенде
  useEffect(() => {
    if (isOpen) {
      api.getHealth()
        .then(data => {
          setGoogleClientConfigured(Boolean(data.googleAuthConfigured));
          if (data.googleClientId) {
            setGoogleClientId(data.googleClientId);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const effectiveClientId = googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // Инициализация Google Identity Services если доступен
  useEffect(() => {
    if (!isOpen) return;

    const setupGoogle = () => {
      if (window.google?.accounts?.id && effectiveClientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: effectiveClientId,
            callback: handleGoogleCredentialResponse,
          });

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'filled_black',
              size: 'large',
              shape: 'pill',
              width: '100%',
              text: 'continue_with',
            });
          }
        } catch (e) {
          console.warn('Google GSI init notice:', e);
        }
      }
    };

    setupGoogle();
    const timer = setTimeout(setupGoogle, 350);
    return () => clearTimeout(timer);
  }, [isOpen, effectiveClientId, tab]);

  if (!isOpen) return null;

  async function handleGoogleCredentialResponse(response) {
    setError('');
    setLoading(true);
    try {
      const data = await api.googleAuth(response.credential);
      login(data.token, data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка авторизации через Google');
    } finally {
      setLoading(false);
    }
  }

  // Быстрый демо-вход через Google (если Client ID еще не заведен в Google Cloud)
  async function handleDemoGoogleLogin() {
    setError('');
    setLoading(true);
    try {
      const randomSeed = Math.floor(1000 + Math.random() * 9000);
      const mockName = `GoogleUser_${randomSeed}`;
      const mockEmail = `user${randomSeed}@gmail.com`;

      // Генерируем JWT payload для Google
      const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
      const payload = btoa(
        JSON.stringify({
          sub: `google_sub_${randomSeed}`,
          name: mockName,
          email: mockEmail,
          picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${mockName}`,
        })
      );
      const demoToken = `${header}.${payload}.signature`;

      const data = await api.googleAuth(demoToken);
      login(data.token, data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка при входе');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'register') {
        const data = await api.register({
          username,
          email,
          password,
        });
        login(data.token, data.user);
        onClose();
      } else {
        const data = await api.login({
          login: emailOrLogin,
          password,
        });
        login(data.token, data.user);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Ошибка запроса');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl max-h-[92dvh] overflow-y-auto">
        
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Заголовок */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {tab === 'login' ? 'Вход в PicShare' : 'Создать аккаунт'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {tab === 'login'
              ? 'Войдите, чтобы обмениваться картинками с друзьями'
              : 'Регистрация без кодов подтверждения на почту'}
          </p>
        </div>

        {/* Переключатель Вход / Регистрация */}
        <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 mb-6">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
              tab === 'login'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
              tab === 'register'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Форма */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Имя пользователя (никнейм)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alex_art"
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {tab === 'register' ? 'Email адрес' : 'Email или имя пользователя'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={tab === 'register' ? 'email' : 'text'}
                required
                value={tab === 'register' ? email : emailOrLogin}
                onChange={(e) => tab === 'register' ? setEmail(e.target.value) : setEmailOrLogin(e.target.value)}
                placeholder={tab === 'register' ? 'name@example.com' : 'name@example.com или alex_art'}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            {tab === 'register' && (
              <p className="text-[11px] text-slate-400 mt-1">Минимум 6 символов, без подтверждения по почте</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Загрузка...' : tab === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        {/* Разделитель */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 text-slate-500 font-medium">или через Google</span>
          </div>
        </div>

        {/* Google вход */}
        <div className="space-y-3">
          <div ref={googleBtnRef} className={`flex justify-center min-h-[44px] ${effectiveClientId ? 'block' : 'hidden'}`}></div>

          {!effectiveClientId && (
            <>
              <button
                type="button"
                onClick={handleDemoGoogleLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2.5 transition"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Войти через Google (в 1 клик)</span>
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowGoogleGuide(!showGoogleGuide)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                >
                  {showGoogleGuide ? 'Скрыть подсказку' : 'Как подключить настоящий Google аккаунт?'}
                </button>
                {showGoogleGuide && (
                  <div className="mt-2 text-left p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
                    <p className="font-semibold text-white">Инструкция:</p>
                    <p>1. В <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline">Google Cloud Console</a> создайте проект и настройте OAuth consent screen.</p>
                    <p>2. В Credentials создайте <b>OAuth 2.0 Client ID (Web Application)</b>.</p>
                    <p>3. В «Authorized JavaScript origins» укажите адрес сайта на Render.</p>
                    <p>4. В Render в Environment Variables добавьте: <code className="text-indigo-300 font-mono">GOOGLE_CLIENT_ID</code>.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
