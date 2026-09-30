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
  RotateCcw,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Pet } from '../types/pet';
import { 
  ALL_POLISH_CITIES, 
  calculateDistanceKm, 
  getNearestPolishCity,
  normalizePolishText 
} from '../data/polishCitiesData';
import { COMPREHENSIVE_24H_CLINICS } from '../data/emergencyClinicsData';
import { 
  requestDeviceLocation,
  openNativeLocationSettings,
  openNativeAppSettings 
} from '../services/geolocationService';

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
  const [selectedVoivodeship, setSelectedVoivodeship] = useState<string>('all');
  const [maxRadiusKm, setMaxRadiusKm] = useState<number | null>(null);

  // User coordinate states
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentCityName, setCurrentCityName] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

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
  const [gpsNotice, setGpsNotice] = useState<{ type: string; message: string; isNative?: boolean } | null>(null);
  const [vetFilterType, setVetFilterType] = useState<'all' | '24h'>('all');

  const voivodeshipSelectId = useId();

  const estimateDriveTime = (km: number): string => {
    if (km <= 3) return '~4-7 min';
    if (km <= 8) return '~8-12 min';
    if (km <= 15) return '~12-18 min';
    if (km <= 25) return '~20-28 min';
    if (km <= 40) return '~30-40 min';
    return `~${Math.round(km * 1.1)} min`;
  };

  // Load saved location on modal open OR automatically invoke native system GPS modal
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
          return;
        }
      }
    } catch {
      // Ignore
    }

    // Automatically trigger system/browser location on open if location not yet set
    handleGetGPSLocation();
  }, [isOpen]);

  // Debounced search for any Polish village, town, or city
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
        // Query backend proxy route with caching and custom User-Agent
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
        // Fallback directly to OpenStreetMap Nominatim
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
          // Keep empty if both fail
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

  // Combined suggestions: Fast local cache + OpenStreetMap results for every village
  const combinedSuggestions = useMemo(() => {
    const q = normalizePolishText(cityInputQuery);
    if (!q || q.length < 1) return [];

    // Local static matches
    const staticMatches = ALL_POLISH_CITIES.filter(c => {
      const normName = normalizePolishText(c.name);
      const normVoiv = normalizePolishText(c.voivodeship);
      return normName.includes(q) || normVoiv.includes(q);
    }).slice(0, 4).map(c => ({
      name: c.name,
      type: 'miasto',
      details: `woj. ${c.voivodeship}`,
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

    return [...staticMatches, ...uniqueOnline].slice(0, 8);
  }, [cityInputQuery, onlineSuggestions]);

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
      setLocationSource('Wskazana miejscowość');
      setIsCitySuggestionsOpen(false);
      setCityInputQuery('');
      setSearchQuery(''); // Clear search filter so neighboring cities and all area clinics are shown!
      setSelectedVoivodeship('all'); // Clear voivodeship filter so neighboring agglomeration cities are visible
      setGpsNotice(null);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY_CITY, fullLabel);
        localStorage.setItem(STORAGE_KEY_COORDS, JSON.stringify(finalCoords));
      } catch {
        // Ignore storage errors
      }
    }
  };

  // Immediate geocoding for any village/town submitted via search button or Enter
  const handleGeocodeOnline = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsGeocodingOnline(true);

    try {
      if (combinedSuggestions.length > 0) {
        const top = combinedSuggestions[0];
        handleSelectCity(top.name, { lat: top.lat, lng: top.lng }, top.voivodeship, top.details);
        setIsGeocodingOnline(false);
        return;
      }

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
    } catch {
      // Ignore
    } finally {
      setIsGeocodingOnline(false);
    }
  };

  // Ultra-Accurate GPS with native OS system dialog
  const handleGetGPSLocation = async () => {
    setIsLocating(true);

    const result = await requestDeviceLocation();

    if (!result.success) {
      setIsLocating(false);
      if (!result.error.isNative) {
        setGpsNotice({
          type: 'browser_iframe',
          isNative: false,
          message: 'W podglądzie w przeglądarce dostęp do GPS jest blokowany przez zabezpieczenia ramki strony (brak zgody w przeglądarce). W zainstalowanej aplikacji APK system Android automatycznie wyświetli natywne okno systemowe ("Włącz lokalizację w urządzeniu"). Kliknij poniżej, aby wybrać Mikołów i zobaczyć dyżury w okolicy:'
        });
      } else if (result.error.code === 'PERMISSION_DENIED') {
        setGpsNotice({
          type: 'permission_denied',
          isNative: true,
          message: 'Brak uprawnień do lokalizacji w systemie Android. Możesz nadać uprawnienia w Ustawieniach telefonu lub wybrać miasto poniżej:'
        });
      } else {
        setGpsNotice({
          type: 'disabled',
          isNative: true,
          message: 'Lokalizacja w systemie Android jest wyłączona. Możesz włączyć GPS w Ustawieniach telefonu lub wybrać miasto poniżej:'
        });
      }
      return;
    }

    const { lat, lng, accuracy } = result.coords;
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
    setLocationSource(accuracy ? `GPS urządzenia (±${accuracy}m)` : 'GPS urządzenia');
    setCityInputQuery('');
    setSearchQuery(''); // Clears search query so all neighboring cities are shown!
    setSelectedVoivodeship('all');
    setGpsNotice(null);
    setIsLocating(false);

    try {
      localStorage.setItem(STORAGE_KEY_CITY, fullLabel);
      localStorage.setItem(STORAGE_KEY_COORDS, JSON.stringify({ lat, lng }));
    } catch {
      // Ignore
    }
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
      // 24h Emergency filter
      if (vetFilterType === '24h' && !clinic.open24h) {
        return false;
      }

      // Voivodeship filter
      if (selectedVoivodeship !== 'all' && clinic.voivodeship !== selectedVoivodeship) {
        return false;
      }

      // Radius filter
      if (maxRadiusKm !== null && clinic.distanceKm !== null && clinic.distanceKm > maxRadiusKm) {
        return false;
      }

      // Search query (clinic name, city, street, services)
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
  }, [clinicsWithDistance, selectedVoivodeship, maxRadiusKm, searchQuery, vetFilterType]);

  if (!isOpen) return null;

  // Google Maps search URL
  const targetSearchLocation = currentCityName || 'Polska';
  const googleMapsSearchUrl = `https://www.google.com/maps/search/${encodeURIComponent(
    `całodobowa klinika weterynaryjna ostry dyżur 24h ${targetSearchLocation}`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-rose-100 flex flex-col h-[94vh] max-h-[94vh]">
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 px-4 py-3 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Kliniki Całodobowe 24/7</h2>
                <span className="text-[10px] font-black uppercase bg-white text-rose-700 px-2 py-0.5 rounded-full shadow-xs">
                  SOS Polska
                </span>
              </div>
              <p className="text-[11px] text-rose-100">
                Ostre dyżury weterynaryjne 24h w całej Polsce • Wszystkie wsie i miasta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition text-white"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compact Location & Search Control Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
          {/* Row 1: Search any village/city OR clinic name + GPS button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={cityInputRef}
                type="text"
                placeholder="Wpisz dowolną wieś, miasto lub szukaj kliniki (np. Gostyń, Mikołów, Katowice)..."
                value={cityInputQuery}
                onChange={(e) => {
                  setCityInputQuery(e.target.value);
                  setSearchQuery(e.target.value);
                  setIsCitySuggestionsOpen(true);
                }}
                onFocus={() => setIsCitySuggestionsOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleGeocodeOnline(cityInputQuery);
                  }
                }}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:outline-none transition shadow-2xs"
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
                    setSearchQuery('');
                    setIsCitySuggestionsOpen(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}

              {/* Autocomplete dropdown for any Polish village/town */}
              {isCitySuggestionsOpen && cityInputQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 z-40 overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {combinedSuggestions.length > 0 ? (
                    combinedSuggestions.map((item) => (
                      <button
                        key={`${item.name}-${item.lat}-${item.lng}`}
                        type="button"
                        onClick={() => handleSelectCity(item.name, { lat: item.lat, lng: item.lng }, item.voivodeship, item.details)}
                        className="w-full text-left px-3 py-2 hover:bg-rose-50 transition flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shrink-0 ${
                            item.type === 'wieś' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.type || 'miejscowość'}
                          </span>
                          <div className="truncate">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-rose-900 mr-1">
                              {item.name}
                            </span>
                            {item.details && (
                              <span className="text-[11px] text-slate-500">
                                ({item.details})
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-rose-600 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1">
                          Wybierz &rarr;
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleGeocodeOnline(cityInputQuery)}
                        disabled={isGeocodingOnline}
                        className="py-1 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                      >
                        <Search className="w-3 h-3" />
                        <span>Szukaj wsi &bdquo;{cityInputQuery}&rdquo; na mapie</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* GPS Button (Triggers native system/browser popup directly) */}
            <button
              type="button"
              onClick={handleGetGPSLocation}
              disabled={isLocating}
              className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 active:scale-95 disabled:opacity-50"
              title="Włącz systemową lokalizację GPS"
            >
              <Compass className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isLocating ? 'Lokalizuję...' : 'Pobierz z GPS'}</span>
              <span className="sm:hidden">{isLocating ? '...' : 'GPS'}</span>
            </button>
          </div>

          {/* GPS notice & Quick selection pills */}
          {gpsNotice && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 space-y-1.5 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium leading-relaxed text-[11px]">{gpsNotice.message}</span>
                <button
                  type="button"
                  onClick={() => setGpsNotice(null)}
                  className="text-amber-500 hover:text-amber-700 p-0.5 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {gpsNotice.isNative && gpsNotice.type === 'permission_denied' && (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => openNativeAppSettings()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shadow-2xs"
                  >
                    <span>⚙️ Otwórz uprawnienia aplikacji w Androidzie</span>
                  </button>
                </div>
              )}
              {gpsNotice.isNative && gpsNotice.type === 'disabled' && (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => openNativeLocationSettings()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shadow-2xs"
                  >
                    <span>⚙️ Otwórz Ustawienia GPS w telefonie</span>
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] font-bold text-amber-800">Wybierz szybko:</span>
                {[
                  { name: 'Mikołów', label: '📍 Mikołów (Śląsk)' },
                  { name: 'Katowice', label: 'Katowice' },
                  { name: 'Tychy', label: 'Tychy' },
                  { name: 'Gliwice', label: 'Gliwice' },
                  { name: 'Chorzów', label: 'Chorzów' },
                  { name: 'Kraków', label: 'Kraków' },
                  { name: 'Warszawa', label: 'Warszawa' },
                ].map(c => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => handleSelectCity(c.name)}
                    className="text-[11px] font-bold bg-white hover:bg-rose-50 text-slate-800 hover:text-rose-700 border border-amber-300 hover:border-rose-300 px-2 py-0.5 rounded-lg shadow-2xs transition"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Row 2: Location badge, Voivodeship select, and radius filter */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                {currentCityName ? (
                  <span className="font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <span className="truncate max-w-[200px] sm:max-w-[280px]">📍 {currentCityName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setUserCoords(null);
                        setCurrentCityName(null);
                        setLocationSource(null);
                        localStorage.removeItem(STORAGE_KEY_CITY);
                        localStorage.removeItem(STORAGE_KEY_COORDS);
                      }}
                      className="text-slate-400 hover:text-rose-600 ml-0.5"
                      title="Wyczyść lokalizację"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : (
                  <span className="text-slate-500 italic">Polska (cały kraj)</span>
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Filter mode: All Vets vs 24h Emergency */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setVetFilterType('all')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                    vetFilterType === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🏥 Wszyscy weterynarze</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVetFilterType('24h')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                    vetFilterType === '24h'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🚨 Tylko dyżur 24/7</span>
                </button>
              </div>

              <label htmlFor={voivodeshipSelectId} className="sr-only">Województwo</label>
              <select
                id={voivodeshipSelectId}
                value={selectedVoivodeship}
                onChange={(e) => setSelectedVoivodeship(e.target.value)}
                className="py-1 px-2 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 focus:ring-1 focus:ring-rose-500 focus:outline-none"
              >
                <option value="all">Wszystkie woj. (16)</option>
                {voivodeships.map((v) => (
                  <option key={v} value={v}>woj. {v}</option>
                ))}
              </select>

              {userCoords && (
                <div className="flex items-center gap-1">
                  {[
                    { label: 'Wszystkie', value: null },
                    { label: '< 25 km', value: 25 },
                    { label: '< 50 km', value: 50 },
                    { label: '< 100 km', value: 100 },
                  ].map((pill) => (
                    <button
                      key={pill.label}
                      type="button"
                      onClick={() => setMaxRadiusKm(pill.value)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition ${
                        maxRadiusKm === pill.value
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Clinic Cards List - Takes up the full height! */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1 text-slate-800">
          {/* Pet Alert Banner (if opened from pet profile) */}
          {pet && (
            <div className="bg-rose-50/70 border border-rose-200/90 rounded-2xl p-2.5 flex items-center justify-between text-xs text-rose-950">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-xs">
                  🐾
                </div>
                <div>
                  <span className="font-black text-slate-900">{pet.name}</span>
                  <span className="text-slate-600 text-[11px] block">
                    {pet.species === 'dog' ? 'Pies' : pet.species === 'cat' ? 'Kot' : 'Zwierzak'} • {pet.weightKg} kg
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

          {/* Results Summary Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 pb-1 gap-1">
            <span className="leading-relaxed">
              Znalezione kliniki: <strong className="text-slate-900 font-black">{filteredClinics.length}</strong>
              {currentCityName ? (
                <span className="text-emerald-800 font-bold ml-1">
                  • Względem: {currentCityName} (w tym miasta ościenne)
                </span>
              ) : ''}
              {selectedVoivodeship !== 'all' ? ` (woj. ${selectedVoivodeship})` : ''}
            </span>
            {userCoords && (
              <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px] shrink-0">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Sortowanie od najbliższej (Mikołów i okolice)
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
                  Brak klinik w zadanym promieniu lub dla wpisanego filtra
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Rozszerz promień wyszukiwania lub zobacz wszystkie dyżury 24h w Polsce:
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVoivodeship('all');
                    setMaxRadiusKm(null);
                    setSearchQuery('');
                    setCityInputQuery('');
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
              const cleanAddress = clinic.address.replace(/\s*\([^)]*\)/g, '').trim();
              const navDestination = encodeURIComponent(`${clinic.name}, ${cleanAddress}`);
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${navDestination}&travelmode=driving`;
              const isNearest = index === 0 && clinic.distanceKm !== null;

              return (
                /* Kostka Kliniki */
                <div
                  key={clinic.id}
                  className={`bg-white border rounded-2xl p-3.5 sm:p-4 shadow-xs transition space-y-2.5 ${
                    isNearest
                      ? 'border-emerald-400 ring-2 ring-emerald-200 bg-gradient-to-b from-emerald-50/20 to-white'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                          {clinic.name}
                        </span>

                        {clinic.open24h ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-emerald-600" />
                            Dyżur 24h / 7 dni
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-blue-600" />
                            {clinic.hours || 'Przychodnia dzienna'}
                          </span>
                        )}

                        {isNearest && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                            ★ NAJBLIŻSZY DYŻUR
                          </span>
                        )}

                        {clinic.distanceKm !== null && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                            <Navigation className="w-2.5 h-2.5 text-teal-600" />
                            <span>{clinic.distanceKm} km stąd ({estimateDriveTime(clinic.distanceKm)})</span>
                          </span>
                        )}

                        {clinic.distanceKm !== null && clinic.distanceKm > 2 && clinic.distanceKm <= 35 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                            🚗 Miasto ościenne ({clinic.city})
                          </span>
                        )}

                        {clinic.distanceKm !== null && clinic.distanceKm <= 2 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                            📍 Na miejscu ({clinic.city})
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="font-extrabold text-slate-800">{clinic.city}:</span>
                        <span className="text-slate-800 font-semibold">{cleanAddress}</span>
                        <span className="text-slate-400 text-[11px]">(woj. {clinic.voivodeship})</span>
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
                          <span>Zapisano jako główny dyżur 24h dla {pet.name}</span>
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

          {/* Direct Google Maps discovery card to find all local veterinary offices */}
          <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs mt-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                🐾
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">
                  Szukasz innego gabinetu w {currentCityName ? currentCityName.split('(')[0].trim() : 'swojej okolicy'}?
                </p>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Otwórz wyszukiwarkę wszystkich lokalnych weterynarzy i przychodni bezpośrednio w Google Maps
                </p>
              </div>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`weterynarz gabinet przychodnia ${currentCityName ? currentCityName.split('(')[0].trim() : 'w pobliżu'}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap inline-flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5 text-white" />
              <span>Wszyscy weterynarze na mapie</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200/90 flex items-center justify-between gap-2 text-xs shrink-0">
          <span className="text-slate-500 text-[11px] truncate">
            Dyżury 24/7 • Wszystkie wsie i miasta w Polsce • Zawsze zadzwoń przed wyjazdem
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition shrink-0"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
