import React, { useState } from 'react';
import { 
  Pill, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  Check, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Download, 
  Calculator, 
  Info, 
  Package, 
  Layers, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  AlertTriangle 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Pet, Medication, DoseScheduleItem, MedicationForm } from '../types/pet';
import { storage } from '../services/storage';
import { 
  createGoogleCalendarUrl, 
  downloadICalendarFile, 
  buildMedicationCalendarEvent 
} from '../services/calendar';
import { 
  calculateMedicationDemand, 
  parseDoseToNumber, 
  getMedicationUnitLabel, 
  getMedicationIcon 
} from '../services/dosageCalculator';

interface MedicationsViewProps {
  pet: Pet;
  medications: Medication[];
  onUpdateMedications: (items: Medication[]) => void;
}

export interface MedicationFormOption {
  form: MedicationForm;
  label: string;
  shortLabel: string;
  icon: string;
  defaultDose: string;
  packageUnitHint: string;
  presets: { label: string; value: string }[];
}

export const MEDICATION_TYPE_OPTIONS: MedicationFormOption[] = [
  {
    form: 'tablet',
    label: 'Tabletka',
    shortLabel: 'Tabletka',
    icon: '💊',
    defaultDose: '1/2 tabletki',
    packageUnitHint: 'szt. w opakowaniu',
    presets: [
      { label: '¼ tab', value: '1/4 tabletki' },
      { label: '⅓ tab', value: '1/3 tabletki' },
      { label: '½ tab', value: '1/2 tabletki' },
      { label: '¾ tab', value: '3/4 tabletki' },
      { label: '1 tab', value: '1 tabletka' },
      { label: '1 ¼ tab', value: '1 1/4 tabletki' },
      { label: '1 ½ tab', value: '1 1/2 tabletki' },
      { label: '2 tab', value: '2 tabletki' },
      { label: '2 ½ tab', value: '2 1/2 tabletki' },
      { label: '3 tab', value: '3 tabletki' },
    ],
  },
  {
    form: 'liquid',
    label: 'Syrop / Płyn',
    shortLabel: 'Syrop / Płyn',
    icon: '🧪',
    defaultDose: '2.5 ml',
    packageUnitHint: 'ml w butelce',
    presets: [
      { label: '0.5 ml', value: '0.5 ml' },
      { label: '1 ml', value: '1 ml' },
      { label: '1.5 ml', value: '1.5 ml' },
      { label: '2 ml', value: '2 ml' },
      { label: '2.5 ml', value: '2.5 ml' },
      { label: '3 ml', value: '3 ml' },
      { label: '5 ml', value: '5 ml' },
      { label: '10 ml', value: '10 ml' },
    ],
  },
  {
    form: 'drops',
    label: 'Krople (oczy/uszy/pysk)',
    shortLabel: 'Krople',
    icon: '💧',
    defaultDose: '2 krople',
    packageUnitHint: 'kropli w butelce',
    presets: [
      { label: '1 kropla', value: '1 kropla' },
      { label: '2 krople', value: '2 krople' },
      { label: '3 krople', value: '3 krople' },
      { label: '4 krople', value: '4 krople' },
      { label: '5 kropli', value: '5 kropli' },
    ],
  },
  {
    form: 'capsule',
    label: 'Kapsułka',
    shortLabel: 'Kapsułka',
    icon: '💊',
    defaultDose: '1 kapsułka',
    packageUnitHint: 'kaps. w opakowaniu',
    presets: [
      { label: '1 kaps.', value: '1 kapsułka' },
      { label: '2 kaps.', value: '2 kapsułki' },
    ],
  },
  {
    form: 'ointment',
    label: 'Maść / Żel',
    shortLabel: 'Maść / Żel',
    icon: '🧴',
    defaultDose: '1 cm maści',
    packageUnitHint: 'g w tubce',
    presets: [
      { label: 'Cienka warstwa', value: 'cienka warstwa' },
      { label: '1 cm', value: '1 cm maści' },
      { label: '2 cm', value: '2 cm maści' },
      { label: '1 doza', value: '1 doza' },
    ],
  },
  {
    form: 'injection',
    label: 'Zastrzyk',
    shortLabel: 'Zastrzyk',
    icon: '💉',
    defaultDose: '0.5 ml',
    packageUnitHint: 'ampułek / ml',
    presets: [
      { label: '0.2 ml', value: '0.2 ml' },
      { label: '0.5 ml', value: '0.5 ml' },
      { label: '1 ml', value: '1 ml' },
      { label: '2 ml', value: '2 ml' },
      { label: '1 amp.', value: '1 ampułka' },
    ],
  },
  {
    form: 'paste',
    label: 'Pasta',
    shortLabel: 'Pasta',
    icon: '🪥',
    defaultDose: '1 cm pasty',
    packageUnitHint: 'cm / tubka',
    presets: [
      { label: '0.5 cm', value: '0.5 cm pasty' },
      { label: '1 cm', value: '1 cm pasty' },
      { label: '2 cm', value: '2 cm pasty' },
    ],
  },
  {
    form: 'powder',
    label: 'Proszek',
    shortLabel: 'Proszek',
    icon: '🧂',
    defaultDose: '1 miarka',
    packageUnitHint: 'saszetek / miarek',
    presets: [
      { label: '½ miarki', value: '1/2 miarki' },
      { label: '1 miarka', value: '1 miarka' },
      { label: '1 saszetka', value: '1 saszetka' },
    ],
  },
  {
    form: 'other',
    label: 'Inna postać',
    shortLabel: 'Inna',
    icon: '📦',
    defaultDose: '1 dawka',
    packageUnitHint: 'dawek',
    presets: [
      { label: '1 dawka', value: '1 dawka' },
      { label: '2 dawki', value: '2 dawki' },
    ],
  },
];

