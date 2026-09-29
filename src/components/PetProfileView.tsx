import React, { useState } from 'react';
import { 
  Heart, 
  Edit3, 
  Scale, 
  Sparkles, 
  AlertCircle, 
  Copy, 
  Check, 
  Phone, 
  Calendar as CalendarIcon, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  Camera, 
  Info,
  Activity,
  BookOpen,
  Paperclip,
  Eye,
  FileText,
  Beef,
  ShieldAlert,
  Wallet,
  HeartHandshake,
  Sliders,
  Utensils,
  TrendingUp,
  ArrowRight,
  Search
} from 'lucide-react';
import { Pet, PetWeightEntry, DashboardConfig } from '../types/pet';
import { storage } from '../services/storage';
import { ScanViewerModal } from './ScanViewerModal';

interface PetProfileViewProps {
  pet: Pet;
  onUpdatePet: (updated: Pet) => void;
  onDeletePet?: (petId: string) => void;
  onOpenNewPetModal: () => void;
  totalVaccinationsCount: number;
  activeMedicationsCount: number;
  onNavigateToTab: (tab: any) => void;
  dashboardConfig: DashboardConfig;
  onOpenDashboardCustomizer: () => void;
  onOpenMedicalReport: () => void;
  onOpenToxicityChecker: () => void;
  onOpenAIScanner: () => void;
  onOpenNutritionCalculator: () => void;
  onOpenExpenses: () => void;
  onOpenPetsitter: () => void;
}

