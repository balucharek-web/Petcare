import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  UserCheck, 
  QrCode, 
  KeyRound, 
  Smartphone, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Plus, 
  Pill, 
  Utensils, 
  Footprints, 
  Droplet,
  Copy,
  Check
} from 'lucide-react';
import QRCode from 'qrcode';
import { Pet } from '../types/pet';
import { generateQuickPairCode } from '../services/cloudSyncService';

interface FamilySharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  onOpenSyncModal: () => void;
}

interface HouseholdAction {
  id: string;
  petId: string;
  author: string;
  type: 'med' | 'food' | 'walk' | 'water' | 'other';
  label: string;
  timestamp: string; // ISO
}

export const FamilySharingModal: React.FC<FamilySharingModalProps> = ({
  isOpen,
  onClose,
  pet,
  onOpenSyncModal
}) => {
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('petcare_family_member') || 'Marta';
  });
  const [customNameInput, setCustomNameInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  const [actions, setActions] = useState<HouseholdAction[]>(() => {
    try {
      const raw = localStorage.getItem(`petcare_family_actions_${pet.id}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: '1',
        petId: pet.id,
        author: 'Marta',
        type: 'food',
        label: 'Śniadanie (mokra karma + suplement)',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        petId: pet.id,
        author: 'Arek',
        type: 'walk',
        label: 'Poranny spacer (30 min)',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    ];
  });

  const [pairCode, setPairCode] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Save actions to local storage
  const saveActions = (newActions: HouseholdAction[]) => {
    setActions(newActions);
    localStorage.setItem(`petcare_family_actions_${pet.id}`, JSON.stringify(newActions));
  };

  const handleSelectUser = (name: string) => {
    setCurrentUser(name);
    localStorage.setItem('petcare_family_member', name);
    setIsEditingName(false);
  };

  const handleLogAction = (type: HouseholdAction['type'], label: string) => {
    const newAction: HouseholdAction = {
      id: Date.now().toString(),
      petId: pet.id,
      author: currentUser,
      type,
      label,
      timestamp: new Date().toISOString()
    };
    saveActions([newAction, ...actions.slice(0, 19)]);
  };

  const handleGeneratePair = async () => {
    setIsGenerating(true);
    try {
      const res = await generateQuickPairCode();
      setPairCode(res.code);
      const url = await QRCode.toDataURL(`petcare://pair?code=${res.code}`, { width: 200, margin: 1 });
      setQrUrl(url);
    } catch {
      // fallback local code
      const localCode = Math.floor(100000 + Math.random() * 900000).toString();
      setPairCode(localCode);
      const url = await QRCode.toDataURL(`petcare://pair?code=${localCode}`, { width: 200, margin: 1 });
      setQrUrl(url);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900">Tryb Współwłaściciela</h2>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold">
                  Rodzina & Petsitter
                </span>
              </div>
              <p className="text-xs text-gray-500">Kto ostatnio podał lek lub nakarmił pupila?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition cursor-pointer" aria-label="Zamknij">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-slate-50/50">
          {/* Active Caregiver Selector */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700">Kto teraz opiekuje się {pet.name}?</span>
              <span className="text-indigo-600 font-extrabold">Aktywny: {currentUser}</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {['Marta', 'Arek', 'Petsitter'].map(name => (
                <button
                  key={name}
                  onClick={() => handleSelectUser(name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    currentUser === name
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {currentUser === name && '✓ '}
                  {name}
                </button>
              ))}

              {!isEditingName ? (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="px-3 py-1.5 border border-dashed border-gray-300 hover:border-indigo-400 text-gray-500 rounded-xl text-xs font-semibold"
                >
                  + Inny opiekun
                </button>
              ) : (
                <div className="flex gap-1.5 w-full pt-1">
                  <input
                    type="text"
                    placeholder="Wpisz imię opiekuna..."
                    value={customNameInput}
                    onChange={e => setCustomNameInput(e.target.value)}
                    className="flex-1 px-3 py-1 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden"
                  />
                  <button
                    onClick={() => {
                      if (customNameInput.trim()) handleSelectUser(customNameInput.trim());
                    }}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                  >
                    Ustaw
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick 1-Tap Action Logger (Prevents Double Dosing) */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-2.5">
            <span className="text-xs font-bold text-gray-700 block uppercase tracking-wider">
              Zarejestruj wykonane zadanie (jako {currentUser}):
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleLogAction('med', 'Podano lekarstwo')}
                className="p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl flex flex-col items-center gap-1 text-center transition cursor-pointer"
              >
                <Pill className="w-5 h-5 text-amber-700" />
                <span className="text-xs font-bold text-amber-900">Podano lek</span>
              </button>

              <button
                onClick={() => handleLogAction('food', 'Posiłek / Karma')}
                className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl flex flex-col items-center gap-1 text-center transition cursor-pointer"
              >
                <Utensils className="w-5 h-5 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-900">Nakarmiono</span>
              </button>

              <button
                onClick={() => handleLogAction('walk', 'Spacer (30 min)')}
                className="p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl flex flex-col items-center gap-1 text-center transition cursor-pointer"
              >
                <Footprints className="w-5 h-5 text-blue-700" />
                <span className="text-xs font-bold text-blue-900">Spacer</span>
              </button>

              <button
                onClick={() => handleLogAction('water', 'Świeża woda')}
                className="p-2.5 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-2xl flex flex-col items-center gap-1 text-center transition cursor-pointer"
              >
                <Droplet className="w-5 h-5 text-cyan-700" />
                <span className="text-xs font-bold text-cyan-900">Woda</span>
              </button>
            </div>
          </div>

          {/* Household Care Log (Recent Actions) */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-gray-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-indigo-600" />
                Dziennik opieki w domu
              </span>
              <span className="text-xs text-gray-400">Ostatnie akcje</span>
            </div>

            <div className="space-y-2">
              {actions.map(act => (
                <div key={act.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {act.author.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">
                        {act.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        Wpisał(a): <span className="font-semibold text-indigo-700">{act.author}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-gray-500">
                    {formatTime(act.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pair with second phone banner */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-700" />
                <h4 className="text-xs font-bold text-indigo-900">Połącz z telefonem partnera / niani</h4>
              </div>
              {!pairCode && (
                <button
                  onClick={handleGeneratePair}
                  disabled={isGenerating}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Generuj kod PIN
                </button>
              )}
            </div>

            {pairCode && (
              <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2 text-center">
                <p className="text-xs text-gray-600">Wpisz kod na drugim telefonie w Ustawieniach Chmury:</p>
                <div className="text-2xl font-mono font-black text-indigo-800 tracking-widest">
                  {pairCode.slice(0, 3)} {pairCode.slice(3)}
                </div>
                {qrUrl && <img src={qrUrl} alt="QR parowania" className="w-24 h-24 mx-auto" />}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
