import React from 'react';
import { Heart, Pill, Stethoscope, Calendar, LayoutGrid } from 'lucide-react';

export type NavTab = 'profile' | 'medications' | 'vaccinations' | 'exams' | 'diseases' | 'calendar';

export const HEALTH_TABS: NavTab[] = ['vaccinations', 'exams', 'diseases'];

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenMore: () => void;
  activeMedsCount?: number;
  expiringVaccinesCount?: number;
}

type NavItem = {
  key: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  isActive: boolean;
  onSelect: () => void;
  badge?: number;
  badgeLabel?: string;
};

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  onOpenMore,
  activeMedsCount = 0,
  expiringVaccinesCount = 0,
}) => {
  const items: NavItem[] = [
    { key: 'profile', label: 'Zwierzak', icon: Heart, isActive: currentTab === 'profile', onSelect: () => onTabChange('profile') },
    {
      key: 'health',
      label: 'Zdrowie',
      icon: Stethoscope,
      isActive: HEALTH_TABS.includes(currentTab),
      onSelect: () => onTabChange(HEALTH_TABS.includes(currentTab) ? currentTab : 'vaccinations'),
      badge: expiringVaccinesCount,
      badgeLabel: 'szczepień wymaga uwagi',
    },
    {
      key: 'medications',
      label: 'Leki',
      icon: Pill,
      isActive: currentTab === 'medications',
      onSelect: () => onTabChange('medications'),
      badge: activeMedsCount,
      badgeLabel: 'aktywnych leków',
    },
    { key: 'calendar', label: 'Kalendarz', icon: Calendar, isActive: currentTab === 'calendar', onSelect: () => onTabChange('calendar') },
    { key: 'more', label: 'Więcej', icon: LayoutGrid, isActive: false, onSelect: onOpenMore },
  ];

  return (
    <nav
      aria-label="Główna nawigacja"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 shadow-lg pb-[env(safe-area-inset-bottom,0px)] transition-colors"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 sm:h-[4.25rem] px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const showBadge = !!item.badge && item.badge > 0 && !item.isActive;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onSelect}
              aria-current={item.isActive ? 'page' : undefined}
              aria-label={showBadge ? `${item.label} (${item.badge} ${item.badgeLabel})` : item.label}
              className="relative flex flex-col items-center justify-center gap-1 min-h-12 select-none active:scale-95 transition min-w-0"
            >
              <span
                className={`relative px-4 py-1 rounded-2xl transition-all duration-200 ${
                  item.isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${item.isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                {showBadge && (
                  <span aria-hidden="true" className="absolute -top-1 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white rounded-full text-[11px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </span>
              <span
                className={`text-xs leading-tight truncate w-full text-center ${
                  item.isActive ? 'font-bold text-teal-700 dark:text-teal-300' : 'font-semibold text-slate-700 dark:text-slate-300'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
