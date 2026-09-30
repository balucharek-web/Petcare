import React, { useState, useMemo } from 'react';
import { 
  X, 
  History, 
  Calendar, 
  Syringe, 
  Stethoscope, 
  Pill, 
  FileHeart, 
  Scale, 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Pet, Vaccination, MedicalExam, MedicalCondition, VetVisit, Medication } from '../types/pet';

interface HealthTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  vaccinations: Vaccination[];
  exams: MedicalExam[];
  visits: VetVisit[];
  medications: Medication[];
}

type TimelineCategory = 'all' | 'vaccine' | 'exam' | 'visit' | 'med' | 'weight';

interface TimelineEvent {
  id: string;
  date: string;
  type: 'vaccine' | 'exam' | 'visit' | 'med' | 'weight';
  title: string;
  subtitle?: string;
  details?: string;
  clinic?: string;
  badge?: string;
  statusColor: 'emerald' | 'blue' | 'purple' | 'amber' | 'indigo' | 'rose';
  attachmentCount?: number;
}

export const HealthTimelineModal: React.FC<HealthTimelineModalProps> = ({
  isOpen,
  onClose,
  pet,
  vaccinations,
  exams,
  visits,
  medications
}) => {
  const [selectedFilter, setSelectedFilter] = useState<TimelineCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Build unified chronological event list
  const events = useMemo<TimelineEvent[]>(() => {
    const list: TimelineEvent[] = [];

    // 1. Vaccinations
    vaccinations.filter(v => v.petId === pet.id).forEach(v => {
      list.push({
        id: `vac_${v.id}`,
        date: v.dateAdministered,
        type: 'vaccine',
        title: v.name,
        subtitle: `Szczepienie / Profilaktyka • Ważne do: ${v.validUntil}`,
        details: v.notes || (v.batchNumber ? `Nr serii: ${v.batchNumber}` : undefined),
        clinic: v.vetClinic,
        badge: v.category === 'deworming' ? 'Odrobaczenie' : v.category === 'antiparasitic' ? 'Pasożyty/Kleszcze' : 'Szczepienie',
        statusColor: 'emerald',
        attachmentCount: v.attachmentUrls?.length
      });
    });

    // 2. Exams
    exams.filter(e => e.petId === pet.id).forEach(e => {
      list.push({
        id: `exam_${e.id}`,
        date: e.date,
        type: 'exam',
        title: e.title,
        subtitle: `Badanie diagnostyczne (${e.category})`,
        details: e.summary,
        clinic: e.clinic,
        badge: e.status === 'normal' ? 'Norma' : e.status === 'attention' ? 'Uwaga' : 'Nieprawidłowe',
        statusColor: e.status === 'normal' ? 'blue' : e.status === 'attention' ? 'amber' : 'rose',
        attachmentCount: e.scans?.length
      });
    });

    // 3. Vet Visits
    visits.filter(v => v.petId === pet.id).forEach(v => {
      list.push({
        id: `visit_${v.id}`,
        date: v.date,
        type: 'visit',
        title: v.reason || 'Wizyta w klinice',
        subtitle: v.clinic || 'Klinika weterynaryjna',
        details: v.diagnosis ? `Rozpoznanie: ${v.diagnosis}` : v.treatmentGiven ? `Leczenie: ${v.treatmentGiven}` : undefined,
        clinic: v.doctor ? `Lek. ${v.doctor}` : undefined,
        badge: v.costPln ? `${v.costPln} zł` : 'Wizyta',
        statusColor: 'purple'
      });
    });

    // 4. Medications started
    medications.filter(m => m.petId === pet.id).forEach(m => {
      list.push({
        id: `med_${m.id}`,
        date: m.startDate,
        type: 'med',
        title: `Rozpoczęcie leku: ${m.name}`,
        subtitle: `Dawka: ${m.dosage} (${m.form})`,
        details: m.instructions || (m.isChronic ? 'Terapia przewlekła' : undefined),
        badge: m.isActive ? 'Aktywny' : 'Zakończony',
        statusColor: 'amber'
      });
    });

    // 5. Weight history
    (pet.weightHistory || []).forEach(w => {
      list.push({
        id: `weight_${w.id}`,
        date: w.date,
        type: 'weight',
        title: `Pomiar wagi: ${w.weightKg} kg`,
        subtitle: w.notes || 'Kontrola masy ciała',
        badge: `${w.weightKg} kg`,
        statusColor: 'indigo'
      });
    });

    // Sort by date
    list.sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [pet, vaccinations, exams, visits, medications, sortOrder]);

  // Filtered list
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // Category filter
      if (selectedFilter !== 'all' && e.type !== selectedFilter) return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchSub = e.subtitle?.toLowerCase().includes(q);
        const matchDetails = e.details?.toLowerCase().includes(q);
        const matchClinic = e.clinic?.toLowerCase().includes(q);
        return matchTitle || matchSub || matchDetails || matchClinic;
      }
      return true;
    });
  }, [events, selectedFilter, searchQuery]);

  if (!isOpen) return null;

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'vaccine':
        return <Syringe className="w-4 h-4 text-emerald-600" />;
      case 'exam':
        return <Stethoscope className="w-4 h-4 text-blue-600" />;
      case 'visit':
        return <FileHeart className="w-4 h-4 text-purple-600" />;
      case 'med':
        return <Pill className="w-4 h-4 text-amber-600" />;
      case 'weight':
        return <Scale className="w-4 h-4 text-indigo-600" />;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const eventDate = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Dzisiaj';
      if (diffDays === 1) return 'Wczoraj';
      if (diffDays < 30) return `${diffDays} dni temu`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} mies. temu`;
      return `${Math.floor(diffDays / 365)} lat temu`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900">Oś Czasu Zdrowia</h2>
                <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full text-[10px] font-bold">
                  {pet.name}
                </span>
              </div>
              <p className="text-xs text-gray-500">Wszystkie szczepienia, badania, wizyty i leki w jednym miejscu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar & Search */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/70 space-y-3">
          {/* Search Input & Sort */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Szukaj badania, leku, szczepionki..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:border-teal-500 transition"
              />
            </div>
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="Zmień kierunek sortowania"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-teal-600" />
              <span>{sortOrder === 'desc' ? 'Najnowsze' : 'Najstarsze'}</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {[
              { id: 'all', label: `Wszystko (${events.length})` },
              { id: 'vaccine', label: 'Szczepienia' },
              { id: 'exam', label: 'Badania' },
              { id: 'visit', label: 'Wizyty' },
              { id: 'med', label: 'Leki' },
              { id: 'weight', label: 'Waga' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id as TimelineCategory)}
                className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
                  selectedFilter === f.id
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Events Feed */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/40 flex-1">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <History className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-gray-700">Brak zdarzeń medycznych</p>
              <p className="text-xs text-gray-400">
                {searchQuery ? 'Brak wyników pasujących do wyszukiwania.' : 'Dodaj pierwsze szczepienie, badanie lub wizytę w aplikacji.'}
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
              {filteredEvents.map(event => (
                <div key={event.id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-teal-500 shadow-xs flex items-center justify-center group-hover:scale-110 transition">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                  </div>

                  {/* Event Card */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs hover:shadow-xs hover:border-teal-300 transition-all space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-50 rounded-lg border border-gray-100">
                          {getEventIcon(event.type)}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-extrabold text-gray-900">
                            {event.title}
                          </h4>
                          {event.subtitle && (
                            <p className="text-[11px] text-gray-500 font-medium">
                              {event.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-gray-800 block">
                          {event.date}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatRelativeTime(event.date)}
                        </span>
                      </div>
                    </div>

                    {event.details && (
                      <p className="text-xs text-gray-600 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                        {event.details}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
                      <span>{event.clinic || 'Wpis domowy'}</span>
                      {event.badge && (
                        <span className="px-2 py-0.5 bg-teal-50 text-teal-800 font-bold rounded-md border border-teal-100">
                          {event.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
