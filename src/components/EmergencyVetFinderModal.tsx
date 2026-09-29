import React, { useState, useEffect, useMemo, useId } from 'react';
import { 
  X, 
  ShieldAlert, 
  Phone, 
  Navigation, 
  MapPin, 
  Search, 
  Compass, 
  Clock, 
  AlertTriangle, 
  Check, 
  Sparkles,
  Info,
  ChevronDown,
  Building2,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';
import { Pet } from '../types/pet';
import { ALL_POLISH_CITIES, PolishCity, calculateDistanceKm, getNearestPolishCity } from '../data/polishCitiesData';
import { COMPREHENSIVE_24H_CLINICS, EmergencyClinic } from '../data/emergencyClinicsData';

// Re-export for any existing references
export type { EmergencyClinic } from '../data/emergencyClinicsData';
export { COMPREHENSIVE_24H_CLINICS as VERIFIED_24H_CLINICS } from '../data/emergencyClinicsData';

interface EmergencyVetFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet?: Pet;
  onUpdatePet?: (updated: Pet) => void;
}

export const EmergencyVetFinderModal: React.FC<EmergencyVetFinderModalProps> = ({
  isOpen,
  onClose,
  pet,
  onUpdatePet,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedVoivodeship, setSelectedVoivodeship] = useState<string>('all');
  const [maxRadiusKm, setMaxRadiusKm] = useState<number | null>(null);

  // User coordinate states
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [savedClinicId, setSavedClinicId] = useState<string | null>(null);

  // Unique IDs for accessible form controls
  const myLocationSelectId = useId();
  const searchInputId = useId();
  const voivodeshipSelectId = useId();
  const citySelectId = useId();

  // Distinct list of voivodeships from all cities & clinics
  const voivodeships = useMemo(() => {
    const set = new Set<string>();
    ALL_POLISH_CITIES.forEach(c => set.add(c.voivodeship));
    COMPREHENSIVE_24H_CLINICS.forEach(c => set.add(c.voivodeship));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pl'));
  }, []);

  // Filtered cities based on selected voivodeship
  const availableCities = useMemo(() => {
    let cities = ALL_POLISH_CITIES;
    if (selectedVoivodeship !== 'all') {
      cities = cities.filter(c => c.voivodeship === selectedVoivodeship);
    }
    return [...cities].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [selectedVoivodeship]);

  // Try GPS with graceful multi-tier fallback
  const handleGetLocation = () => {
    setIsLocating(true);
    setLocationStatus(null);

    if (!navigator.geolocation) {
      fallbackToNetworkLocation('Przeglądarka nie obsługuje GPS. Ustalanie lokalizacji sieciowej...');
      return;
    }

    // Step 1: Rapid low-accuracy position (uses Wi-Fi / cellular base, works instantly indoors and in web browsers)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoordinates(pos.coords.latitude, pos.coords.longitude, 'Lokalizacja GPS (dokładna)');
        setIsLocating(false);
      },
      (err) => {
        console.warn('Fast geolocation failed or denied, trying IP network fallback:', err.message);
        fallbackToNetworkLocation('GPS niedostępny lub zablokowany. Próbuję lokalizacji sieciowej (IP)...');
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000,
      }
    );
  };

  // Fallback: network IP location or prompt to pick Polish city
  const fallbackToNetworkLocation = async (infoMsg: string) => {
    setLocationStatus({
      type: 'info',
      message: infoMsg,
    });

    try {
      const response = await fetch('https://freeipapi.com/api/json', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.latitude && data.longitude) {
          const detectedCity = data.cityName || 'Polska';
          applyCoordinates(
            Number(data.latitude),
            Number(data.longitude),
            `Lokalizacja sieciowa (~${detectedCity})`
          );
          setIsLocating(false);
          return;
        }
      }
    } catch {
      // Ignore network timeout
    }

    // If both GPS and IP fail, give clear user guidance without stopping them
    setIsLocating(false);
    setLocationStatus({
      type: 'warning',
      message: 'Nie udało się pobrać lokalizacji automatycznie. Wybierz swoje miasto z listy poniżej, a natychmiast posortujemy kliniki od najbliższej.',
    });
  };

  const applyCoordinates = (lat: number, lng: number, sourceLabel: string) => {
    setUserCoords({ lat, lng });
    const nearest = getNearestPolishCity(lat, lng);
    setLocationLabel(`${sourceLabel} • w pobliżu: ${nearest.city.name} (${nearest.distanceKm} km)`);
    setLocationStatus({
      type: 'success',
      message: `Znaleziono Twoją pozycję w pobliżu: ${nearest.city.name}. Kliniki posortowano od najbliższej!`,
    });
  };

  // Set user location manually by picking a Polish city
  const handleSelectUserCity = (cityName: string) => {
    const found = ALL_POLISH_CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    if (found) {
      setUserCoords({ lat: found.lat, lng: found.lng });
      setLocationLabel(`Twoje miasto: ${found.name} (${found.voivodeship})`);
      setLocationStatus({
        type: 'success',
        message: `Ustawiono lokalizację: ${found.name}. Wszystkie kliniki posortowano wg odległości od ${found.name}!`,
      });
      // Reset city filter to 'all' so nearby clinics in neighboring cities are immediately visible
      setSelectedCity('all');
    }
  };

  // Automatically attempt geolocation when opened if not yet set
  useEffect(() => {
    if (isOpen && !userCoords && !isLocating) {
      handleGetLocation();
    }
  }, [isOpen]);

  // Compute clinics with distance and filtering
  const clinicsWithDistance = useMemo(() => {
    return COMPREHENSIVE_24H_CLINICS.map(clinic => {
      let distanceKm: number | null = null;
      if (userCoords) {
        distanceKm = calculateDistanceKm(userCoords.lat, userCoords.lng, clinic.lat, clinic.lng);
      }
      return { ...clinic, distanceKm };
    });
  }, [userCoords]);

  const filteredClinics = useMemo(() => {
    return clinicsWithDistance.filter(clinic => {
      // Voivodeship filter
      if (selectedVoivodeship !== 'all' && clinic.voivodeship !== selectedVoivodeship) {
        return false;
      }

      // City filter
      if (selectedCity !== 'all' && clinic.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }

      // Radius filter (if location is known)
      if (maxRadiusKm !== null && clinic.distanceKm !== null && clinic.distanceKm > maxRadiusKm) {
        return false;
      }

      // Search query
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matchesQuery = 
          clinic.name.toLowerCase().includes(query) || 
          clinic.city.toLowerCase().includes(query) || 
          clinic.address.toLowerCase().includes(query) ||
          clinic.voivodeship.toLowerCase().includes(query) ||
          clinic.notes?.toLowerCase().includes(query) ||
          clinic.services?.some(s => s.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      return true;
    }).sort((a, b) => {
      // If distance available, sort strictly by distance
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return a.city.localeCompare(b.city, 'pl');
    });
  }, [clinicsWithDistance, selectedVoivodeship, selectedCity, maxRadiusKm, searchQuery]);

  // Nearest clinic overall (if location known)
  const nearestClinic = useMemo(() => {
    if (!userCoords || filteredClinics.length === 0) return null;
    return filteredClinics[0];
  }, [userCoords, filteredClinics]);

  if (!isOpen) return null;

  // Google Maps search URL for custom town
  const activeCityName = selectedCity !== 'all' ? selectedCity : (locationLabel ? locationLabel.split('•')[0] : 'Polska');
  const googleMapsSearchUrl = `https://www.google.com/maps/search/${encodeURIComponent(
    `całodobowa klinika weterynaryjna ostry dyżur weterynarz 24h ${selectedCity !== 'all' ? selectedCity : ''}`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-rose-100 flex flex-col max-h-[94vh]">
        {/* Urgent Header */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 px-4 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md shadow-xs">
              <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">Kliniki Całodobowe 24/7</h2>
                <span className="text-[10px] font-black uppercase bg-white text-rose-700 px-2 py-0.5 rounded-full shadow-xs">
                  SOS Polska
                </span>
              </div>
              <p className="text-xs text-rose-100">
                Wszystkie miasta i województwa • Ostry dyżur weterynaryjny i pogotowie
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Controls: Location & City Hub */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          {/* Geolocation & Manual Location Setter */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Compass className={`w-4 h-4 text-rose-600 ${isLocating ? 'animate-spin' : ''}`} />
                <span>Twoja lokalizacja:</span>
                {locationLabel ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {locationLabel}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 font-normal">
                    {isLocating ? 'Ustalam współrzędne...' : 'Nieustalona'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  title="Pobierz lokalizację z GPS w telefonie/komputerze"
                >
                  <Compass className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Pobieram GPS...' : 'Pobierz GPS'}</span>
                </button>
              </div>
            </div>

            {/* Quick Polish City Setter Dropdown */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-slate-100">
              <label htmlFor={myLocationSelectId} className="text-[11px] font-medium text-slate-600 flex items-center gap-1 shrink-0">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Ustaw ręcznie swoje miasto (Polska):</span>
              </label>
              <div className="flex-1 relative">
                <select
                  id={myLocationSelectId}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectUserCity(e.target.value);
                    }
                  }}
                  defaultValue=""
                  className="w-full py-1.5 px-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-rose-500 focus:outline-none transition"
                >
                  <option value="" disabled>-- Wybierz swoje miasto (obliczy odległość km) --</option>
                  {ALL_POLISH_CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.voivodeship}) {c.isVoivodeshipCapital ? '★' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Feedback message banner if any */}
            {locationStatus && (
              <div
                className={`text-[11px] px-3 py-1.5 rounded-xl border flex items-center justify-between gap-2 ${
                  locationStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : locationStatus.type === 'warning'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-sky-50 text-sky-800 border-sky-200'
                }`}
              >
                <span>{locationStatus.message}</span>
                <button
                  type="button"
                  onClick={() => setLocationStatus(null)}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                  aria-label="Zamknij powiadomienie"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Search text & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <label htmlFor={searchInputId} className="sr-only">Szukaj miasta, kliniki lub ulicy</label>
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id={searchInputId}
                type="text"
                placeholder="Szukaj miasta, kliniki, ulicy lub usługi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none placeholder:text-slate-400 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  aria-label="Wyczyść wyszukiwanie"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter by Voivodeship */}
            <div className="sm:col-span-3">
              <label htmlFor={voivodeshipSelectId} className="sr-only">Województwo</label>
              <select
                id={voivodeshipSelectId}
                value={selectedVoivodeship}
                onChange={(e) => {
                  setSelectedVoivodeship(e.target.value);
                  setSelectedCity('all');
                }}
                className="w-full py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="all">Cała Polska (16 woj.)</option>
                {voivodeships.map((v) => (
                  <option key={v} value={v}>woj. {v}</option>
                ))}
              </select>
            </div>

            {/* Filter by specific City */}
            <div className="sm:col-span-3">
              <label htmlFor={citySelectId} className="sr-only">Miasto</label>
              <select
                id={citySelectId}
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="all">Wszystkie miasta</option>
                {availableCities.map((city) => (
                  <option key={city.name} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Distance Radius Pills if User Location is active */}
          {userCoords && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
                <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                Promień:
              </span>
              {[
                { label: 'Wszystkie', value: null },
                { label: '< 25 km', value: 25 },
                { label: '< 50 km', value: 50 },
                { label: '< 100 km', value: 100 },
                { label: '< 200 km', value: 200 },
              ].map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => setMaxRadiusKm(pill.value)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                    maxRadiusKm === pill.value
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}

              <div className="ml-auto">
                <a
                  href={googleMapsSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-slate-700 hover:text-rose-700 inline-flex items-center gap-1 underline underline-offset-2"
                >
                  <Navigation className="w-3 h-3 text-teal-600" />
                  <span>Szukaj na mapie Google</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Clinic List */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-3.5 flex-1 text-slate-800">
          {/* Pet Alert & Pre-trip Advice */}
          {pet && (
            <div className="bg-rose-50/70 border border-rose-200/90 rounded-2xl p-3 flex items-center justify-between text-xs text-rose-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-sm">
                  🐾
                </div>
                <div>
                  <span className="font-black text-slate-900">{pet.name}</span>
                  <span className="text-slate-600 text-[11px] block">
                    {pet.species === 'dog' ? 'Pies' : pet.species === 'cat' ? 'Kot' : 'Zwierzak'} • {pet.weightKg} kg
                    {pet.chipNumber ? ` • Chip: ${pet.chipNumber}` : ''}
                  </span>
                </div>
              </div>
              {pet.allergies && (
                <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded-lg font-bold">
                  Alergie: {pet.allergies}
                </span>
              )}
            </div>
          )}

          {/* Urgent First-Aid banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold text-amber-950 block">Zanim ruszysz — ZADZWOŃ do kliniki!</span>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Uprzedź lekarza o przyjeździe: przygotuje tlen, inkubator lub stół operacyjny.
                <strong className="font-bold text-rose-800 ml-1">
                  Nigdy nie podawaj psu ani kotu ludzkiego paracetamolu, ibuprofenu ani aspiryny.
                </strong>
              </p>
            </div>
          </div>

          {/* Results Summary Header */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>
              Kliniki całodobowe: <strong className="text-slate-800">{filteredClinics.length}</strong>
              {selectedCity !== 'all' ? ` dla miasta ${selectedCity}` : ''}
              {selectedVoivodeship !== 'all' ? ` (woj. ${selectedVoivodeship})` : ''}
            </span>
            {userCoords && (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Posortowano od najbliższej
              </span>
            )}
          </div>

          {/* Zero Results Screen with fallback to Google Maps and Nearby Cities */}
          {filteredClinics.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 bg-white text-slate-400 rounded-2xl shadow-xs flex items-center justify-center mx-auto text-xl border border-slate-200">
                🏥
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">
                  Brak zarejestrowanej kliniki 24h dla wybranych kryteriów
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Niektóre mniejsze miejscowości nie posiadają szpitala 24h na swoim terenie. Zmień filtr na całe województwo lub skorzystaj z mapy Google:
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCity('all');
                    setSelectedVoivodeship('all');
                    setMaxRadiusKm(null);
                    setSearchQuery('');
                  }}
                  className="py-2 px-3.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Pokaż wszystkie kliniki w Polsce
                </button>

                <a
                  href={googleMapsSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5 text-rose-200" />
                  <span>Szukaj dyżuru 24h w Google Maps</span>
                </a>
              </div>
            </div>
          ) : (
            filteredClinics.map((clinic, index) => {
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${clinic.lat},${clinic.lng}`;
              const isNearest = index === 0 && clinic.distanceKm !== null;

              return (
                <div
                  key={clinic.id}
                  className={`bg-white border rounded-2xl p-4 shadow-xs transition space-y-3 ${
                    isNearest
                      ? 'border-emerald-300 ring-2 ring-emerald-100 bg-gradient-to-b from-emerald-50/20 to-white'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                          {clinic.name}
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          24h / 7 dni
                        </span>

                        {isNearest && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                            ★ NAJBLIŻSZY DYŻUR
                          </span>
                        )}

                        {clinic.distanceKm !== null && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                            {clinic.distanceKm} km stąd
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{clinic.address} • woj. {clinic.voivodeship}</span>
                      </p>

                      {clinic.notes && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
                          {clinic.notes}
                        </p>
                      )}

                      {clinic.services && clinic.services.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          {clinic.services.map((srv) => (
                            <span
                              key={srv}
                              className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                            >
                              {srv}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Direct 1-Tap Dial & GPS Navigation */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <a
                      href={`tel:${clinic.phone.replace(/\s+/g, '')}`}
                      className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 text-center"
                    >
                      <Phone className="w-3.5 h-3.5 animate-pulse" />
                      <span className="truncate">Zadzwoń: {clinic.phone}</span>
                    </a>

                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 text-center"
                    >
                      <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Trasa (Nawiguj)</span>
                    </a>
                  </div>

                  {/* Save as primary emergency contact for pet */}
                  {pet && onUpdatePet && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePet({
                          ...pet,
                          emergencyClinicPhone: clinic.phone,
                          emergencyClinicName: clinic.name,
                        });
                        setSavedClinicId(clinic.id);
                        setTimeout(() => setSavedClinicId(null), 3000);
                      }}
                      className={`w-full py-1.5 px-3 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 border ${
                        pet.emergencyClinicPhone === clinic.phone || savedClinicId === clinic.id
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {pet.emergencyClinicPhone === clinic.phone || savedClinicId === clinic.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Zapisano jako główny dyżur 24h dla {pet.name} (w profilu i SOS)</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                          <span>Ustaw jako główny dyżur ratunkowy w profilu i karcie SOS</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs shrink-0">
          <span className="text-slate-500 text-[11px] text-center sm:text-left">
            Dyżury 24/7 • Wszystkie 16 województw w Polsce • W nagłym wypadku zawsze najpierw zadzwoń
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-2 px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
