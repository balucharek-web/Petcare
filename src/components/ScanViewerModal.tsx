import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';

interface ScanViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  date?: string;
}

export const ScanViewerModal: React.FC<ScanViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  date,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen) return null;

  const handleZoomIn = () => setScale(s => Math.min(s + 0.3, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.3, 0.5));
  const handleRotate = () => setRotation(r => (r + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `${title.replace(/\s+/g, '_')}_skan.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800 text-white z-10">
        <div className="truncate max-w-[65%]">
          <h3 className="font-semibold text-sm truncate">{title}</h3>
          {date && <p className="text-xs text-slate-400">Data badania: {date}</p>}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={handleZoomOut}
            title="Pomniejsz" aria-label="Pomniejsz"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomIn}
            title="Powiększ" aria-label="Powiększ"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotate}
            title="Obróć o 90°" aria-label="Obróć o 90°"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            title="Pobierz skan" aria-label="Pobierz skan"
            className="p-2 rounded-lg bg-teal-600 hover:bg-teal-500 active:scale-95 text-white transition"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            title="Zamknij" aria-label="Zamknij"
            className="p-2 ml-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div 
        className="flex-1 overflow-auto flex items-center justify-center p-4 cursor-grab active:cursor-grabbing"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div 
          className="transition-transform duration-200 ease-out origin-center max-w-full max-h-full flex items-center justify-center"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
        >
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl bg-white/5 select-none"
            draggable={false}
          />
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="py-2 text-center text-xs text-slate-400 bg-slate-900/60 border-t border-slate-800">
        Kliknij dwukrotnie lub użyj przycisków na górze, aby powiększyć i obrócić dokument
      </div>
    </div>
  );
};
