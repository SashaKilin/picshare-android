import React, { useState } from 'react';
import { Download, Sparkles, X, Check, ExternalLink, ArrowRight } from 'lucide-react';
import { openUpdateDownload } from '../utils/appUpdater';

export function UpdateModal({ isOpen, onClose, updateInfo }) {
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!isOpen || !updateInfo) return null;

  const handleDownload = () => {
    setDownloadStarted(true);
    openUpdateDownload(updateInfo.apkUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl shadow-indigo-950/80 space-y-5">
        
        {/* Glow Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Доступно обновление!</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v{updateInfo.remoteVersion}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Текущая версия: v{updateInfo.currentVersion}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Release Notes */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Что нового в этой версии:</label>
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
            {updateInfo.releaseNotes}
          </div>
        </div>

        {/* Feedback info when download started */}
        {downloadStarted ? (
          <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-3 text-xs text-emerald-300 flex items-center gap-2.5 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Загрузка началась в шторке Android! После завершения нажмите на скачанный файл для обновления.
            </span>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-500 hover:to-pink-400 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{downloadStarted ? 'Скачать повторно' : 'Обновить приложение'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Позже
          </button>
        </div>

      </div>
    </div>
  );
}
