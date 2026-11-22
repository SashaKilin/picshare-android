import React, { useState } from 'react';
import { getServerUrl, setServerUrl } from '../config';
import { CURRENT_VERSION } from '../version';
import { checkAppUpdate } from '../utils/appUpdater';
import { Server, Check, AlertCircle, RefreshCw, X, Radio, ArrowUpCircle } from 'lucide-react';

export function ServerSettingsModal({ isOpen, onClose, onShowUpdate }) {
  const [url, setUrl] = useState(getServerUrl());
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null); // { ok: boolean, message: string }
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  if (!isOpen) return null;

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateMsg('');
    const res = await checkAppUpdate();
    setCheckingUpdate(false);
    if (res.hasUpdate) {
      if (onShowUpdate) {
        onClose();
        onShowUpdate(res);
      }
    } else {
      setUpdateMsg('У вас установлена последняя версия PicShare!');
      setTimeout(() => setUpdateMsg(''), 4000);
    }
  };

  const handleTestConnection = async (targetUrl = url) => {
    setTesting(true);
    setStatus(null);
    try {
      const clean = (targetUrl || '').trim().replace(/\/+$/, '');
      const resp = await fetch(`${clean}/api/health`, { method: 'GET' });
      if (resp.ok) {
        setStatus({ ok: true, message: 'Успешное подключение к серверу PicShare!' });
      } else {
        setStatus({ ok: false, message: `Сервер ответил с кодом ${resp.status}` });
      }
    } catch (e) {
      setStatus({ 
        ok: false, 
        message: 'Не удалось подключиться. Проверьте адрес, запуск сервера и сеть.' 
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const clean = (url || '').trim().replace(/\/+$/, '');
    setServerUrl(clean);
    window.location.reload();
  };

  const applyPreset = (preset) => {
    setUrl(preset);
    handleTestConnection(preset);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-backdrop-fade">
      <div className="relative w-full max-w-md liquid-glass-modal border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-modal-spring">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5 text-white font-bold">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 text-white flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <span>Настройки сервера PicShare</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full liquid-glass-pill text-neutral-400 hover:text-white border border-white/10 hover:border-white/20 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed">
          Укажите адрес бэкенда PicShare. Для работы приложения на телефоне бэкенд должен быть запущен в интернете (на Render) или в одной локальной Wi-Fi сети с телефоном.
        </p>

        {/* Presets */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300">Быстрые пресеты:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => applyPreset('https://picshare-sy84.onrender.com')}
              className="p-3 rounded-2xl liquid-glass-subtle border border-white/10 hover:border-white/30 text-white text-left transition col-span-1 sm:col-span-2 font-semibold"
            >
              🌐 Основной сервер (Render) <span className="text-[11px] text-neutral-400 block font-normal mt-0.5">(picshare-sy84.onrender.com)</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('http://10.0.2.2:5000')}
              className="p-2.5 rounded-2xl liquid-glass-subtle border border-white/10 hover:border-white/30 text-white text-left transition font-semibold"
            >
              📱 Эмулятор Android <span className="text-[10px] text-neutral-400 block font-normal mt-0.5">(10.0.2.2:5000)</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('http://localhost:5000')}
              className="p-2.5 rounded-2xl liquid-glass-subtle border border-white/10 hover:border-white/30 text-white text-left transition font-semibold"
            >
              💻 ПК / Web <span className="text-[10px] text-neutral-400 block font-normal mt-0.5">(localhost:5000)</span>
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300">URL сервера:</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://picshare.onrender.com или http://192.168.1.x:5000"
            className="w-full px-4 py-2.5 text-sm rounded-2xl bg-neutral-900/60 border border-white/10 focus:border-white/40 focus:outline-none text-white placeholder-neutral-500"
          />
        </div>

        {/* Status feedback */}
        {status && (
          <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
            status.ok 
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
          }`}>
            {status.ok ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="truncate">{status.message}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            disabled={testing}
            onClick={() => handleTestConnection()}
            className="x-btn-secondary px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Проверка...' : 'Проверить'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-full text-xs font-semibold text-neutral-400 hover:text-white transition"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="x-btn-primary px-5 py-2 rounded-full text-xs font-bold"
            >
              Сохранить
            </button>
          </div>
        </div>

        {/* Версия приложения и проверка обновлений */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Версия: <b className="text-white">v{CURRENT_VERSION}</b></span>
            <button
              type="button"
              disabled={checkingUpdate}
              onClick={handleCheckUpdate}
              className="text-white font-bold hover:underline flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <ArrowUpCircle className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
              <span>{checkingUpdate ? 'Проверка...' : 'Проверить обновления'}</span>
            </button>
          </div>

          {updateMsg && (
            <p className="text-xs text-emerald-400 text-center font-medium">
              {updateMsg}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
