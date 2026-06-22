import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Filter,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Route,
  Search,
  SlidersHorizontal,
  Target,
  X,
} from "lucide-react-native";
import { ScreenLayout } from "../components/ScreenLayout";
import { apiUrl } from "../lib/api";
import { authHeader } from "../lib/auth";
import { useAuth } from "../context/AuthContext";

type PharmacySearchDose = {
  doseId: number;
  strength: string;
  lastUpdated?: string | null;
};

type PharmacySearchResult = {
  id: number;
  name: string;
  address: string;
  city: string;
  latitude: number | string | null;
  longitude: number | string | null;
  distance?: number | string | null;
  isOpenNow: boolean;
  isOnDuty: boolean;
  openUntil: string | null;
  availabilitySource: "exception" | "duty" | "working_hours" | null;
  doses: PharmacySearchDose[];
};

type SearchResponse = {
  success?: boolean;
  data: PharmacySearchResult[];
  count?: number;
  message?: string | string[];
};

type City = {
  id: number;
  name: string;
};

type CitiesResponse = {
  success?: boolean;
  data: City[] | string[];
};

type WorkingHours = {
  day_of_week: string;
  open_time: string;
  close_time: string;
};

type PharmacyDetails = {
  id: number;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  isOnDuty: boolean;
  phones: string[];
  workingHours: WorkingHours[];
  dutySchedule: {
    startDatetime: string;
    endDatetime: string;
  } | null;
};

type PharmacyDetailsResponse = {
  success?: boolean;
  data: {
    id: number;
    name: string;
    address: string;
    city: string;
    latitude: number | string | null;
    longitude: number | string | null;
    isActive: boolean | number;
    isOnDuty: boolean;
    phones?: string[];
    workingHours?: WorkingHours[];
    dutySchedule?: {
      startDatetime: string;
      endDatetime: string;
    } | null;
  };
};

type SearchSort = "az" | "distance";
type SearchViewMode = "list" | "map";

type UserLocation = {
  latitude: number;
  longitude: number;
};

type SearchFilters = {
  name: string;
  cities: string[];
  openNow: boolean;
  onDuty: boolean;
  radiusEnabled: boolean;
  radius: number;
};

const FALLBACK_CITIES: City[] = [
  { id: 1, name: "Podgorica" },
  { id: 2, name: "Niksic" },
  { id: 3, name: "Herceg Novi" },
  { id: 4, name: "Budva" },
  { id: 5, name: "Bar" },
  { id: 6, name: "Ulcinj" },
  { id: 7, name: "Kotor" },
  { id: 8, name: "Tivat" },
  { id: 9, name: "Cetinje" },
];

const DEFAULT_FILTERS: SearchFilters = {
  name: "",
  cities: [],
  openNow: false,
  onDuty: false,
  radiusEnabled: false,
  radius: 10,
};

const CARD_SHADOW = {
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 18,
  elevation: 5,
} as const;

const normalizeNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeCities = (items: City[] | string[] | undefined) => {
  if (!Array.isArray(items)) return FALLBACK_CITIES;

  const normalized = items.flatMap((item, index) => {
    if (typeof item === "string" && item.trim()) {
      return [{ id: index + 1, name: item.trim() }];
    }

    if (item && typeof item === "object" && typeof item.name === "string") {
      return [{ id: typeof item.id === "number" ? item.id : index + 1, name: item.name.trim() }];
    }

    return [];
  });

  return normalized.length > 0 ? normalized : FALLBACK_CITIES;
};

const getErrorMessage = async (response: Response) => {
  try {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as {
        error?: { message?: string | string[] };
        message?: string | string[];
      };
      const message = data.error?.message ?? data.message;
      if (Array.isArray(message)) return message.join(", ");
      return message ?? "Podaci nijesu dostupni.";
    }
    return (await response.text()) || "Podaci nijesu dostupni.";
  } catch {
    return "Podaci nijesu dostupni.";
  }
};

