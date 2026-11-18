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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-white font-semibold">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <span>Настройки сервера PicShare</span>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Укажите адрес бэкенда PicShare. Для работы приложения на телефоне бэкенд должен быть запущен в интернете (на Render) или в одной локальной Wi-Fi сети с телефоном.
        </p>

        {/* Presets */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Быстрые пресеты:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => applyPreset('https://picshare-sy84.onrender.com')}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-700/60 text-indigo-200 text-left truncate transition-colors col-span-1 sm:col-span-2 font-medium"
            >
              🌐 Основной сервер (Render) <span className="text-[10px] text-indigo-400 block font-normal">(picshare-sy84.onrender.com)</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('http://10.0.2.2:5000')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-left truncate transition-colors"
            >
              📱 Эмулятор Android <span className="text-[10px] text-slate-400 block">(10.0.2.2:5000)</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('http://localhost:5000')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-left truncate transition-colors"
            >
              💻 ПК / Web <span className="text-[10px] text-slate-400 block">(localhost:5000)</span>
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">URL сервера:</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://picshare.onrender.com или http://192.168.1.x:5000"
            className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:outline-none text-white placeholder-slate-500"
          />
        </div>

        {/* Status feedback */}
        {status && (
          <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
            status.ok 
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60' 
              : 'bg-rose-950/40 text-rose-300 border border-rose-800/60'
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
            className="px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Проверка...' : 'Проверить'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all"
            >
              Сохранить и применить
            </button>
          </div>
        </div>

        {/* Версия приложения и проверка обновлений */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Версия приложения: <b className="text-slate-200">v{CURRENT_VERSION}</b></span>
            <button
              type="button"
              disabled={checkingUpdate}
              onClick={handleCheckUpdate}
              className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition disabled:opacity-50"
            >
              <ArrowUpCircle className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
              <span>{checkingUpdate ? 'Проверка...' : 'Проверить обновления'}</span>
            </button>
          </div>

          {updateMsg && (
            <p className="text-[11px] text-emerald-400 text-center font-medium animate-fade-in">
              {updateMsg}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
