import React, { useState } from 'react';
import { 
  HeartHandshake, 
  Clock, 
  Utensils, 
  Footprints, 
  Pill, 
  Phone, 
  AlertTriangle, 
  Copy, 
  Check, 
  Printer, 
  Edit3, 
  Save, 
  X, 
  Plus, 
  Trash2,
  Sparkles
} from 'lucide-react';
import { Pet, Medication, PetsitterPlan } from '../types/pet';
import { storage } from '../services/storage';

interface PetsitterModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  medications: Medication[];
}

export const PetsitterModal: React.FC<PetsitterModalProps> = ({
  isOpen,
  onClose,
  pet,
  medications,
}) => {
  const [plan, setPlan] = useState<PetsitterPlan>(() => storage.getPetsitterPlan(pet.id));
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form edit state
  const [ownerPhone, setOwnerPhone] = useState(plan.ownerPhone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(plan.secondaryContactPhone || '');
  const [habitsAndFears, setHabitsAndFears] = useState(plan.habitsAndFears || '');
  const [favoriteTreats, setFavoriteTreats] = useState(plan.favoriteGamesAndTreats || '');
  const [specialInstructions, setSpecialInstructions] = useState(plan.specialInstructions || '');

  if (!isOpen) return null;

  const activeMeds = medications.filter(m => m.isActive);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: PetsitterPlan = {
      ...plan,
      ownerPhone,
      secondaryContactPhone: secondaryPhone,
      habitsAndFears,
      favoriteGamesAndTreats: favoriteTreats,
      specialInstructions,
    };
    setPlan(updated);
    storage.savePetsitterPlan(updated);
    setIsEditing(false);
  };

  const generatePetsitterText = () => {
    const lines = [
      `🐾 KARTA OPIEKUNA / PETSITTERA DLA: ${pet.name.toUpperCase()}`,
      `==========================================`,
      `Gatunek: ${pet.species === 'dog' ? 'Pies' : pet.species === 'cat' ? 'Kot' : pet.species} | Rasa: ${pet.breed || 'Zwierzak'} | Waga: ${pet.weightKg} kg`,
      ``,
      `📞 KONTAKTY PILNE:`,
      `• Właściciel: ${plan.ownerPhone || 'Brak numeru'}`,
      plan.secondaryContactPhone ? `• Drugi kontakt (rodzina): ${plan.secondaryContactPhone}` : ``,
      `• Weterynarz prowadzący: ${pet.vetClinicName || 'Gabinet'} (${pet.vetPhone || '-'})`,
      pet.emergencyClinicPhone ? `• DYŻUR 24H: ${pet.emergencyClinicPhone}` : ``,
      ``,
      `🥩 HARMONOGRAM KARMIENIA:`,
      ...plan.meals.map(m => `• ${m.time} - ${m.description} (${m.amount})`),
      ``,
      ...(pet.species === 'dog' ? [
        `🐕 SPACERY:`,
        ...plan.walks.map(w => `• ${w.time} (${w.durationMinutes} min) - ${w.notes || 'spacer'}`),
        ``
      ] : []),
      `💊 LEKI DO PODANIA (${activeMeds.length}):`,
      activeMeds.length === 0 ? `• Brak stałych leków` : activeMeds.map(m => `• ${m.name} - ${m.dosage}: ${m.timesOfDay?.map(t => t.time).join(', ')} (${m.instructions || 'z karmą'})`),
      ``,
      `⚠️ ZWYCZAJE I LĘKI:`,
      `• ${plan.habitsAndFears}`,
      ``,
      `🎾 NAGRODY I SMACZKI:`,
      `• ${plan.favoriteGamesAndTreats}`,
      ``,
      `🚨 WAŻNE ZASADY DOMOWE:`,
      `• ${plan.specialInstructions || 'Brak dodatkowych instrukcji'}`,
      `==========================================`,
      `Życzymy udanej opieki nad ${pet.name}! ❤️`
    ];

    return lines.filter(Boolean).join('\n');
  };

  const handleCopyText = () => {
    const text = generatePetsitterText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="no-print p-4 sm:p-5 bg-gradient-to-r from-purple-900 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-purple-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-2xl border border-purple-400/30">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Karta Petsittera / Tymczasowego Opiekuna
              </h2>
              <p className="text-xs text-purple-200/80">Instrukcja opieki nad: {pet.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                copied ? 'bg-emerald-600 text-white' : 'bg-purple-800/60 hover:bg-purple-800 text-purple-200'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Skopiowano SMS' : 'Kopiuj instrukcję'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Drukuj</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800 flex-1">
          {/* Pet Basic Banner */}
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={pet.photoUrl || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80'}
                alt={pet.name}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-purple-400 shadow-xs"
              />
              <div>
                <strong className="text-base text-slate-900 block leading-tight">{pet.name}</strong>
                <p className="text-xs text-slate-500">
                  {pet.breed || 'Zwierzak'} &bull; {pet.weightKg} kg &bull; chip: {pet.chipNumber || 'Brak'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 text-xs font-bold transition shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Podgląd' : 'Edytuj wytyczne'}</span>
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Telefon właściciela</label>
                  <input
                    type="tel"
                    placeholder="np. +48 600 000 000"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-purple-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Drugi kontakt awaryjny (rodzina/sąsiad)</label>
                  <input
                    type="tel"
                    placeholder="np. +48 700 000 000"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Zwyczaje, lęki i zachowanie</label>
                <textarea
                  rows={2}
                  value={habitsAndFears}
                  onChange={(e) => setHabitsAndFears(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ulubione smaczki, zabawy i nagrody</label>
                <input
                  type="text"
                  value={favoriteTreats}
                  onChange={(e) => setFavoriteTreats(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Specjalne instrukcje domowe</label>
                <textarea
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-purple-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-bold"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow"
                >
                  Zapisz instrukcję
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Emergency Contacts */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Numery alarmowe
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-500">Właściciel:</span>
                    <strong className="text-slate-900">{plan.ownerPhone || 'Nie wpisano'}</strong>
                  </div>
                  {plan.secondaryContactPhone && (
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-500">Kontakt awaryjny:</span>
                      <strong className="text-slate-900">{plan.secondaryContactPhone}</strong>
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-500">Weterynarz:</span>
                    <strong className="text-teal-700">{pet.vetPhone || pet.vetClinicName || '-'}</strong>
                  </div>
                  {pet.emergencyClinicPhone && (
                    <div className="flex justify-between items-center bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                      <span className="text-rose-600 font-semibold">Dyżur 24h:</span>
                      <strong className="text-rose-800">{pet.emergencyClinicPhone}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Feeding Plan */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-amber-600" />
                  Plan Posiłków i Karmienia
                </h4>
                <div className="space-y-1.5">
                  {plan.meals.map((meal) => (
                    <div key={meal.id} className="p-3 rounded-xl bg-white border border-slate-200 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                          {meal.time}
                        </span>
                        <span className="font-medium text-slate-700">{meal.description}</span>
                      </div>
                      <span className="font-bold text-slate-900">{meal.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Walks (if dog) */}
              {pet.species === 'dog' && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Footprints className="w-4 h-4 text-emerald-600" />
                    Godziny Spacerów
                  </h4>
                  <div className="space-y-1.5">
                    {plan.walks.map((walk) => (
                      <div key={walk.id} className="p-3 rounded-xl bg-white border border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                            {walk.time}
                          </span>
                          <span className="font-medium text-slate-700">{walk.notes || 'Spacer'}</span>
                        </div>
                        <span className="text-slate-500 font-semibold">{walk.durationMinutes} min</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Medications for Petsitter */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-teal-600" />
                  Leki do podania ({activeMeds.length})
                </h4>
                {activeMeds.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Zwierzak nie przyjmuje obecnie stałych leków.</p>
                ) : (
                  <div className="space-y-1.5">
                    {activeMeds.map((med) => (
                      <div key={med.id} className="p-3 rounded-xl bg-teal-50/50 border border-teal-200 space-y-1">
                        <div className="flex justify-between items-center">
                          <strong className="text-teal-950 font-bold">{med.name}</strong>
                          <span className="font-bold text-teal-800">{med.dosage}</span>
                        </div>
                        <p className="text-[11px] text-teal-700">
                          Godziny: {med.timesOfDay?.map(t => t.time).join(', ')} &bull; {med.instructions}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Habits and Rules */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2">
                <div>
                  <strong className="text-slate-800 block mb-0.5">Zwyczaje i lęki:</strong>
                  <p className="text-slate-600 leading-relaxed">{plan.habitsAndFears}</p>
                </div>
                {plan.favoriteGamesAndTreats && (
                  <div className="pt-2 border-t border-amber-200/60">
                    <strong className="text-slate-800 block mb-0.5">Nagrody & zabawy:</strong>
                    <p className="text-slate-600">{plan.favoriteGamesAndTreats}</p>
                  </div>
                )}
                {plan.specialInstructions && (
                  <div className="pt-2 border-t border-amber-200/60">
                    <strong className="text-rose-900 block mb-0.5">Ważne zasady domowe:</strong>
                    <p className="text-rose-800 font-medium">{plan.specialInstructions}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
