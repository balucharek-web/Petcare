import React, { useState } from 'react';
import { 
  Stethoscope, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  X, 
  Sparkles, 
  Phone, 
  ArrowLeft,
  Clock,
  HeartPulse
} from 'lucide-react';
import { Pet } from '../types/pet';
import { haptics } from '../services/hapticsService';

interface SymptomCheckerModalProps {
  pet: Pet;
  onClose: () => void;
  onOpenEmergencyClinics: () => void;
}

interface SymptomCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
  questions: {
    question: string;
    options: {
      label: string;
      urgency: 'critical' | 'moderate' | 'mild';
      advice: string;
      redFlags?: string[];
    }[];
  }[];
}

const SYMPTOMS: SymptomCategory[] = [
  {
    id: 'vomiting',
    title: 'Wymioty i układ pokarmowy',
    icon: '🤢',
    description: 'Wymioty, mdłości, biegunka, wzdęty brzuch',
    questions: [
      {
        question: 'Jak często i jak długo występują wymioty?',
        options: [
          {
            label: 'Jednorazowy incydent, pupil jest wesoły i chętnie pije wodę',
            urgency: 'mild',
            advice: 'Najprawdopodobniej to chwilowa niestrawność. Wstrzymaj jedzenie na 6-8 godzin (głodówka oszczędzająca żołądek), zapewnij stały dostęp do świeżej wody. Następnie podaj małą porcję karmy lekkostrawnej.',
          },
          {
            label: 'Wymioty powtarzają się od ponad 24h, pupil jest osłabiony i nie pije',
            urgency: 'moderate',
            advice: 'Utrzymujące się wymioty grożą odwodnieniem i zaburzeniami elektrolitowymi. Skonsultuj się z lecznicą w ciągu dzisiejszego dnia.',
            redFlags: ['Odwodnienie', 'Apatia', 'Brak pragnienia'],
          },
          {
            label: 'Obecna krew w wymiotach, twardy powiększony brzuch, próby wymiotów bez treści, podejrzenie połknięcia ciała obcego lub trutki',
            urgency: 'critical',
            advice: 'NATYCHMIAST udaj się do całodobowej kliniki weterynaryjnej! Ryzyko skrętu żołądka, niedrożności jelit lub ostrego zatrucia.',
            redFlags: ['Twardy brzuch', 'Krew', 'Podejrzenie ciała obcego / trutki', 'Skręt żołądka'],
          }
        ]
      }
    ]
  },
  {
    id: 'lethargy',
    title: 'Apatia, gorączka i brak apetytu',
    icon: '😴',
    description: 'Niechęć do ruchu, chowanie się, osowiałość',
    questions: [
      {
        question: 'Od kiedy trwa osłabienie i czy pupil pije wodę?',
        options: [
          {
            label: 'Dziś jest nieco mniej aktywny, ale normalnie pije i reaguje na wołanie',
            urgency: 'mild',
            advice: 'Daj pupilowi odpocząć w cichym i ciepłym miejscu. Obserwuj temperaturę i apetyt do wieczora.',
          },
          {
            label: 'Całkowity brak apetytu i picia od ponad 24 godzin, ciepły suchy nos, dreszcze',
            urgency: 'moderate',
            advice: 'Wskazana wizyta u lekarza weterynarii celem zbadania krwi i nawodnienia kroplówką.',
            redFlags: ['Ryzyko odwodnienia', 'Możliwa gorączka'],
          },
          {
            label: 'Nie reaguje na bodźce, leży bezwładnie, zasinione lub blade dziąsła, kontakt z kleszczem w ostatnich dniach',
            urgency: 'critical',
            advice: 'STAN ZAGROŻENIA ŻYCIA. Może to być ostra babeszjoza (odkleszczowa), wstrząs lub krwotok wewnętrzny. Jedź prosto na ostry dyżur 24h!',
            redFlags: ['Blade/żółte dziąsła', 'Bezwład', 'Podejrzenie babeszjozy'],
          }
        ]
      }
    ]
  },
  {
    id: 'breathing',
    title: 'Oddychanie i kaszel',
    icon: '🫁',
    description: 'Duszność, ziajanie, kaszel, świszczący oddech',
    questions: [
      {
        question: 'W jaki sposób pupil oddycha?',
        options: [
          {
            label: 'Sporadyczny kaszel (np. po pociągnięciu obroży lub rano)',
            urgency: 'mild',
            advice: 'Zmień obrożę na szelki bezuciskowe. Jeśli kaszel powtarza się dłużej niż 2 dni, umów rutynową kontrolę osłuchową płuc i serca.',
          },
          {
            label: 'Kaszel nasilający się w spoczynku, kaszel kennelowy lub u starszego psa w nocy',
            urgency: 'moderate',
            advice: 'Konieczne badanie osłuchowe klatki piersiowej, wykluczenie zapalenia krtani lub wczesnych zmian kardiologicznych.',
          },
          {
            label: 'Sinica języka (niebieski język), oddychanie brzuchem, dławienie się, kot oddychający przez otwarty pysk',
            urgency: 'critical',
            advice: 'OSTRA NIEWYDOLNOŚĆ ODDECHOWA LUB CIAŁO OBCE W DROGACH ODDECHOWYCH. Natychmiastowy transport do kliniki w pozycji z wyciągniętą szyją!',
            redFlags: ['Sinica', 'Duszność spoczynkowa', 'Kot dyszący pyszczkiem'],
          }
        ]
      }
    ]
  },
  {
    id: 'limping',
    title: 'Kulawość i urazy kończyn',
    icon: '🐾',
    description: 'Kuleje, nie stawia łapy, skomli przy dotyku',
    questions: [
      {
        question: 'Jak wygląda kulawość?',
        options: [
          {
            label: 'Lekko utyka po intensywnym bieganiu, stawia łapę na ziemi',
            urgency: 'mild',
            advice: 'Ogranicz ruch i spacery do krótkich na smyczy przez 2-3 dni. Obejrzyj opuszki pod kątem ciał obcych (szkło, kłosy traw).',
          },
          {
            label: 'Wyraźnie unika obciążania kończyny, obrzęk stawu lub łapa jest cieplejsza',
            urgency: 'moderate',
            advice: 'Zgłoś się do lecznicy na badanie ortopedyczne i ewentualne zdjęcie RTG.',
          },
          {
            label: 'Złamanie otwarte, krwotok, nagły paraliż tylnych łap (u jamnika / kota)',
            urgency: 'critical',
            advice: 'PILNY TRANSPORT WETERYNARYJNY. Unieruchom zwierzaka na twardym kocu lub w transporterze. Nie podawaj ludzkich leków przeciwbólowych!',
            redFlags: ['Paraliż', 'Złamanie', 'Krwotok'],
          }
        ]
      }
    ]
  }
];

