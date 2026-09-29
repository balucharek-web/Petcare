import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  AlertTriangle, 
  Clock, 
  ChevronRight, 
  X, 
  Check, 
  Calendar as CalendarIcon,
  Syringe,
  Pill,
  ShieldAlert
} from 'lucide-react';
import { AlertItem, requestNotificationPermission, sendLocalNotification } from '../services/notifications';
import { NavTab } from './BottomNav';

interface AlertsBannerProps {
  alerts: AlertItem[];
  onNavigateToTab: (tab: NavTab) => void;
}

export const AlertsBanner: React.FC<AlertsBannerProps> = ({ alerts, onNavigateToTab }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  if (alerts.length === 0 || isDismissed) {
    return null;
  }

  const primaryAlert = alerts[0];
  const urgentCount = alerts.filter(a => a.severity === 'urgent').length;

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotificationStatus(res);
    if (res === 'granted' && primaryAlert) {
      sendLocalNotification(`PetCare: ${primaryAlert.title}`, {
        body: primaryAlert.description,
      });
    }
  };

  const handleClickAlert = () => {
    if (primaryAlert.type === 'vaccine' || primaryAlert.type === 'deworming') {
      onNavigateToTab('vaccinations');
    } else if (primaryAlert.type === 'medication') {
      onNavigateToTab('medications');
    } else if (primaryAlert.type === 'visit') {
      onNavigateToTab('diseases');
    } else if (primaryAlert.type === 'exam') {
      onNavigateToTab('exams');
    }
  };

  return (
    <div className="mx-4 mt-2 mb-1 animate-fadeIn">
      <div className={`rounded-2xl p-3 border shadow-xs transition ${
        primaryAlert.severity === 'urgent'
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-950'
          : 'bg-teal-500/10 border-teal-500/30 text-teal-950'
      }`}>
        <div className="flex items-start justify-between gap-2.5">
          <div 
            onClick={handleClickAlert}
            className="flex items-start gap-2.5 flex-1 cursor-pointer"
          >
            <div className={`p-1.5 rounded-xl shrink-0 ${
              primaryAlert.severity === 'urgent' ? 'bg-amber-500 text-white' : 'bg-teal-600 text-white'
            }`}>
              {primaryAlert.severity === 'urgent' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <BellRing className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs leading-snug">
                  {primaryAlert.title}
                </span>
                {alerts.length > 1 && (
                  <span className="text-[10px] bg-white/70 px-1.5 py-0.5 rounded-full font-bold">
                    +{alerts.length - 1} inne
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-80 mt-0.5 leading-tight">
                {primaryAlert.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-black/5"
            title="Ukryj powiadomienie"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action strip */}
        <div className="mt-2.5 pt-2 border-t border-black/5 flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={handleClickAlert}
            className="text-[11px] font-bold text-teal-800 hover:underline flex items-center gap-1"
          >
            <span>Szczegóły i kalendarz</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {notificationStatus !== 'granted' && (
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1 shadow-2xs transition active:scale-95"
            >
              <Bell className="w-3 h-3" />
              Włącz powiadomienia w telefonie
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
