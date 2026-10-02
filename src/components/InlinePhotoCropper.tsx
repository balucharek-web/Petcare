import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  RotateCw, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Sparkles, 
  Move,
  Circle,
  Square
} from 'lucide-react';

interface InlinePhotoCropperProps {
  photoUrl: string;
  onPhotoCropped: (croppedDataUrl: string) => void;
  onOpenSampleGallery?: () => void;
  title?: string;
  className?: string;
}

export const InlinePhotoCropper: React.FC<InlinePhotoCropperProps> = ({
  photoUrl,
  onPhotoCropped,
  onOpenSampleGallery,
  title,
  className = '',
}) => {
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isMaskCircle, setIsMaskCircle] = useState(true);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 1, height: 1 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const debounceTimerRef = useRef<any>(null);

  // Preview viewport size (responsive square frame)
  const FRAME_SIZE = 170; // 170x170 px preview frame
  const OUTPUT_SIZE = 600; // 600x600 px high-quality exported avatar

  // Export cropped canvas helper
  const exportCrop = useCallback(() => {
    if (!imgRef.current) return;
    const img = imgRef.current;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const previewToOutputRatio = OUTPUT_SIZE / FRAME_SIZE;

      ctx.save();
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      ctx.translate(pan.x * previewToOutputRatio, pan.y * previewToOutputRatio);
      ctx.rotate((rotation * Math.PI) / 180);

      const drawScale = scale * previewToOutputRatio;
      const drawWidth = img.naturalWidth * drawScale;
      const drawHeight = img.naturalHeight * drawScale;

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      const croppedUrl = canvas.toDataURL('image/jpeg', 0.88);
      onPhotoCropped(croppedUrl);
    } catch {
      // If remote image triggers CORS taint, fallback to raw url
      onPhotoCropped(photoUrl);
    }
  }, [pan, scale, rotation, onPhotoCropped, photoUrl]);

  // Load new image source
  useEffect(() => {
    setIsLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      imgRef.current = img;

      const effectiveW = (rotation % 180 === 0) ? img.naturalWidth : img.naturalHeight;
      const effectiveH = (rotation % 180 === 0) ? img.naturalHeight : img.naturalWidth;
      const initialCover = Math.max(FRAME_SIZE / effectiveW, FRAME_SIZE / effectiveH);
      setMinScale(initialCover);
      setScale(initialCover);
      setPan({ x: 0, y: 0 });
      setIsLoaded(true);

      // Trigger initial crop export
      setTimeout(() => {
        exportCrop();
      }, 50);
    };
    img.onerror = () => {
      setIsLoaded(true);
    };
    img.src = photoUrl;
  }, [photoUrl]);

  // Debounced auto-export when user adjusts pan, scale, or rotation
  useEffect(() => {
    if (!isLoaded) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      exportCrop();
    }, 120);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [pan, scale, rotation, isLoaded, exportCrop]);

  // Mouse pan drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsInteracting(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isInteracting) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsInteracting(false);
  };

  // Touch pan & pinch-zoom handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsInteracting(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
      setTouchDistance(null);
    } else if (e.touches.length === 2) {
      setIsInteracting(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchDistance(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isInteracting) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && touchDistance !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = currentDist - touchDistance;
      const zoomFactor = diff * 0.005;
      setScale(prev => Math.min(Math.max(prev + zoomFactor, minScale), minScale * 4));
      setTouchDistance(currentDist);
    }
  };

  const handleTouchEnd = () => {
    setIsInteracting(false);
    setTouchDistance(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setScale(prev => Math.min(Math.max(prev + zoomDelta, minScale), minScale * 4));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setRotation(0);
    if (imgRef.current) {
      const initialCover = Math.max(FRAME_SIZE / imgRef.current.naturalWidth, FRAME_SIZE / imgRef.current.naturalHeight);
      setScale(initialCover);
    }
    setPan({ x: 0, y: 0 });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) {
        onPhotoCropped(url);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className={`flex flex-col items-center bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4 rounded-3xl border border-slate-200/90 dark:border-slate-700/80 ${className}`}>
      {title && (
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          {title}
        </span>
      )}

      {/* The Interactive Preview / Crop Box */}
      <div className="relative group">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{ width: `${FRAME_SIZE}px`, height: `${FRAME_SIZE}px` }}
          className={`relative overflow-hidden cursor-grab active:cursor-grabbing bg-slate-900 border-2 border-teal-500 shadow-md touch-none flex items-center justify-center transition-all ${
            isMaskCircle ? 'rounded-full' : 'rounded-3xl'
          }`}
          title="Przeciągaj palcem lub myszą, aby ustawić idealny kadr"
        >
          {isLoaded && (
            <img
              src={photoUrl}
              alt="Podgląd pupila"
              draggable={false}
              style={{
                width: `${imageSize.width * scale}px`,
                height: `${imageSize.height * scale}px`,
                maxWidth: 'none',
                maxHeight: 'none',
                transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
              className="absolute pointer-events-none select-none transition-transform duration-75 ease-out"
            />
          )}

          {/* Interactive Rule of Thirds Grid overlay */}
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25">
            <div className="border-r border-b border-white/60" />
            <div className="border-r border-b border-white/60" />
            <div className="border-b border-white/60" />
            <div className="border-r border-b border-white/60" />
            <div className="border-r border-b border-white/60" />
            <div className="border-b border-white/60" />
            <div className="border-r border-b border-white/60" />
            <div className="border-r border-b border-white/60" />
            <div />
          </div>

          {/* Center guide mark */}
          <div className="absolute w-2 h-2 rounded-full bg-teal-400/80 pointer-events-none" />

          {/* Drag Hint badge */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/65 backdrop-blur-xs rounded-full text-[9px] font-bold text-white pointer-events-none flex items-center gap-1 shadow whitespace-nowrap opacity-90 group-hover:opacity-100">
            <Move className="w-2.5 h-2.5 text-teal-400" />
            <span>Przesuń kadr</span>
          </div>
        </div>

        {/* Camera upload badge overlay */}
        <label 
          className="absolute -bottom-1 -right-1 p-2 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl shadow-md cursor-pointer transition active:scale-95 z-10"
          title="Zmień zdjęcie"
        >
          <Camera className="w-4 h-4" />
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      </div>

      {/* Inline Tool Controls right below the preview frame */}
      <div className="w-full max-w-xs mt-3 space-y-2">
        {/* Zoom Slider */}
        <div className="flex items-center gap-2 px-1">
          <button
            type="button"
            onClick={() => setScale(prev => Math.max(prev - 0.15, minScale))}
            className="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            title="Oddal"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={minScale}
            max={minScale * 3.5}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="flex-1 accent-teal-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
            title="Przybliżenie"
          />
          <button
            type="button"
            onClick={() => setScale(prev => Math.min(prev + 0.15, minScale * 3.5))}
            className="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            title="Przybliż"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Buttons: Rotate, Recenter, Mask shape */}
        <div className="flex items-center justify-between gap-1 pt-0.5 text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRotate}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-[11px] font-semibold transition cursor-pointer"
              title="Obróć o 90 stopni"
            >
              <RotateCw className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              <span>Obróć</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-[11px] font-semibold transition cursor-pointer"
              title="Wyśrodkuj kadr"
            >
              <RotateCcw className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMaskCircle(prev => !prev)}
              className="p-1 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title={isMaskCircle ? 'Kształt: Okrągły' : 'Kształt: Zaokrąglony kwadrat'}
            >
              {isMaskCircle ? <Circle className="w-3.5 h-3.5 text-teal-600" /> : <Square className="w-3.5 h-3.5 text-teal-600" />}
            </button>
          </div>

          {onOpenSampleGallery && (
            <button
              type="button"
              onClick={onOpenSampleGallery}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-[11px] font-semibold transition border border-teal-200/80 cursor-pointer"
              title="Wybierz z biblioteki ras"
            >
              <Sparkles className="w-3 h-3 text-teal-600" />
              <span>Galeria</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