export const SymptomCheckerModal: React.FC<SymptomCheckerModalProps> = ({
  pet,
  onClose,
  onOpenEmergencyClinics,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SymptomCategory | null>(null);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);

  const handleSelectOption = (opt: any) => {
    if (opt.urgency === 'critical') {
      haptics.danger();
    } else if (opt.urgency === 'moderate') {
      haptics.warning();
    } else {
      haptics.success();
    }
    setSelectedResult(opt);
  };

  const handleReset = () => {
    haptics.tap();
    setSelectedCategory(null);
    setActiveQuestionIdx(0);
    setSelectedResult(null);
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-rose-100 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-slate-900 px-5 py-4 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-200 rounded-2xl border border-rose-400/30">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Asystent Wczesnych Objawów</h2>
                <span className="text-xs font-black uppercase bg-white text-rose-700 px-2 py-0.5 rounded-full shadow-xs">
                  Triage 24h
                </span>
              </div>
              <p className="text-xs text-rose-100">
                Szybka ocena pilności i pierwsza pomoc dla {pet.name}
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
          {!selectedCategory ? (
            /* Step 1: Pick symptom category */
            <div className="space-y-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Jaki niepokojący objaw zauważasz u {pet.name}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Wybierz grupę objawów, aby ocenić poziom pilności i otrzymać zalecenia pierwszej pomocy.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {SYMPTOMS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      haptics.tap();
                      setSelectedCategory(cat);
                    }}
                    className="p-3.5 rounded-2xl bg-slate-50 hover:bg-rose-50/60 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-300 transition text-left flex items-start gap-3 group cursor-pointer shadow-2xs"
                  >
                    <span className="text-2xl shrink-0 p-1.5 bg-white dark:bg-slate-700 rounded-xl shadow-2xs">
                      {cat.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-rose-700 block truncate">
                        {cat.title}
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {cat.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  Asystent objawów PetCare ma charakter orientacyjny i nie zastępuje profesjonalnego badania weterynaryjnego. W razie wątpliwości zawsze skonsultuj się z lecznicą.
                </p>
              </div>
            </div>
          ) : !selectedResult ? (
            /* Step 2: Answer specific question */
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Wróć do wyboru objawów</span>
              </button>

              <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 flex items-center gap-2.5">
                <span className="text-2xl">{selectedCategory.icon}</span>
                <div>
                  <span className="font-extrabold text-sm text-rose-950 dark:text-rose-200 block">
                    {selectedCategory.title}
                  </span>
                  <span className="text-xs text-rose-700 dark:text-rose-300">
                    Odpowiedz na poniższe pytanie, aby ocenić pilność
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {selectedCategory.questions[activeQuestionIdx]?.question}
                </h4>

                <div className="space-y-2 pt-1">
                  {selectedCategory.questions[activeQuestionIdx]?.options.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectOption(opt)}
                      className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-400 hover:bg-rose-50/30 text-left transition flex items-start justify-between gap-3 group cursor-pointer shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-rose-900 block leading-snug">
                          {opt.label}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Step 3: Result & Advice */
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedResult(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Zmień odpowiedź</span>
              </button>

              {/* Urgency Badge Banner */}
              <div className={`p-4 rounded-2xl border space-y-2 ${
                selectedResult.urgency === 'critical'
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
                  : selectedResult.urgency === 'moderate'
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
              }`}>
                <div className="flex items-center gap-2 font-black text-sm">
                  {selectedResult.urgency === 'critical' ? (
                    <>
                      <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
                      <span>PILNY OSTRY DYŻUR WETERYNARYJNY (0-2h)</span>
                    </>
                  ) : selectedResult.urgency === 'moderate' ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <span>ZALECANA KONSULTACJA W CIĄGU 24H</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>ŁAGODNY OBJAW – DOMOWA OBSERWACJA</span>
                    </>
                  )}
                </div>

                <p className="text-xs leading-relaxed font-medium">
                  {selectedResult.advice}
                </p>
              </div>

              {/* Red flags */}
              {selectedResult.redFlags && selectedResult.redFlags.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                  <span className="font-extrabold uppercase text-xs text-slate-400 block">
                    Czerwone flagi (objawy alarmowe):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedResult.redFlags.map((flag: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-xs font-bold">
                        ⚠️ {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Critical action button: Go to 24h Clinics */}
              {selectedResult.urgency === 'critical' && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.danger();
                    onClose();
                    onOpenEmergencyClinics();
                  }}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition active:scale-98 animate-pulse"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Znajdź najbliższą klinikę całodobową 24h &rarr;</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-400">
            W 100% darmowy moduł bezpieczeństwa PetCare
          </span>
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs transition cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
