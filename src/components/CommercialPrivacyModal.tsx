import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Trash2, 
  Download, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  ExternalLink,
  Smartphone,
  EyeOff
} from 'lucide-react';
import { bundleAllPetData, exportBackupFile } from '../services/cloudSyncService';
import { storage } from '../services/storage';

interface CommercialPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReset?: () => void;
}

export const CommercialPrivacyModal: React.FC<CommercialPrivacyModalProps> = ({
  isOpen,
  onClose,
  onDataReset
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'security' | 'delete'>('privacy');
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleExecuteDeleteAllData = () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'USUŃ') {
      return;
    }

    setIsDeleting(true);
    setTimeout(() => {
      // Clear all local storage
      localStorage.clear();
      sessionStorage.clear();
      // Reset storage to default empty state
      storage.savePets([]);
      storage.saveVaccinations([]);
      storage.saveMedications([]);
      storage.saveExams([]);
      storage.saveConditions([]);
      storage.saveVisits([]);
      setIsDeleting(false);
      setShowDeleteConfirmDialog(false);
      onClose();
      if (onDataReset) {
        onDataReset();
      }
      window.location.reload();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900">Prywatność i Bezpieczeństwo</h2>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                  Standard Google Play
                </span>
              </div>
              <p className="text-xs text-gray-500">Zgodność z RODO / GDPR i zarządzanie danymi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 p-1 bg-gray-100 border-b border-gray-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-2 px-3 rounded-xl transition ${
              activeTab === 'privacy' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Polityka Prywatności
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-3 rounded-xl transition ${
              activeTab === 'security' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Audyt & Bezpieczeństwo
          </button>
          <button
            onClick={() => setActiveTab('delete')}
            className={`py-2 px-3 rounded-xl transition ${
              activeTab === 'delete' ? 'bg-white text-rose-700 shadow-xs' : 'text-rose-500 hover:text-rose-700'
            }`}
          >
            Usuń konto i dane
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-gray-600">
          {/* TAB 1: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-900">
                  Aplikacja PetCare nie sprzedaje, nie profiluje ani nie przekazuje danych Twoich zwierząt brokerom reklamowym.
                </span>
              </div>

              <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
                <h4 className="font-extrabold text-gray-900 text-sm">1. Administrator Danych</h4>
                <p>
                  Administratorem danych wprowadzonych do aplikacji jesteś wyłącznie Ty (Użytkownik). Dane przetwarzane są lokalnie na Twoim urządzeniu końcowym.
                </p>

                <h4 className="font-extrabold text-gray-900 text-sm pt-2">2. Cel Przetwarzania Danych</h4>
                <p>
                  Dane medyczne, zdjęcia, terminy szczepień oraz dawkowania leków przetwarzane są wyłącznie w celu prowadzenia elektronicznej książeczki zdrowia Twoich zwierząt domowych i generowania przypomnień.
                </p>

                <h4 className="font-extrabold text-gray-900 text-sm pt-2">3. Kopia w Chmurze</h4>
                <p>
                  Kopia zapasowa danych zapisywana jest wyłącznie w wybranej przez Ciebie usłudze chmurowej (Dysk Google / Prywatne repozytorium) z użyciem szyfrowanych kanałów TLS/SSL.
                </p>

                <h4 className="font-extrabold text-gray-900 text-sm pt-2">4. Prawa Użytkownika (RODO)</h4>
                <p>
                  Przysługuje Ci prawo do wglądu w dane, ich sprostowania, eksportu w czytelnym formacie maszynowym (JSON) oraz natychmiastowego i trwałego usunięcia wszystkich danych.
                </p>
              </div>

              {/* Data Export Button */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-900 text-xs">Pobierz kopię swoich danych (JSON)</div>
                  <div className="text-[11px] text-gray-400">Prawo do przenoszenia danych (art. 20 RODO)</div>
                </div>
                <button
                  onClick={exportBackupFile}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  Eksportuj dane
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY AUDIT */}
          {activeTab === 'security' && (
            <div className="space-y-3.5">
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Architektura Bezpieczeństwa PetCare</span>
                </div>
                <p className="text-xs text-slate-300">
                  Aplikacja została zaprojektowana w modelu <strong>Local-First Sandbox</strong>. Twoje dane nie opuszczają Twojego telefonu bez Twojej wyraźnej zgody.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-900">Piaskownica systemu Android (App Sandbox):</strong>
                    <p className="text-gray-500 mt-0.5">Żadna inna aplikacja zainstalowana na Twoim telefonie nie ma dostępu do bazy PetCare.</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-900">Szyfrowanie SSL/TLS (HTTPS):</strong>
                    <p className="text-gray-500 mt-0.5">Wszystkie żądania sieciowe (Dysk Google, geolokalizacja klinik) korzystają z bezpiecznych połączeń.</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-900">Brak analityki telemetrycznej:</strong>
                    <p className="text-gray-500 mt-0.5">Nie używamy uciążliwych skryptów śledzących ruch użytkownika.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACCOUNT & DATA DELETION (Google Play Requirement) */}
          {activeTab === 'delete' && (
            <div className="space-y-4">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-950">
                  <h4 className="font-extrabold text-rose-900 text-sm">Trwałe usunięcie konta i danych</h4>
                  <p className="mt-1">
                    Zgodnie z zasadami <strong>Google Play Developer Policy</strong> oraz <strong>art. 17 RODO (Prawo do bycia zapomnianym)</strong>, masz pełne prawo trwale wykasować wszystkie swoje zwierzęta, badania, leki i konfiguracje.
                  </p>
                  <p className="font-bold mt-2 text-rose-900">Tej operacji nie można cofnąć!</p>
                </div>
              </div>

              {!showDeleteConfirmDialog ? (
                <button
                  onClick={() => setShowDeleteConfirmDialog(true)}
                  className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  Rozpocznij procedurę usuwania danych
                </button>
              ) : (
                <div className="p-4 bg-gray-50 border border-rose-300 rounded-2xl space-y-3 animate-fadeIn">
                  <label className="text-xs font-bold text-gray-800 block">
                    Aby potwierdzić, wpisz słowo <span className="text-rose-700 font-extrabold">USUŃ</span> w pole poniżej:
                  </label>
                  <input
                    type="text"
                    placeholder="Wpisz USUŃ"
                    value={deleteConfirmationText}
                    onChange={e => setDeleteConfirmationText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:border-rose-500 uppercase"
                  />

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => setShowDeleteConfirmDialog(false)}
                      className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={handleExecuteDeleteAllData}
                      disabled={deleteConfirmationText.trim().toUpperCase() !== 'USUŃ' || isDeleting}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-extrabold rounded-xl text-xs transition shadow-xs cursor-pointer"
                    >
                      {isDeleting ? 'Usuwanie...' : 'Tak, bezpowrotnie usuń wszystko'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