export const MedicationsView: React.FC<MedicationsViewProps> = ({
  pet,
  medications,
  onUpdateMedications,
}) => {
  const [isAddingMed, setIsAddingMed] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [medicationToDelete, setMedicationToDelete] = useState<Medication | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [doseLogs, setDoseLogs] = useState(() => storage.getDoseLogs(pet.id, todayStr));

  // Form State
  const [formName, setFormName] = useState('');
  const [formIngredient, setFormIngredient] = useState('');
  const [formForm, setFormForm] = useState<Medication['form']>('tablet');
  const [formDosage, setFormDosage] = useState('3/4 tabletki');
  const [formInstructions, setFormInstructions] = useState('');
  const [formStartDate, setFormStartDate] = useState(todayStr);
  const [formEndDate, setFormEndDate] = useState('');
  const [formIsChronic, setFormIsChronic] = useState(true);
  const [formPackageSize, setFormPackageSize] = useState<string>('30');
  const [formCurrentStock, setFormCurrentStock] = useState<string>('');
  const [formTimes, setFormTimes] = useState<DoseScheduleItem[]>([
    { id: 't-1', label: 'Rano', time: '08:00', amount: '3/4 tabletki' },
    { id: 't-2', label: 'Wieczór', time: '20:00', amount: '3/4 tabletki' },
  ]);
  const [customSlotIds, setCustomSlotIds] = useState<Record<string, boolean>>({});

  const activeMeds = medications.filter(m => m.isActive);
  const archivedMeds = medications.filter(m => !m.isActive);

  // Compute daily schedule items
  const dailySlots = activeMeds.flatMap(med => 
    med.timesOfDay.map(slot => ({
      medication: med,
      slot,
    }))
  ).sort((a, b) => a.slot.time.localeCompare(b.slot.time));

  const isDoseTaken = (medId: string, time: string) => {
    return doseLogs.some(l => l.medicationId === medId && l.time === time && l.scheduledDate === todayStr);
  };

  const handleToggleDose = (med: Medication, slot: DoseScheduleItem) => {
    const isNowTaken = storage.toggleDoseLog(pet.id, med.id, slot.time, todayStr);
    setDoseLogs(storage.getDoseLogs(pet.id, todayStr));

    if (isNowTaken) {
      try {
        confetti({
          particleCount: 35,
          spread: 55,
          origin: { y: 0.8 },
          colors: ['#0d9488', '#10b981', '#06b6d4'],
        });
      } catch {
        // Safe fallback
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingMed(null);
    setFormName('');
    setFormIngredient('');
    setFormForm('tablet');
    setFormDosage('1/2 tabletki');
    setFormInstructions('');
    setFormStartDate(todayStr);
    setFormEndDate('');
    setFormIsChronic(true);
    setFormPackageSize('30');
    setFormCurrentStock('');
    setShowAdvancedOptions(false);
    setCustomSlotIds({});
    setFormTimes([
      { id: `t-${Date.now()}-1`, label: 'Rano', time: '08:00', amount: '1/2 tabletki' },
      { id: `t-${Date.now()}-2`, label: 'Wieczór', time: '20:00', amount: '1/2 tabletki' },
    ]);
    setIsAddingMed(true);
  };

  const handleOpenEdit = (med: Medication) => {
    setEditingMed(med);
    setFormName(med.name);
    setFormIngredient(med.activeIngredient || '');
    setFormForm(med.form);
    setFormDosage(med.dosage);
    setFormInstructions(med.instructions || '');
    setFormStartDate(med.startDate);
    setFormEndDate(med.endDate || '');
    setFormIsChronic(med.isChronic);
    setFormPackageSize(med.packageSize ? String(med.packageSize) : '30');
    setFormCurrentStock(med.currentStock !== undefined ? String(med.currentStock) : '');
    setFormTimes([...med.timesOfDay]);
    setShowAdvancedOptions(Boolean(med.currentStock !== undefined || med.instructions || med.endDate || !med.isChronic));

    const cfg = MEDICATION_TYPE_OPTIONS.find(o => o.form === med.form) || MEDICATION_TYPE_OPTIONS[0];
    const initialCustom: Record<string, boolean> = {};
    med.timesOfDay.forEach(slot => {
      if (!cfg.presets.some(p => p.value === slot.amount)) {
        initialCustom[slot.id] = true;
      }
    });
    setCustomSlotIds(initialCustom);

    setIsAddingMed(true);
  };

  const handleSelectMedicationForm = (newForm: Medication['form']) => {
    setFormForm(newForm);
    const cfg = MEDICATION_TYPE_OPTIONS.find(o => o.form === newForm) || MEDICATION_TYPE_OPTIONS[0];
    const newDose = cfg.defaultDose;
    setFormDosage(newDose);
    setCustomSlotIds({});
    setFormTimes(prev => prev.map(slot => ({
      ...slot,
      amount: newDose,
    })));

    if (newForm === 'liquid') {
      setFormPackageSize('100');
    } else if (newForm === 'drops') {
      setFormPackageSize('100');
    } else if (newForm === 'capsule' || newForm === 'tablet') {
      setFormPackageSize('30');
    }
  };

  const handleAddTimeSlot = (defaultLabel = 'Południe', defaultTime = '13:00') => {
    const activeCfg = MEDICATION_TYPE_OPTIONS.find(o => o.form === formForm) || MEDICATION_TYPE_OPTIONS[0];
    setFormTimes(prev => [
      ...prev,
      {
        id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
        label: defaultLabel,
        time: defaultTime,
        amount: formDosage || activeCfg.defaultDose,
      }
    ]);
  };

  const handleRemoveTimeSlot = (id: string) => {
    setFormTimes(prev => prev.filter(t => t.id !== id));
    setCustomSlotIds(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleUpdateTimeSlot = (id: string, field: keyof DoseScheduleItem, val: string) => {
    setFormTimes(prev => prev.map(t => t.id === id ? { ...t, [field]: val } : t));
  };

  // Quick preset applicator for a specific time slot or all slots
  const applyPresetToSlot = (slotId: string, presetVal: string) => {
    handleUpdateTimeSlot(slotId, 'amount', presetVal);
    setCustomSlotIds(prev => ({ ...prev, [slotId]: false }));
  };

  const applyPresetToAllSlots = (presetVal: string) => {
    setFormDosage(presetVal);
    setFormTimes(prev => prev.map(t => ({ ...t, amount: presetVal })));
    setCustomSlotIds({});
  };

  // Preview calculation in the form
  const formDailyTotal = formTimes.reduce((sum, slot) => sum + parseDoseToNumber(slot.amount), 0);
  const formMonthlyDemand = Math.round(formDailyTotal * 30 * 10) / 10;
  const parsedPackageSize = parseFloat(formPackageSize);
  const formPackagesMonthly = parsedPackageSize > 0 
    ? Math.ceil(formMonthlyDemand / parsedPackageSize) 
    : null;


  const handleSaveMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (formTimes.length === 0) {
      alert('Dodaj co najmniej jedną porę dnia dla tego leku.');
      return;
    }

    const pkgSize = formPackageSize ? parseFloat(formPackageSize) : undefined;
    const curStock = formCurrentStock !== '' ? parseFloat(formCurrentStock) : undefined;

    if (editingMed) {
      const updated = medications.map(m => {
        if (m.id === editingMed.id) {
          return {
            ...m,
            name: formName.trim(),
            activeIngredient: formIngredient.trim() || undefined,
            form: formForm,
            dosage: formDosage.trim(),
            instructions: formInstructions.trim() || undefined,
            startDate: formStartDate,
            endDate: formEndDate ? formEndDate : undefined,
            isChronic: formIsChronic,
            packageSize: pkgSize,
            currentStock: curStock,
            timesOfDay: formTimes,
          };
        }
        return m;
      });
      onUpdateMedications(updated);
    } else {
      const newMed: Medication = {
        id: `med-${Date.now()}`,
        petId: pet.id,
        name: formName.trim(),
        activeIngredient: formIngredient.trim() || undefined,
        form: formForm,
        dosage: formDosage.trim() || '1 dawka',
        instructions: formInstructions.trim() || undefined,
        startDate: formStartDate,
        endDate: formEndDate ? formEndDate : undefined,
        isChronic: formIsChronic,
        isActive: true,
        packageSize: pkgSize,
        currentStock: curStock,
        timesOfDay: formTimes,
      };
      onUpdateMedications([...medications, newMed]);
    }

    setIsAddingMed(false);
  };

  const handleDeleteMedication = (med: Medication) => {
    setMedicationToDelete(med);
  };

  const confirmDeleteMedication = () => {
    if (!medicationToDelete) return;
    storage.deleteMedication(medicationToDelete.id);
    const updated = medications.filter(m => m.id !== medicationToDelete.id);
    onUpdateMedications(updated);
    if (editingMed?.id === medicationToDelete.id) {
      setIsAddingMed(false);
      setEditingMed(null);
    }
    setMedicationToDelete(null);
  };

  const handleToggleActiveMedication = (med: Medication) => {
    const updated = medications.map(m => m.id === med.id ? { ...m, isActive: !m.isActive } : m);
    onUpdateMedications(updated);
  };

  // Google Calendar integration
  const handleAddToGoogleCalendar = (med: Medication, slot?: DoseScheduleItem) => {
    const timeToUse = slot?.time || med.timesOfDay[0]?.time || '08:00';
    const amountToUse = slot?.amount || med.dosage;
    const event = buildMedicationCalendarEvent(
      pet.name,
      med.name,
      amountToUse,
      timeToUse,
      med.instructions,
      true
    );
    const url = createGoogleCalendarUrl(event);
    window.open(url, '_blank');
  };

  // Phone Calendar (.ics) integration
  const handleDownloadPhoneCalendar = (med: Medication, slot?: DoseScheduleItem) => {
    const events = (slot ? [slot] : med.timesOfDay).map(s => 
      buildMedicationCalendarEvent(pet.name, med.name, s.amount, s.time, med.instructions, true)
    );
    const filename = `Lek_${pet.name}_${med.name.replace(/\s+/g, '_')}`;
    downloadICalendarFile(filename, events);
  };

  if (isAddingMed) {
    const activeCfg = MEDICATION_TYPE_OPTIONS.find(o => o.form === formForm) || MEDICATION_TYPE_OPTIONS[0];
    const currentUnitLabel = getMedicationUnitLabel(formForm, formMonthlyDemand);

    return (
      <div className="w-full bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 animate-fadeIn">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">{activeCfg.icon}</span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                {editingMed ? 'Edytuj lek' : 'Dodaj nowy lek'}
              </h3>
              <span className="text-[10px] text-teal-700 font-semibold">
                {activeCfg.label} • {activeCfg.defaultDose}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingMed(false)}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full font-bold text-xs"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSaveMedication} className="space-y-2.5 text-xs">
          {/* Row 1: Nazwa i Postać */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-0.5 text-[11px]">
                Nazwa leku lub suplementu *
              </label>
              <input
                type="text"
                required
                placeholder="np. Melosus, Cardisure, Apoquel"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-teal-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-0.5 text-[11px]">
                Postać leku
              </label>
              <select
                value={formForm}
                onChange={(e) => handleSelectMedicationForm(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-teal-800"
              >
                {MEDICATION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.form} value={opt.form}>
                    {opt.icon} {opt.label} ({opt.defaultDose})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Dawka i pory podawania */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                  Pory i dawkowanie leku
                </span>
                <span className="text-[11px] text-teal-800 font-semibold">
                  Wybierz dawkę z listy lub kliknij szybki przycisk poniżej
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddTimeSlot('Rano', '08:00')}
                  className="px-2 py-1 rounded-lg bg-white border border-teal-300 text-teal-800 text-xs font-bold hover:bg-teal-50 active:scale-95 transition"
                >
                  + Rano
                </button>
                <button
                  type="button"
                  onClick={() => handleAddTimeSlot('Wieczór', '20:00')}
                  className="px-2 py-1 rounded-lg bg-white border border-teal-300 text-teal-800 text-xs font-bold hover:bg-teal-50 active:scale-95 transition"
                >
                  + Wieczór
                </button>
              </div>
            </div>

            {/* Quick dosage preset chips (1 tap sets dose for all hours) */}
            {activeCfg.presets && activeCfg.presets.length > 0 && (
              <div className="bg-white/80 p-2 rounded-xl border border-teal-100">
                <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                  ⚡ Szybki wybór dawki (ustawia dla wszystkich pór):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeCfg.presets.map((p) => {
                    const isSelected = formTimes.length > 0 && formTimes.every(t => t.amount === p.value);
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => applyPresetToAllSlots(p.value)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition active:scale-95 shadow-2xs ${
                          isSelected
                            ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-400'
                            : 'bg-white border border-slate-300 text-slate-800 hover:border-teal-400 hover:bg-teal-50'
                        }`}
                        title={`Ustaw dawkę ${p.value}`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {formTimes.map((slot) => {
                const isPreset = activeCfg.presets.some(p => p.value === slot.amount);
                const isCustomMode = customSlotIds[slot.id] || !isPreset;

                return (
                  <div
                    key={slot.id}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Pora"
                        value={slot.label}
                        onChange={(e) => handleUpdateTimeSlot(slot.id, 'label', e.target.value)}
                        className="w-20 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800"
                      />
                      <input
                        type="time"
                        value={slot.time}
                        onChange={(e) => handleUpdateTimeSlot(slot.id, 'time', e.target.value)}
                        className="w-24 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-extrabold text-teal-800"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      {isCustomMode ? (
                        <div className="flex-1 min-w-0 flex items-center gap-1.5 animate-fadeIn">
                          <input
                            type="text"
                            placeholder="Wpisz dawkę, np. 1/8, 0.7 ml..."
                            value={slot.amount}
                            onChange={(e) => handleUpdateTimeSlot(slot.id, 'amount', e.target.value)}
                            autoFocus
                            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-white border-2 border-teal-500 text-xs font-bold text-slate-900 focus:outline-teal-600 focus:ring-1 focus:ring-teal-300 shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomSlotIds(prev => ({ ...prev, [slot.id]: false }));
                              handleUpdateTimeSlot(slot.id, 'amount', activeCfg.presets[0]?.value || '1 dawka');
                            }}
                            className="px-2 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-extrabold border border-teal-300 shrink-0 whitespace-nowrap active:scale-95 transition"
                            title="Powrót do wyboru z gotowej listy"
                          >
                            📋 Lista
                          </button>
                        </div>
                      ) : (
                        <select
                          value={isPreset ? slot.amount : '__custom__'}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setCustomSlotIds(prev => ({ ...prev, [slot.id]: true }));
                            } else {
                              handleUpdateTimeSlot(slot.id, 'amount', e.target.value);
                            }
                          }}
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:bg-white focus:border-teal-600"
                        >
                          <optgroup label="Popularne dawki (z listy)">
                            {activeCfg.presets.map((p) => (
                              <option key={p.value} value={p.value}>
                                {p.label} ({p.value})
                              </option>
                            ))}
                          </optgroup>
                          <option value="__custom__">✍️ Wpisz inną dawkę...</option>
                        </select>
                      )}

                      {formTimes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTimeSlot(slot.id)}
                          className="w-7 h-7 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg text-xs font-bold shrink-0 ml-auto"
                          title="Usuń tę porę"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-xl px-3 py-2 border border-teal-200 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <Calculator className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Zapotrzebowanie miesięczne:</span>
                <strong className="text-teal-800 font-extrabold text-sm">
                  {formMonthlyDemand} {currentUnitLabel}
                </strong>
              </span>
              <span className="text-[11px] text-slate-500 font-bold">
                {Math.round(formDailyTotal * 100) / 100} / dzień
              </span>
            </div>
          </div>

          {/* Harmonijka - Więcej opcji */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/60">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="w-full px-3 py-2 text-left font-bold text-slate-700 text-xs flex items-center justify-between hover:bg-slate-100 transition"
            >
              <span>⚙️ Więcej opcji (zapas leków, opakowanie, zalecenia)</span>
              {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAdvancedOptions && (
              <div className="p-3 pt-1 border-t border-slate-200 space-y-2.5 bg-white text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-xs">Wielkość opakowania</label>
                    <input
                      type="number"
                      value={formPackageSize}
                      onChange={(e) => setFormPackageSize(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-xs">Zapas w domu</label>
                    <input
                      type="number"
                      value={formCurrentStock}
                      onChange={(e) => setFormCurrentStock(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-xs">Zalecenia podawania</label>
                  <input
                    type="text"
                    placeholder="np. z jedzeniem, po posiłku, na czczo"
                    value={formInstructions}
                    onChange={(e) => setFormInstructions(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-2">
            {editingMed && (
              <button
                type="button"
                onClick={() => handleDeleteMedication(editingMed)}
                className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition"
              >
                Usuń
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsAddingMed(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-98"
            >
              {editingMed ? 'Zapisz zmiany' : 'Zapisz lek'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 animate-fadeIn">
      {/* Top Banner with Today's Tracker */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white rounded-3xl p-5 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-teal-200">
              Harmonogram na dziś
            </span>
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <Pill className="w-5 h-5 text-teal-300" />
              Dawkowanie Leków: {pet.name}
            </h2>
            <p className="text-xs text-teal-100 mt-0.5">
              {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-2 bg-white text-teal-800 hover:bg-teal-50 rounded-2xl text-xs font-bold shadow active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            Dodaj lek
          </button>
        </div>

        {/* Interactive Today Doses Checklist */}
        {dailySlots.length === 0 ? (
          <div className="bg-white/10 rounded-2xl p-4 text-center text-xs text-teal-100">
            Brak zaplanowanych leków na dzisiaj. Kliknij „Dodaj lek”, aby utworzyć harmonogram!
          </div>
        ) : (
          <div className="space-y-2">
            {dailySlots.map(({ medication, slot }) => {
              const completed = isDoseTaken(medication.id, slot.time);

              return (
                <div
                  key={`${medication.id}-${slot.time}`}
                  onClick={() => handleToggleDose(medication, slot)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition select-none ${
                    completed
                      ? 'bg-emerald-900/40 border border-emerald-400/40 text-emerald-100'
                      : 'bg-white/15 hover:bg-white/20 border border-white/10 text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition ${
                        completed
                          ? 'bg-emerald-400 text-teal-950 font-bold shadow'
                          : 'border-2 border-white/50 text-transparent hover:border-white'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getMedicationIcon(medication.form)}</span>
                        <span className={`font-bold text-sm ${completed ? 'line-through opacity-80' : ''}`}>
                          {medication.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-semibold">
                          {slot.label} ({slot.time})
                        </span>
                      </div>
                      <p className="text-xs text-teal-100">
                        Dawka: <strong>{slot.amount}</strong>
                        {medication.instructions && ` • ${medication.instructions}`}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold shrink-0">
                    {completed ? 'Podano ✓' : 'Do podania'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Global Monthly Summary Calculator Header */}
      {activeMeds.length > 0 && (
        <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base">Miesięczne Zapotrzebowanie na Leki</h3>
                <p className="text-[11px] text-slate-400">Automatyczne przeliczenie dawek (tabletki, syropy, krople)</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {activeMeds.map((med) => {
              const demand = calculateMedicationDemand(med);
              const unitWord = getMedicationUnitLabel(med.form, demand.monthlyUnits);

              return (
                <div key={med.id} className="bg-slate-800/80 border border-slate-700/70 p-3 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                        <span>{getMedicationIcon(med.form)}</span>
                        <span>{med.name}</span>
                      </span>
                      <span className="text-[11px] text-teal-400 font-semibold">
                        {med.timesOfDay.map(t => `${t.label}: ${t.amount}`).join(' + ')}
                      </span>
                    </div>
                    <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-medium">
                      {demand.dailyUnits} {unitWord}/dzień
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Potrzeba na 30 dni:</span>
                    <strong className="text-emerald-400 font-extrabold text-sm">
                      {demand.monthlyUnits} {unitWord}
                      {demand.packagesNeededMonthly && (
                        <span className="text-slate-300 font-normal text-[11px] ml-1">
                          (~{demand.packagesNeededMonthly} op.)
                        </span>
                      )}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Medications List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span>Aktywne kuracje i leki</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold">
              {activeMeds.length}
            </span>
          </h3>
          <span className="text-xs text-slate-400">Synchronizuj z kalendarzem</span>
        </div>

        {activeMeds.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-500">
            <Pill className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-sm text-slate-700">Brak aktywnych leków</p>
            <p className="text-xs text-slate-400 mt-1">
              Dodaj leki z dawkowaniem (np. tabletki, syropy, krople), a kalkulator wyliczy zapotrzebowanie.
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow"
            >
              Dodaj pierwszy lek
            </button>
          </div>
        ) : (
          activeMeds.map((med) => {
            const demand = calculateMedicationDemand(med);
            const unitLabel = getMedicationUnitLabel(med.form, demand.monthlyUnits);

            return (
              <div
                key={med.id}
                className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {getMedicationIcon(med.form)}
                      </span>
                      <h4 className="font-bold text-slate-900 text-base">{med.name}</h4>
                    </div>
                    {med.activeIngredient && (
                      <p className="text-xs text-slate-400">Substancja: {med.activeIngredient}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(med)}
                      title="Edytuj lek"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMedication(med)}
                      title="Usuń lek"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Doses breakdown */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pory i dawki</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {med.timesOfDay.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                      >
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          {slot.label}: <strong>{slot.time}</strong>
                        </span>
                        <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                          {slot.amount}
                        </span>
                      </div>
                    ))}
                  </div>

                  {med.instructions && (
                    <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Zalecenia: <strong>{med.instructions}</strong></span>
                    </p>
                  )}
                </div>

                {/* Monthly Calculator Highlight Pill */}
                <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-teal-600 text-white rounded-xl shadow-xs">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-teal-800 tracking-wider block">
                        Zapotrzebowanie na 30 dni (1 miesiąc)
                      </span>
                      <p className="text-xs text-teal-900 font-medium">
                        Dzienne zużycie: <strong>{demand.dailyUnits} {unitLabel}/dzień</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-base sm:text-lg font-black text-teal-900 tracking-tight">
                      {demand.monthlyUnits} <span className="text-xs font-semibold text-teal-700">{unitLabel}</span>
                    </div>
                    {demand.packagesNeededMonthly && (
                      <span className="text-[11px] text-teal-700 block font-medium">
                        Potrzebne: <strong>{demand.packagesNeededMonthly}</strong> {demand.packagesNeededMonthly === 1 ? 'opakowanie' : demand.packagesNeededMonthly < 5 ? 'opakowania' : 'opakowań'} ({med.packageSize} szt.)
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock alert if entered */}
                {demand.daysLeftWithStock !== undefined && (
                  <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    demand.daysLeftWithStock <= 5 
                      ? 'bg-rose-50 border-rose-200 text-rose-800' 
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Package className="w-3.5 h-3.5" />
                      Zapas w domu: <strong>{med.currentStock} {unitLabel}</strong>
                    </span>
                    <span className="font-bold">
                      Wystarczy na: ~{demand.daysLeftWithStock} {demand.daysLeftWithStock === 1 ? 'dzień' : 'dni'}
                    </span>
                  </div>
                )}

                {/* Treatment details */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>
                    {med.isChronic ? 'Kuracja stała / przewlekła' : `Kuracja do: ${med.endDate || 'zakończenia objawów'}`}
                  </span>
                  <span>Rozpoczęto: {med.startDate}</span>
                </div>

                {/* Calendar Integration Bar */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <CalendarIcon className="w-4 h-4 text-teal-600" />
                    <span>Dodaj do kalendarza:</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Google Calendar */}
                    <button
                      onClick={() => handleAddToGoogleCalendar(med)}
                      title="Dodaj powiadomienie do Kalendarza Google"
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Google Kalendarz
                    </button>

                    {/* Phone Calendar (.ics) */}
                    <button
                      onClick={() => handleDownloadPhoneCalendar(med)}
                      title="Pobierz plik przypomnienia do kalendarza w telefonie (.ics)"
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-semibold transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Kalendarz w telefonie (.ics)
                    </button>

                    {/* Quick Delete */}
                    <button
                      onClick={() => handleDeleteMedication(med)}
                      title="Usuń ten lek z listy"
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-semibold transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Usuń lek</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Archived / Past Medications */}
      {archivedMeds.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Zakończone terapie ({archivedMeds.length})
          </h4>
          {archivedMeds.map((med) => (
            <div
              key={med.id}
              className="bg-white/60 p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs text-slate-600"
            >
              <div>
                <span className="font-semibold text-slate-700">{med.name}</span>
                <span className="text-slate-400 ml-2">({med.dosage})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActiveMedication(med)}
                  className="text-xs text-teal-700 hover:underline font-semibold"
                >
                  Wznów podawanie
                </button>
                <button
                  onClick={() => handleDeleteMedication(med)}
                  title="Usuń lek trwale"
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Delete Confirmation Modal */}
      {medicationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-center text-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Usunąć lek „{medicationToDelete.name}”?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Lek oraz wszystkie powiązane z nim pory i wpisy dawkowania zostaną trwale usunięte z aplikacji.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMedicationToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={confirmDeleteMedication}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Tak, usuń lek
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
