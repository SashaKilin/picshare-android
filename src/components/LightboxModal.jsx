import React, { useEffect } from 'react';
import { X, Download, User, Calendar, FileText } from 'lucide-react';

export function LightboxModal({ image, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!image) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/95 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative max-w-5xl max-h-[96dvh] w-full flex flex-col bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Верхняя плашка */}
        <div className="p-3 sm:p-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={image.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${image.sender_username}`}
              alt={image.sender_username}
              className="w-8 h-8 rounded-full border border-slate-700 object-cover"
            />
            <div>
              <p className="text-sm font-semibold text-white">
                {image.sender_username || 'Пользователь'}
              </p>
              <p className="text-[11px] text-slate-400">
                {new Date(image.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={image.file_url}
              download={image.original_name}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Само изображение */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/60 min-h-[300px]">
          <img
            src={image.file_url}
            alt={image.original_name}
            className="max-h-[72vh] max-w-full object-contain rounded-xl shadow-2xl"
          />
        </div>

        {/* Подпись (если есть) */}
        {image.caption && (
          <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
            <p className="text-sm text-slate-200">
              {image.caption}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