export const PetProfileView: React.FC<PetProfileViewProps> = ({
  pet,
  onUpdatePet,
  onDeletePet,
  onOpenNewPetModal,
  totalVaccinationsCount,
  activeMedicationsCount,
  onNavigateToTab,
  dashboardConfig,
  onOpenDashboardCustomizer,
  onOpenMedicalReport,
  onOpenToxicityChecker,
  onOpenAIScanner,
  onOpenNutritionCalculator,
  onOpenExpenses,
  onOpenPetsitter,
}) => {
  const [copiedChip, setCopiedChip] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingWeight, setIsAddingWeight] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWeightNotes, setNewWeightNotes] = useState('');
  const [previewBookletScan, setPreviewBookletScan] = useState<{ url: string; title: string; date?: string } | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Pet>>({ ...pet });

  // Quick calculations for nutrition widget
  const isCat = pet.species === 'cat';
  const rer = Math.round(70 * Math.pow(Math.max(0.5, pet.weightKg || 1), 0.75));
  const factor = isCat ? (pet.isNeutered ? 1.2 : 1.4) : (pet.isNeutered ? 1.6 : 1.8);
  const estimatedDailyKcal = Math.round(rer * factor);
  const estimatedDryFoodGrams = Math.round((estimatedDailyKcal / 360) * 100);

  // Quick expenses calculation
  const expenses = storage.getExpenses(pet.id);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amountPln, 0);

  const handleBookletScanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) {
        const newScan = {
          id: `bk-${Date.now()}`,
          url,
          title: file.name ? file.name.replace(/\.[^/.]+$/, '') : `Książeczka zdrowia - str. ${(pet.bookletScans?.length || 0) + 1}`,
          date: new Date().toISOString().slice(0, 10),
        };
        const updatedBookletScans = [...(pet.bookletScans || []), newScan];
        onUpdatePet({
          ...pet,
          bookletScans: updatedBookletScans,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteBookletScan = (scanId: string) => {
    const updatedBookletScans = (pet.bookletScans || []).filter(s => s.id !== scanId);
    onUpdatePet({
      ...pet,
      bookletScans: updatedBookletScans,
    });
  };

  const calculateAge = (birthDate: string): string => {
    if (!birthDate) return '-';
    const birth = new Date(birthDate);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    if (years === 0) {
      return `${months} ${months === 1 ? 'miesiąc' : months < 5 ? 'miesiące' : 'miesięcy'}`;
    }
    const yearStr = years === 1 ? 'rok' : years < 5 ? 'lata' : 'lat';
    return `${years} ${yearStr} ${months > 0 ? `i ${months} mies.` : ''}`;
  };

  const copyChip = () => {
    if (pet.chipNumber) {
      navigator.clipboard.writeText(pet.chipNumber);
      setCopiedChip(true);
      setTimeout(() => setCopiedChip(false), 2000);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Pet = {
      ...pet,
      ...editForm,
      weightKg: Number(editForm.weightKg) || pet.weightKg,
    };
    onUpdatePet(updated);
    setIsEditing(false);
  };

  const handleAddWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(newWeight);
    if (isNaN(w) || w <= 0) return;
    const newEntry: PetWeightEntry = {
      id: `w-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      weightKg: w,
      notes: newWeightNotes.trim() || undefined,
    };
    const updated: Pet = {
      ...pet,
      weightKg: w,
      weightHistory: [...(pet.weightHistory || []), newEntry],
    };
    onUpdatePet(updated);
    setNewWeight('');
    setNewWeightNotes('');
    setIsAddingWeight(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) {
        setEditForm(prev => ({ ...prev, photoUrl: url }));
      }
    };
    reader.readAsDataURL(file);
  };

  if (isAddingWeight) {
    return (
      <div className="w-full bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 animate-fadeIn">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-teal-600" />
            Nowy pomiar wagi
          </h3>
          <button
            type="button"
            onClick={() => setIsAddingWeight(false)}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full font-bold text-xs"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleAddWeight} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Waga (kg) *
            </label>
            <input
              type="number"
              step="0.05"
              required
              autoFocus
              placeholder="np. 28.5"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-base font-bold text-slate-800 focus:outline-teal-600"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Notatka (opcjonalnie)
            </label>
            <input
              type="text"
              placeholder="np. Ważenie domowe na czczo"
              value={newWeightNotes}
              onChange={(e) => setNewWeightNotes(e.target.value)}
              className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-teal-600"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingWeight(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-xs sm:text-sm"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow transition active:scale-98"
            >
              Zapisz wagę
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="w-full bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 animate-fadeIn">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-teal-600" />
            Edytuj profil: {pet.name}
          </h3>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full font-bold text-xs"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSaveEdit} className="space-y-3 text-sm">
          {/* Photo & Name */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src={editForm.photoUrl || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80'}
                alt="Podgląd"
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-teal-500 shadow-xs"
              />
              <label className="absolute -bottom-1 -right-1 p-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow cursor-pointer">
                <Camera className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex-1">
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Imię zwierzaka *</label>
              <input
                type="text"
                required
                value={editForm.name || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 focus:outline-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Rasa</label>
              <input
                type="text"
                value={editForm.breed || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, breed: e.target.value }))}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-teal-600"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Waga (kg)</label>
              <input
                type="number"
                step="0.1"
                value={editForm.weightKg || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, weightKg: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Data urodzenia</label>
              <input
                type="date"
                value={editForm.birthDate || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, birthDate: e.target.value }))}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-teal-600"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nr Mikroczipu (15 cyfr)</label>
              <input
                type="text"
                value={editForm.chipNumber || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, chipNumber: e.target.value }))}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono focus:outline-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nr Paszportu</label>
              <input
                type="text"
                value={editForm.passportNumber || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, passportNumber: e.target.value }))}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono focus:outline-teal-600"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Kastracja / Sterylizacja</label>
              <select
                value={editForm.isNeutered ? 'yes' : 'no'}
                onChange={(e) => setEditForm(prev => ({ ...prev, isNeutered: e.target.value === 'yes' }))}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-teal-600"
              >
                <option value="yes">Tak (Kastrowany/a)</option>
                <option value="no">Nie (Niekastrowany/a)</option>
              </select>
            </div>
          </div>

          <div className="text-xs">
            <label className="font-bold text-slate-700 block mb-1">Alergie i Nietolerancje</label>
            <input
              type="text"
              value={editForm.allergies || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, allergies: e.target.value }))}
              placeholder="np. Alergia na kurczaka, atopowe zapalenie skóry"
              className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-teal-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Główna Przychodnia</label>
              <input
                type="text"
                value={editForm.vetClinicName || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, vetClinicName: e.target.value }))}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-teal-600"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Telefon do lecznicy</label>
              <input
                type="tel"
                value={editForm.vetPhone || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, vetPhone: e.target.value }))}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-teal-600"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-xs sm:text-sm"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow transition active:scale-98"
            >
              Zapisz zmiany
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 animate-fadeIn">
      {/* Top Pet Hero Card (Always Visible) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="relative shrink-0">
            <img
              src={pet.photoUrl || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=150&q=80'}
              alt={pet.name}
              className="w-20 h-20 rounded-2xl object-cover ring-2 ring-teal-500 shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs shadow">
              {pet.species === 'dog' ? '🐶' : pet.species === 'cat' ? '🐱' : '🐰'}
            </span>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {pet.name}
                </h1>
                <p className="text-xs font-semibold text-slate-500">
                  {pet.breed || 'Mieszaniec'} &bull; {pet.gender === 'female' ? 'Suczka / Samica' : 'Pies / Samiec'}
                </p>
              </div>

              <div className="flex items-center justify-center sm:justify-end gap-2">
                <button
                  onClick={() => {
                    setEditForm({ ...pet });
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edytuj
                </button>

                <button
                  onClick={onOpenDashboardCustomizer}
                  title="Dostosuj widok strony głównej"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition border border-teal-200 shadow-xs"
                >
                  <Sliders className="w-3.5 h-3.5 text-teal-600" />
                  <span>Dostosuj pulpit</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Badges */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Wiek</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block">
                  {calculateAge(pet.birthDate)}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Waga</span>
                <span className="text-xs sm:text-sm font-bold text-teal-700 truncate block">
                  {pet.weightKg} kg
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Kastracja</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block">
                  {pet.isNeutered ? 'Tak' : 'Nie'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* WIDGET: Shortcuts (Dzisiejsze leki & szczepienia) */}
        {dashboardConfig.shortcuts !== false && (
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigateToTab('medications')}
              className="flex items-center justify-between p-3 rounded-2xl bg-teal-50/80 hover:bg-teal-100/80 text-teal-900 transition text-left"
            >
              <div>
                <span className="text-[10px] font-bold uppercase text-teal-600">Leki dzienne</span>
                <p className="font-bold text-xs">{activeMedicationsCount} aktywnych</p>
              </div>
              <span className="text-base">💊</span>
            </button>

            <button
              onClick={() => onNavigateToTab('vaccinations')}
              className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900 transition text-left"
            >
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600">Szczepienia</span>
                <p className="font-bold text-xs">{totalVaccinationsCount} wpisów</p>
              </div>
              <span className="text-base">💉</span>
            </button>
          </div>
        )}
      </div>

      {/* WIDGET: Skaner Medyczny AI (Opcja 3) */}
      {dashboardConfig.aiScanner !== false && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 text-white shadow-md border border-teal-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-2xl border border-teal-400/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-white">Skaner Recept i Badań AI</h3>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-400 text-amber-950">
                  Gemini
                </span>
              </div>
              <p className="text-[11px] text-teal-200/80">
                Zrób zdjęcie zaleceń lub wyników krwi – AI rozpozna leki i dawkowanie
              </p>
            </div>
          </div>

          <button
            onClick={onOpenAIScanner}
            className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs shrink-0 shadow transition active:scale-95 flex items-center gap-1"
          >
            <span>Skanuj</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* WIDGET: Kalkulator Żywienia i Kalorii (Opcja 4) */}
      {dashboardConfig.nutritionCalculator !== false && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
                <Beef className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Kalkulator Żywienia (RER / MER)</h3>
                <p className="text-xs text-slate-400">Dzienne zapotrzebowanie kaloryczne</p>
              </div>
            </div>

            <button
              onClick={onOpenNutritionCalculator}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition border border-amber-200"
            >
              <span>Oblicz</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Zapotrzebowanie</span>
              <strong className="text-lg font-black text-amber-950 block mt-0.5">
                ~{estimatedDailyKcal} kcal
              </strong>
              <span className="text-[10px] text-amber-700">na dobę</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Sucha karma (~360kcal)</span>
              <strong className="text-lg font-black text-teal-800 block mt-0.5">
                ~{estimatedDryFoodGrams} g
              </strong>
              <span className="text-[10px] text-slate-500">2 posiłki po {Math.round(estimatedDryFoodGrams / 2)}g</span>
            </div>
          </div>
        </div>
      )}

      {/* WIDGET: Baza Toksyczności (Opcja 2) */}
      {dashboardConfig.toxicChecker !== false && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 rounded-xl text-rose-700">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Czy zwierzak może to zjeść?</h3>
                <p className="text-xs text-slate-400">Sprawdź bezpieczeństwo jedzenia i roślin</p>
              </div>
            </div>

            <button
              onClick={onOpenToxicityChecker}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition border border-rose-200"
            >
              <span>Baza wiedzy</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
            <button
              onClick={onOpenToxicityChecker}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold border border-rose-200 flex items-center gap-1"
            >
              <span>🍫 Czekolada</span>
              <span className="text-[9px] uppercase font-black px-1 rounded bg-rose-200 text-rose-900">Śmiertelna</span>
            </button>

            <button
              onClick={onOpenToxicityChecker}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold border border-rose-200 flex items-center gap-1"
            >
              <span>🍇 Winogrona</span>
              <span className="text-[9px] uppercase font-black px-1 rounded bg-rose-200 text-rose-900">Nerki</span>
            </button>

            <button
              onClick={onOpenToxicityChecker}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold border border-rose-200 flex items-center gap-1"
            >
              <span>💊 Paracetamol</span>
              <span className="text-[9px] uppercase font-black px-1 rounded bg-rose-200 text-rose-900">Trucizna</span>
            </button>

            <button
              onClick={onOpenToxicityChecker}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1"
            >
              <span>🥕 Marchewka</span>
              <span className="text-[9px] uppercase font-black px-1 rounded bg-emerald-200 text-emerald-900">Zdrowa</span>
            </button>
          </div>
        </div>
      )}

      {/* WIDGET: Wydatki i Finanse (Opcja 5) */}
      {dashboardConfig.expensesWidget !== false && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Wydatki i Finanse</h3>
                <p className="text-xs text-slate-400">Koszty leczenia, karmy i wizyt</p>
              </div>
            </div>

            <button
              onClick={onOpenExpenses}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition border border-emerald-200"
            >
              <span>Portfel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex justify-between items-center text-xs">
            <div>
              <span className="text-emerald-800 font-semibold block">Zarejestrowane wydatki:</span>
              <strong className="text-lg font-black text-emerald-950">
                {totalExpenses.toLocaleString('pl-PL')} zł
              </strong>
            </div>
            <button
              onClick={onOpenExpenses}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition"
            >
              + Dodaj paragon
            </button>
          </div>
        </div>
      )}

      {/* WIDGET: Karta Petsittera (Opcja 6) */}
      {dashboardConfig.petsitterCard !== false && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-50 rounded-xl text-purple-700">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tryb Petsittera / Opiekuna</h3>
                <p className="text-xs text-slate-400">Harmonogram karmienia, leków i zasady</p>
              </div>
            </div>

            <button
              onClick={onOpenPetsitter}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold transition border border-purple-200"
            >
              <span>Instrukcja</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Zostawiasz {pet.name} pod opieką rodziny lub petsittera? Wygeneruj gotową wiadomość SMS/WhatsApp lub wydruk z godzinami karmienia, spacerów i numerami alarmowymi.
          </p>
        </div>
      )}

      {/* WIDGET: Mikroczip i Dokumenty */}
      {dashboardConfig.chipAndDocs !== false && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Mikroczip i Dokumenty</h3>
                <p className="text-xs text-slate-400">Identyfikacja w Safe-Animal / CBDZ</p>
              </div>
            </div>

            {pet.chipNumber && (
              <button
                onClick={copyChip}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  copiedChip ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {copiedChip ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedChip ? 'Skopiowano' : 'Kopiuj'}
              </button>
            )}
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-4 font-mono">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
              <span>TRANS-PONDER CHIP</span>
              <span>15 CYFR ISO</span>
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-widest text-teal-300">
              {pet.chipNumber || 'Brak wpisanego chipa'}
            </div>
            {/* Barcode visual */}
            <div className="mt-3 flex items-center justify-between gap-1 opacity-70 h-6 overflow-hidden">
              {[...Array(36)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white h-full"
                  style={{
                    width: `${(i % 3) + 1}px`,
                    opacity: i % 2 === 0 ? 0.9 : 0.4,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Nr Paszportu</span>
              <span className="font-semibold text-slate-800">{pet.passportNumber || 'Brak'}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Nr Tatuażu</span>
              <span className="font-semibold text-slate-800">{pet.tattooNumber || 'Brak'}</span>
            </div>
          </div>
        </div>
      )}

      {/* WIDGET: Kontrola Wagi */}
      {dashboardConfig.weightTracker !== false && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-50 rounded-xl text-teal-700">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Kontrola Wagi</h3>
                <p className="text-xs text-slate-400">Aktualna: <strong className="text-teal-700">{pet.weightKg} kg</strong></p>
              </div>
            </div>
            <button
              onClick={() => setIsAddingWeight(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Nowy pomiar
            </button>
          </div>

          {/* Weight history list */}
          <div className="space-y-2">
            {(!pet.weightHistory || pet.weightHistory.length === 0) ? (
              <p className="text-xs text-slate-400 text-center py-2">Brak wcześniejszych pomiarów wagi.</p>
            ) : (
              pet.weightHistory.slice(-4).reverse().map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    <span className="font-semibold text-slate-700">{entry.date}</span>
                    {entry.notes && <span className="text-slate-400 italic">({entry.notes})</span>}
                  </div>
                  <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-xl shadow-xs border border-slate-100">
                    {entry.weightKg} kg
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* WIDGET: Physical Health Booklet Scans */}
      {dashboardConfig.bookletScans !== false && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Książeczka Zdrowia (Skany)</h3>
                <p className="text-xs text-slate-400">Zdjęcia fizycznej książeczki weterynaryjnej</p>
              </div>
            </div>
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer transition shadow-xs">
              <Camera className="w-3.5 h-3.5" />
              <span>Dodaj stronę</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleBookletScanUpload}
                className="hidden"
              />
            </label>
          </div>

          {(!pet.bookletScans || pet.bookletScans.length === 0) ? (
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-dashed border-amber-200 text-center">
              <Paperclip className="w-6 h-6 text-amber-500 mx-auto mb-1.5 opacity-60" />
              <p className="text-xs font-semibold text-slate-700">Brak wgranych skanów książeczki</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Zrób zdjęcie stron fizycznej książeczki zdrowia (szczepienia, wpisy, pieczątki lekarza).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pet.bookletScans.map((scan) => (
                <div
                  key={scan.id}
                  className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-3/4 flex flex-col justify-end shadow-xs hover:shadow-md transition"
                >
                  <img
                    src={scan.url}
                    alt={scan.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/20 to-transparent pointer-events-none" />

                  <div className="relative p-2.5 z-10 text-white">
                    <p className="text-xs font-bold truncate leading-tight">{scan.title}</p>
                    <p className="text-[10px] text-slate-300">{scan.date}</p>
                  </div>

                  <div className="absolute top-2 right-2 flex gap-1.5 z-20">
                    <button
                      type="button"
                      onClick={() => setPreviewBookletScan({ url: scan.url, title: scan.title, date: scan.date })}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black text-white backdrop-blur-xs transition"
                      title="Powiększ i zobacz"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBookletScan(scan.id)}
                      className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-700 text-white backdrop-blur-xs transition"
                      title="Usuń stronę"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WIDGET: Cechy i Ostrzeżenia Zdrowotne */}
      {dashboardConfig.healthAlerts !== false && (pet.allergies || pet.specialNotes || pet.color) && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-teal-600" />
            Cechy i Ostrzeżenia Zdrowotne
          </h3>

          {pet.allergies && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold uppercase text-rose-700 block">Alergie i Nietolerancje</span>
                <p className="text-xs text-rose-900 font-medium">{pet.allergies}</p>
              </div>
            </div>
          )}

          {pet.specialNotes && (
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100">
              <span className="text-[10px] font-bold uppercase text-blue-700 block mb-1">Uwagi Behawioralne</span>
              <p className="text-xs text-blue-900 leading-relaxed">{pet.specialNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* WIDGET: Twój Weterynarz */}
      {dashboardConfig.vetContact !== false && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-teal-600" />
            Twój Weterynarz
          </h3>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Przychodnia:</span>
              <strong className="text-slate-800">{pet.vetClinicName || 'Nie ustawiono'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Lekarz:</span>
              <strong className="text-slate-800">{pet.vetDoctorName || '-'}</strong>
            </div>
            {pet.vetPhone && (
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500">Telefon do lecznicy:</span>
                <a
                  href={`tel:${pet.vetPhone}`}
                  className="font-bold text-teal-700 hover:text-teal-800 bg-white px-2.5 py-1 rounded-xl border border-slate-200"
                >
                  {pet.vetPhone}
                </a>
              </div>
            )}
            {pet.emergencyClinicPhone && (
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-rose-600 font-semibold">Dyżur całodobowy:</span>
                <a
                  href={`tel:${pet.emergencyClinicPhone}`}
                  className="font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200"
                >
                  {pet.emergencyClinicPhone}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customize Dashboard Footer Prompt */}
      <div className="text-center pt-2">
        <button
          onClick={onOpenDashboardCustomizer}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold shadow-xs transition"
        >
          <Sliders className="w-3.5 h-3.5 text-teal-600" />
          <span>Dostosuj widok kafelków pulpitu</span>
        </button>
      </div>

      {previewBookletScan && (
        <ScanViewerModal
          isOpen={true}
          imageUrl={previewBookletScan.url}
          title={previewBookletScan.title}
          date={previewBookletScan.date}
          onClose={() => setPreviewBookletScan(null)}
        />
      )}
    </div>
  );
};
