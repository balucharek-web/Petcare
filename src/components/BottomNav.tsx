import React from 'react';
import { 
  Heart, 
  Pill, 
  Syringe, 
  FileSearch, 
  Stethoscope, 
  Calendar 
} from 'lucide-react';

export type NavTab = 'profile' | 'medications' | 'vaccinations' | 'exams' | 'diseases' | 'calendar';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeMedsCount?: number;
  expiringVaccinesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  activeMedsCount = 0,
  expiringVaccinesCount = 0,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'profile', label: 'Zwierzak', icon: Heart },
    { id: 'medications', label: 'Leki', icon: Pill, badge: activeMedsCount },
    { id: 'vaccinations', label: 'Szczepienia', icon: Syringe, badge: expiringVaccinesCount },
    { id: 'exams', label: 'Badania', icon: FileSearch },
    { id: 'diseases', label: 'Wizyty', icon: Stethoscope },
    { id: 'calendar', label: 'Kalendarz', icon: Calendar },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-lg pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md mx-auto grid grid-cols-6 h-[4.25rem] px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center gap-1 select-none active:scale-95 transition"
            >
              {/* Active pill background effect */}
              <div 
                className={`relative p-1.5 px-3 rounded-2xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-teal-600 text-white shadow-sm -translate-y-0.5' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                {!!tab.badge && tab.badge > 0 && !isActive && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-teal-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] leading-tight transition-colors ${
                  isActive ? 'font-extrabold text-teal-700' : 'font-semibold text-slate-600'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
