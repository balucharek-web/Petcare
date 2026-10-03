import React, { useState } from 'react';
import { 
  Scale, 
  Plus, 
  Trash2, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  X, 
  Check, 
  Download, 
  Sparkles,
  Info
} from 'lucide-react';
import { Pet, PetWeightEntry } from '../types/pet';
import { haptics } from '../services/hapticsService';

interface WeightTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  onUpdatePet: (updated: Pet) => void;
}

export const WeightTrackerModal: React.FC<WeightTrackerModalProps> = ({
  isOpen,
  onClose,
  pet,
  onUpdatePet,
}) => {
  const [newWeight, setNewWeight] = useState('');
  const [newWeightDate, setNewWeightDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newWeightNotes, setNewWeightNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  // Prepare sorted weight history
  let rawHistory = pet.weightHistory ? [...pet.weightHistory] : [];
  
  // If pet has a weightKg but no entries in weightHistory, synthesize first entry so chart/list is never blank
  if (rawHistory.length === 0 && pet.weightKg && pet.weightKg > 0) {
    rawHistory = [{
      id: 'initial-weight',
      date: pet.createdAt ? pet.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
      weightKg: pet.weightKg,
      notes: 'Waga początkowa profilu'
    }];
  }

  const sortedHistory = rawHistory.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const count = sortedHistory.length;
  const firstEntry = sortedHistory[0];
  const lastEntry = sortedHistory[count - 1];
  const currentWeight = lastEntry ? lastEntry.weightKg : (pet.weightKg || 0);

  const weightDelta = (firstEntry && lastEntry && count > 1)
    ? Number((lastEntry.weightKg - firstEntry.weightKg).toFixed(2))
    : 0;

  const minWeight = count > 0 ? Math.min(...sortedHistory.map(e => e.weightKg)) : currentWeight;
  const maxWeight = count > 0 ? Math.max(...sortedHistory.map(e => e.weightKg)) : currentWeight;
  const weightSpan = maxWeight - minWeight || 1;

  // Chart layout
  const chartWidth = 400;
  const chartHeight = 160;
  const padX = 36;
  const padY = 24;

  const points = sortedHistory.map((entry, index) => {
    const x = count === 1
      ? chartWidth / 2
      : padX + (index / (count - 1)) * (chartWidth - padX * 2);
    const y = padY + (1 - (entry.weightKg - minWeight) / weightSpan) * (chartHeight - padY * 2);
    return { x, y, ...entry };
  });

  const svgPathD = points.length > 1
    ? points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '')
    : '';

  const areaPathD = points.length > 1
    ? `${svgPathD} L ${points[points.length - 1].x.toFixed(1)} ${chartHeight - 10} L ${points[0].x.toFixed(1)} ${chartHeight - 10} Z`
    : '';

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newWeight);
    if (isNaN(val) || val <= 0) return;

    const entry: PetWeightEntry = {
      id: crypto.randomUUID(),
      date: newWeightDate || new Date().toISOString().split('T')[0],
      weightKg: val,
      notes: newWeightNotes.trim() || undefined,
    };

    const updatedHistory = [...(pet.weightHistory || (rawHistory.length > 0 ? rawHistory : [])), entry].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const latest = updatedHistory[updatedHistory.length - 1];

    onUpdatePet({
      ...pet,
      weightKg: latest.weightKg,
      weightHistory: updatedHistory,
    });

    setNewWeight('');
    setNewWeightNotes('');
    setNewWeightDate(new Date().toISOString().split('T')[0]);
    setIsAdding(false);
    haptics.success();
  };

  const handleDelete = (id: string) => {
    const updatedHistory = (pet.weightHistory || rawHistory).filter(e => e.id !== id);
    const sorted = [...updatedHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latest = sorted[sorted.length - 1];

    onUpdatePet({
      ...pet,
      weightKg: latest ? latest.weightKg : pet.weightKg,
      weightHistory: updatedHistory,
    });
    haptics.selection();
  };

  const handleExportCsv = () => {
    if (sortedHistory.length === 0) return;
    const cleanName = (pet.name || 'pupil').replace(/[^a-zA-Z0-9_-]/g, '_');
    const headers = ['Data pomiaru', 'Zwierzak', 'Waga (kg)', 'Notatki'];
    const rows = sortedHistory.map(e => [
      e.date,
      `"${pet.name.replace(/"/g, '""')}"`,
      e.weightKg.toString().replace('.', ','),
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csv = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `Waga_${cleanName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-teal-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-2xl border border-teal-400/30">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Kontrola Wagi i Wykres: {pet.name}
              </h2>
              <p className="text-xs text-teal-200/80">Wykres zmian masy ciała w czasie, historia ważeń i trendy</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={sortedHistory.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-40"
              title="Pobierz historię wagi do arkusza CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800 flex-1">
          {/* Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-center">
              <span className="text-[10px] uppercase font-bold text-teal-800 block">Aktualna waga</span>
              <strong className="text-xl sm:text-2xl font-black text-teal-950 block mt-0.5">
                {currentWeight} kg
              </strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Trend ogólny</span>
              <div className="flex items-center justify-center gap-1 mt-1">
                {weightDelta > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span className="text-base font-extrabold text-amber-700">+{weightDelta} kg</span>
                  </>
                ) : weightDelta < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-blue-600" />
                    <span className="text-base font-extrabold text-blue-700">{weightDelta} kg</span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-teal-700">Stabilna</span>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Min / Max</span>
              <span className="text-xs sm:text-sm font-black text-slate-800 block mt-1.5">
                {minWeight} kg / {maxWeight} kg
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Liczba pomiarów</span>
              <span className="text-xl sm:text-2xl font-black text-slate-800 block mt-0.5">
                {count}
              </span>
            </div>
          </div>

          {/* Interactive Chart Section */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-3xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Wykres Dynamiki Wagi
                </h3>
              </div>
              {count > 1 && (
                <span className="text-[11px] font-semibold text-slate-500">
                  {firstEntry.date} ➔ {lastEntry.date}
                </span>
              )}
            </div>

            {count >= 2 ? (
              <div className="w-full bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-44 overflow-visible"
                >
                  <defs>
                    <linearGradient id="modalWeightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1={padX} y1={padY} x2={chartWidth - padX} y2={padY} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <line x1={padX} y1={(chartHeight - padY) / 2} x2={chartWidth - padX} y2={(chartHeight - padY) / 2} stroke="#f1f5f9" strokeDasharray="2 2" />
                  <line x1={padX} y1={chartHeight - padY} x2={chartWidth - padX} y2={chartHeight - padY} stroke="#e2e8f0" strokeDasharray="3 3" />

                  {/* Y Axis labels */}
                  <text x={padX - 8} y={padY + 4} textAnchor="end" className="text-[9px] font-bold fill-slate-400">
                    {maxWeight}kg
                  </text>
                  <text x={padX - 8} y={chartHeight - padY + 4} textAnchor="end" className="text-[9px] font-bold fill-slate-400">
                    {minWeight}kg
                  </text>

                  {/* Area fill */}
                  {areaPathD && (
                    <path d={areaPathD} fill="url(#modalWeightGrad)" />
                  )}

                  {/* Line */}
                  {svgPathD && (
                    <path
                      d={svgPathD}
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Points */}
                  {points.map((pt) => (
                    <g key={pt.id}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="5"
                        fill="#ffffff"
                        stroke="#0d9488"
                        strokeWidth="3"
                      />
                      <rect
                        x={pt.x - 18}
                        y={pt.y - 20}
                        width="36"
                        height="14"
                        rx="4"
                        fill="#0f172a"
                      />
                      <text
                        x={pt.x}
                        y={pt.y - 10}
                        textAnchor="middle"
                        className="text-[9px] font-black fill-white"
                      >
                        {pt.weightKg} kg
                      </text>
                      <text
                        x={pt.x}
                        y={chartHeight - 4}
                        textAnchor="middle"
                        className="text-[8px] font-semibold fill-slate-400"
                      >
                        {pt.date.slice(5)}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <div className="bg-white p-5 rounded-2xl border border-dashed border-teal-200 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                  <Scale className="w-5 h-5" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                  Zapisano 1 pomiar wagi ({currentWeight} kg)
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Dodaj kolejny pomiar (np. z dzisiaj lub z wizyty u weterynarza), aby od razu wygenerować płynny wykres i linię trendu masy ciała pupila!
                </p>
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Dodaj drugi pomiar do wykresu</span>
                </button>
              </div>
            )}
          </div>

          {/* Action to add new weight */}
          {!isAdding ? (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Zapisz nowy pomiar wagi pupila</span>
            </button>
          ) : (
            <form onSubmit={handleAdd} className="p-4 bg-teal-50 rounded-2xl border border-teal-200 animate-fadeIn space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-teal-700" />
                  <span>Dodaj nowy pomiar do historii i wykresu</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-teal-900 block mb-1">Waga (w kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newWeight}
                    onChange={e => setNewWeight(e.target.value)}
                    placeholder="np. 14.8"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-teal-300 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-teal-900 block mb-1">Data pomiaru *</label>
                  <input
                    type="date"
                    value={newWeightDate}
                    onChange={e => setNewWeightDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-teal-300 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-teal-900 block mb-1">Notatka (opcjonalnie)</label>
                  <input
                    type="text"
                    value={newWeightNotes}
                    onChange={e => setNewWeightNotes(e.target.value)}
                    placeholder="np. w gabinecie wet., na czczo"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-teal-300 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs active:scale-98"
                >
                  Zapisz pomiar
                </button>
              </div>
            </form>
          )}

          {/* Table / List of Measurements */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Pełna historia ważeń ({count})
            </h4>

            <div className="space-y-1.5">
              {[...sortedHistory].reverse().map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-xs transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{entry.date}</span>
                        <span className="font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                          {entry.weightKg} kg
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-[11px] text-slate-500 italic mt-0.5">{entry.notes}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Usuń ten wpis"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
