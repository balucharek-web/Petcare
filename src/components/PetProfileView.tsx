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
  Search,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  RotateCcw,
  LayoutDashboard
} from 'lucide-react';
import { 
  Pet, 
  PetWeightEntry, 
  DashboardConfig, 
  DashboardWidgetKey, 
  DEFAULT_WIDGET_ORDER, 
  DEFAULT_DASHBOARD_CONFIG 
} from '../types/pet';
import { storage } from '../services/storage';
import { ScanViewerModal } from './ScanViewerModal';
import { calculatePetHumanAge } from './AgeCalculatorModal';

interface PetProfileViewProps {
  pet: Pet;
  onUpdatePet: (updated: Pet) => void;
  onDeletePet?: (petId: string) => void;
  onOpenNewPetModal: () => void;
  totalVaccinationsCount: number;
  activeMedicationsCount: number;
  onNavigateToTab: (tab: any) => void;
  dashboardConfig: DashboardConfig;
  onSaveDashboardConfig?: (newConfig: DashboardConfig) => void;
  onOpenDashboardCustomizer: () => void;
  onOpenMedicalReport: () => void;
  onOpenToxicityChecker: () => void;
  onOpenAIScanner: () => void;
  onOpenNutritionCalculator: () => void;
  onOpenExpenses: () => void;
  onOpenPetsitter: () => void;
  onOpenAgeCalculator?: () => void;
  onOpenEmergencyVetFinder?: () => void;
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
  onSaveDashboardConfig,
  onOpenDashboardCustomizer,
  onOpenMedicalReport,
  onOpenToxicityChecker,
  onOpenAIScanner,
  onOpenNutritionCalculator,
  onOpenExpenses,
  onOpenPetsitter,
  onOpenAgeCalculator,
  onOpenEmergencyVetFinder,
}) => {
  const [copiedChip, setCopiedChip] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingWeight, setIsAddingWeight] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWeightNotes, setNewWeightNotes] = useState('');
  const [previewBookletScan, setPreviewBookletScan] = useState<{ url: string; title: string; date?: string } | null>(null);

  // Drag and drop / tile reordering state
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedKey, setDraggedKey] = useState<DashboardWidgetKey | null>(null);
  const [dragOverKey, setDragOverKey] = useState<DashboardWidgetKey | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Pet>>({ ...pet });

  // Biological human age calculation
  const getPetAgeYearsMonths = () => {
    if (!pet.birthDate) return { y: 0, m: 0 };
    const birth = new Date(pet.birthDate);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    return { y: Math.max(0, years), m: Math.max(0, months) };
  };
  const petAgeYM = getPetAgeYearsMonths();
  const quickHumanAge = pet.birthDate 
    ? calculatePetHumanAge(pet.species, petAgeYM.y, petAgeYM.m, pet.weightKg || 12)
    : null;

  // Quick calculations for nutrition widget
  const isCat = pet.species === 'cat';
  const rer = Math.round(70 * Math.pow(Math.max(0.5, pet.weightKg || 1), 0.75));
  const factor = isCat ? (pet.isNeutered ? 1.2 : 1.4) : (pet.isNeutered ? 1.6 : 1.8);
  const estimatedDailyKcal = Math.round(rer * factor);
  const estimatedDryFoodGrams = Math.round((estimatedDailyKcal / 360) * 100);

  // Quick calculations for expenses widget
  const expenses = storage.getExpenses(pet.id);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amountPln, 0);

  // Toast feedback helper
  const showReorderToast = (msg = 'Zapisano nową kolejność kafelków') => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2500);
  };

  // Reorder logic
  const currentOrder: DashboardWidgetKey[] = (
    dashboardConfig.order && dashboardConfig.order.length > 0
      ? dashboardConfig.order
      : DEFAULT_WIDGET_ORDER
  );

  const isWidgetVisible = (key: DashboardWidgetKey): boolean => {
    if (dashboardConfig[key] === false) return false;
    if (key === 'healthAlerts') {
      return Boolean(pet.allergies || pet.specialNotes || pet.color);
    }
    return true;
  };

  const visibleWidgets = currentOrder.filter(isWidgetVisible);

  const handleMoveWidget = (key: DashboardWidgetKey, direction: 'up' | 'down') => {
    const visibleIndex = visibleWidgets.indexOf(key);
    if (visibleIndex === -1) return;

    const targetVisibleIndex = direction === 'up' ? visibleIndex - 1 : visibleIndex + 1;
    if (targetVisibleIndex < 0 || targetVisibleIndex >= visibleWidgets.length) return;

    const targetKey = visibleWidgets[targetVisibleIndex];

    const fullOrder = [...currentOrder];
    const fromIndex = fullOrder.indexOf(key);
    const toIndex = fullOrder.indexOf(targetKey);

    if (fromIndex !== -1 && toIndex !== -1) {
      fullOrder.splice(fromIndex, 1);
      fullOrder.splice(toIndex, 0, key);

      const newConfig: DashboardConfig = {
        ...dashboardConfig,
        order: fullOrder,
      };
      storage.saveDashboardConfig(newConfig);
      onSaveDashboardConfig?.(newConfig);
      showReorderToast();
    }
  };

  const handleReorder = (fromKey: DashboardWidgetKey, toKey: DashboardWidgetKey) => {
    if (fromKey === toKey) return;
    const fullOrder = [...currentOrder];
    const fromIndex = fullOrder.indexOf(fromKey);
    const toIndex = fullOrder.indexOf(toKey);

    if (fromIndex !== -1 && toIndex !== -1) {
      fullOrder.splice(fromIndex, 1);
      fullOrder.splice(toIndex, 0, fromKey);

      const newConfig: DashboardConfig = {
        ...dashboardConfig,
        order: fullOrder,
      };
      storage.saveDashboardConfig(newConfig);
      onSaveDashboardConfig?.(newConfig);
      showReorderToast();
    }
  };

  const handleDragStart = (e: React.DragEvent, key: DashboardWidgetKey) => {
    setDraggedKey(key);
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetKey: DashboardWidgetKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverKey !== targetKey) {
      setDragOverKey(targetKey);
    }
  };

  const handleDrop = (e: React.DragEvent, targetKey: DashboardWidgetKey) => {
    e.preventDefault();
    if (draggedKey && draggedKey !== targetKey) {
      handleReorder(draggedKey, targetKey);
    }
    setDraggedKey(null);
    setDragOverKey(null);
  };

  const handleDragEnd = () => {
    setDraggedKey(null);
    setDragOverKey(null);
  };

  // Touch handlers for mobile drag & drop
  const handleTouchStart = (e: React.TouchEvent, key: DashboardWidgetKey) => {
    setDraggedKey(key);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggedKey) return;
    const touch = e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const container = el?.closest('[data-widget-key]');
    if (container) {
      const target = container.getAttribute('data-widget-key') as DashboardWidgetKey;
      if (target && target !== dragOverKey) {
        setDragOverKey(target);
      }
    }
  };

  const handleTouchEnd = () => {
    if (draggedKey && dragOverKey && draggedKey !== dragOverKey) {
      handleReorder(draggedKey, dragOverKey);
    }
    setDraggedKey(null);
    setDragOverKey(null);
  };

  const handleResetOrder = () => {
    const resetConfig: DashboardConfig = {
      ...dashboardConfig,
      order: [...DEFAULT_WIDGET_ORDER],
    };
    storage.saveDashboardConfig(resetConfig);
    onSaveDashboardConfig?.(resetConfig);
    showReorderToast('Przywrócono domyślny układ kafelków');
  };

  const WIDGET_TITLES: Record<DashboardWidgetKey, { label: string; desc: string }> = {
    shortcuts: { label: 'Szybkie skróty', desc: 'Dzisiejsze leki i szczepienia' },
    aiScanner: { label: 'Skaner Recept AI', desc: 'Odczyt recept i wyników badań' },
    nutritionCalculator: { label: 'Kalkulator Żywienia', desc: 'RER / MER i zapotrzebowanie' },
    toxicChecker: { label: 'Czy może to zjeść?', desc: 'Baza toksyczności jedzenia' },
    expensesWidget: { label: 'Wydatki i Finanse', desc: 'Budżet i koszty opieki' },
    petsitterCard: { label: 'Tryb Petsittera', desc: 'Karta opiekuna i harmonogram' },
    chipAndDocs: { label: 'Mikroczip i Dokumenty', desc: 'Identyfikacja i paszport' },
    weightTracker: { label: 'Kontrola Wagi', desc: 'Pomiary i wykres masy ciała' },
    bookletScans: { label: 'Książeczka Zdrowia', desc: 'Skany stron książeczki' },
    healthAlerts: { label: 'Ostrzeżenia Zdrowotne', desc: 'Alergie i uwagi' },
    vetContact: { label: 'Twój Weterynarz', desc: 'Kontakt do gabinetu i dyżur 24h' },
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
    const updated = {
      ...pet,
      ...editForm,
      weightKg: Number(editForm.weightKg) || pet.weightKg,
    };
    onUpdatePet(updated as Pet);
    setIsEditing(false);
  };

  const handleAddWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newWeight);
    if (isNaN(val) || val <= 0) return;

    const newEntry: PetWeightEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      weightKg: val,
      notes: newWeightNotes.trim() || undefined,
    };

    const currentHistory = pet.weightHistory || [];
    const updatedHistory = [...currentHistory, newEntry];

    const updatedPet: Pet = {
      ...pet,
      weightKg: val,
      weightHistory: updatedHistory,
    };

    onUpdatePet(updatedPet);
    setNewWeight('');
    setNewWeightNotes('');
    setIsAddingWeight(false);
  };

  const handleBookletScanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      const newScan = {
        id: crypto.randomUUID(),
        title: `Strona ${(pet.bookletScans?.length || 0) + 1}`,
        url: base64,
        date: new Date().toISOString().split('T')[0],
      };

      const updatedScans = [...(pet.bookletScans || []), newScan];
      onUpdatePet({
        ...pet,
        bookletScans: updatedScans,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteBookletScan = (scanId: string) => {
    const updatedScans = (pet.bookletScans || []).filter(s => s.id !== scanId);
    onUpdatePet({
      ...pet,
      bookletScans: updatedScans,
    });
  };

  const calculateAge = (birthDateString?: string) => {
    if (!birthDateString) return 'Nieznany';
    const birth = new Date(birthDateString);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();

    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }

    if (years === 0) {
      return `${months} mies.`;
    }
    return `${years} lat, ${months} mies.`;
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 animate-fadeIn">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-teal-600" />
          Edytuj profil: {pet.name}
        </h2>

        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Imię</label>
              <input
                type="text"
                value={editForm.name || ''}
                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Rasa</label>
              <input
                type="text"
                value={editForm.breed || ''}
                onChange={e => setEditForm(prev => ({ ...prev, breed: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Gatunek</label>
              <select
                value={editForm.species || 'dog'}
                onChange={e => setEditForm(prev => ({ ...prev, species: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="dog">Pies</option>
                <option value="cat">Kot</option>
                <option value="other">Inny</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Płeć</label>
              <select
                value={editForm.gender || 'male'}
                onChange={e => setEditForm(prev => ({ ...prev, gender: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="male">Samiec</option>
                <option value="female">Samica</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Data urodzenia</label>
              <input
                type="date"
                value={editForm.birthDate || ''}
                onChange={e => setEditForm(prev => ({ ...prev, birthDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Waga (kg)</label>
              <input
                type="number"
                step="0.1"
                value={editForm.weightKg || ''}
                onChange={e => setEditForm(prev => ({ ...prev, weightKg: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Numer Mikroczipa (15 cyfr)</label>
              <input
                type="text"
                value={editForm.chipNumber || ''}
                onChange={e => setEditForm(prev => ({ ...prev, chipNumber: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                placeholder="616093900123456"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Numer Paszportu</label>
              <input
                type="text"
                value={editForm.passportNumber || ''}
                onChange={e => setEditForm(prev => ({ ...prev, passportNumber: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                placeholder="PL 1234567"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Umaszczenie / Kolor</label>
              <input
                type="text"
                value={editForm.color || ''}
                onChange={e => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Kastracja / Sterylizacja</label>
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="neutered"
                    checked={editForm.isNeutered === true}
                    onChange={() => setEditForm(prev => ({ ...prev, isNeutered: true }))}
                    className="text-teal-600"
                  />
                  <span>Tak</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="neutered"
                    checked={editForm.isNeutered === false}
                    onChange={() => setEditForm(prev => ({ ...prev, isNeutered: false }))}
                    className="text-teal-600"
                  />
                  <span>Nie</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Przychodnia weterynaryjna</label>
              <input
                type="text"
                value={editForm.vetClinicName || ''}
                onChange={e => setEditForm(prev => ({ ...prev, vetClinicName: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Telefon do weterynarza</label>
              <input
                type="tel"
                value={editForm.vetPhone || ''}
                onChange={e => setEditForm(prev => ({ ...prev, vetPhone: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Alergie i Nietolerancje</label>
            <input
              type="text"
              value={editForm.allergies || ''}
              onChange={e => setEditForm(prev => ({ ...prev, allergies: e.target.value }))}
              placeholder="np. kurczak, pyłki, jad osy, penicylina"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Szczególne uwagi / Behawior</label>
            <textarea
              rows={2}
              value={editForm.specialNotes || ''}
              onChange={e => setEditForm(prev => ({ ...prev, specialNotes: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
            {onDeletePet ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Czy na pewno usunąć profil ${pet.name}?`)) {
                    onDeletePet(pet.id);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition"
              >
                Usuń profil
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition"
              >
                Zapisz zmiany
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // Helper to render content for each individual widget key
  const renderWidgetContent = (key: DashboardWidgetKey) => {
    switch (key) {
      case 'shortcuts':
        return (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 rounded-xl text-teal-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Dzisiejsze skróty</h3>
                  <p className="text-xs text-slate-400">Aktywne leki i kalendarz szczepień</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNavigateToTab('medications')}
                className="flex items-center justify-between p-3 rounded-2xl bg-teal-50/80 hover:bg-teal-100/80 text-teal-900 transition text-left cursor-pointer"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase text-teal-600">Leki dzienne</span>
                  <p className="font-bold text-xs">{activeMedicationsCount} aktywnych</p>
                </div>
                <span className="text-base">💊</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToTab('vaccinations')}
                className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900 transition text-left cursor-pointer"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-600">Szczepienia</span>
                  <p className="font-bold text-xs">{totalVaccinationsCount} wpisów</p>
                </div>
                <span className="text-base">💉</span>
              </button>
            </div>
          </div>
        );

      case 'aiScanner':
        return (
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
              type="button"
              onClick={onOpenAIScanner}
              className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs shrink-0 shadow transition active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span>Skanuj</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        );

      case 'nutritionCalculator':
        return (
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
                type="button"
                onClick={onOpenNutritionCalculator}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition border border-amber-200 cursor-pointer"
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
        );

      case 'toxicChecker':
        return (
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
                type="button"
                onClick={onOpenToxicityChecker}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition border border-rose-200 cursor-pointer"
              >
                <span>Baza wiedzy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
              <button
                type="button"
                onClick={onOpenToxicityChecker}
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold border border-rose-200 flex items-center gap-1 cursor-pointer"
              >
                <span>🍫 Czekolada</span>
                <span className="text-[9px] uppercase font-black px-1 rounded bg-rose-200 text-rose-900">Śmiertelna</span>
              </button>

              <button
                type="button"
                onClick={onOpenToxicityChecker}
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold border border-rose-200 flex items-center gap-1 cursor-pointer"
              >
                <span>🍇 Winogrona</span>
                <span className="text-[9px] uppercase font-black px-1 rounded bg-rose-200 text-rose-900">Nerki</span>
              </button>

              <button
                type="button"
                onClick={onOpenToxicityChecker}
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold border border-rose-200 flex items-center gap-1 cursor-pointer"
              >
                <span>💊 Paracetamol</span>
                <span className="text-[9px] uppercase font-black px-1 rounded bg-rose-200 text-rose-900">Trucizna</span>
              </button>

              <button
                type="button"
                onClick={onOpenToxicityChecker}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1 cursor-pointer"
              >
                <span>🥕 Marchewka</span>
                <span className="text-[9px] uppercase font-black px-1 rounded bg-emerald-200 text-emerald-900">Zdrowa</span>
              </button>
            </div>
          </div>
        );

      case 'expensesWidget':
        return (
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
                type="button"
                onClick={onOpenExpenses}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition border border-emerald-200 cursor-pointer"
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
                type="button"
                onClick={onOpenExpenses}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                + Dodaj paragon
              </button>
            </div>
          </div>
        );

      case 'petsitterCard':
        return (
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
                type="button"
                onClick={onOpenPetsitter}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold transition border border-purple-200 cursor-pointer"
              >
                <span>Instrukcja</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Zostawiasz {pet.name} pod opieką rodziny lub petsittera? Wygeneruj gotową wiadomość SMS/WhatsApp lub wydruk z godzinami karmienia, spacerów i numerami alarmowymi.
            </p>
          </div>
        );

      case 'chipAndDocs':
        return (
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
                  type="button"
                  onClick={copyChip}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
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
        );

      case 'weightTracker':
        return (
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
                type="button"
                onClick={() => setIsAddingWeight(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Nowy pomiar
              </button>
            </div>

            {isAddingWeight && (
              <form onSubmit={handleAddWeight} className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100 mb-4 animate-fadeIn">
                <h4 className="text-xs font-bold text-teal-900 mb-2">Zapisz nowy pomiar masy ciała</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="text-[10px] font-bold text-teal-800 block mb-0.5">Waga (kg)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={newWeight}
                      onChange={e => setNewWeight(e.target.value)}
                      placeholder="np. 12.4"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-teal-200 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-teal-800 block mb-0.5">Notatka (opcjonalnie)</label>
                    <input
                      type="text"
                      value={newWeightNotes}
                      onChange={e => setNewWeightNotes(e.target.value)}
                      placeholder="np. po diecie, w gabinecie"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-teal-200 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingWeight(false)}
                    className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs"
                  >
                    Zapisz pomiar
                  </button>
                </div>
              </form>
            )}

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
        );

      case 'bookletScans':
        return (
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
                        className="p-1.5 rounded-lg bg-black/60 hover:bg-black text-white backdrop-blur-xs transition cursor-pointer"
                        title="Powiększ i zobacz"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBookletScan(scan.id)}
                        className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-700 text-white backdrop-blur-xs transition cursor-pointer"
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
        );

      case 'healthAlerts':
        return (
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
        );

      case 'vetContact':
        return (
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
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pb-24 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/90 text-white rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 backdrop-blur-sm border border-slate-700 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

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
                  type="button"
                  onClick={() => {
                    setEditForm({ ...pet });
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edytuj
                </button>

                <button
                  type="button"
                  onClick={onOpenDashboardCustomizer}
                  title="Dostosuj widok strony głównej"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition border border-teal-200 shadow-xs cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-teal-600" />
                  <span>Dostosuj pulpit</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Badges */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button
                type="button"
                onClick={onOpenAgeCalculator}
                className="bg-slate-50 hover:bg-teal-50/70 p-2.5 rounded-2xl border border-slate-100 hover:border-teal-200 text-center transition cursor-pointer active:scale-95 group"
                title="Kliknij, aby otworzyć kalkulator wieku na lata ludzkie i etapy życia"
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-teal-700 block">Wiek</span>
                  <Sparkles className="w-2.5 h-2.5 text-teal-600 opacity-60 group-hover:opacity-100" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block">
                  {calculateAge(pet.birthDate)}
                </span>
                {quickHumanAge && (
                  <span className="text-[10px] font-bold text-teal-700 block truncate mt-0.5">
                    ≈ {quickHumanAge.humanAge} l. ludzkich
                  </span>
                )}
              </button>
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Waga</span>
                <span className="text-xs sm:text-sm font-bold text-teal-700 truncate block">
                  {pet.weightKg} kg
                </span>
                <span className="text-[10px] font-bold text-slate-400 block truncate mt-0.5">
                  {pet.species === 'dog' ? (pet.weightKg <= 10 ? 'Rasa mała' : pet.weightKg <= 25 ? 'Rasa średnia' : pet.weightKg <= 45 ? 'Rasa duża' : 'Rasa olbrzymia') : 'Kot'}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Kastracja</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block">
                  {pet.isNeutered ? 'Tak' : 'Nie'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 block truncate mt-0.5">
                  {pet.gender === 'male' ? 'Samiec' : 'Samica'}
                </span>
              </div>
            </div>

            {/* Quick Health Shortcuts: Age & 24h Emergency Clinics */}
            <div className="grid grid-cols-2 gap-2 mt-2.5">
              {onOpenAgeCalculator && (
                <button
                  type="button"
                  onClick={onOpenAgeCalculator}
                  className="p-2.5 rounded-2xl bg-teal-50/70 hover:bg-teal-100/70 text-teal-900 border border-teal-200/80 text-left transition flex items-center justify-between gap-1 shadow-2xs cursor-pointer active:scale-98"
                >
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-extrabold text-teal-700 block">Lata ludzkie</span>
                    <span className="text-xs font-bold text-teal-950 truncate block">
                      {quickHumanAge ? `${quickHumanAge.humanAge} l. (${quickHumanAge.lifeStage.stageName.split(' ')[0]})` : 'Kalkulator wieku'}
                    </span>
                  </div>
                  <span className="text-sm shrink-0">🎂</span>
                </button>
              )}

              {onOpenEmergencyVetFinder && (
                <button
                  type="button"
                  onClick={onOpenEmergencyVetFinder}
                  className="p-2.5 rounded-2xl bg-rose-50/70 hover:bg-rose-100/70 text-rose-900 border border-rose-200/80 text-left transition flex items-center justify-between gap-1 shadow-2xs cursor-pointer active:scale-98"
                >
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-extrabold text-rose-700 block">Ostry dyżur 24h</span>
                    <span className="text-xs font-bold text-rose-950 truncate block">
                      Kliniki w pobliżu
                    </span>
                  </div>
                  <span className="text-sm shrink-0">🚨</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reorder and Customization Action Toolbar */}
      <div className="p-3 bg-white rounded-3xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
            <ArrowUpDown className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-tight">
              Układ kafelków na pulpicie
            </h4>
            <p className="text-[10px] text-slate-500">
              {visibleWidgets.length} aktywnych kafelków &bull; Przeciągaj kafelki, by ustalić własną kolejność
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={() => setIsReorderMode(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
              isReorderMode
                ? 'bg-teal-600 hover:bg-teal-500 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <GripVertical className="w-3.5 h-3.5" />
            <span>{isReorderMode ? 'Zakończ układanie' : 'Przestawiaj kafelki'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenDashboardCustomizer}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Dostosuj widoczność modułów"
          >
            <Sliders className="w-4 h-4 text-teal-700" />
          </button>
        </div>
      </div>

      {/* Reorder Mode Guidance Banner */}
      {isReorderMode && (
        <div className="p-3.5 rounded-3xl bg-gradient-to-r from-teal-800 to-slate-900 text-white shadow-md border border-teal-700/80 animate-fadeIn flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl shrink-0">
              <GripVertical className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Tryb przesuwania kafelków aktywny</span>
              <p className="text-[11px] text-teal-200/80 leading-tight">
                Chwyć kafelek i przeciągnij w górę lub w dół, albo użyj strzałek ▲ / ▼. Kolejność zapisuje się automatycznie.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleResetOrder}
              className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-teal-200 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
              title="Przywróć standardowy porządek modułów"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Domyślna</span>
            </button>
            <button
              type="button"
              onClick={() => setIsReorderMode(false)}
              className="px-3 py-1 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-[11px] transition shadow-xs cursor-pointer"
            >
              Gotowe
            </button>
          </div>
        </div>
      )}

      {/* Draggable & Reorderable Dashboard Tiles */}
      <div className="space-y-4">
        {visibleWidgets.map((widgetKey, visibleIndex) => {
          const isBeingDragged = draggedKey === widgetKey;
          const isTarget = dragOverKey === widgetKey && draggedKey !== widgetKey;
          const itemMeta = WIDGET_TITLES[widgetKey] || { label: widgetKey, desc: '' };

          return (
            <div
              key={widgetKey}
              data-widget-key={widgetKey}
              draggable
              onDragStart={(e) => handleDragStart(e, widgetKey)}
              onDragOver={(e) => handleDragOver(e, widgetKey)}
              onDrop={(e) => handleDrop(e, widgetKey)}
              onDragEnd={handleDragEnd}
              className={`group relative rounded-3xl transition-all duration-200 ${
                isBeingDragged
                  ? 'opacity-35 scale-[0.98] ring-2 ring-teal-500 ring-dashed'
                  : isTarget
                  ? 'ring-2 ring-teal-500 ring-offset-4 bg-teal-50/40 shadow-xl scale-[1.01]'
                  : ''
              }`}
            >
              {/* Reordering Controls Header / Grip Bar */}
              <div className={`transition-all flex items-center justify-between ${
                isReorderMode
                  ? 'px-3.5 py-2 bg-slate-900 text-white rounded-2xl mb-1.5 shadow-sm'
                  : 'opacity-0 group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100 absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-sm rounded-xl px-2 py-1'
              }`}>
                <div
                  className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing select-none"
                  title="Chwyć i przeciągnij, aby zmienić kolejność"
                  onTouchStart={(e) => handleTouchStart(e, widgetKey)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <GripVertical className={`w-4 h-4 ${isReorderMode ? 'text-teal-400' : 'text-slate-500'}`} />
                  {isReorderMode ? (
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-teal-500/30 text-teal-300 text-[10px] flex items-center justify-center font-mono">
                        {visibleIndex + 1}
                      </span>
                      {itemMeta.label}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-600 hidden sm:inline">
                      Przeciągnij kafelek
                    </span>
                  )}
                </div>

                {isReorderMode && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveWidget(widgetKey, 'up')}
                      disabled={visibleIndex === 0}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-25 transition cursor-pointer"
                      title="Przesuń wyżej"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveWidget(widgetKey, 'down')}
                      disabled={visibleIndex === visibleWidgets.length - 1}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-25 transition cursor-pointer"
                      title="Przesuń niżej"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Widget Content Body */}
              {renderWidgetContent(widgetKey)}
            </div>
          );
        })}
      </div>

      {/* Customize Dashboard Footer Prompt */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onOpenDashboardCustomizer}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold shadow-xs transition cursor-pointer"
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
