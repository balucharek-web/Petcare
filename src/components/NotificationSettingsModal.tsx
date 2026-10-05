import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Pill,
  Syringe,
  Calendar,
  Smartphone,
  RefreshCw,
  Send,
  Sparkles,
  Stethoscope,
  FileText,
  ChevronRight,
  Check,
  Settings2,
  Trash2,
  Clock
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
import { AlertItem } from '../services/notifications';
import { NavTab } from './BottomNav';

export interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts?: AlertItem[];
  onNavigateToTab?: (tab: NavTab) => void;
  onDismissAlert?: (alertId: string) => void;
  onClearAllAlerts?: () => void;
  initialTab?: 'alerts' | 'settings';
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  alerts = [],
  onNavigateToTab,
  onDismissAlert,
  onClearAllAlerts,
  initialTab = 'alerts'
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'settings'>(initialTab);
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(getNotificationSettings());
      checkNotificationPermission().then(setHasPermission);
      setFeedback(null);
      // If there are alerts, open alerts tab; otherwise open requested initial tab
      setActiveTab(alerts.length > 0 ? 'alerts' : initialTab);
    }
  }, [isOpen, alerts.length, initialTab]);

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
        message: 'Wysłano powiadomienie! Sprawdź pasek powiadomień w telefonie.'
      });
      syncAllScheduledNotifications().catch(() => {});
    } else {
      setFeedback({
        type: 'error',
        message: 'Nie udało się wyświetlić powiadomienia. Upewnij się, że zezwoliłeś aplikacji na powiadomienia w systemie.'
      });
    }
  };

  const handleGoToAlert = (alert: AlertItem) => {
    if (!onNavigateToTab) {
      onClose();
      return;
    }

    if (alert.type === 'vaccine' || alert.type === 'deworming') {
      onNavigateToTab('vaccinations');
    } else if (alert.type === 'medication') {
      onNavigateToTab('medications');
    } else if (alert.type === 'visit') {
      onNavigateToTab('diseases');
    } else if (alert.type === 'exam') {
      onNavigateToTab('exams');
    }
    onClose();
  };

  const getAlertIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'vaccine':
        return <Syringe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'deworming':
        return <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'medication':
        return <Pill className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'visit':
        return <Stethoscope className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'exam':
        return <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      default:
        return <Bell className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
    }
  };

  const getAlertTypeName = (type: AlertItem['type']) => {
    switch (type) {
      case 'vaccine':
        return 'Szczepienie';
      case 'deworming':
        return 'Odrobaczenie';
      case 'medication':
        return 'Lekarstwo';
      case 'visit':
        return 'Wizyta weterynaryjna';
      case 'exam':
        return 'Badanie laboratoryjne';
      default:
        return 'Przypomnienie';
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-2xl">
              <BellRing className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                Centrum powiadomień
              </h2>
              <p className="text-xs sm:text-xs text-slate-500 dark:text-slate-400">
                Alerty zdrowotne, przypomnienia i ustawienia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 pb-2.5 px-3 border-b-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'alerts'
                ? 'border-teal-600 text-teal-700 dark:text-teal-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerty i przypomnienia</span>
            {alerts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs font-extrabold bg-rose-500 text-white animate-pulse">
                {alerts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 pb-2.5 px-3 border-b-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'settings'
                ? 'border-teal-600 text-teal-700 dark:text-teal-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Ustawienia powiadomień</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'alerts' && (
            <div className="space-y-3">
              {alerts.length === 0 ? (
                /* Empty state when there are NO notifications */
                <div className="py-8 px-4 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Brak nowych powiadomień
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Wszystkie szczepienia, leki i zaplanowane wizyty Twojego pupila są pod kontrolą.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col gap-2 w-full max-w-xs">
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>Dostosuj przypomnienia w telefonie</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* List of active alerts */
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Aktywne alerty ({alerts.length})
                    </span>
                    {onClearAllAlerts && (
                      <button
                        onClick={onClearAllAlerts}
                        className="text-xs font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 cursor-pointer transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Wyczyść wszystkie</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {alerts.map((alert) => {
                      const isUrgent = alert.severity === 'urgent';
                      const isWarning = alert.severity === 'warning';

                      return (
                        <div
                          key={alert.id}
                          className={`p-3.5 rounded-2xl border transition-all shadow-xs ${
                            isUrgent
                              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                              : isWarning
                              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                              : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <div
                                className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                  isUrgent
                                    ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'
                                    : isWarning
                                    ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                                    : 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400'
                                }`}
                              >
                                {getAlertIcon(alert.type)}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                      isUrgent
                                        ? 'bg-rose-200/70 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                                        : isWarning
                                        ? 'bg-amber-200/70 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                                        : 'bg-teal-200/70 dark:bg-teal-900 text-teal-800 dark:text-teal-200'
                                    }`}
                                  >
                                    {getAlertTypeName(alert.type)}
                                  </span>

                                  {alert.petName && (
                                    <span className="text-xs bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full font-medium border border-slate-200/60 dark:border-slate-700">
                                      🐾 {alert.petName}
                                    </span>
                                  )}
                                </div>

                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 leading-snug">
                                  {alert.title}
                                </h4>

                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-tight">
                                  {alert.description}
                                </p>
                              </div>
                            </div>

                            {/* Dismiss button */}
                            {onDismissAlert && (
                              <button
                                onClick={() => onDismissAlert(alert.id)}
                                title="Oznacz jako odczytane"
                                className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer shrink-0"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Quick Navigation Action */}
                          {onNavigateToTab && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {alert.daysRemaining < 0
                                  ? `Zaległe o ${Math.abs(alert.daysRemaining)} dni`
                                  : alert.daysRemaining === 0
                                  ? 'Termin dzisiaj'
                                  : `Za ${alert.daysRemaining} dni`}
                              </span>

                              <button
                                onClick={() => handleGoToAlert(alert)}
                                className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>Przejdź do szczegółów</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
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
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
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
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-xl">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                      Główny przełącznik
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Wszystkie powiadomienia w telefonie
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('enabled')}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                    settings.enabled ? 'bg-teal-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md" />
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
                      <p className="text-xs text-slate-500">
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
                      <p className="text-xs text-slate-500">
                        Alert przed zbliżającym się terminem
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
                      <p className="text-xs text-slate-500">
                        Przypomnienie przed zaplanowaną wizytą
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

              {/* Lock Screen Support Info */}
              <div className="p-3 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-2xl flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="text-xs text-teal-950 dark:text-teal-200 leading-relaxed">
                  <span className="font-bold block text-teal-900 dark:text-teal-100">Ekran blokady włączony (Android)</span>
                  Powiadomienia PetCare mają najwyższy priorytet (Heads-Up) i widoczność publiczną – wyświetlają się bezpośrednio na zablokowanym ekranie telefonu, z wibracją i dźwiękiem.
                </div>
              </div>

              {/* Test Push Notification Button */}
              <div className="pt-2">
                <button
                  onClick={handleSendTestNotification}
                  disabled={isSendingTest}
                  className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
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
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex justify-between items-center">
          <span className="text-xs text-slate-400">
            {activeTab === 'alerts'
              ? `${alerts.length} aktywnych alertów`
              : 'Konfiguracja lokalna'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
