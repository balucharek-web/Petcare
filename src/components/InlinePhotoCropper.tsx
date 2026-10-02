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
  // Keep original source image decoupled from crop exports
  const [sourceImage, setSourceImage] = useState<string>(photoUrl);
  const lastPropUrlRef = useRef<string>(photoUrl);
  const lastExportedUrlRef = useRef<string>('');

  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isMaskCircle, setIsMaskCircle] = useState(true);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 300, height: 300 });
  const [isImageReady, setIsImageReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgElementRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchScaleRef = useRef<number>(1);
  const exportTimerRef = useRef<any>(null);

  // Preview viewport size (responsive square frame)
  const FRAME_SIZE = 180; // 180x180 px preview frame
  const OUTPUT_SIZE = 600; // 600x600 px high-quality exported avatar

  // Only update internal source if a truly new photo prop is passed from outside
  useEffect(() => {
    if (photoUrl && photoUrl !== lastExportedUrlRef.current && photoUrl !== lastPropUrlRef.current) {
      lastPropUrlRef.current = photoUrl;
      setSourceImage(photoUrl);
    }
  }, [photoUrl]);

  // Export cropped canvas helper
  const exportCrop = useCallback(() => {
    const img = imgElementRef.current;
    if (!img) return;

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
      const naturalW = img.naturalWidth || imageDimensions.width;
      const naturalH = img.naturalHeight || imageDimensions.height;
      const drawWidth = naturalW * drawScale;
      const drawHeight = naturalH * drawScale;

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      const croppedUrl = canvas.toDataURL('image/jpeg', 0.88);
      lastExportedUrlRef.current = croppedUrl;
      onPhotoCropped(croppedUrl);
    } catch {
      // In case of remote cross-origin taint, return the source image URL
      onPhotoCropped(sourceImage);
    }
  }, [pan, scale, rotation, onPhotoCropped, sourceImage, imageDimensions]);

  // Debounced export helper (never blocks or stutters UI drag)
  const scheduleExport = useCallback((delay = 100) => {
    if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
    exportTimerRef.current = setTimeout(() => {
      exportCrop();
    }, delay);
  }, [exportCrop]);

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth || 300;
    const h = img.naturalHeight || 300;
    setImageDimensions({ width: w, height: h });

    const effectiveW = (rotation % 180 === 0) ? w : h;
    const effectiveH = (rotation % 180 === 0) ? h : w;
    const initialCover = Math.max(FRAME_SIZE / effectiveW, FRAME_SIZE / effectiveH);
    
    setMinScale(initialCover);
    setScale(initialCover);
    setPan({ x: 0, y: 0 });
    setIsImageReady(true);

    setTimeout(() => {
      exportCrop();
    }, 60);
  };

  // Fluid Pointer Dragging with PointerCapture
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      };
    } else if (activePointersRef.current.size === 2) {
      setIsDragging(false);
      const points = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      initialPinchDistRef.current = dist;
      initialPinchScaleRef.current = scale;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 1 && isDragging) {
      const nextX = e.clientX - dragStartRef.current.x;
      const nextY = e.clientY - dragStartRef.current.y;
      setPan({ x: nextX, y: nextY });
    } else if (activePointersRef.current.size === 2 && initialPinchDistRef.current !== null) {
      const points = Array.from(activePointersRef.current.values());
      const currentDist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const factor = currentDist / initialPinchDistRef.current;
      const nextScale = Math.min(Math.max(initialPinchScaleRef.current * factor, minScale), minScale * 4);
      setScale(nextScale);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (activePointersRef.current.size === 0) {
      setIsDragging(false);
      initialPinchDistRef.current = null;
      // Trigger canvas export now that dragging has completely ended
      scheduleExport(0);
    } else if (activePointersRef.current.size === 1) {
      const remaining = Array.from(activePointersRef.current.values())[0];
      dragStartRef.current = {
        x: remaining.x - pan.x,
        y: remaining.y - pan.y,
      };
      setIsDragging(true);
      initialPinchDistRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setScale(prev => {
      const next = Math.min(Math.max(prev + zoomDelta, minScale), minScale * 4);
      scheduleExport(150);
      return next;
    });
  };

  const handleRotate = () => {
    setRotation(prev => {
      const next = (prev + 90) % 360;
      setTimeout(() => scheduleExport(0), 50);
      return next;
    });
  };

  const handleReset = () => {
    setRotation(0);
    const effectiveW = (rotation % 180 === 0) ? imageDimensions.width : imageDimensions.height;
    const effectiveH = (rotation % 180 === 0) ? imageDimensions.height : imageDimensions.width;
    const initialCover = Math.max(FRAME_SIZE / effectiveW, FRAME_SIZE / effectiveH);
    setScale(initialCover);
    setPan({ x: 0, y: 0 });
    setTimeout(() => scheduleExport(0), 50);
  };

  const handleScaleChange = (newScale: number) => {
    setScale(newScale);
    scheduleExport(150);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) {
        lastPropUrlRef.current = url;
        setSourceImage(url);
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
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          style={{ 
            width: `${FRAME_SIZE}px`, 
            height: `${FRAME_SIZE}px`,
            touchAction: 'none'
          }}
          className={`relative overflow-hidden cursor-grab active:cursor-grabbing bg-slate-900 border-2 border-teal-500 shadow-md flex items-center justify-center select-none ${
            isMaskCircle ? 'rounded-full' : 'rounded-3xl'
          }`}
          title="Przesuń palcem lub myszą, aby ustawić idealny kadr"
        >
          {/* Always mounted image to avoid any flicker/blink */}
          <img
            ref={imgElementRef}
            src={sourceImage}
            alt="Podgląd pupila"
            draggable={false}
            crossOrigin="anonymous"
            onLoad={handleImageLoaded}
            style={{
              width: `${imageDimensions.width * scale}px`,
              height: `${imageDimensions.height * scale}px`,
              maxWidth: 'none',
              maxHeight: 'none',
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              willChange: 'transform',
              opacity: isImageReady ? 1 : 0,
            }}
            className="absolute pointer-events-none select-none transition-opacity duration-150"
          />

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
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-black/65 backdrop-blur-xs rounded-full text-[9px] font-bold text-white pointer-events-none flex items-center gap-1 shadow whitespace-nowrap opacity-90 group-hover:opacity-100">
            <Move className="w-2.5 h-2.5 text-teal-400" />
            <span>Przesuń kadr</span>
          </div>
        </div>

        {/* Camera upload badge overlay */}
        <label 
          className="absolute -bottom-1 -right-1 p-2 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl shadow-md cursor-pointer transition active:scale-95 z-10"
          title="Wgraj nowe zdjęcie z aparatu lub pliku"
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
            onClick={() => handleScaleChange(Math.max(scale - 0.15, minScale))}
            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 transition cursor-pointer"
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
            onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
            className="flex-1 accent-teal-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
            title="Przybliżenie"
          />
          <button
            type="button"
            onClick={() => handleScaleChange(Math.min(scale + 0.15, minScale * 3.5))}
            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            title="Przybliż"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Buttons: Rotate, Recenter, Mask shape */}
        <div className="flex items-center justify-between gap-1 pt-0.5 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRotate}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-[11px] font-semibold transition cursor-pointer"
              title="Obróć o 90 stopni"
            >
              <RotateCw className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              <span>Obróć</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-[11px] font-semibold transition cursor-pointer"
              title="Wyśrodkuj kadr"
            >
              <RotateCcw className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMaskCircle(prev => !prev)}
              className="p-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title={isMaskCircle ? 'Kształt: Okrągły' : 'Kształt: Zaokrąglony kwadrat'}
            >
              {isMaskCircle ? <Circle className="w-3.5 h-3.5 text-teal-600" /> : <Square className="w-3.5 h-3.5 text-teal-600" />}
            </button>
          </div>

          {onOpenSampleGallery && (
            <button
              type="button"
              onClick={onOpenSampleGallery}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-[11px] font-semibold transition border border-teal-200/80 cursor-pointer"
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
