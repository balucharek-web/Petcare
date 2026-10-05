import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  X, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  Bug, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Pill, 
  ExternalLink,
  Info,
  Sparkles,
  ChevronRight,
  Download
} from 'lucide-react';
import { Pet, ParasiteProtection, ParasiteType, ParasiteForm } from '../types/pet';
import { storage } from '../services/storage';
import { createGoogleCalendarUrl, downloadICalendarFile, buildParasiteCalendarEvent } from '../services/calendar';

interface ParasiteProtectionModalProps {
  pet: Pet;
  isOpen: boolean;
  onClose: () => void;
  onProtectionUpdated?: () => void;
}

// Preset database of popular vet products with guaranteed duration
interface ProductPreset {
  name: string;
  type: ParasiteType;
  form: ParasiteForm;
  durationDays: number;
  durationLabel: string;
  notes: string;
}

const PRESET_PRODUCTS: ProductPreset[] = [
  // Ticks & Fleas
  { name: 'Foresto', type: 'tick_flea', form: 'collar', durationDays: 240, durationLabel: '8 miesięcy', notes: 'Obroża wodoodporna przeciw kleszczom i pchłom' },
  { name: 'Bravecto (tabletka)', type: 'tick_flea', form: 'tablet', durationDays: 84, durationLabel: '12 tygodni (3 mies.)', notes: 'Smaczna tabletka do rozgryzania, szybkie działanie' },
  { name: 'Bravecto Plus (krople)', type: 'tick_flea', form: 'spot_on', durationDays: 84, durationLabel: '12 tygodni', notes: 'Krople spot-on dla kotów (kleszcze + świerzbowiec)' },
  { name: 'Simparica / Simparica Trio', type: 'tick_flea', form: 'tablet', durationDays: 35, durationLabel: '5 tygodni', notes: 'Tabletka przeciw kleszczom, pchłom i świerzbowcom' },
  { name: 'NexGard / NexGard Spectra', type: 'tick_flea', form: 'tablet', durationDays: 28, durationLabel: '4 tygodnie', notes: 'Tabletka do żucia przeciw kleszczom i pasożytom jelitowym' },
  { name: 'Credelio', type: 'tick_flea', form: 'tablet', durationDays: 30, durationLabel: '1 miesiąc', notes: 'Mała tabletka smakowa dla psów i kotów' },
  { name: 'Advantix', type: 'tick_flea', form: 'spot_on', durationDays: 28, durationLabel: '4 tygodnie', notes: 'Krople na skórę (działa odstraszająco na kleszcze)' },
  { name: 'Fypryst / Frontline Combo', type: 'tick_flea', form: 'spot_on', durationDays: 28, durationLabel: '4 tygodnie', notes: 'Klasyczne krople spot-on przeciw pchłom i kleszczom' },
  { name: 'Vectra 3D', type: 'tick_flea', form: 'spot_on', durationDays: 30, durationLabel: '1 miesiąc', notes: 'Krople o silnym działaniu odstraszającym (tylko psy!)' },

  // Deworming (Endoparasites)
  { name: 'Milprazon / Milbemax', type: 'deworming', form: 'tablet', durationDays: 90, durationLabel: '3 miesiące (kwartał)', notes: 'Szerokie spektrum przeciw nicieniom i tasiemcom' },
  { name: 'Drontal / Drontal Plus', type: 'deworming', form: 'tablet', durationDays: 90, durationLabel: '3 miesiące', notes: 'Klasyczna tabletka odrobaczająca w kształcie kostki' },
  { name: 'Dehinel Plus / Dehinel', type: 'deworming', form: 'tablet', durationDays: 90, durationLabel: '3 miesiące', notes: 'Skuteczny preparat na tasiemce i nicienie' },
  { name: 'Cestal Plus Flavour', type: 'deworming', form: 'tablet', durationDays: 90, durationLabel: '3 miesiące', notes: 'Aromatyzowane tabletki odrobaczające' },
  { name: 'Profender (kot)', type: 'deworming', form: 'spot_on', durationDays: 90, durationLabel: '3 miesiące', notes: 'Krople na kark bezstresowe dla kotów' },
  { name: 'Panacur (fenbendazol)', type: 'deworming', form: 'paste', durationDays: 90, durationLabel: '3 miesiące', notes: 'Pasta/tabletki, polecane także przy lambliach' },
];

