import React, { useState, useEffect, useMemo, useId, useRef } from 'react';
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
  Building2,
  SlidersHorizontal,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { Pet } from '../types/pet';
import { 
  ALL_POLISH_CITIES, 
  calculateDistanceKm, 
  getNearestPolishCity,
  normalizePolishText 
} from '../data/polishCitiesData';
import { COMPREHENSIVE_24H_CLINICS } from '../data/emergencyClinicsData';

// Re-export for compatibility
export type { EmergencyClinic } from '../data/emergencyClinicsData';
export { COMPREHENSIVE_24H_CLINICS as VERIFIED_24H_CLINICS } from '../data/emergencyClinicsData';

interface EmergencyVetFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet?: Pet;
  onUpdatePet?: (updated: Pet) => void;
}

const STORAGE_KEY_CITY = 'petcare_user_city';
const STORAGE_KEY_COORDS = 'petcare_user_coords';

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
  const [currentCityName, setCurrentCityName] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<{
    type: 'success' | 'warning' | 'info';
    text: string;
  } | null>(null);

  // City Autocomplete state
  const [cityInputQuery, setCityInputQuery] = useState('');
  const [isCitySuggestionsOpen, setIsCitySuggestionsOpen] = useState(false);
  const [isGeocodingOnline, setIsGeocodingOnline] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);

  const [savedClinicId, setSavedClinicId] = useState<string | null>(null);

  const searchInputId = useId();
  const voivodeshipSelectId = useId();
  const citySelectId = useId();

  // Load saved location on modal open
  useEffect(() => {
    if (!isOpen) return;

    try {
      const savedCity = localStorage.getItem(STORAGE_KEY_CITY);
      const savedCoordsStr = localStorage.getItem(STORAGE_KEY_COORDS);

      if (savedCity && savedCoordsStr) {
        const coords = JSON.parse(savedCoordsStr);
        if (coords.lat && coords.lng) {
          setUserCoords(coords);
          setCurrentCityName(savedCity);
          setLocationSource('Zapisana lokalizacja');
          setLocationMessage({
            type: 'info',
            text: `Twoja zapisana lokalizacja: ${savedCity}. Kliniki posortowano od najbliższej!`,
          });
          return;
        }
      }
    } catch {
      // Ignore parsing errors
    }
  }, [isOpen]);

  // Distinct list of voivodeships
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

  // City suggestions matching cityInputQuery
  const citySuggestions = useMemo(() => {
    const q = normalizePolishText(cityInputQuery);
    if (!q || q.length < 1) return [];

    return ALL_POLISH_CITIES.filter(c => {
      const normName = normalizePolishText(c.name);
      const normVoiv = normalizePolishText(c.voivodeship);
      return normName.includes(q) || normVoiv.includes(q);
    }).slice(0, 8);
  }, [cityInputQuery]);

  // Set user location directly to a Polish city
  const handleSelectCity = (cityName: string, coords?: { lat: number; lng: number }, voivodeship?: string) => {
    let finalCoords = coords;
    let finalVoiv = voivodeship;

    if (!finalCoords) {
      const found = ALL_POLISH_CITIES.find(
        c => normalizePolishText(c.name) === normalizePolishText(cityName)
      );
      if (found) {
        finalCoords = { lat: found.lat, lng: found.lng };
        finalVoiv = found.voivodeship;
      }
    }

    if (finalCoords) {
      setUserCoords(finalCoords);
      setCurrentCityName(cityName);
      setLocationSource('Wskazane miasto');
      setIsCitySuggestionsOpen(false);
      setCityInputQuery('');
      setSelectedCity('all'); // Show all clinics sorted from this city

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY_CITY, cityName);
        localStorage.setItem(STORAGE_KEY_COORDS, JSON.stringify(finalCoords));
      } catch {
        // Ignore storage errors
      }

      setLocationMessage({
        type: 'success',
        text: `Ustawiono lokalizację: ${cityName}${finalVoiv ? ` (woj. ${finalVoiv})` : ''}. Kliniki posortowano od najbliższej!`,
      });
    }
  };

  // Online geocoding via OpenStreetMap Nominatim for any Polish village/town not in static list
  const handleGeocodeOnline = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsGeocodingOnline(true);
    setLocationMessage(null);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=pl&limit=1&q=${encodeURIComponent(
        queryText.trim()
      )}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'pl,en' },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const item = data[0];
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const name = item.name || queryText;

          handleSelectCity(name, { lat, lng });
          setIsGeocodingOnline(false);
          return;
        }
      }
      setLocationMessage({
        type: 'warning',
        text: `Nie znaleziono miejscowości "${queryText}". Wybierz jedno z podpowiedzi miast poniżej.`,
      });
    } catch {
      setLocationMessage({
        type: 'warning',
        text: 'Błąd połączenia z mapą. Wybierz miasto z listy poniżej.',
      });
    } finally {
      setIsGeocodingOnline(false);
    }
  };

  // High-accuracy GPS with deliberate user action
  const handleGetGPSLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage({
        type: 'warning',
        text: 'Twoja przeglądarka nie obsługuje geolokalizacji. Wpisz swoje miasto ręcznie w polu poniżej.',
      });
      return;
    }

    setIsLocating(true);
    setLocationMessage({
      type: 'info',
      text: 'Pobieram dokładne współrzędne z czujnika GPS telefonu/urządzenia...',
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const nearest = getNearestPolishCity(lat, lng);

        setUserCoords({ lat, lng });
        setCurrentCityName(nearest.city.name);
        setLocationSource('GPS urządzenia');
        setIsLocating(false);

        try {
          localStorage.setItem(STORAGE_KEY_CITY, nearest.city.name);
          localStorage.setItem(STORAGE_KEY_COORDS, JSON.stringify({ lat, lng }));
        } catch {
          // Ignore
        }

        setLocationMessage({
          type: 'success',
          text: `Pobrano dokładną pozycję GPS! Jesteś w pobliżu: ${nearest.city.name} (${nearest.distanceKm} km). Kliniki posortowano od najbliższej!`,
        });
      },
      (err) => {
        console.warn('GPS location error:', err);
        setIsLocating(false);
        setLocationMessage({
          type: 'warning',
          text: 'GPS niedostępny lub zablokowany w przeglądarce. Wpisz swoją miejscowość (np. Mikołów) poniżej, a natychmiast wyliczymy odległości.',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Calculate distance from user coords to every clinic
  const clinicsWithDistance = useMemo(() => {
    return COMPREHENSIVE_24H_CLINICS.map(clinic => {
      let distanceKm: number | null = null;
      if (userCoords) {
        distanceKm = calculateDistanceKm(userCoords.lat, userCoords.lng, clinic.lat, clinic.lng);
      }
      return { ...clinic, distanceKm };
    });
  }, [userCoords]);

  // Filtered and sorted clinics
  const filteredClinics = useMemo(() => {
    return clinicsWithDistance.filter(clinic => {
      // Voivodeship filter
      if (selectedVoivodeship !== 'all' && clinic.voivodeship !== selectedVoivodeship) {
        return false;
      }

      // City filter
      if (selectedCity !== 'all') {
        const normSelected = normalizePolishText(selectedCity);
        const normClinicCity = normalizePolishText(clinic.city);
        if (normClinicCity !== normSelected) {
          return false;
        }
      }

      // Radius filter
      if (maxRadiusKm !== null && clinic.distanceKm !== null && clinic.distanceKm > maxRadiusKm) {
        return false;
      }

      // Search query
      const query = normalizePolishText(searchQuery);
      if (query) {
        const matchesQuery = 
          normalizePolishText(clinic.name).includes(query) || 
          normalizePolishText(clinic.city).includes(query) || 
          normalizePolishText(clinic.address).includes(query) ||
          normalizePolishText(clinic.voivodeship).includes(query) ||
          (clinic.notes && normalizePolishText(clinic.notes).includes(query)) ||
          clinic.services?.some(s => normalizePolishText(s).includes(query));
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

  if (!isOpen) return null;

  // Google Maps search URL
  const targetSearchLocation = currentCityName || (selectedCity !== 'all' ? selectedCity : 'Polska');
  const googleMapsSearchUrl = `https://www.google.com/maps/search/${encodeURIComponent(
    `całodobowa klinika weterynaryjna ostry dyżur 24h ${targetSearchLocation}`
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
                Wszystkie miasta i gminy w Polsce • Ostre dyżury weterynaryjne 24h
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

        {/* Location & City Setting Center */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          {/* Active Location Banner */}
          <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    Twoja lokalizacja:
                  </span>
                  {currentCityName ? (
                    <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                      <span>📍 {currentCityName}</span>
                      {locationSource && (
                        <span className="text-[10px] text-emerald-600 font-semibold">({locationSource})</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 italic">
                      Nie wybrano (wpisz swoje miasto poniżej)
                    </span>
                  )}
                </div>
                {userCoords && (
                  <p className="text-[11px] text-slate-500 pl-5.5">
                    Odległości do klinik liczone od: <strong>{currentCityName}</strong>
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleGetGPSLocation}
                  disabled={isLocating}
                  className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                  title="Pobierz dokładne współrzędne z GPS w telefonie"
                >
                  <Compass className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Pobieram GPS...' : 'Pobierz z GPS'}</span>
                </button>

                {currentCityName && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserCoords(null);
                      setCurrentCityName(null);
                      setLocationSource(null);
                      localStorage.removeItem(STORAGE_KEY_CITY);
                      localStorage.removeItem(STORAGE_KEY_COORDS);
                      setLocationMessage(null);
                    }}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium transition"
                    title="Wyczyść zapisaną lokalizację"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Interactive City Autocomplete Search Bar */}
            <div className="relative pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={cityInputRef}
                    type="text"
                    placeholder="Wpisz swoje miasto (np. Mikołów, Tychy, Katowice, Warszawa...)"
                    value={cityInputQuery}
                    onChange={(e) => {
                      setCityInputQuery(e.target.value);
                      setIsCitySuggestionsOpen(true);
                    }}
                    onFocus={() => setIsCitySuggestionsOpen(true)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:outline-none transition"
                  />
                  {cityInputQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setCityInputQuery('');
                        setIsCitySuggestionsOpen(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {cityInputQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => handleGeocodeOnline(cityInputQuery)}
                    disabled={isGeocodingOnline}
                    className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shrink-0 active:scale-95 disabled:opacity-50"
                  >
                    {isGeocodingOnline ? 'Szukam...' : 'Ustaw to miasto'}
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {isCitySuggestionsOpen && cityInputQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 z-30 overflow-hidden divide-y divide-slate-100 animate-fadeIn max-h-60 overflow-y-auto">
                  {citySuggestions.length > 0 ? (
                    citySuggestions.map((city) => (
                      <button
                        key={`${city.name}-${city.voivodeship}`}
                        type="button"
                        onClick={() => handleSelectCity(city.name, { lat: city.lat, lng: city.lng }, city.voivodeship)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-rose-50 transition flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
                          <span className="text-xs font-bold text-slate-800 group-hover:text-rose-900">
                            {city.name}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            (woj. {city.voivodeship})
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-rose-600 opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
                          Wybierz <ChevronRight className="w-3 h-3" />
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center space-y-2">
                      <p className="text-xs text-slate-600">
                        Nie ma na liście podstawowej? Możemy wyszukać dowolną miejscowość w Polsce:
                      </p>
                      <button
                        type="button"
                        onClick={() => handleGeocodeOnline(cityInputQuery)}
                        className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Szukaj miejscowości &bdquo;{cityInputQuery}&rdquo; na mapie</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Popular Cities Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                Szybki wybór:
              </span>
              {[
                { name: 'Mikołów', label: '📍 Mikołów (Śląsk)' },
                { name: 'Katowice', label: 'Katowice' },
                { name: 'Tychy', label: 'Tychy' },
                { name: 'Gliwice', label: 'Gliwice' },
                { name: 'Sosnowiec', label: 'Sosnowiec' },
                { name: 'Bielsko-Biała', label: 'Bielsko-Biała' },
                { name: 'Kraków', label: 'Kraków' },
                { name: 'Warszawa', label: 'Warszawa' },
                { name: 'Wrocław', label: 'Wrocław' },
              ].map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleSelectCity(c.name)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition ${
                    currentCityName?.toLowerCase() === c.name.toLowerCase()
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Status message */}
            {locationMessage && (
              <div
                className={`text-[11px] px-3 py-1.5 rounded-xl border flex items-center justify-between gap-2 ${
                  locationMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : locationMessage.type === 'warning'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-sky-50 text-sky-800 border-sky-200'
                }`}
              >
                <span>{locationMessage.text}</span>
                <button
                  type="button"
                  onClick={() => setLocationMessage(null)}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                  aria-label="Zamknij"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Search text & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            {/* Search Input for Clinics */}
            <div className="sm:col-span-6 relative">
              <label htmlFor={searchInputId} className="sr-only">Szukaj kliniki, ulicy lub usługi</label>
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id={searchInputId}
                type="text"
                placeholder="Filtruj listę klinik (nazwa, ulica, miasto)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none placeholder:text-slate-400 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
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
                <option value="all">Wszystkie woj. (16)</option>
                {voivodeships.map((v) => (
                  <option key={v} value={v}>woj. {v}</option>
                ))}
              </select>
            </div>

            {/* Filter by City */}
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

          {/* Distance Radius Pills if Location is active */}
          {userCoords && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
                <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                Promień od {currentCityName}:
              </span>
              {[
                { label: 'Wszystkie', value: null },
                { label: '< 20 km', value: 20 },
                { label: '< 40 km', value: 40 },
                { label: '< 80 km', value: 80 },
                { label: '< 150 km', value: 150 },
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
                  <span>Szukaj w Google Maps ({currentCityName || 'okolica'})</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Clinic List */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-3.5 flex-1 text-slate-800">
          {/* Pet Alert Banner */}
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

          {/* Urgent First-Aid advice banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold text-amber-950 block">Zanim ruszysz — ZADZWOŃ do kliniki!</span>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Uprzedź lekarza o przyjeździe: przygotuje tlen, inkubator lub salę operacyjną.
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
              {currentCityName ? ` • Względem: ${currentCityName}` : ''}
              {selectedVoivodeship !== 'all' ? ` (woj. ${selectedVoivodeship})` : ''}
            </span>
            {userCoords && (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Posortowano od najbliższej
              </span>
            )}
          </div>

          {/* Zero Results Screen */}
          {filteredClinics.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 bg-white text-slate-400 rounded-2xl shadow-xs flex items-center justify-center mx-auto text-xl border border-slate-200">
                🏥
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">
                  Brak wyników w zadanym promieniu lub dla wybranego filtra
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Rozszerz promień wyszukiwania lub zobacz wszystkie dyżury w Polsce:
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
                  <span>Szukaj w Google Maps ({currentCityName || 'okolica'})</span>
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
                            {clinic.distanceKm} km od {currentCityName || 'Ciebie'}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{clinic.address} • {clinic.city} (woj. {clinic.voivodeship})</span>
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
            Dyżury 24/7 • Wszystkie miasta i gminy w Polsce • W nagłym wypadku zawsze najpierw zadzwoń
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
