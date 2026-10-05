import React, { useState } from 'react';
import { 
  Syringe, 
  Plus, 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Download, 
  Paperclip,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { Pet, Vaccination, VaccineStatus } from '../types/pet';
import { compressImage } from '../utils/imageCompressor';
import { 
  createGoogleCalendarUrl, 
  downloadICalendarFile, 
  buildVaccinationCalendarEvent 
} from '../services/calendar';
import { ScanViewerModal } from './ScanViewerModal';

interface VaccinationsViewProps {
  pet: Pet;
  vaccinations: Vaccination[];
  onUpdateVaccinations: (items: Vaccination[]) => void;
}

export const VaccinationsView: React.FC<VaccinationsViewProps> = ({
  pet,
  vaccinations,
  onUpdateVaccinations,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingVac, setEditingVac] = useState<Vaccination | null>(null);

  // Scan preview modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; date: string } | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<Vaccination['category']>('rabies');
  const [formAdminDate, setFormAdminDate] = useState(new Date().toISOString().slice(0, 10));
  const [formValidUntil, setFormValidUntil] = useState(() => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().slice(0, 10);
  });
  const [formBatch, setFormBatch] = useState('');
  const [formClinic, setFormClinic] = useState(pet.vetClinicName || '');
  const [formDoctor, setFormDoctor] = useState(pet.vetDoctorName || '');
  const [formNotes, setFormNotes] = useState('');
  const [formAttachments, setFormAttachments] = useState<string[]>([]);

  const getVaccineStatus = (validUntil: string): { status: VaccineStatus; label: string; daysLeft: number } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(validUntil);
    exp.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', label: `Przeterminowane (${Math.abs(diffDays)} dni temu)`, daysLeft: diffDays };
    }
    if (diffDays <= 30) {
      return { status: 'expiring_soon', label: `Wygasa za ${diffDays} dni!`, daysLeft: diffDays };
    }
    return { status: 'valid', label: `Aktualne (jeszcze ${diffDays} dni)`, daysLeft: diffDays };
  };

  const handleOpenAdd = () => {
    setEditingVac(null);
    setFormName('');
    setFormCategory('rabies');
    setFormAdminDate(new Date().toISOString().slice(0, 10));
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    setFormValidUntil(next.toISOString().slice(0, 10));
    setFormBatch('');
    setFormClinic(pet.vetClinicName || '');
    setFormDoctor(pet.vetDoctorName || '');
    setFormNotes('');
    setFormAttachments([]);
    setIsAdding(true);
  };

  const handleOpenEdit = (v: Vaccination) => {
    setEditingVac(v);
    setFormName(v.name);
    setFormCategory(v.category);
    setFormAdminDate(v.dateAdministered);
    setFormValidUntil(v.validUntil);
    setFormBatch(v.batchNumber || '');
    setFormClinic(v.vetClinic || '');
    setFormDoctor(v.vetDoctor || '');
    setFormNotes(v.notes || '');
    setFormAttachments(v.attachmentUrls || []);
    setIsAdding(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingVac) {
      const updated = vaccinations.map(v => {
        if (v.id === editingVac.id) {
          return {
            ...v,
            name: formName.trim(),
            category: formCategory,
            dateAdministered: formAdminDate,
            validUntil: formValidUntil,
            batchNumber: formBatch.trim() || undefined,
            vetClinic: formClinic.trim() || undefined,
            vetDoctor: formDoctor.trim() || undefined,
            notes: formNotes.trim() || undefined,
            attachmentUrls: formAttachments,
          };
        }
        return v;
      });
      onUpdateVaccinations(updated);
    } else {
      const newVac: Vaccination = {
        id: `vac-${Date.now()}`,
        petId: pet.id,
        name: formName.trim(),
        category: formCategory,
        dateAdministered: formAdminDate,
        validUntil: formValidUntil,
        batchNumber: formBatch.trim() || undefined,
        vetClinic: formClinic.trim() || undefined,
        vetDoctor: formDoctor.trim() || undefined,
        notes: formNotes.trim() || undefined,
        attachmentUrls: formAttachments,
      };
      onUpdateVaccinations([...vaccinations, newVac]);
    }
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    onUpdateVaccinations(vaccinations.filter(v => v.id !== id));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 });
      setFormAttachments(prev => [...prev, res.dataUrl]);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        if (url) {
          setFormAttachments(prev => [...prev, url]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Calendar sync for vaccination
  const handleAddToGoogleCalendar = (v: Vaccination) => {
    const event = buildVaccinationCalendarEvent(pet.name, v.name, v.validUntil, v.vetClinic);
    const url = createGoogleCalendarUrl(event);
    window.open(url, '_blank');
  };

  const handleDownloadPhoneCalendar = (v: Vaccination) => {
    const event = buildVaccinationCalendarEvent(pet.name, v.name, v.validUntil, v.vetClinic);
    const filename = `Szczepienie_${pet.name}_${v.name.replace(/\s+/g, '_')}`;
    downloadICalendarFile(filename, [event]);
  };

  if (isAdding) {
    return (
      <div className="w-full bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 animate-fadeIn">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <Syringe className="w-4 h-4 text-teal-600" />
            {editingVac ? 'Edytuj szczepienie' : 'Dodaj nowe szczepienie'}
          </h3>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full text-xs font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3 text-sm">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-800 text-xs sm:text-sm">
                Nazwa preparatu / szczepionki *
              </label>
              <span className="text-xs text-teal-700 font-semibold">
                Wpisz lub kliknij sugestię poniżej
              </span>
            </div>
            <input
              type="text"
              required
              placeholder="np. Milprazon, Rabisin, Bravecto, Nobivac"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-teal-600 focus:bg-white"
            />
            {/* Quick suggestions based on selected category */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {(formCategory === 'deworming' 
                ? ['Milprazon', 'Drontal', 'Cestal Plus', 'Dehinel Plus', 'InPar']
                : formCategory === 'antiparasitic'
                ? ['Bravecto', 'NexGard Spectra', 'Simparica Trio', 'Foresto', 'Advantix']
                : formCategory === 'rabies'
                ? ['Rabisin', 'Nobivac Rabies', 'Biocan R', 'Versican Plus']
                : ['Nobivac DHPPi', 'Eurican DAPPi', 'Versican Plus L4', 'Vanguard 7']
              ).map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setFormName(sug)}
                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-white border border-teal-200 text-teal-800 hover:bg-teal-50 active:scale-95 transition"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="vacc-field-1" className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Kategoria</label>
              <select id="vacc-field-1"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-bold text-slate-800"
              >
                <option value="rabies">Wścieklizna (obowiązkowa)</option>
                <option value="deworming">Odrobaczenie (profilaktyka)</option>
                <option value="antiparasitic">Pchły i kleszcze (ochrona)</option>
                <option value="core">Choroby zakaźne (zasadnicze)</option>
                <option value="non_core">Dodatkowe</option>
                <option value="other">Inne</option>
              </select>
            </div>
            <div>
              <label htmlFor="vacc-field-2" className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Nr serii (batch)</label>
              <input id="vacc-field-2"
                type="text"
                placeholder="np. RB-88914-A"
                value={formBatch}
                onChange={(e) => setFormBatch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="vacc-field-3" className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Data podania *</label>
              <input id="vacc-field-3"
                type="date"
                required
                value={formAdminDate}
                onChange={(e) => setFormAdminDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-medium"
              />
            </div>
            <div>
              <label htmlFor="vacc-field-4" className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Ważne do (termin) *</label>
              <input id="vacc-field-4"
                type="date"
                required
                value={formValidUntil}
                onChange={(e) => setFormValidUntil(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-teal-400 text-xs sm:text-sm font-bold text-teal-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="vacc-field-5" className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Klinika / Gabinet</label>
              <input id="vacc-field-5"
                type="text"
                placeholder="Klinika Weterynaryjna"
                value={formClinic}
                onChange={(e) => setFormClinic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="vacc-field-6" className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Lekarz weterynarii</label>
              <input id="vacc-field-6"
                type="text"
                placeholder="dr wet."
                value={formDoctor}
                onChange={(e) => setFormDoctor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 items-center">
            <div className="col-span-2">
              <label htmlFor="vacc-field-7" className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Uwagi / Zalecenia</label>
              <input id="vacc-field-7"
                type="text"
                placeholder="np. Wpis w paszporcie s. 8, bez powikłań"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1 text-xs sm:text-sm">Skan / Zdjęcie</label>
              <label className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer flex items-center justify-center gap-1.5 border border-slate-300 text-xs">
                <Paperclip className="w-4 h-4 text-teal-700" />
                <span className="truncate">{formAttachments.length > 0 ? `${formAttachments.length} plik` : 'Wgraj'}</span>
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
              Zapisz szczepienie
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
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600 block">
            Profilaktyka weterynaryjna
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Syringe className="w-5 h-5 text-teal-600" />
            Szczepienia: {pet.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kontroluj ważność szczepień i dodawaj przypomnienia do kalendarza
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-bold shadow active:scale-95 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Dodaj szczepienie
        </button>
      </div>

      {/* List */}
      {vaccinations.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-500">
          <Syringe className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-sm text-slate-700">Brak zarejestrowanych szczepień</p>
          <p className="text-xs text-slate-400 mt-1">
            Wprowadź szczepienie przeciwko wściekliźnie lub chorobom zakaźnym, aby monitorować termin kolejnej dawki.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow"
          >
            Dodaj pierwsze szczepienie
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {vaccinations.map((vac) => {
            const { status, label } = getVaccineStatus(vac.validUntil);

            return (
              <div
                key={vac.id}
                className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3"
              >
                {/* Header with status badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900">{vac.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                        vac.category === 'rabies' 
                          ? 'bg-rose-100 text-rose-800'
                          : vac.category === 'deworming'
                          ? 'bg-purple-100 text-purple-800'
                          : vac.category === 'antiparasitic'
                          ? 'bg-amber-100 text-amber-800'
                          : vac.category === 'core'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {vac.category === 'rabies' 
                          ? 'Wścieklizna' 
                          : vac.category === 'deworming' 
                          ? 'Odrobaczenie' 
                          : vac.category === 'antiparasitic' 
                          ? 'Pchły/Kleszcze' 
                          : vac.category === 'core' 
                          ? 'Zakaźne' 
                          : 'Inne'}
                      </span>
                    </div>
                    {vac.batchNumber && (
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Nr serii / batch: {vac.batchNumber}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(vac)}
                      title="Edytuj wpis"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(vac.id)}
                      title="Usuń wpis"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expiry Pill Highlight */}
                <div
                  className={`p-3 rounded-2xl flex items-center justify-between text-xs font-semibold ${
                    status === 'expired'
                      ? 'bg-rose-50 border border-rose-200 text-rose-800'
                      : status === 'expiring_soon'
                      ? 'bg-amber-50 border border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {status === 'expired' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    ) : status === 'expiring_soon' ? (
                      <Clock className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>{label}</span>
                  </div>
                  <span className="font-bold">Termin: {vac.validUntil}</span>
                </div>

                {/* Dates & Clinic */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-bold">Data szczepienia</span>
                    <strong className="text-slate-800">{vac.dateAdministered}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-bold">Lekarz / Gabinet</span>
                    <strong className="text-slate-800">{vac.vetDoctor || vac.vetClinic || '-'}</strong>
                  </div>
                </div>

                {vac.notes && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {vac.notes}
                  </p>
                )}

                {/* Attachments preview */}
                {vac.attachmentUrls && vac.attachmentUrls.length > 0 && (
                  <div className="pt-1">
                    <span className="text-xs font-bold uppercase text-slate-400 block mb-1.5">
                      Załączony skan / wpis paszportowy
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {vac.attachmentUrls.map((url, idx) => (
                        <div
                          key={idx}
                          onClick={() => setPreviewImage({ url, title: `Szczepienie: ${vac.name}`, date: vac.dateAdministered })}
                          className="relative group cursor-pointer shrink-0 rounded-xl overflow-hidden border border-slate-200 w-20 h-20 shadow-xs"
                        >
                          <img src={url} alt="Skan szczepienia" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                            <Eye className="w-4 h-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Calendar Add Bar */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5 self-start sm:self-center">
                    <CalendarIcon className="w-3.5 h-3.5 text-teal-600" />
                    Przypomnij o kolejnej dawce:
                  </span>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleAddToGoogleCalendar(vac)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Google Kalendarz
                    </button>
                    <button
                      onClick={() => handleDownloadPhoneCalendar(vac)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-semibold transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      W telefonie (.ics)
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Modal */}
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
