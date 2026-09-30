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
  RotateCcw,
  LocateFixed,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { Pet } from '../types/pet';
import { 
  ALL_POLISH_CITIES, 
  calculateDistanceKm, 
  getNearestPolishCity,
  getNearbyCities,
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
  const [detectedVoivodeship, setDetectedVoivodeship] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<{
    type: 'success' | 'warning' | 'info';
    text: string;
  } | null>(null);

  // System notification card when GPS is off/disabled/denied
  const [showGpsDisabledNotice, setShowGpsDisabledNotice] = useState(false);
  const [showGpsInstructions, setShowGpsInstructions] = useState(false);
  const [gpsErrorCode, setGpsErrorCode] = useState<number | null>(null);

  // City & Village Autocomplete search state
  const [cityInputQuery, setCityInputQuery] = useState('');
  const [isCitySuggestionsOpen, setIsCitySuggestionsOpen] = useState(false);
  const [isGeocodingOnline, setIsGeocodingOnline] = useState(false);
  const [onlineSuggestions, setOnlineSuggestions] = useState<Array<{
    name: string;
    type: string;
    details: string;
    voivodeship: string;
    lat: number;
    lng: number;
  }>>([]);
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
      } else {
        // If user has no saved location, ask if they want to enable GPS
        setShowGpsDisabledNotice(true);
      }
    } catch {
      // Ignore parsing errors
    }
  }, [isOpen]);

  // Check browser geolocation permission status on open
  useEffect(() => {
    if (!isOpen || !navigator.permissions?.query) return;

    try {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        if (status.state === 'denied') {
          setShowGpsDisabledNotice(true);
          setGpsErrorCode(1);
        }
      }).catch(() => {
        // Ignore permission query error on browsers without full support
      });
    } catch {
      // Ignore
    }
  }, [isOpen]);

  // Debounced search for any Polish village, town, or city (Nominatim + Polish Administrative Registry)
  useEffect(() => {
    const trimmed = cityInputQuery.trim();
    if (trimmed.length < 2) {
      setOnlineSuggestions([]);
      setIsGeocodingOnline(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsGeocodingOnline(true);
      try {
        // Try server-side proxy route with caching and official User-Agent
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.results)) {
            setOnlineSuggestions(data.results);
            setIsGeocodingOnline(false);
            return;
          }
        }
      } catch {
        // Fallback to client-side Nominatim query
        try {
          const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=pl&addressdetails=1&limit=8&q=${encodeURIComponent(trimmed)}`;
          const fallbackRes = await fetch(fallbackUrl, {
            headers: { 'Accept-Language': 'pl,en' },
            signal: AbortSignal.timeout(5000),
          });
          if (fallbackRes.ok) {
            const items = await fallbackRes.json();
            if (Array.isArray(items)) {
              const mapped = items.map((item: any) => {
                const addr = item.address || {};
                const rawName = addr.village || addr.town || addr.city || addr.hamlet || addr.suburb || item.name || trimmed;
                const gmina = (addr.municipality || '').replace(/^gmina\s+/i, '');
                const county = addr.county || '';
                const voiv = (addr.state || '').replace(/^województwo\s+/i, '');
                let type = 'miejscowość';
                if (addr.village || item.type === 'village' || item.type === 'hamlet') type = 'wieś';
                else if (addr.town || item.type === 'town') type = 'miasto';
                else if (addr.city || item.type === 'city') type = 'miasto';
                const parts: string[] = [];
                if (gmina && gmina.toLowerCase() !== rawName.toLowerCase()) parts.push(`gm. ${gmina}`);
                if (county) parts.push(county);
                if (voiv) parts.push(`woj. ${voiv}`);
                return {
                  name: rawName,
                  type,
                  details: parts.join(', '),
                  voivodeship: voiv || 'Polska',
                  lat: parseFloat(item.lat),
                  lng: parseFloat(item.lon),
                };
              });
              setOnlineSuggestions(mapped);
              setIsGeocodingOnline(false);
              return;
            }
          }
        } catch {
          // If offline or failed, keep empty
        }
      }
      setIsGeocodingOnline(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [cityInputQuery]);

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

  // Combined suggestions: Fast local cache + OpenStreetMap results for every village
  const combinedSuggestions = useMemo(() => {
    const q = normalizePolishText(cityInputQuery);
    if (!q || q.length < 1) return [];

    // Local static matches
    const staticMatches = ALL_POLISH_CITIES.filter(c => {
      const normName = normalizePolishText(c.name);
      const normVoiv = normalizePolishText(c.voivodeship);
      return normName.includes(q) || normVoiv.includes(q);
    }).slice(0, 5).map(c => ({
      name: c.name,
      type: 'miasto',
      details: `pow. ${c.name}, woj. ${c.voivodeship}`,
      voivodeship: c.voivodeship,
      lat: c.lat,
      lng: c.lng,
    }));

    const seen = new Set(staticMatches.map(s => `${normalizePolishText(s.name)}_${normalizePolishText(s.voivodeship)}`));
    const uniqueOnline = onlineSuggestions.filter(o => {
      const key = `${normalizePolishText(o.name)}_${normalizePolishText(o.voivodeship)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return [...staticMatches, ...uniqueOnline].slice(0, 10);
  }, [cityInputQuery, onlineSuggestions]);

  // Nearby cities suggestions dynamically computed when user is located
  const nearbyCities = useMemo(() => {
    if (!userCoords) return [];
    return getNearbyCities(userCoords.lat, userCoords.lng, 8, 55);
  }, [userCoords]);

  // Set user location directly to any village, town, or city
  const handleSelectCity = (
    cityName: string, 
    coords?: { lat: number; lng: number }, 
    voivodeship?: string,
    details?: string
  ) => {
    let finalCoords = coords;
    let finalVoiv = voivodeship;
    let finalDetails = details;

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
      const fullLabel = finalDetails ? `${cityName} (${finalDetails})` : (finalVoiv ? `${cityName} (woj. ${finalVoiv})` : cityName);
      setCurrentCityName(fullLabel);
      setDetectedVoivodeship(finalVoiv || null);
      setLocationSource('Wskazana miejscowość');
      setIsCitySuggestionsOpen(false);
      setCityInputQuery('');
      setSelectedCity('all'); // Show all clinics sorted from this exact point
      setShowGpsDisabledNotice(false);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY_CITY, fullLabel);
        localStorage.setItem(STORAGE_KEY_COORDS, JSON.stringify(finalCoords));
      } catch {
        // Ignore storage errors
      }

      setLocationMessage({
        type: 'success',
        text: `Ustawiono lokalizację: ${fullLabel}. Kliniki posortowano od najbliższej!`,
      });
    }
  };

  // Immediate geocoding for any village/town submitted via search button or Enter
  const handleGeocodeOnline = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsGeocodingOnline(true);
    setLocationMessage(null);

    try {
      // First check if already in suggestions
      if (combinedSuggestions.length > 0) {
        const top = combinedSuggestions[0];
        handleSelectCity(top.name, { lat: top.lat, lng: top.lng }, top.voivodeship, top.details);
        setIsGeocodingOnline(false);
        return;
      }

      // Query server endpoint
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(queryText.trim())}`, {
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.results && data.results.length > 0) {
          const item = data.results[0];
          handleSelectCity(item.name, { lat: item.lat, lng: item.lng }, item.voivodeship, item.details);
          setIsGeocodingOnline(false);
          return;
        }
      }

      // Direct fallback
      const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=pl&limit=1&addressdetails=1&q=${encodeURIComponent(queryText.trim())}`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { 'Accept-Language': 'pl,en' },
        signal: AbortSignal.timeout(5000),
      });

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (fallbackData && fallbackData.length > 0) {
          const item = fallbackData[0];
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const addr = item.address || {};
          const name = addr.village || addr.town || addr.city || item.name || queryText;
          const voiv = (addr.state || '').replace(/^województwo\s+/i, '');
          const gmina = (addr.municipality || '').replace(/^gmina\s+/i, '');
          const county = addr.county || '';
          const parts: string[] = [];
          if (gmina) parts.push(`gm. ${gmina}`);
          if (county) parts.push(county);
          if (voiv) parts.push(`woj. ${voiv}`);

          handleSelectCity(name, { lat, lng }, voiv, parts.join(', '));
          setIsGeocodingOnline(false);
          return;
        }
      }

      setLocationMessage({
        type: 'warning',
        text: `Nie znaleziono miejscowości "${queryText}". Sprawdź pisownię lub wybierz miasto z listy.`,
      });
    } catch {
      setLocationMessage({
        type: 'warning',
        text: 'Błąd wyszukiwania na mapie. Wybierz miejscowość z listy.',
      });
    } finally {
      setIsGeocodingOnline(false);
    }
  };

  // Ultra-Accurate GPS with Reverse Geocoding and strict fresh coordinates
  const handleGetGPSLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage({
        type: 'warning',
        text: 'Twoja przeglądarka nie obsługuje geolokalizacji. Wpisz swoją miejscowość ręcznie w polu poniżej.',
      });
      setShowGpsDisabledNotice(true);
      return;
    }

    setIsLocating(true);
    setLocationMessage({
      type: 'info',
      text: 'Pobieram dokładne współrzędne z czujnika GPS urządzenia (satelity/nadajniki)...',
    });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 0);

        let detectedPlaceName = '';
        let detectedVoiv = '';
        let detectedDetails = '';

        // Reverse geocoding via backend proxy to get exact village and voivodeship
        try {
          const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`, {
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.location) {
              detectedPlaceName = data.location.name;
              detectedVoiv = data.location.voivodeship;
              detectedDetails = data.location.details;
            }
          }
        } catch {
          // Direct client fallback to OpenStreetMap reverse geocoding
          try {
            const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
            const nomRes = await fetch(nomUrl, {
              headers: { 'Accept-Language': 'pl,en' },
              signal: AbortSignal.timeout(4000),
            });
            if (nomRes.ok) {
              const data = await nomRes.json();
              const addr = data.address || {};
              detectedPlaceName = addr.village || addr.town || addr.city || addr.hamlet || addr.suburb || addr.municipality || '';
              detectedVoiv = (addr.state || '').replace(/^województwo\s+/i, '');
              const gmina = (addr.municipality || '').replace(/^gmina\s+/i, '');
              const county = addr.county || '';
              const parts: string[] = [];
              if (gmina && gmina.toLowerCase() !== detectedPlaceName.toLowerCase()) parts.push(`gm. ${gmina}`);
              if (county) parts.push(county);
              if (detectedVoiv) parts.push(`woj. ${detectedVoiv}`);
              detectedDetails = parts.join(', ');
            }
          } catch {
            // Keep empty
          }
        }

        // Fallback to closest static Polish city if reverse geocoding is unavailable
        if (!detectedPlaceName) {
          const nearest = getNearestPolishCity(lat, lng);
          detectedPlaceName = nearest.city.name;
          detectedVoiv = nearest.city.voivodeship;
          detectedDetails = `woj. ${detectedVoiv}`;
        }

        const fullLabel = detectedDetails ? `${detectedPlaceName} (${detectedDetails})` : detectedPlaceName;
        setUserCoords({ lat, lng });
        setCurrentCityName(fullLabel);
        setDetectedVoivodeship(detectedVoiv);
        setLocationSource(`GPS urządzenia (dokładność ±${accuracy}m)`);
        setIsLocating(false);
        setShowGpsDisabledNotice(false);
        setSelectedCity('all'); // Show all clinics sorted from this exact GPS position

        try {
          localStorage.setItem(STORAGE_KEY_CITY, fullLabel);
          localStorage.setItem(STORAGE_KEY_COORDS, JSON.stringify({ lat, lng }));
        } catch {
          // Ignore
        }

        setLocationMessage({
          type: 'success',
          text: `📍 Dokładna lokalizacja: ${detectedPlaceName}${detectedVoiv ? ` (woj. ${detectedVoiv})` : ''} [dokładność: ±${accuracy}m]. Kliniki posortowano od najbliższej!`,
        });
      },
      (err) => {
        console.warn('GPS location error:', err);
        setIsLocating(false);
        setShowGpsDisabledNotice(true);
        setGpsErrorCode(err.code);
        let msg = 'Lokalizacja GPS jest wyłączona lub zablokowana w urządzeniu.';
        if (err.code === 1) {
          msg = 'Dostęp do lokalizacji został zablokowany w przeglądarce. Zezwól na lokalizację w pasku adresu lub wpisz swoją miejscowość poniżej.';
        } else if (err.code === 2) {
          msg = 'Czujnik GPS w telefonie/urządzeniu jest wyłączony. Włącz GPS w pasku powiadomień lub wpisz swoją miejscowość poniżej.';
        } else if (err.code === 3) {
          msg = 'Przekroczono czas oczekiwania na sygnał GPS. Spróbuj ponownie lub wpisz miejscowość poniżej.';
        }
        setLocationMessage({
          type: 'warning',
          text: msg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // CRITICAL: Never accept stale cached position from another city or voivodeship!
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
                      Nie wybrano (włącz GPS lub wpisz swoją wieś / miasto)
                    </span>
                  )}
                </div>
                {userCoords && (
                  <p className="text-[11px] text-slate-500 pl-5.5">
                    Odległości do klinik 24h liczone od: <strong>{currentCityName}</strong>
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
                      setDetectedVoivodeship(null);
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

            {/* System Notification: GPS is off / blocked / prompt */}
            {showGpsDisabledNotice && (
              <div className="bg-gradient-to-r from-amber-50 to-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 shadow-sm space-y-2.5 animate-fadeIn">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5 animate-pulse">
                      <LocateFixed className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          {gpsErrorCode === 1 
                            ? 'Dostęp do lokalizacji został zablokowany'
                            : 'Lokalizacja GPS jest wyłączona'}
                        </h4>
                        <span className="text-[10px] font-bold uppercase bg-rose-200/80 text-rose-800 px-2 py-0.5 rounded-full">
                          Powiadomienie
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Czy chcesz włączyć lokalizację GPS? Pozwoli to automatycznie wykryć Twoją miejscowość i precyzyjnie uszeregować dyżury weterynaryjne 24h od najbliższego.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGpsDisabledNotice(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/60 transition"
                    aria-label="Ukryj powiadomienie"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <button
                    type="button"
                    onClick={handleGetGPSLocation}
                    disabled={isLocating}
                    className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    <Compass className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'Włączam GPS...' : 'Włącz lokalizację (zezwól)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGpsInstructions(!showGpsInstructions)}
                    className="py-1.5 px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Jak włączyć?</span>
                    {showGpsInstructions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      cityInputRef.current?.focus();
                      setShowGpsDisabledNotice(false);
                    }}
                    className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                  >
                    Wpisz miejscowość ręcznie
                  </button>
                </div>

                {/* Step-by-step help */}
                {showGpsInstructions && (
                  <div className="bg-white/95 border border-rose-200 rounded-xl p-2.5 text-xs text-slate-700 space-y-1.5 mt-1">
                    <span className="font-bold text-slate-900 block text-[11px]">
                      Instrukcja włączenia lokalizacji:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <strong className="text-slate-800 block mb-0.5">📱 W telefonie (Android / iOS):</strong>
                        <p className="text-slate-600 leading-tight">
                          Rozwiń górną belkę (pasek powiadomień) w telefonie i włącz ikonę <strong>Lokalizacja / GPS</strong>, a w przeglądarce kliknij <strong>Zezwól</strong>.
                        </p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <strong className="text-slate-800 block mb-0.5">🌐 W przeglądarce:</strong>
                        <p className="text-slate-600 leading-tight">
                          Kliknij ikonę kłódki lub suwaków obok adresu strony www &rarr; ustaw <strong>Lokalizacja</strong> na <strong>Zezwalaj</strong> &rarr; kliknij &bdquo;Włącz lokalizację&rdquo;.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interactive City & Village Autocomplete Search Bar */}
            <div className="relative pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={cityInputRef}
                    type="text"
                    placeholder="Wpisz dowolną wieś lub miasto w Polsce (np. Gostyń, Mikołów, Wyry, Ząb, Pcim...)"
                    value={cityInputQuery}
                    onChange={(e) => {
                      setCityInputQuery(e.target.value);
                      setIsCitySuggestionsOpen(true);
                    }}
                    onFocus={() => setIsCitySuggestionsOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGeocodeOnline(cityInputQuery);
                      }
                    }}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:outline-none transition"
                  />
                  {isGeocodingOnline ? (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                    </div>
                  ) : cityInputQuery ? (
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
                  ) : null}
                </div>

                {cityInputQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => handleGeocodeOnline(cityInputQuery)}
                    disabled={isGeocodingOnline}
                    className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shrink-0 active:scale-95 disabled:opacity-50"
                  >
                    {isGeocodingOnline ? 'Szukam...' : 'Ustaw tę miejscowość'}
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown for ALL Polish cities, towns, and villages */}
              {isCitySuggestionsOpen && cityInputQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 z-30 overflow-hidden divide-y divide-slate-100 animate-fadeIn max-h-64 overflow-y-auto">
                  {combinedSuggestions.length > 0 ? (
                    combinedSuggestions.map((item) => {
                      const isVillage = item.type === 'wieś';
                      return (
                        <button
                          key={`${item.name}-${item.lat}-${item.lng}`}
                          type="button"
                          onClick={() => handleSelectCity(item.name, { lat: item.lat, lng: item.lng }, item.voivodeship, item.details)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-rose-50 transition flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shrink-0 ${
                              isVillage 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {item.type || 'miejscowość'}
                            </span>
                            <div className="truncate">
                              <span className="text-xs font-bold text-slate-900 group-hover:text-rose-900 mr-1.5">
                                {item.name}
                              </span>
                              {item.details && (
                                <span className="text-[11px] text-slate-500">
                                  ({item.details})
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-rose-600 opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5 shrink-0 ml-2">
                            Wybierz <ChevronRight className="w-3 h-3" />
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center space-y-2">
                      <p className="text-xs text-slate-600">
                        {isGeocodingOnline ? 'Przeszukuję bazę wszystkich wsi i miast w Polsce...' : 'Szukasz małej wsi lub osady?'}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleGeocodeOnline(cityInputQuery)}
                        disabled={isGeocodingOnline}
                        className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Znajdź &bdquo;{cityInputQuery}&rdquo; na mapie Polski</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* City suggestions after locating user */}
            {userCoords && nearbyCities.length > 0 && (
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-600" />
                    Podpowiedzi miast w Twojej okolicy:
                  </span>
                  <span className="text-[10px] text-slate-400">kliknij, aby przełączyć</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {nearbyCities.map(({ city, distanceKm }) => {
                    const isCurrent = currentCityName?.toLowerCase().includes(city.name.toLowerCase());
                    return (
                      <button
                        key={`${city.name}-${city.voivodeship}`}
                        type="button"
                        onClick={() => handleSelectCity(city.name, { lat: city.lat, lng: city.lng }, city.voivodeship)}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition flex items-center gap-1 ${
                          isCurrent
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>📍 {city.name}</span>
                        <span className={`text-[10px] ${isCurrent ? 'text-rose-100' : 'text-slate-400 font-normal'}`}>
                          ({distanceKm} km)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Popular Cities Chips if location not yet set */}
            {!userCoords && (
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
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}

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

          {/* Quick 3 Closest Emergency Clinics */}
          {userCoords && filteredClinics.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Najbliższe ostre dyżury 24h w Twoim zasięgu:
                </span>
                <span className="text-[10px] font-bold text-emerald-700">1 klik = Połączenie / Trasa</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {filteredClinics.slice(0, 3).map((clinic, idx) => (
                  <div key={`quick-${clinic.id}`} className="bg-white p-2.5 rounded-xl border border-emerald-200/80 shadow-xs space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 line-clamp-1" title={clinic.name}>
                          {idx + 1}. {clinic.name}
                        </span>
                        {clinic.distanceKm !== null && (
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md shrink-0">
                            {clinic.distanceKm} km
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{clinic.address}, {clinic.city}</p>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <a
                        href={`tel:${clinic.phone.replace(/\s+/g, '')}`}
                        className="flex-1 py-1 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold text-center flex items-center justify-center gap-1 shadow-xs transition active:scale-95"
                      >
                        <Phone className="w-2.5 h-2.5 animate-pulse" />
                        <span>Zadzwoń</span>
                      </a>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${clinic.lat},${clinic.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold text-center flex items-center justify-center gap-1 shadow-xs transition active:scale-95"
                      >
                        <Navigation className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Nawiguj</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