const buildSearchParams = ({
  doseIds,
  sort,
  filters,
  userLocation,
}: {
  doseIds: number[];
  sort: SearchSort;
  filters: SearchFilters;
  userLocation: UserLocation | null;
}) => {
  const params = new URLSearchParams();
  doseIds.forEach((doseId) => params.append("doseIds", String(doseId)));

  if (sort === "distance" && userLocation) {
    params.set("sort", "distance");
  } else {
    params.set("sort", "az");
  }

  if (userLocation && (sort === "distance" || filters.radiusEnabled)) {
    params.set("uLat", String(userLocation.latitude));
    params.set("uLng", String(userLocation.longitude));
  }

  if (filters.radiusEnabled && userLocation) {
    params.set("radius", String(filters.radius));
  }

  if (filters.openNow) params.set("openNow", "true");
  if (filters.onDuty) params.set("onDuty", "true");
  if (filters.cities.length > 0) {
    filters.cities.forEach((city) => params.append("city", city));
  }
  if (filters.name.trim()) params.set("name", filters.name.trim());
  return params;
};

const formatTime = (value: string | null) => {
  if (!value) return null;
  const match = value.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : value;
};

const formatDistance = (value: number | string | null | undefined) => {
  const distance = normalizeNumber(value);
  if (distance === null) return null;
  if (distance < 1) return `${Math.round(distance * 1000)} m`;
  return `${distance.toFixed(distance < 10 ? 1 : 0)} km`;
};

