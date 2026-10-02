import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  AlertTriangle, 
  Globe, 
  Building2, 
  Search,
  Sparkles,
  Info
} from 'lucide-react';
import { Pet } from '../types/pet';
import { haptics } from '../services/hapticsService';

interface MicrochipVerifyModalProps {
  pet: Pet;
  onClose: () => void;
}

export const MicrochipVerifyModal: React.FC<MicrochipVerifyModalProps> = ({
  pet,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const rawChip = (pet.chipNumber || '').trim();
  const cleanChip = rawChip.replace(/\D/g, '');

  const isExact15Digits = cleanChip.length === 15;
  const prefix = cleanChip.slice(0, 3);

  // Decode prefix
  let originLabel = 'Międzynarodowy kod producenta (ISO 11784/11785)';
  let isPolishCode = false;

  if (prefix === '616') {
    originLabel = '🇵🇱 Polska (Oficjalny kod kraju ISO 616)';
    isPolishCode = true;
  } else if (prefix === '250') {
    originLabel = '🇫🇷 Francja (Kod kraju ISO 250)';
  } else if (prefix === '276') {
    originLabel = '🇩🇪 Niemcy (Kod kraju ISO 276)';
  } else if (prefix === '826') {
    originLabel = '🇬🇧 Wielka Brytania (Kod kraju ISO 826)';
  } else if (prefix === '380') {
    originLabel = '🇮🇹 Włochy (Kod kraju ISO 380)';
  } else if (prefix.startsWith('9')) {
    originLabel = '🌐 Kod producenta transpondera (Datamars / Trovan / Virbac / Avid)';
  }

  const handleCopy = () => {
    haptics.tap();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cleanChip || rawChip);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const safeAnimalSearchUrl = `https://www.safe-animal.eu/pl/szukaj-zwierzecia?chip=${encodeURIComponent(cleanChip)}`;
  const cbdzoeSearchUrl = `https://www.cbdzoe.pl/`;
  const europetnetSearchUrl = `https://www.europetnet.org/`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-teal-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900 px-5 py-4 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-2xl border border-teal-400/30">
              <ShieldCheck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Weryfikacja Mikroczipa</h2>
                <span className="text-[10px] font-black uppercase bg-teal-400 text-slate-950 px-2 py-0.5 rounded-full shadow-xs">
                  SAFE-ANIMAL
                </span>
              </div>
              <p className="text-xs text-teal-100">
                Sprawdź rejestrację czipa {pet.name} w ogólnopolskich bazach
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              haptics.tap();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition text-white cursor-pointer"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-100">
          {/* Chip Number Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Numer Transpondera (Mikroczip)
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                isExact15Digits 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {isExact15Digits ? '✓ Standard ISO 15 cyfr' : `${cleanChip.length} / 15 cyfr`}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="font-mono text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-white select-all">
                {cleanChip || 'Brak wpisanego numeru'}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!cleanChip}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950 hover:bg-teal-100 text-teal-700 dark:text-teal-300 font-bold text-xs transition cursor-pointer disabled:opacity-40"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Skopiowano' : 'Kopiuj'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
              <Globe className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>{originLabel}</span>
            </p>
          </div>

          {/* Direct Verification Links */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Oficjalne Bazy Rejestracji w Polsce i Europie
            </h3>

            {/* SAFE-ANIMAL */}
            <a
              href={safeAnimalSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => haptics.tap()}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-teal-50 hover:bg-teal-100/90 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 transition group shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  SA
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-teal-950 dark:text-teal-100 group-hover:text-teal-700">
                      SAFE-ANIMAL Polska
                    </span>
                    <span className="text-[10px] bg-teal-200 dark:bg-teal-800 text-teal-900 dark:text-teal-100 font-bold px-1.5 py-0.2 rounded-md">
                      Główna baza
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-800/80 dark:text-teal-300">
                    Sprawdź status rejestracji, dane właściciela i połączenie z EUROPETNET
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition" />
            </a>

            {/* CBDZOE */}
            <a
              href={cbdzoeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => haptics.tap()}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition group shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  CB
                </div>
                <div>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-blue-600">
                    CBDZOE (Centralna Baza)
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Centralna Baza Danych Zwierząt Oznakowanych Elektronicznie
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition" />
            </a>

            {/* EUROPETNET */}
            <a
              href={europetnetSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => haptics.tap()}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition group shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  EU
                </div>
                <div>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600">
                    EUROPETNET (Baza Europejska)
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Wyszukiwanie transgraniczne w przypadku podróży zagranicznych
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition" />
            </a>
          </div>

          {/* Educational Note */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-950 dark:text-amber-100">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Ważna informacja dla każdego opiekuna</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Samo wszczepienie czipa u weterynarza <strong>nie oznacza automatycznego przypisania Twojego numeru telefonu</strong>. Czip musi zostać wprowadzony do bazy (np. SAFE-ANIMAL). Jeśli zgubiony pupil trafi do schroniska lub lecznicy, czytnik odczyta tylko numer — aby z Tobą skontaktowano, czip musi być zarejestrowany.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
