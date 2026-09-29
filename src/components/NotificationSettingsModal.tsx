import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  X,
  CheckCircle2,
  AlertCircle,
  Pill,
  Syringe,
  Calendar,
  Smartphone,
  RefreshCw,
  Send
} from 'lucide-react';
import {
  getNotificationSettings,
  saveNotificationSettings,
  checkNotificationPermission,
  requestNotificationPermission,
  sendInstantNotification,
  syncAllScheduledNotifications,
  NotificationSettings
} from '../services/notificationService';
import { storage } from '../services/storage';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(getNotificationSettings());
      checkNotificationPermission().then(setHasPermission);
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof NotificationSettings) => {
    const updated = saveNotificationSettings({ [key]: !settings[key] });
    setSettings(updated);
    syncAllScheduledNotifications().catch(() => {});
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setHasPermission(granted);
    if (granted) {
      setFeedback({
        type: 'success',
        message: 'Uprawnienia do powiadomień zostały pomyślnie przyznane!'
      });
      syncAllScheduledNotifications().catch(() => {});
    } else {
      setFeedback({
        type: 'error',
        message: 'Uprawnienia zostały odrzucone w ustawieniach systemu Android.'
      });
    }
  };

  const handleSendTestNotification = async () => {
    setIsSendingTest(true);
    setFeedback(null);

    const allPets = storage.getPets();
    const activePet = allPets.find(p => p.id === storage.getActivePetId()) || allPets[0];
    const petName = activePet?.name || 'Twój pupil';

    const success = await sendInstantNotification(
      `🐾 PetCare: Przypomnienie dla ${petName}`,
      `Powiadomienia w telefonie działają prawidłowo! Będziesz otrzymywać przypomnienia o lekach, szczepieniach i wizytach.`
    );

    setIsSendingTest(false);

    if (success) {
      setHasPermission(true);
      setFeedback({
        type: 'success',
        message: 'Wysłano powiadomienie! Sprawdź górny pasek powiadomień w telefonie.'
      });
      syncAllScheduledNotifications().catch(() => {});
    } else {
      setFeedback({
        type: 'error',
        message: 'Nie udało się wyświetlić powiadomienia. Upewnij się, że zezwoliłeś aplikacji na powiadomienia.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-2xl">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Powiadomienia w telefonie
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Przypomnienia o lekach, szczepieniach i wizytach
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Permission Status Banner */}
          {!hasPermission ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Wymagane zezwolenie na powiadomienia
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
                  Aby telefon mógł przypominać o lekach w wyznaczonych godzinach, nadaj uprawnienie.
                </p>
                <button
                  onClick={handleRequestPermission}
                  className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Włącz powiadomienia w systemie
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                  Powiadomienia Android aktywne
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                Zezwolono
              </span>
            </div>
          )}

          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Master Switch */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-xl">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Główny przełącznik
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Wszystkie powiadomienia w telefonie
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('enabled')}
              className={`w-12 h-6.5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                settings.enabled ? 'bg-teal-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <div className="w-5 h-5 bg-white rounded-full shadow-md" />
            </button>
          </div>

          {/* Category Toggles */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Kategorie powiadomień
            </p>

            {/* Medications */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Przypomnienia o lekach
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Powiadomienie o porannych i wieczornych dawkach
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('medications')}
                disabled={!settings.enabled}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                  settings.enabled && settings.medications
                    ? 'bg-teal-600 justify-end'
                    : 'bg-slate-300 dark:bg-slate-700 justify-start opacity-60'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-xs" />
              </button>
            </div>

            {/* Vaccinations */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Syringe className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Szczepienia i odrobaczanie
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Alert 2 dni przed wymaganym terminem
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('vaccinations')}
                disabled={!settings.enabled}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                  settings.enabled && settings.vaccinations
                    ? 'bg-teal-600 justify-end'
                    : 'bg-slate-300 dark:bg-slate-700 justify-start opacity-60'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-xs" />
              </button>
            </div>

            {/* Visits */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Wizyty u weterynarza
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Przypomnienie dzień przed zaplanowaną wizytą
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('visits')}
                disabled={!settings.enabled}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                  settings.enabled && settings.visits
                    ? 'bg-teal-600 justify-end'
                    : 'bg-slate-300 dark:bg-slate-700 justify-start opacity-60'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-xs" />
              </button>
            </div>
          </div>

          {/* Test Push Notification Button */}
          <div className="pt-2">
            <button
              onClick={handleSendTestNotification}
              disabled={isSendingTest}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer text-sm"
            >
              {isSendingTest ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Wysyłanie powiadomienia...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Wyślij powiadomienie testowe na telefon</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
