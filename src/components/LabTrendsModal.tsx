import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles,
  Info,
  ChevronRight
} from 'lucide-react';
import { Pet, MedicalExam } from '../types/pet';
import { haptics } from '../services/hapticsService';

interface LabTrendsModalProps {
  pet: Pet;
  exams: MedicalExam[];
  onClose: () => void;
  onOpenExamDetails?: (examId: string) => void;
}

interface BiomarkerDataPoint {
  date: string;
  value: number;
  unit: string;
  refRange: string;
  refMin?: number;
  refMax?: number;
  isFlagged?: boolean;
  examId: string;
  examTitle: string;
}

export const LabTrendsModal: React.FC<LabTrendsModalProps> = ({
  pet,
  exams,
  onClose,
  onOpenExamDetails,
}) => {
  // Extract all numeric biomarkers that appear in at least one exam
  const biomarkerSeries = useMemo(() => {
    const map = new Map<string, BiomarkerDataPoint[]>();

    // Sort exams chronologically
    const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedExams.forEach((exam) => {
      (exam.keyParameters || []).forEach((param) => {
        if (!param.name) return;

        // Clean parameter name
        const rawName = param.name.trim();
        // Normalize name: e.g. "ALT (GPT)" -> "ALT (Wątroba)", "Mocznik (BUN)" -> "Mocznik"
        let normName = rawName;
        if (/alt/i.test(rawName)) normName = 'ALT (Aminotransferaza)';
        else if (/ast/i.test(rawName)) normName = 'AST (AspAT)';
        else if (/mocznik|bun/i.test(rawName)) normName = 'Mocznik (BUN)';
        else if (/kreatyn/i.test(rawName)) normName = 'Kreatynina';
        else if (/glukoz/i.test(rawName)) normName = 'Glukoza';
        else if (/t4|hormon/i.test(rawName)) normName = 'T4 (Tarczyca)';
        else if (/leukocyt|wbc/i.test(rawName)) normName = 'Leukocyty (WBC)';
        else if (/erytrocyt|rbc/i.test(rawName)) normName = 'Erytrocyty (RBC)';

        // Parse numerical value
        const numVal = parseFloat(String(param.value).replace(',', '.').replace(/[^\d.]/g, ''));
        if (isNaN(numVal)) return;

        // Parse ref range (e.g. "10 - 100" or "0.5 - 1.7")
        let refMin: number | undefined = undefined;
        let refMax: number | undefined = undefined;
        if (param.refRange) {
          const parts = param.refRange.split('-').map(p => parseFloat(p.trim().replace(',', '.')));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            refMin = parts[0];
            refMax = parts[1];
          }
        }

        const point: BiomarkerDataPoint = {
          date: exam.date,
          value: numVal,
          unit: param.unit || '',
          refRange: param.refRange || '',
          refMin,
          refMax,
          isFlagged: param.isFlagged,
          examId: exam.id,
          examTitle: exam.title,
        };

        if (!map.has(normName)) {
          map.set(normName, []);
        }
        map.get(normName)!.push(point);
      });
    });

    return map;
  }, [exams]);

  const biomarkerNames = useMemo(() => Array.from(biomarkerSeries.keys()), [biomarkerSeries]);

  const [selectedBiomarker, setSelectedBiomarker] = useState<string>(() => {
    // Prefer ALT, then Kreatynina, then first available
    if (biomarkerSeries.has('ALT (Aminotransferaza)')) return 'ALT (Aminotransferaza)';
    if (biomarkerSeries.has('Mocznik (BUN)')) return 'Mocznik (BUN)';
    if (biomarkerSeries.has('Kreatynina')) return 'Kreatynina';
    return biomarkerNames[0] || '';
  });

  const activePoints = useMemo(() => {
    return biomarkerSeries.get(selectedBiomarker) || [];
  }, [biomarkerSeries, selectedBiomarker]);

  // Statistical calculations for chart
  const stats = useMemo(() => {
    if (activePoints.length === 0) return null;
    const values = activePoints.map(p => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const firstPoint = activePoints[0];
    const latestPoint = activePoints[activePoints.length - 1];
    const prevPoint = activePoints.length > 1 ? activePoints[activePoints.length - 2] : null;

    let delta = 0;
    let deltaPercent = 0;
    if (prevPoint) {
      delta = latestPoint.value - prevPoint.value;
      deltaPercent = prevPoint.value !== 0 ? (delta / prevPoint.value) * 100 : 0;
    }

    const refMin = latestPoint.refMin;
    const refMax = latestPoint.refMax;

    // Determine status
    let statusText = 'W normie fizjologicznej';
    let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (refMax !== undefined && latestPoint.value > refMax) {
      statusText = `Powyżej normy referencyjnej (> ${refMax})`;
      statusColor = 'text-rose-700 bg-rose-50 border-rose-200';
    } else if (refMin !== undefined && latestPoint.value < refMin) {
      statusText = `Poniżej normy referencyjnej (< ${refMin})`;
      statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
    }

    return {
      minVal,
      maxVal,
      firstPoint,
      latestPoint,
      prevPoint,
      delta,
      deltaPercent,
      refMin,
      refMax,
      refRange: latestPoint.refRange,
      unit: latestPoint.unit,
      statusText,
      statusColor,
    };
  }, [activePoints]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-teal-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900 px-5 py-4 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-2xl border border-teal-400/30">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Wykresy Trendów Laboratoryjnych</h2>
                <span className="text-[10px] font-black uppercase bg-teal-400 text-slate-950 px-2 py-0.5 rounded-full shadow-xs">
                  Biomarkery Krwi
                </span>
              </div>
              <p className="text-xs text-teal-100">
                Śledź zmiany parametrów krwi {pet.name} na osi czasu z normami weterynaryjnymi
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              haptics.tap();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition text-white cursor-pointer"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-100">
          {biomarkerNames.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <Activity className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-bold text-sm">Brak zarejestrowanych parametrów krwi</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Dodaj lub zeskanuj badania krwi z parametrami (ALT, mocznik, kreatynina, glukoza), aby zobaczyć automatyczne wykresy trendów.
              </p>
            </div>
          ) : (
            <>
              {/* Biomarker Selector Tabs */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  Wybierz wskaźnik laboratoryjny:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {biomarkerNames.map((name) => {
                    const isSelected = name === selectedBiomarker;
                    const count = biomarkerSeries.get(name)?.length || 0;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          haptics.tap();
                          setSelectedBiomarker(name);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isSelected ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stats & Current Value Card */}
              {stats && (
                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Ostatni pomiar ({stats.latestPoint.date})
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                          {stats.latestPoint.value}
                        </span>
                        <span className="text-sm font-bold text-slate-500">
                          {stats.unit}
                        </span>
                        {stats.refRange && (
                          <span className="text-xs text-slate-500 ml-1">
                            (Norma: {stats.refRange})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${stats.statusColor}`}>
                        {stats.statusText}
                      </span>
                    </div>
                  </div>

                  {/* Trend Indicator */}
                  {stats.prevPoint && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                      {stats.delta < 0 ? (
                        <TrendingDown className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : stats.delta > 0 ? (
                        <TrendingUp className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <Minus className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        Zmiana od poprzedniego badania ({stats.prevPoint.date}):
                      </span>
                      <strong className={`font-black ${
                        stats.delta < 0 ? 'text-emerald-700' : stats.delta > 0 ? 'text-amber-700' : 'text-slate-600'
                      }`}>
                        {stats.delta > 0 ? '+' : ''}{Math.round(stats.delta * 100) / 100} {stats.unit} ({stats.delta > 0 ? '+' : ''}{Math.round(stats.deltaPercent * 10) / 10}%)
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* Visual SVG Interactive Trend Line Chart */}
              {activePoints.length > 1 && stats && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-teal-600" />
                      Krzywa zmian na osi czasu ({activePoints.length} pomiarów)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Zielony obszar = norma weterynaryjna
                    </span>
                  </div>

                  {/* SVG Chart */}
                  <div className="w-full h-44 sm:h-52 relative pt-2">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160">
                      {(() => {
                        const paddingX = 45;
                        const paddingY = 25;
                        const chartW = 500 - paddingX * 2;
                        const chartH = 160 - paddingY * 2;

                        // Range calculation
                        const allVals = activePoints.map(p => p.value);
                        if (stats.refMin !== undefined) allVals.push(stats.refMin);
                        if (stats.refMax !== undefined) allVals.push(stats.refMax);

                        const domainMin = Math.max(0, Math.min(...allVals) * 0.85);
                        const domainMax = Math.max(...allVals) * 1.15;
                        const domainRange = domainMax - domainMin || 1;

                        const getY = (val: number) => paddingY + chartH - ((val - domainMin) / domainRange) * chartH;
                        const getX = (idx: number) => paddingX + (idx / (activePoints.length - 1)) * chartW;

                        // Reference Range Shading
                        let refBox = null;
                        if (stats.refMin !== undefined && stats.refMax !== undefined) {
                          const yTop = getY(stats.refMax);
                          const yBottom = getY(stats.refMin);
                          refBox = (
                            <rect
                              x={paddingX}
                              y={yTop}
                              width={chartW}
                              height={Math.max(4, yBottom - yTop)}
                              fill="rgba(16, 185, 129, 0.12)"
                              stroke="rgba(16, 185, 129, 0.3)"
                              strokeDasharray="4 3"
                            />
                          );
                        }

                        // Path points
                        const pointsString = activePoints
                          .map((p, idx) => `${getX(idx)},${getY(p.value)}`)
                          .join(' ');

                        return (
                          <>
                            {/* Normal corridor */}
                            {refBox}

                            {/* Trend Line */}
                            <polyline
                              fill="none"
                              stroke="#0d9488"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={pointsString}
                            />

                            {/* Data points */}
                            {activePoints.map((p, idx) => {
                              const cx = getX(idx);
                              const cy = getY(p.value);
                              return (
                                <g key={idx}>
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r="6"
                                    fill="#ffffff"
                                    stroke="#0d9488"
                                    strokeWidth="3"
                                  />
                                  <text
                                    x={cx}
                                    y={cy - 10}
                                    textAnchor="middle"
                                    className="text-[11px] font-extrabold fill-slate-800 dark:fill-white font-sans"
                                  >
                                    {p.value}
                                  </text>
                                  <text
                                    x={cx}
                                    y={paddingY + chartH + 18}
                                    textAnchor="middle"
                                    className="text-[9px] font-semibold fill-slate-400 font-sans"
                                  >
                                    {p.date}
                                  </text>
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              )}

              {/* History Table of Exams */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Historia pomiarów i powiązane badania
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                  {activePoints.map((pt, idx) => (
                    <div
                      key={idx}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold shrink-0">
                          <Calendar className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-white block">
                            {pt.examTitle}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Data badania: {pt.date}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-teal-700 dark:text-teal-400">
                          {pt.value} {pt.unit}
                        </span>
                        {pt.refRange && (
                          <span className="text-[10px] text-slate-400 block">
                            Norma: {pt.refRange}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Veterinary Insight Alert */}
              <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80 flex items-start gap-2.5 text-xs text-teal-900 dark:text-teal-200 shadow-2xs">
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <span className="font-bold block">Wskazówka profilaktyczna PetCare:</span>
                  <p className="text-[11px] text-teal-800 dark:text-teal-300">
                    Pojedynczy parametr może ulegać chwilowym wahaniom (np. po posiłku lub stresie). Zawsze porównuj wyniki z normami podanymi bezpośrednio przez laboratorium i konsultuj zmiany z lekarzem prowadzącym.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
