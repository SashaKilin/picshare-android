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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-backdrop-fade">
      <div className="relative w-full max-w-md liquid-glass-modal border border-white/20 rounded-3xl p-6 shadow-2xl space-y-5 animate-modal-spring">
        
        {/* Glow Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Доступно обновление!</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold liquid-glass-pill text-white border border-white/20">
                  v{updateInfo.remoteVersion}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Текущая версия: v{updateInfo.currentVersion}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-full liquid-glass-pill text-neutral-400 hover:text-white border border-white/10 hover:border-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Release Notes */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-300">Что нового в этой версии:</label>
          <div className="liquid-glass-subtle border border-white/10 rounded-2xl p-4 text-xs text-neutral-300 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
            {updateInfo.releaseNotes}
          </div>
        </div>

        {/* Feedback info when download started */}
        {downloadStarted ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-xs text-emerald-300 flex items-center gap-2.5">
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
            className="x-btn-primary flex-1 py-3 px-4 rounded-full text-xs font-bold flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{downloadStarted ? 'Скачать повторно' : 'Обновить приложение'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="x-btn-secondary py-3 px-4 rounded-full text-neutral-400 hover:text-white text-xs font-semibold"
          >
            Позже
          </button>
        </div>

      </div>
    </div>
  );
}
