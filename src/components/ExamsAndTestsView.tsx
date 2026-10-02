import React, { useState } from 'react';
import { 
  FileSearch, 
  Plus, 
  Paperclip, 
  Eye, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Download, 
  FileText,
  Activity,
  Image as ImageIcon,
  Camera
} from 'lucide-react';
import { Pet, MedicalExam, ExamResultStatus } from '../types/pet';
import { compressImage } from '../utils/imageCompressor';
import { 
  createGoogleCalendarUrl, 
  downloadICalendarFile, 
  CalendarEventPayload 
} from '../services/calendar';
import { ScanViewerModal } from './ScanViewerModal';
import { haptics } from '../services/hapticsService';

interface ExamsAndTestsViewProps {
  pet: Pet;
  exams: MedicalExam[];
  onUpdateExams: (items: MedicalExam[]) => void;
  onOpenLabTrends?: () => void;
}

export const ExamsAndTestsView: React.FC<ExamsAndTestsViewProps> = ({
  pet,
  exams,
  onUpdateExams,
  onOpenLabTrends,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingExam, setEditingExam] = useState<MedicalExam | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; date: string } | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<MedicalExam['category']>('blood');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formClinic, setFormClinic] = useState(pet.vetClinicName || '');
  const [formDoctor, setFormDoctor] = useState(pet.vetDoctorName || '');
  const [formStatus, setFormStatus] = useState<ExamResultStatus>('normal');
  const [formSummary, setFormSummary] = useState('');
  const [formNextDate, setFormNextDate] = useState('');
  const [formScans, setFormScans] = useState<{ id: string; url: string; title: string; date: string }[]>([]);
  const [formParams, setFormParams] = useState<{ name: string; value: string; unit?: string; refRange?: string; isFlagged?: boolean }[]>([]);

  const handleOpenAdd = () => {
    setEditingExam(null);
    setFormTitle('');
    setFormCategory('blood');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormClinic(pet.vetClinicName || '');
    setFormDoctor(pet.vetDoctorName || '');
    setFormStatus('normal');
    setFormSummary('');
    setFormNextDate('');
    setFormScans([]);
    setFormParams([
      { name: 'Leukocyty (WBC)', value: '', unit: 'G/l', refRange: '6.0 - 12.0', isFlagged: false },
      { name: 'Erytrocyty (RBC)', value: '', unit: 'T/l', refRange: '5.5 - 8.5', isFlagged: false },
      { name: 'Kreatynina', value: '', unit: 'mg/dl', refRange: '0.8 - 1.6', isFlagged: false },
    ]);
    setIsAdding(true);
  };

  const handleOpenEdit = (exam: MedicalExam) => {
    setEditingExam(exam);
    setFormTitle(exam.title);
    setFormCategory(exam.category);
    setFormDate(exam.date);
    setFormClinic(exam.clinic || '');
    setFormDoctor(exam.doctor || '');
    setFormStatus(exam.status);
    setFormSummary(exam.summary);
    setFormNextDate(exam.nextRecommendedDate || '');
    setFormScans([...exam.scans]);
    setFormParams(exam.keyParameters ? [...exam.keyParameters] : []);
    setIsAdding(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 });
      setFormScans(prev => [
        ...prev,
        {
          id: `scan-${Date.now()}`,
          url: res.dataUrl,
          title: file.name || 'Skan badania',
          date: formDate,
        }
      ]);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        if (url) {
          setFormScans(prev => [
            ...prev,
            {
              id: `scan-${Date.now()}`,
              url,
              title: file.name || 'Skan badania',
              date: formDate,
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddParam = () => {
    setFormParams(prev => [
      ...prev,
      { name: '', value: '', unit: '', refRange: '', isFlagged: false }
    ]);
  };

  const handleRemoveParam = (index: number) => {
    setFormParams(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateParam = (index: number, field: string, val: any) => {
    setFormParams(prev => prev.map((p, i) => i === index ? { ...p, [field]: val } : p));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const filteredParams = formParams.filter(p => p.name.trim() !== '');

    if (editingExam) {
      const updated = exams.map(ex => {
        if (ex.id === editingExam.id) {
          return {
            ...ex,
            title: formTitle.trim(),
            category: formCategory,
            date: formDate,
            clinic: formClinic.trim() || undefined,
            doctor: formDoctor.trim() || undefined,
            status: formStatus,
            summary: formSummary.trim(),
            nextRecommendedDate: formNextDate ? formNextDate : undefined,
            scans: formScans,
            keyParameters: filteredParams.length > 0 ? filteredParams : undefined,
          };
        }
        return ex;
      });
      onUpdateExams(updated);
    } else {
      const newExam: MedicalExam = {
        id: `exam-${Date.now()}`,
        petId: pet.id,
        title: formTitle.trim(),
        category: formCategory,
        date: formDate,
        clinic: formClinic.trim() || undefined,
        doctor: formDoctor.trim() || undefined,
        status: formStatus,
        summary: formSummary.trim(),
        nextRecommendedDate: formNextDate ? formNextDate : undefined,
        scans: formScans,
        keyParameters: filteredParams.length > 0 ? filteredParams : undefined,
      };
      onUpdateExams([...exams, newExam]);
    }

    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    onUpdateExams(exams.filter(e => e.id !== id));
  };

  // Calendar sync for follow-up
  const handleAddFollowUpToCalendar = (exam: MedicalExam, isGoogle: boolean) => {
    if (!exam.nextRecommendedDate) return;
    const payload: CalendarEventPayload = {
      title: `🔬 ${pet.name}: Kontrolne badanie - ${exam.title}`,
      description: `Zalecana kontrola medyczna / badanie dla: ${pet.name}\nBadanie: ${exam.title}\nPoprzedni wynik: ${exam.summary}\nGabinet: ${exam.clinic || 'Klinika weterynaryjna'}`,
      startDate: `${exam.nextRecommendedDate}T10:00:00`,
      endDate: `${exam.nextRecommendedDate}T10:45:00`,
      location: exam.clinic || 'Klinika Weterynaryjna',
      isAllDay: true,
      alarmMinutesBefore: 1440,
    };

    if (isGoogle) {
      window.open(createGoogleCalendarUrl(payload), '_blank');
    } else {
      downloadICalendarFile(`Badanie_Kontrolne_${pet.name}_${exam.title.replace(/\s+/g, '_')}`, [payload]);
    }
  };

  if (isAdding) {
    return (
      <div className="w-full bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 animate-fadeIn">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-teal-600" />
            {editingExam ? 'Edytuj badanie' : 'Dodaj badanie lub wyniki'}
          </h3>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full font-bold text-xs"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3 text-sm">
          <div>
            <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">
              Tytuł / Rodzaj badania *
            </label>
            <input
              type="text"
              required
              placeholder="np. Morfologia i biochemia krwi, USG jamy brzusznej"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-teal-600 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Kategoria</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-bold text-slate-800"
              >
                <option value="blood">Krew (morfologia / biochemia)</option>
                <option value="ultrasound">USG</option>
                <option value="xray">RTG / Rentgen</option>
                <option value="urine">Mocz</option>
                <option value="feces">Kał</option>
                <option value="cardio">Echo serca / EKG</option>
                <option value="cytology">Cytologia / Biopsja</option>
                <option value="ophthalmic">Okulistyka</option>
                <option value="other">Inne</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Status wyniku</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-bold text-slate-800"
              >
                <option value="normal">Prawidłowe (w normie)</option>
                <option value="attention">Wymaga kontroli</option>
                <option value="abnormal">Nieprawidłowe</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Data badania *</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-teal-600"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Kolejna kontrola</label>
              <input
                type="date"
                value={formNextDate}
                onChange={(e) => setFormNextDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-teal-400 text-xs sm:text-sm font-bold text-teal-800 focus:outline-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Klinika</label>
              <input
                type="text"
                placeholder="np. Klinika Weterynaryjna"
                value={formClinic}
                onChange={(e) => setFormClinic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:outline-teal-600"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Lekarz</label>
              <input
                type="text"
                placeholder="dr wet."
                value={formDoctor}
                onChange={(e) => setFormDoctor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:outline-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 items-center">
            <div className="col-span-2">
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Podsumowanie wyników *</label>
              <input
                type="text"
                required
                placeholder="np. Wszystkie parametry w normie"
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:outline-teal-600"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Załącznik skanu</label>
              <label className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer flex items-center justify-center gap-1.5 border border-slate-300 text-xs">
                <Paperclip className="w-4 h-4 text-teal-700" />
                <span className="truncate">{formScans.length > 0 ? `${formScans.length} plik` : 'Wgraj'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-xs sm:text-sm"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow transition text-xs sm:text-sm active:scale-98"
            >
              Zapisz badanie
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 block">
            Diagnostyka i Laboratorium
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-teal-600" />
            Badania i Wyniki: {pet.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Przechowuj skany USG, RTG, wyniki krwi oraz parametry laboratoryjne
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {onOpenLabTrends && (
            <button
              type="button"
              onClick={() => {
                haptics.tap();
                onOpenLabTrends();
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-2xl text-xs font-bold border border-teal-200/90 shadow-2xs active:scale-95 transition cursor-pointer"
              title="Zobacz wykresy zmian parametrów krwi na osi czasu"
            >
              <Activity className="w-4 h-4 text-teal-600" />
              <span className="hidden min-[400px]:inline">Wykresy trendów</span>
              <span className="min-[400px]:hidden">Trendy</span>
            </button>
          )}

          <button
            onClick={() => {
              haptics.tap();
              handleOpenAdd();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Dodaj badanie</span>
          </button>
        </div>
      </div>

      {/* List */}
      {exams.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-500">
          <FileSearch className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-sm text-slate-700">Brak zarejestrowanych badań</p>
          <p className="text-xs text-slate-400 mt-1">
            Wgraj zdjęcia wyników krwi, opis badania USG lub zdjęcie rentgenowskie.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow"
          >
            Dodaj pierwsze badanie
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">{exam.title}</h3>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        exam.status === 'normal'
                          ? 'bg-emerald-100 text-emerald-800'
                          : exam.status === 'attention'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {exam.status === 'normal' ? 'W normie ✓' : exam.status === 'attention' ? 'Do kontroli' : 'Nieprawidłowe'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Data: <strong className="text-slate-700">{exam.date}</strong> • {exam.clinic || 'Gabinet'}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(exam)}
                    title="Edytuj badanie"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(exam.id)}
                    title="Usuń badanie"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Summary Description */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-900 block mb-1">Podsumowanie i wnioski lekarskie:</span>
                {exam.summary}
              </div>

              {/* Key Parameters Table if present */}
              {exam.keyParameters && exam.keyParameters.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-xs">
                  <div className="bg-slate-100/70 px-3 py-1.5 font-bold text-slate-600 text-[11px] uppercase tracking-wider">
                    Kluczowe parametry laboratoryjne
                  </div>
                  <div className="divide-y divide-slate-100">
                    {exam.keyParameters.map((param, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2">
                        <span className="font-medium text-slate-700">{param.name}</span>
                        <div className="text-right">
                          <span className={`font-bold ${param.isFlagged ? 'text-rose-600' : 'text-slate-900'}`}>
                            {param.value} {param.unit}
                          </span>
                          {param.refRange && (
                            <span className="text-[10px] text-slate-400 block">Norma: {param.refRange}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scans & Images preview with full-screen zoom */}
              {exam.scans && exam.scans.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">
                    Skany i zdjęcia dokumentów ({exam.scans.length}) — kliknij, aby powiększyć
                  </span>
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {exam.scans.map((scan) => (
                      <div
                        key={scan.id}
                        onClick={() => setPreviewImage({ url: scan.url, title: `${exam.title} - ${scan.title}`, date: exam.date })}
                        className="group relative cursor-pointer shrink-0 rounded-2xl overflow-hidden border border-slate-200 w-24 h-24 shadow-sm bg-slate-100"
                      >
                        <img src={scan.url} alt={scan.title} className="w-full h-full object-cover transition group-hover:scale-105" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition p-1 text-center">
                          <Eye className="w-5 h-5 mb-0.5" />
                          <span className="text-[9px] font-bold uppercase">Podgląd</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up reminder if defined */}
              {exam.nextRecommendedDate && (
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600">
                    Zalecana kolejna kontrola: <strong className="text-teal-700">{exam.nextRecommendedDate}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAddFollowUpToCalendar(exam, true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Google Kalendarz
                    </button>
                    <button
                      onClick={() => handleAddFollowUpToCalendar(exam, false)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-semibold"
                    >
                      <Download className="w-3 h-3" />
                      W telefonie (.ics)
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {previewImage && (
        <ScanViewerModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          title={previewImage.title}
          date={previewImage.date}
        />
      )}
    </div>
  );
};
