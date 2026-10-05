import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Camera, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  X, 
  RefreshCw,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { createDeviceSyncQRCode, redeemDeviceSyncQRCode, QRSyncResult, countAllAttachments } from '../services/qrSyncService';
import { storage } from '../services/storage';
import { QRScannerModal } from './QRScannerModal';

interface QRTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => void;
  initialMode?: 'send' | 'receive';
}

export const QRTransferModal: React.FC<QRTransferModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
  initialMode = 'send',
}) => {
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>(initialMode);
  const [qrResult, setQrResult] = useState<QRSyncResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setFeedback(null);
      setManualCode('');
      if (initialMode === 'send') {
        generateQR();
      }
    }
  }, [isOpen, initialMode]);

  const generateQR = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await createDeviceSyncQRCode();
      setQrResult(res);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Nie udało się wygenerować kodu QR.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyTransferCode = () => {
    try {
      const rawExport = storage.exportAllData();
      navigator.clipboard.writeText(rawExport);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    } catch {
      setFeedback({
        type: 'error',
        message: 'Nie udało się skopiować kodu transferu.',
      });
    }
  };

  const handleApplyScannedCode = async (codeText: string) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await redeemDeviceSyncQRCode(codeText);
      setFeedback({
        type: 'success',
        message: `Sukces! Pomyślnie przeniesiono ${res.petCount} zwierzaków oraz ${res.attachmentsCount} załączników!`,
      });
      onDataRestored();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Błąd odczytu danych z kodu QR.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleApplyScannedCode(manualCode.trim());
  };

  if (!isOpen) return null;

  const currentPets = storage.getPets();
  const attachments = countAllAttachments();

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl border border-teal-500/20">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                Transfer Kodem QR (Drugi telefon)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                100% danych, zdjęć i leków • Działa natychmiast i bez internetu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer" aria-label="Zamknij">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="p-3 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <button
              onClick={() => {
                setActiveTab('send');
                setFeedback(null);
                generateQR();
              }}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'send'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>1. Nadaj (Ten telefon)</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('receive');
                setFeedback(null);
              }}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'receive'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>2. Odbierz (Skanuj)</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`m-4 mb-0 p-3.5 rounded-2xl text-xs flex items-start gap-2.5 animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : feedback.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                : 'bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="font-semibold leading-relaxed">{feedback.message}</span>
          </div>
        )}

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {activeTab === 'send' ? (
            /* TAB 1: SENDER (SHOW QR CODE) */
            <div className="space-y-4 text-center">
              <div className="bg-teal-50 dark:bg-teal-950/50 p-3.5 rounded-2xl border border-teal-200 dark:border-teal-800 text-left flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <div className="text-xs text-teal-900 dark:text-teal-200">
                  <p className="font-bold">Jak przenieść dane na drugi telefon?</p>
                  <ol className="list-decimal list-inside space-y-0.5 mt-1 text-slate-700 dark:text-teal-300 font-medium">
                    <li>Otwórz aplikację <strong>PetCare</strong> na drugim telefonie.</li>
                    <li>Wybierz opcję <strong>„Skanuj Kod QR”</strong> (na ekranie startowym lub w menu).</li>
                    <li>Skieruj aparat na poniższy kod QR. Gotowe!</li>
                  </ol>
                </div>
              </div>

              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
                  <p className="text-xs text-slate-500 font-medium">Generowanie kodu QR z Twoimi zwierzakami...</p>
                </div>
              ) : qrResult ? (
                <div className="space-y-3">
                  <div className="p-3 sm:p-4 bg-white rounded-3xl shadow-lg border-2 border-teal-500/80 inline-block mx-auto max-w-full">
                    <img
                      src={qrResult.qrCodeDataUrl}
                      alt="Kod QR transferu"
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-2xl mx-auto"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                    <span className="px-3 py-1 bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 font-bold rounded-xl border border-teal-200 dark:border-teal-800">
                      🐾 {currentPets.length} {currentPets.length === 1 ? 'zwierzak' : 'zwierzaków'}
                    </span>
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-bold rounded-xl border border-emerald-200 dark:border-emerald-800">
                      📎 {attachments.total} załączników
                    </span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl">
                      🔒 Bezpośredni transfer
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={generateQR}
                      className="px-3.5 py-2 text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Odśwież kod QR</span>
                    </button>
                    <button
                      onClick={handleCopyTransferCode}
                      className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Skopiowano!' : 'Kopiuj tekst transferu'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs text-slate-500">Kliknij poniżej, aby wygenerować kod:</p>
                  <button
                    onClick={generateQR}
                    className="mt-3 px-5 py-2.5 bg-teal-600 text-white rounded-2xl font-bold text-xs shadow-md transition"
                  >
                    Wygeneruj kod QR
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: RECEIVER (CAMERA SCANNER & MANUAL PASTE) */
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
                <div className="w-12 h-12 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Zeskanuj kod z pierwszego telefonu
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    Włącz aparat i wyceluj w kod QR wyświetlony na ekranie pierwszego telefonu. Wszystkie dane zostaną skopiowane natychmiast.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  disabled={isLoading}
                  className="w-full py-4 px-5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold rounded-2xl shadow-lg shadow-teal-600/25 flex items-center justify-center gap-2.5 transition active:scale-98 cursor-pointer text-sm"
                >
                  <Camera className="w-5 h-5" />
                  <span>Uruchom Skaner Aparatu</span>
                </button>
              </div>

              {/* Alternative: Paste JSON or Code */}
              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  LUB WKLEJ KOD KONTEM / TEKSTEM
                </p>
                <form onSubmit={handleManualCodeSubmit} className="space-y-2">
                  <textarea
                    rows={2}
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Wklej tutaj kod QR (pc_data:...) lub pełny zrzut danych JSON..."
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-teal-500 transition font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!manualCode.trim() || isLoading}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Zastosuj wklejony kod i przywróć dane</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-center">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Transfer jest szyfrowany i bezpośredni — nikt inny nie ma dostępu do Twoich danych.
          </span>
        </div>
      </div>

      {/* Camera Live Scanner Sub-Modal */}
      {isScannerOpen && (
        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={(scanned) => {
            setIsScannerOpen(false);
            handleApplyScannedCode(scanned);
          }}
        />
      )}
    </div>
  );
};