export const ParasiteProtectionModal: React.FC<ParasiteProtectionModalProps> = ({
  pet,
  isOpen,
  onClose,
  onProtectionUpdated
}) => {
  const [protections, setProtections] = useState<ParasiteProtection[]>(() => 
    storage.getParasites(pet.id)
  );

  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [selectedType, setSelectedType] = useState<ParasiteType>('tick_flea');
  const [productName, setProductName] = useState('');
  const [form, setForm] = useState<ParasiteForm>('tablet');
  const [applicationDate, setApplicationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationDays, setDurationDays] = useState(84); // default ~12 weeks
  const [vetClinic, setVetClinic] = useState(pet.vetClinicName || '');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  // Compute calculated valid until date
  const calculatedValidUntil = useMemo(() => {
    try {
      const d = new Date(applicationDate);
      d.setDate(d.getDate() + Number(durationDays));
      return d.toISOString().slice(0, 10);
    } catch {
      return applicationDate;
    }
  }, [applicationDate, durationDays]);

  // Current Active Protections analysis
  const todayStr = new Date().toISOString().slice(0, 10);

  const latestTickFlea = useMemo(() => {
    const list = protections
      .filter(p => p.type === 'tick_flea')
      .sort((a, b) => b.validUntil.localeCompare(a.validUntil));
    return list[0] || null;
  }, [protections]);

  const latestDeworming = useMemo(() => {
    const list = protections
      .filter(p => p.type === 'deworming')
      .sort((a, b) => b.validUntil.localeCompare(a.validUntil));
    return list[0] || null;
  }, [protections]);

  // Calculate days remaining
  const calculateDaysLeft = (validUntil: string) => {
    const diffMs = new Date(validUntil).getTime() - new Date(todayStr).getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  // Seasonal tick activity for Poland & Central Europe
  const currentMonth = new Date().getMonth(); // 0 = Jan, 9 = Oct
  const tickSeasonData = useMemo(() => {
    if (currentMonth >= 2 && currentMonth <= 5) {
      return {
        level: 'Ekstremalna (Szczyt Wiosenny)',
        badgeColor: 'bg-red-500 text-white',
        desc: 'Szczyt aktywności kleszczy pospolitych i łąkowych. Zagrożenie babeszjozą i boreliozą!',
        alert: true,
      };
    } else if (currentMonth >= 6 && currentMonth <= 7) {
      return {
        level: 'Wysoka',
        badgeColor: 'bg-amber-500 text-white',
        desc: 'Wysoka aktywność w lasach, na łąkach i w parkach miejskich. Wymagana stała ochrona.',
        alert: false,
      };
    } else if (currentMonth >= 8 && currentMonth <= 10) {
      return {
        level: 'Bardzo Wysoka (Szczyt Jesienny)',
        badgeColor: 'bg-orange-600 text-white',
        desc: 'Jesienny szczyt kleszczy łąkowych (przenoszą śmiertelną dla psów babeszjozę). Kleszcze żerują aż do przymrozków!',
        alert: true,
      };
    } else {
      return {
        level: 'Niska do Umiarkowanej',
        badgeColor: 'bg-emerald-600 text-white',
        desc: 'Kleszcze hibernują, lecz budzą się już przy temperaturze powyżej +4°C (np. w cieplejsze zimowe dni).',
        alert: false,
      };
    }
  }, [currentMonth]);

  const handleSelectPreset = (preset: ProductPreset) => {
    setProductName(preset.name);
    setSelectedType(preset.type);
    setForm(preset.form);
    setDurationDays(preset.durationDays);
    if (!notes) setNotes(preset.notes);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      alert('Podaj nazwę preparatu');
      return;
    }

    const newRecord: ParasiteProtection = {
      id: `par-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      petId: pet.id,
      type: selectedType,
      productName: productName.trim(),
      form,
      dateAdministered: applicationDate,
      durationDays: Number(durationDays),
      validUntil: calculatedValidUntil,
      vetClinic: vetClinic.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    storage.saveParasite(newRecord);
    const updated = storage.getParasites(pet.id);
    setProtections(updated);
    setIsAdding(false);
    setProductName('');
    setNotes('');

    if (onProtectionUpdated) onProtectionUpdated();
  };

  const handleDelete = (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć ten wpis o ochronie?')) {
      storage.deleteParasite(id);
      const updated = storage.getParasites(pet.id);
      setProtections(updated);
      if (onProtectionUpdated) onProtectionUpdated();
    }
  };

  // Google Calendar integration
  const handleOpenGoogleCalendar = (item: ParasiteProtection) => {
    const payload = buildParasiteCalendarEvent(pet.name, item.productName, item.type, item.validUntil, item.form);
    const url = createGoogleCalendarUrl(payload);
    window.open(url, '_blank');
  };

  const handleDownloadIcs = (item: ParasiteProtection) => {
    const payload = buildParasiteCalendarEvent(pet.name, item.productName, item.type, item.validUntil, item.form);
    downloadICalendarFile(`Ochrona_${pet.name}_${item.productName}`, [payload]);
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                Inteligentna Profilaktyka
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
                Kleszcze & Odrobaczanie
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                Pupil: <strong className="text-white">{pet.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition text-white/80 hover:text-white" aria-label="Zamknij">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">

          {/* Seasonal Tick Alert Box */}
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
              <Bug className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  Radar Aktywności Kleszczy:
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${tickSeasonData.badgeColor}`}>
                  {tickSeasonData.level}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {tickSeasonData.desc}
              </p>
            </div>
          </div>

          {/* Active Protection Status Shield Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Ticks & Fleas Status */}
            {(() => {
              const daysLeft = latestTickFlea ? calculateDaysLeft(latestTickFlea.validUntil) : -999;
              const isProtected = latestTickFlea && daysLeft >= 0;
              const isWarning = isProtected && daysLeft <= 7;

              return (
                <div className={`p-4 rounded-2xl border transition-all ${
                  isProtected
                    ? isWarning
                      ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
                      : 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                    : 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Bug className="w-3.5 h-3.5" />
                      Kleszcze & Pchły
                    </span>
                    {isProtected ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                        isWarning ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                      }`}>
                        {isWarning ? `Kończy się (${daysLeft} dni)` : 'Chroniony'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-600 text-white">
                        Brak ochrony!
                      </span>
                    )}
                  </div>

                  {latestTickFlea ? (
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {latestTickFlea.productName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Ważne do: <strong className="text-slate-700 dark:text-slate-200">{latestTickFlea.validUntil}</strong>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {daysLeft > 0 ? (
                          <span>Pozostało jeszcze <strong>{daysLeft} dni</strong> aktywnego działania.</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            Ochrona wygasła {Math.abs(daysLeft)} dni temu! Podaj nową dawkę.
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                      Brak zarejestrowanego preparatu. Zarejestruj dawkę, aby chronić pupila przed chorobami odkleszczowymi.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Deworming Status */}
            {(() => {
              const daysLeft = latestDeworming ? calculateDaysLeft(latestDeworming.validUntil) : -999;
              const isProtected = latestDeworming && daysLeft >= 0;
              const isWarning = isProtected && daysLeft <= 14;

              return (
                <div className={`p-4 rounded-2xl border transition-all ${
                  isProtected
                    ? isWarning
                      ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
                      : 'bg-teal-50/80 dark:bg-teal-950/20 border-teal-300 dark:border-teal-800/60'
                    : 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5" />
                      Odrobaczanie
                    </span>
                    {isProtected ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                        isWarning ? 'bg-amber-500 text-white' : 'bg-teal-600 text-white'
                      }`}>
                        {isWarning ? `Termin blisko` : 'Aktualne'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-600 text-white">
                        Do wykonania!
                      </span>
                    )}
                  </div>

                  {latestDeworming ? (
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {latestDeworming.productName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Kolejne: <strong className="text-slate-700 dark:text-slate-200">{latestDeworming.validUntil}</strong>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {daysLeft > 0 ? (
                          <span>Kolejne zalecane za <strong>{daysLeft} dni</strong>.</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            Zalecany termin minął {Math.abs(daysLeft)} dni temu!
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                      Brak wpisu o odrobaczaniu. Standardowo zaleca się powtarzanie co 3 miesiące.
                    </div>
                  )}
                </div>
              );
            })()}

          </div>

          {/* Action Button: Add Dose */}
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 text-sm transition"
            >
              <Plus className="w-5 h-5" />
              Zarejestruj podanie preparatu (Kleszcze / Odrobaczanie)
            </button>
          )}

          {/* Add Form */}
          {isAdding && (
            <form onSubmit={handleSave} className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Nowa dawka preparatu
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Anuluj
                </button>
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Rodzaj profilaktyki
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setSelectedType('tick_flea'); setDurationDays(84); }}
                    className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                      selectedType === 'tick_flea'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Bug className="w-4 h-4" />
                    Kleszcze & Pchły
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedType('deworming'); setDurationDays(90); }}
                    className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                      selectedType === 'deworming'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Pill className="w-4 h-4" />
                    Odrobaczanie
                  </button>
                </div>
              </div>

              {/* Quick Preset Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Szybki wybór popularnego preparatu (1-klik):
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  {PRESET_PRODUCTS.filter(p => p.type === selectedType).map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`text-xs py-1 px-2.5 rounded-lg border font-semibold transition ${
                        productName === p.name
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-400 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {p.name} ({p.durationLabel})
                    </button>
                  ))}
                </div>
              </div>

              {/* Product name & Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="parasite-field-1" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nazwa preparatu *
                  </label>
                  <input id="parasite-field-1"
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="np. Bravecto, Foresto, Milprazon"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="parasite-field-2" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Postać preparatu
                  </label>
                  <select id="parasite-field-2"
                    value={form}
                    onChange={(e) => setForm(e.target.value as ParasiteForm)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="tablet">Tabletka</option>
                    <option value="collar">Obroża</option>
                    <option value="spot_on">Krople (Spot-on)</option>
                    <option value="paste">Pasta</option>
                    <option value="spray">Spray</option>
                    <option value="other">Inna</option>
                  </select>
                </div>
              </div>

              {/* Dates & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="parasite-field-3" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data podania
                  </label>
                  <input id="parasite-field-3"
                    type="date"
                    required
                    value={applicationDate}
                    onChange={(e) => setApplicationDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="parasite-field-4" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Czas ochrony (dni)
                  </label>
                  <input id="parasite-field-4"
                    type="number"
                    min="1"
                    max="365"
                    required
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kolejne podanie:
                  </label>
                  <div className="w-full px-3 py-2 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-extrabold flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {calculatedValidUntil}
                  </div>
                </div>
              </div>

              {/* Optional clinic & notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="parasite-field-5" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Gabinet / Lekarz (opcjonalnie)
                  </label>
                  <input id="parasite-field-5"
                    type="text"
                    value={vetClinic}
                    onChange={(e) => setVetClinic(e.target.value)}
                    placeholder="np. Przychodnia Weterynaryjna"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="parasite-field-6" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notatki (np. waga pupila, samopoczucie)
                  </label>
                  <input id="parasite-field-6"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="np. Podano po jedzeniu, bez problemu"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                >
                  Zapisz i ustaw przypomnienie
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="py-2.5 px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-300 transition"
                >
                  Anuluj
                </button>
              </div>
            </form>
          )}

          {/* History of Protections */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Historia Podań ({protections.length})</span>
              <span className="text-xs font-normal lowercase">posortowane od najnowszych</span>
            </h3>

            {protections.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-4">
                <ShieldCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Brak wpisów o podaniu preparatów. Dodaj pierwszy preparat powyżej!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {protections.map((item) => {
                  const daysLeft = calculateDaysLeft(item.validUntil);
                  const isExpired = daysLeft < 0;

                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-extrabold ${
                            item.type === 'tick_flea'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                          }`}>
                            {item.type === 'tick_flea' ? 'Kleszcze & Pchły' : 'Odrobaczanie'}
                          </span>
                          <strong className="text-sm text-slate-900 dark:text-white font-extrabold">
                            {item.productName}
                          </strong>
                          <span className="text-slate-400 text-xs">({item.form})</span>
                        </div>

                        <div className="text-slate-600 dark:text-slate-300 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Podano: <strong>{item.dateAdministered}</strong></span>
                          <span>•</span>
                          <span>
                            Ważne do: <strong className={isExpired ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>{item.validUntil}</strong>
                          </span>
                          <span>•</span>
                          <span className={isExpired ? 'text-rose-500 font-semibold' : 'text-slate-500'}>
                            {isExpired ? `Wygasło (${Math.abs(daysLeft)} dni temu)` : `Aktywne (jeszcze ${daysLeft} dni)`}
                          </span>
                        </div>

                        {item.notes && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                            {item.notes}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleOpenGoogleCalendar(item)}
                          title="Dodaj termin ponownego podania do Kalendarza Google"
                          className="p-1.5 px-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 flex items-center gap-1 font-bold text-xs transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Google Cal</span>
                        </button>

                        <button
                          onClick={() => handleDownloadIcs(item)}
                          title="Pobierz termin do kalendarza w telefonie (.ics)"
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(item.id)}
                          title="Usuń wpis"
                          className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-extrabold rounded-xl transition"
          >
            Zamknij
          </button>
        </div>

      </div>
    </div>
  );
};