const formatRelativeUpdate = (value?: string | null) => {
  if (!value) return "Azuriranje nije dostupno";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Azuriranje nije dostupno";

  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return "Azurirano upravo";
  if (diffMinutes < 60) return `Azurirano prije ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Azurirano prije ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `Azurirano prije ${diffDays} d`;
};

const getAvailabilityLabel = (pharmacy: PharmacySearchResult) => {
  if (pharmacy.isOnDuty) {
    return pharmacy.openUntil ? `Dezurna do ${formatTime(pharmacy.openUntil)}` : "Dezurna";
  }
  if (pharmacy.isOpenNow) {
    return pharmacy.openUntil ? `Otvoreno do ${formatTime(pharmacy.openUntil)}` : "Otvoreno sada";
  }
  return "Trenutno zatvoreno";
};

const formatWorkingHoursRange = (openTime: string, closeTime: string) =>
  `${formatTime(openTime) ?? openTime} - ${formatTime(closeTime) ?? closeTime}`;

const parseLocalDateTime = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T| )(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] ?? 0)
  );
};

const getDutyStatus = (pharmacy: PharmacyDetails) => {
  if (pharmacy.isOnDuty) return "Dezurna sada";
  if (!pharmacy.dutySchedule) return "Nije trenutno dezurna";

  const start = parseLocalDateTime(pharmacy.dutySchedule.startDatetime);
  const end = parseLocalDateTime(pharmacy.dutySchedule.endDatetime);
  const now = new Date();

  if (start && now < start) return "Dezurstvo zakazano";
  if (end && now > end) return "Dezurstvo zavrseno";
  return "Nije trenutno dezurna";
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("sr-Latn-ME", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function PharmacyDetailsSheet({
  visible,
  loading,
  error,
  pharmacy,
  medicineName,
  selectedDoseStrengths,
  onClose,
  availableDoseStrengths,
  distanceLabel,
  latestUpdateLabel,
}: {
  visible: boolean;
  loading: boolean;
  error: string;
  pharmacy: PharmacyDetails | null;
  medicineName: string;
  selectedDoseStrengths: string[];
  onClose: () => void;
  availableDoseStrengths: string[];
  distanceLabel: string | null;
  latestUpdateLabel: string;
}) {
  const insets = useSafeAreaInsets();

  const openMaps = async () => {
    if (!pharmacy) return;
    const label = encodeURIComponent(`${pharmacy.name}, ${pharmacy.address}, ${pharmacy.city}`);
    const lat = pharmacy.latitude;
    const lng = pharmacy.longitude;
    const url =
      lat !== null && lng !== null
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${label}`;
    await Linking.openURL(url);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-950/55">
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="max-h-[86%] rounded-t-[32px] bg-white px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="items-center pb-3">
            <View className="h-1.5 w-16 rounded-full bg-slate-200" />
          </View>

          {loading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#2563eb" />
            </View>
          ) : error || !pharmacy ? (
            <View className="rounded-3xl border border-red-200 bg-red-50 p-5">
              <Text className="text-base font-semibold text-red-700">Detalji nijesu dostupni.</Text>
              <Text className="mt-2 text-sm leading-6 text-red-600">
                {error || "Nije moguce prikazati podatke za odabranu apoteku."}
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="overflow-hidden rounded-[28px] border border-blue-200/80 bg-white">
                <View className="border-b border-slate-100 px-5 py-5">
                  <View className="flex-row items-start justify-between gap-4">
                    <View className="flex-1">
                      <Text className="text-xs font-semibold uppercase text-blue-600">
                        Detalji apoteke
                      </Text>
                      <Text className="mt-2 text-[24px] font-bold text-slate-900">
                        {pharmacy.name}
                      </Text>
                      <Text className="mt-1 text-base text-slate-500">{pharmacy.city}</Text>

                      <TouchableOpacity
                        onPress={openMaps}
                        className="mt-5 self-start rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3"
                      >
                        <View className="flex-row items-center gap-2">
                          <Route size={18} color="#1d4ed8" />
                          <Text className="text-base font-semibold text-blue-700">Prikazi na mapi</Text>
                        </View>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={onClose}
                      className="h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white"
                    >
                      <X size={24} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="gap-5 px-5 py-5">
                  <View className="overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50/70">
                    <View className="border-b border-emerald-100 px-5 py-4">
                      <Text className="text-xs font-semibold uppercase text-emerald-700">
                        Trazeni lijek
                      </Text>
                      <Text className="mt-2 text-[20px] font-bold text-slate-900">{medicineName}</Text>
                      <Text className="mt-2 text-sm leading-6 text-slate-600">
                        Apoteka ima izdvojene doze koje odgovaraju trenutnoj pretrazi.
                      </Text>
                    </View>

                    <View className="gap-3 px-5 py-4">
                      <View className="rounded-3xl border border-white bg-white p-4">
                        <Text className="text-xs font-semibold uppercase text-slate-500">Trazene doze</Text>
                        <View className="mt-3 flex-row flex-wrap gap-2">
                          {selectedDoseStrengths.map((dose) => (
                            <View key={dose} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">
                              <Text className="text-sm font-bold text-blue-700">{dose}</Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      <View className="rounded-3xl border border-white bg-white p-4">
                        <Text className="text-xs font-semibold uppercase text-slate-500">Dostupno u apoteci</Text>
                        <View className="mt-3 flex-row flex-wrap gap-2">
                          {availableDoseStrengths.map((dose) => (
                            <View key={dose} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5">
                              <Text className="text-sm font-bold text-emerald-700">{dose}</Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      <View className="rounded-3xl border border-white bg-white p-4">
                        <Text className="text-xs font-semibold uppercase text-slate-500">Udaljenost</Text>
                        <Text className="mt-2 text-sm font-semibold text-slate-900">
                          {distanceLabel || "Nije dostupna"}
                        </Text>
                      </View>

                      <View className="rounded-3xl border border-white bg-white p-4">
                        <Text className="text-xs font-semibold uppercase text-slate-500">Zadnje azuriranje</Text>
                        <Text className="mt-2 text-sm font-semibold text-slate-900">{latestUpdateLabel}</Text>
                      </View>
                    </View>
                  </View>

                  <View>
                    <Text className="text-[20px] font-bold text-slate-900">Kontakt</Text>
                    <View className="mt-4 flex-row flex-wrap gap-3">
                      {pharmacy.phones.length > 0 ? (
                        pharmacy.phones.map((phone) => (
                          <TouchableOpacity
                            key={phone}
                            onPress={() => Linking.openURL(`tel:${phone}`)}
                            className="rounded-full border border-slate-200 bg-white px-4 py-3"
                          >
                            <View className="flex-row items-center gap-2">
                              <Phone size={16} color="#475569" />
                              <Text className="text-[16px] font-semibold text-slate-700">{phone}</Text>
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text className="text-sm text-slate-500">Nije dostupno.</Text>
                      )}
                    </View>
                  </View>

                  <View>
                    <View className="mb-4 flex-row items-center justify-between">
                      <Text className="text-[20px] font-bold text-slate-900">Lokacija</Text>
                      <TouchableOpacity
                        onPress={openMaps}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2"
                      >
                        <View className="flex-row items-center gap-2">
                          <Copy size={14} color="#1d4ed8" />
                          <Text className="text-sm font-semibold text-blue-700">Otvori</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                    <View className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <Text className="text-base text-slate-700">{pharmacy.address}</Text>
                      <Text className="mt-2 text-base text-slate-500">{pharmacy.city}</Text>
                    </View>
                  </View>

                  {pharmacy.dutySchedule ? (
                    <View>
                      <Text className="text-[20px] font-bold text-slate-900">Dezurni termin</Text>
                      <View className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
                        <Text className="text-sm leading-6 text-slate-600">
                          Od <Text className="font-semibold text-slate-900">{formatDateTime(pharmacy.dutySchedule.startDatetime)}</Text>
                        </Text>
                        <Text className="mt-1 text-sm leading-6 text-slate-600">
                          Do <Text className="font-semibold text-slate-900">{formatDateTime(pharmacy.dutySchedule.endDatetime)}</Text>
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  <View>
                    <Text className="text-[20px] font-bold text-slate-900">Radno vrijeme</Text>
                    <View className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                      {pharmacy.workingHours.length > 0 ? (
                        pharmacy.workingHours.map((item, index) => (
                          <View
                            key={`${item.day_of_week}-${index}`}
                            className="flex-row items-center justify-between border-b border-slate-100 px-4 py-4"
                          >
                            <Text className="text-[16px] font-semibold text-slate-800">{item.day_of_week}</Text>
                            <Text className="text-[16px] text-slate-600">
                              {formatWorkingHoursRange(item.open_time, item.close_time)}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text className="px-4 py-4 text-sm text-slate-500">Radno vrijeme nije dostupno.</Text>
                      )}
                    </View>
                  </View>

                  <View className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <Text className="text-sm font-semibold text-slate-900">Status apoteke</Text>
                    <Text className="mt-2 text-sm text-slate-600">
                      {pharmacy.isActive ? "Aktivna apoteka" : "Neaktivna apoteka"}
                    </Text>
                    <Text className="mt-3 text-sm font-semibold text-slate-900">Dezurstvo</Text>
                    <Text className="mt-2 text-sm text-slate-600">{getDutyStatus(pharmacy)}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function PharmacySearchScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    medicineId?: string;
    medicineName?: string;
    doseIds?: string;
    doseStrengths?: string;
  }>();

  const medicineId = Number(params.medicineId ?? 0);
  const medicineName = params.medicineName ?? "Odabrani lijek";
  const doseIds = useMemo(
    () =>
      String(params.doseIds ?? "")
        .split(",")
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    [params.doseIds]
  );
  const selectedDoseStrengths = useMemo(
    () =>
      String(params.doseStrengths ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [params.doseStrengths]
  );

  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SearchSort>("az");
  const [viewMode, setViewMode] = useState<SearchViewMode>("list");
  const [cities, setCities] = useState<City[]>(FALLBACK_CITIES);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [pharmacies, setPharmacies] = useState<PharmacySearchResult[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsPharmacy, setDetailsPharmacy] = useState<PharmacyDetails | null>(null);
  const [detailsContext, setDetailsContext] = useState<PharmacySearchResult | null>(null);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationError, setNotificationError] = useState("");
  const hasTrackedInitialSearch = useRef(false);

  const selectedCityLabel =
    filters.cities.length === 0 ? "Svi gradovi" : filters.cities.length === 1 ? filters.cities[0] : `${filters.cities.length} grada`;

  const activeFiltersCount = [
    filters.openNow,
    filters.onDuty,
    filters.radiusEnabled,
    filters.cities.length > 0,
    filters.name.trim().length > 0,
  ].filter(Boolean).length;

  const fetchPharmacies = useCallback(
    async (trackSearch = false) => {
      if (doseIds.length === 0) {
        setSearchError("Nijesu odabrane doze za pretragu.");
        setPharmacies([]);
        return;
      }

      setIsSearchLoading(true);
      setSearchError("");

      try {
        const params = buildSearchParams({ doseIds, sort, filters, userLocation });
        if (trackSearch) params.set("trackSearch", "true");

        const response = await fetch(apiUrl(`/api/v1/pharmacies/search?${params.toString()}`));
        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const data = (await response.json()) as SearchResponse;
        setPharmacies(Array.isArray(data.data) ? data.data : []);
      } catch (error) {
        setPharmacies([]);
        setSearchError(error instanceof Error ? error.message : "Pretraga nije uspjela.");
      } finally {
        setIsSearchLoading(false);
      }
    },
    [doseIds, sort, filters, userLocation]
  );

  useEffect(() => {
    const loadCities = async () => {
      try {
        const response = await fetch(apiUrl("/api/v1/cities"));
        if (!response.ok) return;
        const data = (await response.json()) as CitiesResponse;
        setCities(normalizeCities(data.data));
      } catch {}
    };

    void loadCities();
  }, []);

  useEffect(() => {
    void fetchPharmacies(!hasTrackedInitialSearch.current);
    hasTrackedInitialSearch.current = true;
  }, [fetchPharmacies]);

  const requestLocation = async () => {
    setLocationError("");
    setIsLocating(true);
    try {
      const geolocation = globalThis.navigator?.geolocation;
      if (!geolocation) {
        throw new Error("Lokacija nije podrzana na ovom uredjaju.");
      }

      const location = await new Promise<UserLocation>((resolve, reject) => {
        geolocation.getCurrentPosition(
          (position) =>
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          () => reject(new Error("Nije moguce dobiti lokaciju korisnika.")),
          { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
        );
      });
      setUserLocation(location);
      if (sort === "distance") {
        void fetchPharmacies(false);
      }
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "Nije moguce dobiti lokaciju korisnika.");
    } finally {
      setIsLocating(false);
    }
  };

  const openFilters = () => {
    setDraftFilters(filters);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
  };

  const toggleCity = (city: string) => {
    setDraftFilters((current) => ({
      ...current,
      cities: current.cities.includes(city)
        ? current.cities.filter((item) => item !== city)
        : [...current.cities, city],
    }));
  };

  const toggleDetails = async (pharmacy: PharmacySearchResult) => {
    setDetailsVisible(true);
    setDetailsLoading(true);
    setDetailsError("");
    setDetailsPharmacy(null);
    setDetailsContext(pharmacy);

    try {
      const response = await fetch(apiUrl(`/api/v1/pharmacies/${pharmacy.id}`));
      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = (await response.json()) as PharmacyDetailsResponse;
      setDetailsPharmacy({
        id: data.data.id,
        name: data.data.name,
        address: data.data.address,
        city: data.data.city,
        latitude: normalizeNumber(data.data.latitude),
        longitude: normalizeNumber(data.data.longitude),
        isActive: data.data.isActive === true || data.data.isActive === 1,
        isOnDuty: data.data.isOnDuty,
        phones: Array.isArray(data.data.phones) ? data.data.phones : [],
        workingHours: Array.isArray(data.data.workingHours) ? data.data.workingHours : [],
        dutySchedule: data.data.dutySchedule ?? null,
      });
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : "Detalji nijesu dostupni.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const subscribeToNotifications = async () => {
    if (!user || doseIds.length === 0) return;

    setNotificationLoading(true);
    setNotificationMessage("");
    setNotificationError("");

    try {
      const headers = await authHeader();
      const results = await Promise.allSettled(
        Array.from(new Set(doseIds)).map((doseId) =>
          fetch(apiUrl("/api/v1/notifications"), {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ dose_id: doseId }),
          })
        )
      );

      const successfulCount = results.filter(
        (result) => result.status === "fulfilled" && result.value.ok
      ).length;

      if (successfulCount > 0) {
        setNotificationMessage(
          successfulCount === doseIds.length
            ? "Pretplata na obavjestenja je sacuvana."
            : "Dio obavjestenja je uspjesno sacuvan."
        );
      } else {
        setNotificationError("Pretplata na obavjestenja nije uspjela.");
      }
    } catch {
      setNotificationError("Pretplata na obavjestenja nije uspjela.");
    } finally {
      setNotificationLoading(false);
    }
  };

  return (
    <ScreenLayout>
      <View className="flex-1 bg-sky-50">
        <View className="bg-white px-4 pb-4" style={{ paddingTop: insets.top + 8 }}>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
            >
              <ArrowLeft size={18} color="#334155" />
            </TouchableOpacity>

            <View className="flex-1">
              <Text className="text-xs text-slate-500">Dostupnost lijeka</Text>
              <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
                {medicineName}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          stickyHeaderIndices={[1]}
        >
          <View className="px-4 pb-5">
            <View className="rounded-[34px] border border-slate-200 bg-white p-6" style={CARD_SHADOW}>
              <View className="flex-row items-start gap-4">
                <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-blue-50">
                  <Search size={28} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <Text className="text-[22px] font-bold text-slate-900">{medicineName}</Text>
                  <Text className="mt-2 text-base text-slate-500">
                    Doze: {selectedDoseStrengths.join(", ") || "Nije odabrano"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="border-y border-blue-100 bg-white px-4 py-4">
            <View className="flex-row flex-wrap gap-3">
              <TouchableOpacity
                onPress={openFilters}
                className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <View className="flex-row items-center gap-2">
                  <Filter size={18} color="#2563eb" />
                  <Text className="text-[15px] font-bold text-slate-800">Filteri</Text>
                  {activeFiltersCount > 0 ? (
                    <View className="rounded-full bg-blue-600 px-2 py-0.5">
                      <Text className="text-xs font-bold text-white">{activeFiltersCount}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (sort === "az") {
                    setSort("distance");
                    if (!userLocation) {
                      void requestLocation();
                    }
                  } else {
                    setSort("az");
                  }
                }}
                className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <View className="flex-row items-center gap-2">
                  <SlidersHorizontal size={18} color="#2563eb" />
                  <Text className="text-[15px] font-bold text-slate-800">
                    {sort === "az" ? "A-Z" : "Udaljenost"}
                  </Text>
                  <ChevronDown size={18} color="#94a3b8" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => void requestLocation()}
                disabled={isLocating}
                className={`rounded-3xl border px-4 py-3 ${
                  userLocation ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <View className="flex-row items-center gap-2">
                  <LocateFixed size={18} color={userLocation ? "#047857" : "#334155"} />
                  <Text className={`text-[15px] font-bold ${userLocation ? "text-emerald-700" : "text-slate-800"}`}>
                    {isLocating ? "Lociram..." : "Moja lokacija"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View className="mt-4 flex-row items-center justify-between gap-3">
              <View className="rounded-full bg-blue-50 px-4 py-2">
                <View className="flex-row items-center gap-2">
                  <MapPin size={14} color="#2563eb" />
                  <Text className="text-sm font-semibold text-blue-700">{selectedCityLabel}</Text>
                </View>
              </View>

              <View className="flex-row rounded-full border border-slate-200 bg-slate-100 p-1">
                <TouchableOpacity
                  onPress={() => setViewMode("list")}
                  className={`rounded-full px-5 py-2 ${viewMode === "list" ? "bg-white" : ""}`}
                >
                  <Text className={`text-base font-bold ${viewMode === "list" ? "text-slate-950" : "text-slate-500"}`}>
                    Lista
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setViewMode("map")}
                  className={`rounded-full px-5 py-2 ${viewMode === "map" ? "bg-white" : ""}`}
                >
                  <Text className={`text-base font-bold ${viewMode === "map" ? "text-slate-950" : "text-slate-500"}`}>
                    Mapa
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="px-4 pt-5">
            {locationError ? (
              <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <Text className="text-sm text-amber-700">{locationError}</Text>
              </View>
            ) : null}

            {notificationMessage ? (
              <View className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <Text className="text-sm text-emerald-700">{notificationMessage}</Text>
              </View>
            ) : null}

            {notificationError ? (
              <View className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <Text className="text-sm text-red-700">{notificationError}</Text>
              </View>
            ) : null}

            <View className="rounded-[34px] border border-slate-200 bg-white p-6" style={CARD_SHADOW}>
              <Text className="text-[15px] font-semibold text-blue-600">
                {pharmacies.length} apoteka za prikaz
              </Text>
              <Text className="mt-3 text-[24px] font-bold text-slate-900">Dostupnost lijeka</Text>
              <Text className="mt-2 text-base leading-7 text-slate-500">
                Lista prikazuje apoteke koje imaju odabranu dozu na stanju.
              </Text>
            </View>
          </View>

          <View className="px-4 pt-5">
            {isSearchLoading ? (
              <View className="items-center py-12">
                <ActivityIndicator color="#2563eb" />
              </View>
            ) : searchError ? (
              <View className="rounded-[30px] border border-red-200 bg-white p-5">
                <Text className="text-base font-semibold text-red-700">{searchError}</Text>
              </View>
            ) : viewMode === "map" ? (
              <View className="rounded-[30px] border border-slate-200 bg-white p-6" style={CARD_SHADOW}>
                <View className="items-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12">
                  <Target size={30} color="#2563eb" />
                  <Text className="mt-4 text-lg font-semibold text-slate-900">Mapa uskoro</Text>
                  <Text className="mt-2 text-center text-sm leading-6 text-slate-500">
                    Sadrzaj je vec pripremljen za listu i detalje apoteke. Map prikaz mozes nastaviti kasnije bez promjene API sloja.
                  </Text>
                </View>
              </View>
            ) : pharmacies.length === 0 ? (
              <View className="rounded-[30px] border border-slate-200 bg-white p-6" style={CARD_SHADOW}>
                <Text className="text-lg font-semibold text-slate-900">Nema rezultata</Text>
                <Text className="mt-2 text-sm leading-6 text-slate-500">
                  Trenutno nema apoteka koje odgovaraju odabranim dozama i filterima.
                </Text>
                {user ? (
                  <TouchableOpacity
                    onPress={() => void subscribeToNotifications()}
                    disabled={notificationLoading}
                    className="mt-5 rounded-2xl bg-blue-600 px-4 py-4"
                  >
                    <Text className="text-center text-sm font-semibold text-white">
                      {notificationLoading ? "Sacuvavam obavjestenja..." : "Obavijesti me kada bude dostupno"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View className="gap-5">
                {pharmacies.map((pharmacy) => {
                  const distanceLabel = formatDistance(pharmacy.distance);
                  return (
                    <View
                      key={pharmacy.id}
                      className="rounded-[30px] border border-slate-200 bg-white p-6"
                      style={CARD_SHADOW}
                    >
                      <View className="flex-row items-start gap-4">
                        <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-blue-50">
                          <Building2 size={26} color="#2563eb" />
                        </View>

                        <View className="flex-1">
                          <View className="flex-row flex-wrap items-center gap-2">
                            <Text className="flex-1 text-[19px] font-bold text-slate-900">{pharmacy.name}</Text>
                            <View className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1">
                              <Text className="text-sm font-semibold text-blue-700">{pharmacy.city}</Text>
                            </View>
                          </View>

                          <View className="mt-4 gap-2">
                            <View className="flex-row items-start gap-2">
                              <MapPin size={18} color="#94a3b8" style={{ marginTop: 2 }} />
                              <Text className="flex-1 text-base text-slate-600">{pharmacy.address}</Text>
                            </View>

                            <View className="flex-row items-center gap-2">
                              <Clock3 size={18} color={pharmacy.isOpenNow ? "#2563eb" : "#94a3b8"} />
                              <Text className={`text-base font-semibold ${pharmacy.isOpenNow ? "text-blue-700" : "text-slate-500"}`}>
                                {getAvailabilityLabel(pharmacy)}
                              </Text>
                            </View>
                          </View>

                          <View className="mt-5 flex-row flex-wrap gap-2">
                            {pharmacy.doses.map((dose) => (
                              <View
                                key={`${pharmacy.id}-${dose.doseId}`}
                                className="rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-3"
                              >
                                <Text className="text-base font-bold text-emerald-700">{dose.strength}</Text>
                                <Text className="mt-1 text-sm font-semibold text-emerald-700/80">
                                  {formatRelativeUpdate(dose.lastUpdated)}
                                </Text>
                              </View>
                            ))}
                          </View>

                          {distanceLabel ? (
                            <View className="mt-4 self-start rounded-2xl bg-slate-50 px-3 py-2">
                              <View className="flex-row items-center gap-2">
                                <Navigation size={16} color="#2563eb" />
                                <Text className="text-sm font-bold text-blue-700">{distanceLabel}</Text>
                              </View>
                            </View>
                          ) : null}

                          <TouchableOpacity
                            onPress={() => void toggleDetails(pharmacy)}
                            className="mt-6 rounded-[20px] border border-blue-200 bg-white px-4 py-4"
                          >
                            <View className="flex-row items-center justify-center gap-2">
                              <Text className="text-[17px] font-semibold text-blue-700">Detalji</Text>
                              <ChevronRight size={20} color="#1d4ed8" />
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
          <View className="flex-1 bg-slate-950/55">
            <Pressable className="flex-1" onPress={() => setFiltersOpen(false)} />
            <View className="rounded-t-[32px] bg-white px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
              <View className="items-center pb-4">
                <View className="h-1.5 w-16 rounded-full bg-slate-200" />
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-[22px] font-bold text-slate-900">Filteri</Text>
                  <TouchableOpacity onPress={resetFilters}>
                    <Text className="text-sm font-semibold text-blue-600">Resetuj</Text>
                  </TouchableOpacity>
                </View>

                <View className="mt-5">
                  <Text className="mb-2 text-sm font-semibold text-slate-700">Naziv apoteke</Text>
                  <TextInput
                    value={draftFilters.name}
                    onChangeText={(text) => setDraftFilters((current) => ({ ...current, name: text }))}
                    placeholder="Montefarm, Benu..."
                    placeholderTextColor="#94a3b8"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                  />
                </View>

                <View className="mt-5 gap-3">
                  <TouchableOpacity
                    onPress={() => setDraftFilters((current) => ({ ...current, openNow: !current.openNow }))}
                    className={`rounded-2xl border px-4 py-4 ${draftFilters.openNow ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}
                  >
                    <Text className={`text-base font-semibold ${draftFilters.openNow ? "text-blue-700" : "text-slate-800"}`}>
                      Samo trenutno otvorene
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setDraftFilters((current) => ({ ...current, onDuty: !current.onDuty }))}
                    className={`rounded-2xl border px-4 py-4 ${draftFilters.onDuty ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}
                  >
                    <Text className={`text-base font-semibold ${draftFilters.onDuty ? "text-blue-700" : "text-slate-800"}`}>
                      Samo dezurne
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      setDraftFilters((current) => ({
                        ...current,
                        radiusEnabled: !current.radiusEnabled,
                      }))
                    }
                    className={`rounded-2xl border px-4 py-4 ${draftFilters.radiusEnabled ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}
                  >
                    <Text className={`text-base font-semibold ${draftFilters.radiusEnabled ? "text-blue-700" : "text-slate-800"}`}>
                      Ogranicenje na {draftFilters.radius} km
                    </Text>
                  </TouchableOpacity>
                </View>

                {draftFilters.radiusEnabled ? (
                  <View className="mt-4">
                    <Text className="mb-2 text-sm font-semibold text-slate-700">Radijus</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {[5, 10, 20, 30].map((radius) => (
                        <TouchableOpacity
                          key={radius}
                          onPress={() => setDraftFilters((current) => ({ ...current, radius }))}
                          className={`rounded-full border px-4 py-2 ${draftFilters.radius === radius ? "border-blue-600 bg-blue-600" : "border-slate-200 bg-slate-50"}`}
                        >
                          <Text className={`text-sm font-semibold ${draftFilters.radius === radius ? "text-white" : "text-slate-700"}`}>
                            {radius} km
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View className="mt-5">
                  <Text className="mb-3 text-sm font-semibold text-slate-700">Gradovi</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {cities.map((city) => {
                      const active = draftFilters.cities.includes(city.name);
                      return (
                        <TouchableOpacity
                          key={city.id}
                          onPress={() => toggleCity(city.name)}
                          className={`rounded-full border px-4 py-2 ${active ? "border-blue-600 bg-blue-600" : "border-slate-200 bg-slate-50"}`}
                        >
                          <Text className={`text-sm font-semibold ${active ? "text-white" : "text-slate-700"}`}>
                            {city.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity onPress={applyFilters} className="mb-4 mt-6 rounded-2xl bg-blue-600 py-4">
                  <Text className="text-center text-base font-semibold text-white">Primijeni filtere</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <PharmacyDetailsSheet
          visible={detailsVisible}
          loading={detailsLoading}
          error={detailsError}
          pharmacy={detailsPharmacy}
          medicineName={medicineName}
          selectedDoseStrengths={selectedDoseStrengths}
          onClose={() => setDetailsVisible(false)}
          availableDoseStrengths={detailsContext?.doses.map((dose) => dose.strength) ?? []}
          distanceLabel={formatDistance(detailsContext?.distance)}
          latestUpdateLabel={formatRelativeUpdate(detailsContext?.doses?.[0]?.lastUpdated)}
        />
      </View>
    </ScreenLayout>
  );
}
