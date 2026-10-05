import React, { useState } from 'react';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Calendar, 
  Tag, 
  TrendingUp, 
  FileText, 
  X, 
  DollarSign, 
  Camera, 
  PieChart,
  CheckCircle2,
  Download
} from 'lucide-react';
import { Pet, PetExpense, VetVisit, ExpenseCategory } from '../types/pet';
import { storage } from '../services/storage';

interface ExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  visits: VetVisit[];
  onDataChanged: () => void;
}

export const ExpensesModal: React.FC<ExpensesModalProps> = ({
  isOpen,
  onClose,
  pet,
  visits,
  onDataChanged,
}) => {
  const [expenses, setExpenses] = useState<PetExpense[]>(() => storage.getExpenses(pet.id));
  const [isAdding, setIsAdding] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');

  // Form state
  const [title, setTitle] = useState('');
  const [amountPln, setAmountPln] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<ExpenseCategory>('vet');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  // Aggregate with visits having costPln
  const visitExpenses: PetExpense[] = visits
    .filter(v => v.costPln && v.costPln > 0)
    .map(v => ({
      id: `visit-exp-${v.id}`,
      petId: pet.id,
      title: `Wizyta: ${v.reason || 'Weterynarz'} (${v.clinic || 'Gabinet'})`,
      amountPln: v.costPln || 0,
      date: v.date,
      category: 'vet' as ExpenseCategory,
      notes: v.diagnosis ? `Diagnoza: ${v.diagnosis}` : undefined,
    }));

  const allExpenses = [...expenses, ...visitExpenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const filtered = categoryFilter === 'all'
    ? allExpenses
    : allExpenses.filter(e => e.category === categoryFilter);

  // Totals
  const totalAmount = allExpenses.reduce((acc, curr) => acc + curr.amountPln, 0);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const thisMonthAmount = allExpenses
    .filter(e => e.date.startsWith(currentMonth))
    .reduce((acc, curr) => acc + curr.amountPln, 0);

  const thisYearAmount = allExpenses
    .filter(e => e.date.startsWith(`${currentYear}`))
    .reduce((acc, curr) => acc + curr.amountPln, 0);

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  allExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amountPln;
  });

  const categoryLabels: Record<ExpenseCategory, { label: string; icon: string; color: string }> = {
    vet: { label: 'Lecznica & Badania', icon: '🩺', color: 'bg-teal-500' },
    meds: { label: 'Leki & Apteczka', icon: '💊', color: 'bg-indigo-500' },
    food: { label: 'Karma & Smaczki', icon: '🥩', color: 'bg-amber-500' },
    hygiene: { label: 'Pielęgnacja & Spa', icon: '🛁', color: 'bg-cyan-500' },
    toys: { label: 'Akcesoria & Zabawki', icon: '🎾', color: 'bg-pink-500' },
    insurance: { label: 'Ubezpieczenie', icon: '🛡️', color: 'bg-emerald-500' },
    training: { label: 'Szkolenie & Behawior', icon: '🐕', color: 'bg-purple-500' },
    other: { label: 'Inne wydatki', icon: '📦', color: 'bg-slate-500' },
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountPln);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const newExp: PetExpense = {
      id: `exp-${Date.now()}`,
      petId: pet.id,
      title: title.trim() || 'Wydatek',
      amountPln: parsedAmount,
      date,
      category,
      notes: notes.trim() || undefined,
    };

    const updated = [newExp, ...expenses];
    setExpenses(updated);
    storage.saveExpenses([...storage.getExpenses().filter(e => e.petId !== pet.id), ...updated]);

    setTitle('');
    setAmountPln('');
    setNotes('');
    setIsAdding(false);
    onDataChanged();
  };

  const handleDeleteExpense = (id: string) => {
    // Only delete manually added expenses, visits are managed in visits view
    if (id.startsWith('visit-exp-')) {
      alert('Ten wydatek pochodzi z zarejestrowanej wizyty lekarskiej w zakładce Wizyty.');
      return;
    }
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    storage.saveExpenses([...storage.getExpenses().filter(e => e.petId !== pet.id), ...updated]);
    onDataChanged();
  };

  const handleExportCsv = () => {
    if (allExpenses.length === 0) return;
    const cleanPetName = (pet.name || 'pupil').replace(/[^a-zA-Z0-9_-]/g, '_');
    const headers = ['Data', 'Zwierzak', 'Tytuł / Usługa', 'Kategoria', 'Kwota (PLN)', 'Notatki'];
    const rows = allExpenses.map(e => [
      e.date,
      `"${pet.name.replace(/"/g, '""')}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${(categoryLabels[e.category]?.label || e.category).replace(/"/g, '""')}"`,
      e.amountPln.toFixed(2).replace('.', ','),
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Wydatki_${cleanPetName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-400/30">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Wydatki i Finanse Zwierzaka
              </h2>
              <p className="text-xs text-emerald-200/80">Koszty leczenia, karmy i opieki dla: {pet.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={allExpenses.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-40"
              title="Pobierz arkusz kalkulacyjny CSV z polskimi znakami do Excela" aria-label="Pobierz arkusz kalkulacyjny CSV z polskimi znakami do Excela"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pobierz CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition" aria-label="Zamknij">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-800 flex-1">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-xs uppercase font-bold text-emerald-800 block">Łącznie</span>
              <strong className="text-lg sm:text-xl font-black text-emerald-950 block mt-0.5">
                {totalAmount.toLocaleString('pl-PL')} zł
              </strong>
              <span className="text-xs text-emerald-700 block">{allExpenses.length} pozycji</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-center">
              <span className="text-xs uppercase font-bold text-teal-800 block">Ten miesiąc</span>
              <strong className="text-lg sm:text-xl font-black text-teal-950 block mt-0.5">
                {thisMonthAmount.toLocaleString('pl-PL')} zł
              </strong>
              <span className="text-xs text-teal-700 block">Bieżący okres</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs uppercase font-bold text-slate-500 block">W roku {currentYear}</span>
              <strong className="text-lg sm:text-xl font-black text-slate-900 block mt-0.5">
                {thisYearAmount.toLocaleString('pl-PL')} zł
              </strong>
              <span className="text-xs text-slate-500 block">Roczna suma</span>
            </div>
          </div>

          {/* Add Expense Button / Form */}
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Dodaj nowy wydatek (paragon, karma, lek)</span>
            </button>
          ) : (
            <form onSubmit={handleAddExpense} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs animate-fadeIn">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <strong className="text-sm font-bold text-slate-900">Nowy wpis wydatku</strong>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="expense-field-1" className="font-bold text-slate-700 block mb-1">Tytuł / Nazwa *</label>
                  <input id="expense-field-1"
                    type="text"
                    required
                    placeholder="np. Wizyta kontrolna, karma Royal Canin, obroża Foresto"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="expense-field-2" className="font-bold text-slate-700 block mb-1">Kwota (zł) *</label>
                  <input id="expense-field-2"
                    type="number"
                    step="0.01"
                    required
                    placeholder="np. 145.50"
                    value={amountPln}
                    onChange={(e) => setAmountPln(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="expense-field-3" className="font-bold text-slate-700 block mb-1">Kategoria</label>
                  <select id="expense-field-3"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-emerald-600"
                  >
                    {Object.entries(categoryLabels).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.icon} {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="expense-field-4" className="font-bold text-slate-700 block mb-1">Data</label>
                  <input id="expense-field-4"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="expense-field-5" className="font-bold text-slate-700 block mb-1">Notatka (opcjonalnie)</label>
                <input id="expense-field-5"
                  type="text"
                  placeholder="np. Paragon ze sklepu zoologicznego"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-emerald-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow"
                >
                  Zapisz wydatek
                </button>
              </div>
            </form>
          )}

          {/* Category breakdown bars */}
          {totalAmount > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                Podział wydatków wg kategorii
              </span>
              <div className="space-y-2 text-xs">
                {Object.entries(categoryLabels).map(([key, info]) => {
                  const amt = categoryTotals[key] || 0;
                  if (amt === 0) return null;
                  const pct = Math.round((amt / totalAmount) * 100);

                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span>{info.icon}</span>
                          <span>{info.label}</span>
                        </span>
                        <span className="font-bold text-slate-900">
                          {amt.toLocaleString('pl-PL')} zł <span className="text-slate-400 font-normal">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${info.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expense List */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Historia wydatków ({filtered.length})
              </span>

              {/* Quick Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="text-xs p-1.5 rounded-xl bg-slate-100 border border-slate-200 font-semibold text-slate-700"
              >
                <option value="all">Wszystkie kategorie</option>
                {Object.entries(categoryLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>

            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Brak zarejestrowanych wydatków w wybranej kategorii.
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-between gap-3 text-xs transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">
                        {categoryLabels[item.category]?.icon || '📦'}
                      </span>
                      <div>
                        <strong className="text-slate-900 block leading-tight">{item.title}</strong>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          {item.date} &bull; {categoryLabels[item.category]?.label || item.category}
                        </span>
                        {item.notes && (
                          <span className="text-xs text-slate-500 italic block">{item.notes}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 shrink-0">
                        {item.amountPln.toLocaleString('pl-PL')} zł
                      </span>

                      {!item.id.startsWith('visit-exp-') && (
                        <button
                          onClick={() => handleDeleteExpense(item.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg transition"
                          title="Usuń wpis"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
