import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Filter,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Pill,
  Power,
  RotateCcw,
  RotateCw,
  Route,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
} from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { apiUrl } from "../lib/api";
import { authHeader } from "../lib/auth";
import { useAuth } from "../context/AuthContext";
import { MedicineDetailsModal } from "../components/medications/MedicineDetailsModal";
import type { MedicineDetails } from "../lib/medication-types";

// ─── Types ────────────────────────────────────────────────────────────────────

type MedicationAlternative = {
  id: number;
  name: string;
  description: string | null;
};

type PharmacySearchDose = {
  doseId: number;
  strength: string;
  lastUpdated?: string | null;
  is_refundable: boolean;
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
  is_state: boolean;
};

type SearchResponse = {
  success?: boolean;
  data: PharmacySearchResult[];
  count?: number;
  message?: string | string[];
};

type City = { id: number; name: string };
type CitiesResponse = { success?: boolean; data: City[] | string[] };

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
  img_url: string | null;
  phones: string[];
  workingHours: WorkingHours[];
  dutySchedule: { startDatetime: string; endDatetime: string } | null;
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
    img_url?: string | null;
    phones?: string[];
    workingHours?: WorkingHours[];
    dutySchedule?: { startDatetime: string; endDatetime: string } | null;
  };
};

type SearchSort = "az" | "distance";
type SearchViewMode = "list" | "map";
type UserLocation = { latitude: number; longitude: number };

type SearchFilters = {
  name: string;
  cities: string[];
  openNow: boolean;
  onDuty: boolean;
  radiusEnabled: boolean;
  radius: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

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
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeNumber = (v: number | string | null | undefined) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const normalizeCities = (items: City[] | string[] | undefined): City[] => {
  if (!Array.isArray(items)) return FALLBACK_CITIES;
  const out = items.flatMap((item, i) => {
    if (typeof item === "string" && item.trim()) return [{ id: i + 1, name: item.trim() }];
    if (item && typeof item === "object" && typeof item.name === "string")
      return [{ id: typeof item.id === "number" ? item.id : i + 1, name: item.name.trim() }];
    return [];
  });
  return out.length > 0 ? out : FALLBACK_CITIES;
};

const getErrorMessage = async (res: Response) => {
  try {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const d = (await res.json()) as {
        error?: { message?: string | string[] };
        message?: string | string[];
      };
      const m = d.error?.message ?? d.message;
      if (Array.isArray(m)) return m.join(", ");
      return m ?? "Podaci nijesu dostupni.";
    }
    return (await res.text()) || "Podaci nijesu dostupni.";
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
  const p = new URLSearchParams();
  doseIds.forEach((id) => p.append("doseIds", String(id)));
  p.set("sort", sort === "distance" && userLocation ? "distance" : "az");
  if (userLocation && (sort === "distance" || filters.radiusEnabled)) {
    p.set("uLat", String(userLocation.latitude));
    p.set("uLng", String(userLocation.longitude));
  }
  if (filters.radiusEnabled && userLocation) p.set("radius", String(filters.radius));
  if (filters.openNow) p.set("openNow", "true");
  if (filters.onDuty) p.set("onDuty", "true");
  filters.cities.forEach((c) => p.append("city", c));
  if (filters.name.trim()) p.set("name", filters.name.trim());
  return p;
};

const formatTime = (v: string | null) => {
  if (!v) return null;
  const m = v.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : v;
};

const formatDistance = (v: number | string | null | undefined) => {
  const d = normalizeNumber(v);
  if (d === null) return null;
  return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(d < 10 ? 1 : 0)} km`;
};

const formatRelativeUpdate = (v?: string | null) => {
  if (!v) return "Azuriranje nije dostupno";
  const date = new Date(v);
  if (Number.isNaN(date.getTime())) return "Azuriranje nije dostupno";
  const diffMin = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMin < 1) return "Azurirano upravo";
  if (diffMin < 60) return `Azurirano prije ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `Azurirano prije ${diffH} h`;
  return `Azurirano prije ${Math.round(diffH / 24)} d`;
};

const getAvailabilityLabel = (p: PharmacySearchResult) => {
  if (p.isOnDuty) return p.openUntil ? `Dezurna do ${formatTime(p.openUntil)}` : "Dezurna";
  if (p.isOpenNow) return p.openUntil ? `Otvoreno do ${formatTime(p.openUntil)}` : "Otvoreno sada";
  return "Zatvoreno";
};

const formatWorkingHoursRange = (o: string, c: string) =>
  `${formatTime(o) ?? o} – ${formatTime(c) ?? c}`;

const parseLocalDateTime = (v: string) => {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T| )(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; }
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
};

const formatDateTime = (v: string) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString("sr-Latn-ME", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const getDutyStatus = (pharmacy: PharmacyDetails) => {
  if (pharmacy.isOnDuty) return { highlighted: true, label: "Dezurna sada" };
  if (!pharmacy.dutySchedule) return { highlighted: false, label: "Nije trenutno dezurna" };
  const start = parseLocalDateTime(pharmacy.dutySchedule.startDatetime);
  const end = parseLocalDateTime(pharmacy.dutySchedule.endDatetime);
  const now = new Date();
  if (start && now < start) return { highlighted: false, label: "Dezurstvo zakazano" };
  if (end && now > end) return { highlighted: false, label: "Dezurstvo zavrseno" };
  return { highlighted: false, label: "Nije trenutno dezurna" };
};

// ─── Checkbox row (matches web design) ───────────────────────────────────────

// ─── PharmacyMapView — Google Maps via react-native-maps ─────────────────────

// Montenegro bounding box centre
const MNE_CENTER = { latitude: 42.7, longitude: 19.37 };

function PharmacyMapView({
  pharmacies,
  userLocation,
  isLocating,
  onRequestLocation,
  fullScreen = false,
}: {
  pharmacies: PharmacySearchResult[];
  userLocation: UserLocation | null;
  isLocating: boolean;
  onRequestLocation: () => void;
  medicineName: string;
  doseStrengths: string[];
  fullScreen?: boolean;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const mapHeight = Math.max(windowHeight - 290, 360);
  const containerSize = fullScreen ? ({ flex: 1 } as const) : { height: mapHeight };
  const mapRef = useRef<MapView>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const pharmaciesWithCoords = useMemo(
    () =>
      pharmacies.flatMap((p) => {
        const lat = normalizeNumber(p.latitude);
        const lng = normalizeNumber(p.longitude);
        if (lat === null || lng === null) return [];
        return [{ ...p, latitude: lat, longitude: lng }];
      }),
    [pharmacies]
  );

  // Auto-fit camera to all markers whenever the pharmacy list changes
  useEffect(() => {
    if (pharmaciesWithCoords.length === 0) return;
    const coords = pharmaciesWithCoords.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
    }));
    if (userLocation) coords.push(userLocation);
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
        animated: true,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [pharmaciesWithCoords, userLocation]);

  // Pan to user location when it resolves
  useEffect(() => {
    if (!userLocation) return;
    mapRef.current?.animateToRegion(
      { ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      600
    );
  }, [userLocation]);

  return (
    <View style={[containerSize, { borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: "#e2e8f0" }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{ ...MNE_CENTER, latitudeDelta: 2.5, longitudeDelta: 2.5 }}
        showsUserLocation={!!userLocation}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPress={() => setSelectedId(null)}
      >
        {pharmaciesWithCoords.map((pharmacy) => {
          const pinColor = pharmacy.isOnDuty ? "#2563eb" : pharmacy.isOpenNow ? "#10b981" : "#ef4444";
          return (
            <Marker
              key={pharmacy.id}
              coordinate={{ latitude: pharmacy.latitude, longitude: pharmacy.longitude }}
              pinColor={pinColor}
              onPress={() => setSelectedId((prev) => (prev === pharmacy.id ? null : pharmacy.id))}
            />
          );
        })}
      </MapView>

      {/* Selected pharmacy callout card */}
      {selectedId !== null && (() => {
        const p = pharmaciesWithCoords.find((x) => x.id === selectedId);
        if (!p) return null;
        const isOnDuty = p.isOnDuty;
        const isOpen = p.isOpenNow;
        const statusLabel = isOnDuty ? "Dezurna" : isOpen ? "Radi" : "Ne radi";
        const statusBg = isOnDuty ? "#eff6ff" : isOpen ? "#ecfdf5" : "#fef2f2";
        const statusBorder = isOnDuty ? "#bfdbfe" : isOpen ? "#a7f3d0" : "#fecaca";
        const statusText = isOnDuty ? "#1d4ed8" : isOpen ? "#059669" : "#dc2626";
        return (
          <View
            style={{
              position: "absolute",
              bottom: 70,
              left: 12,
              right: 12,
              backgroundColor: "white",
              borderRadius: 16,
              padding: 14,
              gap: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
              borderWidth: 1,
              borderColor: "#e2e8f0",
              zIndex: 40,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Text style={{ fontWeight: "700", fontSize: 14, color: "#0f172a", lineHeight: 20, flex: 1, marginRight: 8 }} numberOfLines={2}>
                {p.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedId(null)}>
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: "#64748b" }} numberOfLines={1}>{p.address}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: statusBg, borderWidth: 1, borderColor: statusBorder }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: statusText }}>{statusLabel}</Text>
              </View>
              <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: p.is_state ? "#ecfdf5" : "#f8fafc", borderWidth: 1, borderColor: p.is_state ? "#a7f3d0" : "#e2e8f0" }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: p.is_state ? "#059669" : "#64748b" }}>
                  {p.is_state ? "Državna" : "Privatna"}
                </Text>
              </View>
            </View>
            {p.doses.length > 0 && (
              <View style={{ backgroundColor: "#ecfdf5", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "#d1fae5", gap: 4 }}>
                <Text style={{ fontSize: 9, fontWeight: "700", color: "#059669", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Dostupne doze
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                  {p.doses.slice(0, 4).map((dose) => {
                    const refundable = p.is_state && dose.is_refundable;
                    return (
                      <View key={dose.doseId} style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: refundable ? "#d1fae5" : "#f1f5f9", borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: refundable ? "#a7f3d0" : "#e2e8f0" }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: refundable ? "#065f46" : "#475569" }}>{dose.strength}</Text>
                        {refundable && (
                          <View style={{ backgroundColor: "#059669", borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 8, fontWeight: "900", color: "#fff" }}>RFZO</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                  {p.doses.length > 4 && (
                    <Text style={{ fontSize: 10, color: "#64748b" }}>+{p.doses.length - 4}</Text>
                  )}
                </View>
              </View>
            )}
            <TouchableOpacity
              onPress={() => {
                const dest = `${p.latitude},${p.longitude}`;
                const origin = userLocation ? `${userLocation.latitude},${userLocation.longitude}` : null;
                const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}${origin ? `&origin=${origin}` : ""}`;
                void Linking.openURL(url);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: "#2563eb",
                borderRadius: 12,
                paddingVertical: 10,
              }}
            >
              <Navigation size={14} color="white" />
              <Text style={{ fontSize: 13, fontWeight: "700", color: "white" }}>Navigiraj</Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* Locate me button */}
      <View style={{ position: "absolute", top: 12, right: 12, zIndex: 30 }}>
        <TouchableOpacity
          onPress={onRequestLocation}
          disabled={isLocating}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: userLocation ? "#ecfdf5" : "rgba(255,255,255,0.95)",
            borderWidth: 1,
            borderColor: userLocation ? "#a7f3d0" : "#e2e8f0",
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <LocateFixed size={15} color={userLocation ? "#059669" : "#475569"} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: userLocation ? "#059669" : "#334155" }}>
            {isLocating ? "Trazim..." : userLocation ? "Moja lokacija" : "Prikazi lokaciju"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status legend */}
      <View
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          zIndex: 30,
          backgroundColor: "rgba(255,255,255,0.95)",
          borderRadius: 14,
          padding: 10,
          borderWidth: 1,
          borderColor: "#e2e8f0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 3,
          gap: 5,
        }}
      >
        <Text style={{ fontSize: 8, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>
          Status
        </Text>
        <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
          {[
            { label: "Dezurna", bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
            { label: "Radi", bg: "#ecfdf5", border: "#a7f3d0", text: "#059669" },
            { label: "Ne radi", bg: "#fef2f2", border: "#fecaca", text: "#dc2626" },
          ].map((s) => (
            <View
              key={s.label}
              style={{ backgroundColor: s.bg, borderWidth: 1, borderColor: s.border, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3 }}
            >
              <Text style={{ fontSize: 9, fontWeight: "700", color: s.text }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function CheckboxRow({
  label,
  checked,
  centered,
  disabled,
  onPress,
}: {
  label: string;
  checked: boolean;
  centered?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center rounded-xl border border-slate-200 bg-white px-3 py-3 ${disabled ? "opacity-60" : ""} ${centered ? "justify-center" : "justify-between"}`}
    >
      {centered && <View className="w-5" />}
      <Text className="flex-1 text-sm font-semibold text-slate-700 text-center">{label}</Text>
      <View
        className={`h-5 w-5 items-center justify-center rounded border ${
          checked ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
        }`}
      >
        {checked && (
          <View className="h-2.5 w-2.5 rounded-sm bg-white" />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Pharmacy Details Bottom Sheet ───────────────────────────────────────────

function PharmacyDetailsSheet({
  visible,
  loading,
  error,
  pharmacy,
  medicineName,
  selectedDoseStrengths,
  availableDoseStrengths,
  distanceLabel,
  latestUpdateLabel,
  onClose,
  onShowOnMap,
}: {
  visible: boolean;
  loading: boolean;
  error: string;
  pharmacy: PharmacyDetails | null;
  medicineName: string;
  selectedDoseStrengths: string[];
  availableDoseStrengths: string[];
  distanceLabel: string | null;
  latestUpdateLabel: string;
  onClose: () => void;
  onShowOnMap: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!pharmacy) return;
    const lat = pharmacy.latitude;
    const lng = pharmacy.longitude;
    const text =
      lat !== null && lng !== null
        ? `${lat},${lng}`
        : `${pharmacy.address}, ${pharmacy.city}`;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    if (Platform.OS === "android") {
      ToastAndroid.show("Adresa kopirana", ToastAndroid.SHORT);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const dutyStatus = pharmacy ? getDutyStatus(pharmacy) : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-950/40">
        <Pressable className="flex-1" onPress={onClose} />

        <View
          className="max-h-[88%] rounded-t-[28px] border-t border-slate-200 bg-white"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          {/* Drag handle */}
          <View className="items-center pb-2 pt-3">
            <View className="h-1 w-10 rounded-full bg-slate-200" />
          </View>

          {/* Sheet header */}
          <View className="flex-row items-start justify-between gap-4 border-b border-slate-100 px-5 pb-4">
            <View className="flex-1 min-w-0">
              <Text className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Detalji apoteke
              </Text>
              {pharmacy && !loading && !error ? (
                <>
                  <Text className="mt-1.5 text-[22px] font-bold tracking-tight text-slate-900" numberOfLines={2}>
                    {pharmacy.name}
                  </Text>
                  <Text className="mt-0.5 text-sm font-medium text-slate-500">{pharmacy.city}</Text>
                  <TouchableOpacity
                    onPress={onShowOnMap}
                    className="mt-3 self-start flex-row items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2"
                  >
                    <Route size={14} color="#1d4ed8" />
                    <Text className="text-sm font-semibold text-blue-700">Prikazi na mapi</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
            >
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#2563eb" />
              <Text className="mt-3 text-sm font-semibold text-blue-600">Ucitavanje detalja...</Text>
            </View>
          ) : error || !pharmacy ? (
            <View className="m-5 rounded-[28px] border border-red-200 bg-white p-5">
              <Text className="text-sm font-semibold text-red-600">Detalji nijesu dostupni.</Text>
              <Text className="mt-2 text-sm leading-6 text-slate-600">
                {error || "Nije moguce prikazati podatke za odabranu apoteku."}
              </Text>
              <TouchableOpacity onPress={onClose} className="mt-4 self-start rounded-xl bg-slate-900 px-4 py-2">
                <Text className="text-sm font-semibold text-white">Zatvori</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 20 }}>
              {/* Pharmacy image */}
              {pharmacy.img_url ? (
                <View className="overflow-hidden rounded-3xl border border-slate-200">
                  <Image
                    source={{ uri: pharmacy.img_url }}
                    style={{ width: "100%", height: 180 }}
                    resizeMode="cover"
                  />
                </View>
              ) : null}

              {/* Medicine context gradient card */}
              <View
                className="overflow-hidden rounded-3xl border border-emerald-200/80"
                style={{ backgroundColor: "rgba(236,253,245,0.95)" }}
              >
                <View className="border-b border-emerald-100/80 px-5 py-4">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Trazeni lijek</Text>
                  <Text className="mt-1 text-lg font-bold text-slate-900">{medicineName}</Text>
                  <Text className="mt-1 text-sm text-slate-600">
                    Apoteka ima izdvojene doze koje odgovaraju trenutnoj pretrazi.
                  </Text>
                </View>

                <View className="gap-3 px-5 py-4">
                  <View className="flex-row gap-3">
                    <View className="flex-1 rounded-2xl border border-white/80 bg-white/90 p-4">
                      <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trazene doze</Text>
                      <View className="mt-2.5 flex-row flex-wrap gap-2">
                        {selectedDoseStrengths.length > 0 ? (
                          selectedDoseStrengths.map((dose) => (
                            <View key={`sel-${dose}`} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1">
                              <Text className="text-xs font-bold text-blue-700">{dose}</Text>
                            </View>
                          ))
                        ) : (
                          <Text className="text-sm text-slate-500">Nema doza.</Text>
                        )}
                      </View>
                    </View>

                    <View className="flex-1 rounded-2xl border border-white/80 bg-white/90 p-4">
                      <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dostupno</Text>
                      <View className="mt-2.5 flex-row flex-wrap gap-2">
                        {availableDoseStrengths.length > 0 ? (
                          availableDoseStrengths.map((dose) => (
                            <View key={`avl-${dose}`} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1">
                              <Text className="text-xs font-bold text-emerald-700">{dose}</Text>
                            </View>
                          ))
                        ) : (
                          <Text className="text-sm text-slate-500">Nema doza.</Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1 rounded-2xl border border-white/80 bg-white/90 p-4">
                      <View className="flex-row items-start gap-2.5">
                        <Navigation size={16} color="#2563eb" style={{ marginTop: 1 }} />
                        <View className="flex-1">
                          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Udaljenost</Text>
                          <Text className="mt-1 text-sm font-semibold text-slate-900">
                            {distanceLabel || "Nije dostupna"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="flex-1 rounded-2xl border border-white/80 bg-white/90 p-4">
                      <View className="flex-row items-start gap-2.5">
                        <Clock3 size={16} color="#059669" style={{ marginTop: 1 }} />
                        <View className="flex-1">
                          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Azuriranje</Text>
                          <Text className="mt-1 text-sm font-semibold text-slate-900">{latestUpdateLabel}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Status 2-col */}
              <View className="flex-row gap-3">
                <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
                  <View className="flex-row items-start gap-2.5">
                    <Power size={16} color={pharmacy.isActive ? "#059669" : "#94a3b8"} style={{ marginTop: 1 }} />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-900">Status</Text>
                      <Text className="mt-1 text-sm text-slate-600">{pharmacy.isActive ? "Aktivna" : "Neaktivna"}</Text>
                    </View>
                  </View>
                </View>

                <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
                  <View className="flex-row items-start gap-2.5">
                    <Sparkles size={16} color={dutyStatus?.highlighted ? "#2563eb" : "#94a3b8"} style={{ marginTop: 1 }} />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-900">Dezurstvo</Text>
                      <Text className={`mt-1 text-sm font-semibold ${dutyStatus?.highlighted ? "text-blue-700" : "text-slate-700"}`}>
                        {dutyStatus?.label}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Phones */}
              <View>
                <Text className="mb-3 text-base font-bold text-slate-900">Kontakt</Text>
                {pharmacy.phones.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {pharmacy.phones.map((phone) => (
                      <TouchableOpacity
                        key={phone}
                        onPress={() => Linking.openURL(`tel:${phone}`)}
                        className="flex-row items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5"
                      >
                        <Phone size={14} color="#475569" />
                        <Text className="text-sm font-semibold text-slate-700">{phone}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text className="text-sm text-slate-500">Kontakt nije dostupan.</Text>
                )}
              </View>

              {/* Location */}
              <View>
                <View className="mb-2.5 flex-row items-center justify-between">
                  <Text className="text-base font-bold text-slate-900">Lokacija</Text>
                  <TouchableOpacity
                    onPress={() => void copyAddress()}
                    className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-1.5 ${copied ? "border-emerald-200 bg-emerald-50" : "border-blue-200 bg-blue-50"}`}
                  >
                    <Copy size={12} color={copied ? "#059669" : "#1d4ed8"} />
                    <Text className={`text-xs font-semibold ${copied ? "text-emerald-700" : "text-blue-700"}`}>
                      {copied ? "Kopirano!" : "Kopiraj adresu"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <View className="flex-row items-center gap-2">
                    <MapPin size={14} color="#94a3b8" />
                    <Text className="flex-1 text-sm text-slate-700">{pharmacy.address}</Text>
                  </View>
                  <Text className="ml-5 mt-1.5 text-sm text-slate-500">{pharmacy.city}</Text>
                </View>
              </View>

              {/* Duty schedule */}
              {pharmacy.dutySchedule ? (
                <View>
                  <Text className="mb-2.5 text-base font-bold text-slate-900">Dezurni termin</Text>
                  <View className="rounded-2xl border border-slate-200 bg-white p-4">
                    <Text className="text-sm leading-6 text-slate-600">
                      Od <Text className="font-semibold text-slate-900">{formatDateTime(pharmacy.dutySchedule.startDatetime)}</Text>
                    </Text>
                    <Text className="text-sm leading-6 text-slate-600">
                      Do <Text className="font-semibold text-slate-900">{formatDateTime(pharmacy.dutySchedule.endDatetime)}</Text>
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Working hours */}
              <View>
                <Text className="mb-2.5 text-base font-bold text-slate-900">Radno vrijeme</Text>
                <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {pharmacy.workingHours.length > 0 ? (
                    pharmacy.workingHours.map((item, i) => (
                      <View
                        key={`${item.day_of_week}-${i}`}
                        className="flex-row items-center justify-between border-b border-slate-100 px-4 py-3"
                      >
                        <Text className="text-sm font-semibold text-slate-800">{item.day_of_week}</Text>
                        <Text className="text-sm text-slate-600">
                          {formatWorkingHoursRange(item.open_time, item.close_time)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text className="px-4 py-4 text-sm text-slate-500">Radno vrijeme nije dostupno.</Text>
                  )}
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PharmacySearchScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    medicineId?: string;
    medicineName?: string;
    doseIds?: string;
    doseStrengths?: string;
    filters?: string;
  }>();

  const medicineName = params.medicineName ?? "Odabrani lijek";
  const doseIds = useMemo(
    () =>
      String(params.doseIds ?? "")
        .split(",")
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0),
    [params.doseIds]
  );
  const selectedDoseStrengths = useMemo(
    () =>
      String(params.doseStrengths ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [params.doseStrengths]
  );

  // Search state
  const [filters, setFilters] = useState<SearchFilters>(() => {
    try {
      return params.filters ? (JSON.parse(params.filters) as SearchFilters) : DEFAULT_FILTERS;
    } catch {
      return DEFAULT_FILTERS;
    }
  });
  const [sort, setSort] = useState<SearchSort>("az");
  const [viewMode, setViewMode] = useState<SearchViewMode>("list");
  const [mapSinglePharmacy, setMapSinglePharmacy] = useState<PharmacySearchResult | null>(null);
  const [cities, setCities] = useState<City[]>(FALLBACK_CITIES);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [pharmacies, setPharmacies] = useState<PharmacySearchResult[]>([]);

  // UI state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsPharmacy, setDetailsPharmacy] = useState<PharmacyDetails | null>(null);
  const [detailsContext, setDetailsContext] = useState<PharmacySearchResult | null>(null);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationError, setNotificationError] = useState("");

  // Alternatives state
  const [alternatives, setAlternatives] = useState<MedicationAlternative[]>([]);
  const [alternativesLoading, setAlternativesLoading] = useState(false);
  const [alternativesError, setAlternativesError] = useState("");
  const [alternativesLoaded, setAlternativesLoaded] = useState(false);
  const [selectedAlt, setSelectedAlt] = useState<MedicationAlternative | null>(null);
  const [altDoses, setAltDoses] = useState<PharmacySearchDose[]>([]);
  const [altDosesLoading, setAltDosesLoading] = useState(false);
  const [selectedAltDoseIds, setSelectedAltDoseIds] = useState<number[]>([]);
  const [altDetailsVisible, setAltDetailsVisible] = useState(false);
  const [altDetailsLoading, setAltDetailsLoading] = useState(false);
  const [altDetailsMedicine, setAltDetailsMedicine] = useState<MedicineDetails | null>(null);

  const hasTrackedInitialSearch = useRef(false);

  const activeFiltersCount = [
    filters.openNow,
    filters.onDuty,
    filters.radiusEnabled,
    filters.cities.length > 0,
    filters.name.trim().length > 0,
  ].filter(Boolean).length;

  const selectedCityLabel =
    filters.cities.length === 0
      ? "Svi gradovi"
      : filters.cities.length === 1
        ? filters.cities[0]
        : `${filters.cities.length} grada`;

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
        const p = buildSearchParams({ doseIds, sort, filters, userLocation });
        if (trackSearch) p.set("trackSearch", "true");
        const res = await fetch(apiUrl(`/api/v1/pharmacies/search?${p.toString()}`));
        if (!res.ok) throw new Error(await getErrorMessage(res));
        const data = (await res.json()) as SearchResponse;
        setPharmacies(Array.isArray(data.data) ? data.data : []);
      } catch (e) {
        setPharmacies([]);
        setSearchError(e instanceof Error ? e.message : "Pretraga nije uspjela.");
      } finally {
        setIsSearchLoading(false);
      }
    },
    [doseIds, sort, filters, userLocation]
  );

  useEffect(() => {
    const loadCities = async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/cities"));
        if (!res.ok) return;
        const data = (await res.json()) as CitiesResponse;
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        throw new Error("Dozvola za lokaciju nije odobrena.");
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      const lower = raw.toLowerCase();
      const msg =
        lower.includes("unsatisfied device") ||
        lower.includes("location request failed") ||
        lower.includes("location services are disabled") ||
        lower.includes("location provider")
          ? "Lokacijske usluge su isključene. Uključite ih u postavkama uređaja."
          : raw || "Nije moguće dobiti lokaciju.";
      setLocationError(msg);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSortToggle = () => {
    if (sort === "az") {
      setSort("distance");
      if (!userLocation) void requestLocation();
    } else {
      setSort("az");
    }
  };

  const toggleCity = (city: string) =>
    setFilters((cur) => ({
      ...cur,
      cities: cur.cities.includes(city)
        ? cur.cities.filter((c) => c !== city)
        : [...cur.cities, city],
    }));

  const openDetails = async (pharmacy: PharmacySearchResult) => {
    setDetailsVisible(true);
    setDetailsLoading(true);
    setDetailsError("");
    setDetailsPharmacy(null);
    setDetailsContext(pharmacy);
    try {
      const res = await fetch(apiUrl(`/api/v1/pharmacies/${pharmacy.id}`));
      if (!res.ok) throw new Error(await getErrorMessage(res));
      const data = (await res.json()) as PharmacyDetailsResponse;
      setDetailsPharmacy({
        id: data.data.id,
        name: data.data.name,
        address: data.data.address,
        city: data.data.city,
        latitude: normalizeNumber(data.data.latitude),
        longitude: normalizeNumber(data.data.longitude),
        isActive: data.data.isActive === true || data.data.isActive === 1,
        isOnDuty: data.data.isOnDuty,
        img_url: data.data.img_url ?? null,
        phones: Array.isArray(data.data.phones) ? data.data.phones : [],
        workingHours: Array.isArray(data.data.workingHours) ? data.data.workingHours : [],
        dutySchedule: data.data.dutySchedule ?? null,
      });
    } catch (e) {
      setDetailsError(e instanceof Error ? e.message : "Detalji nijesu dostupni.");
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
      const responses = results
        .filter((r): r is PromiseFulfilledResult<Response> => r.status === "fulfilled")
        .map((r) => r.value);
      const ok = responses.filter((r) => r.ok).length;
      const conflict = responses.filter((r) => r.status === 409).length;
      const total = Array.from(new Set(doseIds)).length;

      if (ok > 0) {
        setNotificationMessage(ok === total ? "Pretplata je sačuvana." : "Dio pretplata je sačuvan.");
      } else if (conflict === responses.length && responses.length > 0) {
        setNotificationError("Već imaš pretplatu na ovaj lijek.");
      } else {
        setNotificationError("Pretplata nije uspjela.");
      }
    } catch {
      setNotificationError("Pretplata nije uspjela.");
    } finally {
      setNotificationLoading(false);
    }
  };

  const medicineId = params.medicineId ? Number(params.medicineId) : null;

  const loadAlternatives = async () => {
    if (!medicineId) return;
    setAlternativesLoading(true);
    setAlternativesError("");
    try {
      const res = await fetch(apiUrl(`/api/v1/medication/${medicineId}/alternatives`));
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { data: MedicationAlternative[] };
      setAlternatives(Array.isArray(data.data) ? data.data : []);
      if (!Array.isArray(data.data) || data.data.length === 0) {
        setAlternativesError("Nema alternativnih lijekova.");
      }
    } catch {
      setAlternativesError("Greška pri učitavanju alternativa.");
    } finally {
      setAlternativesLoading(false);
      setAlternativesLoaded(true);
    }
  };

  const selectAlternative = async (alt: MedicationAlternative) => {
    if (selectedAlt?.id === alt.id) {
      setSelectedAlt(null);
      setAltDoses([]);
      setSelectedAltDoseIds([]);
      return;
    }
    setSelectedAlt(alt);
    setSelectedAltDoseIds([]);
    setAltDoses([]);
    setAltDosesLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/v1/medication/${alt.id}/doses`));
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { data: Array<{ id: number; strength: string }> };
      const doses: PharmacySearchDose[] = (Array.isArray(data.data) ? data.data : []).map((d) => ({
        doseId: d.id,
        strength: d.strength,
        is_refundable: false,
      }));
      setAltDoses(doses);
      setSelectedAltDoseIds(doses.map((d) => d.doseId));
    } catch {
      setAltDoses([]);
    } finally {
      setAltDosesLoading(false);
    }
  };

  const openAltDetails = async (id: number) => {
    setAltDetailsVisible(true);
    setAltDetailsLoading(true);
    setAltDetailsMedicine(null);
    try {
      const [detRes, dosesRes] = await Promise.all([
        fetch(apiUrl(`/api/v1/medication/${id}`)),
        fetch(apiUrl(`/api/v1/medication/${id}/doses`)),
      ]);
      const detData = (await detRes.json()) as { data: { id: number; name: string; description: string; img_url?: string; activeIngredients?: { id: number; name: string }[] } };
      const dosesData = (await dosesRes.json()) as { data: { id: number; strength: string }[] };
      setAltDetailsMedicine({
        id: detData.data.id,
        name: detData.data.name,
        description: detData.data.description,
        img_url: detData.data.img_url,
        activeIngredients: Array.isArray(detData.data.activeIngredients) ? detData.data.activeIngredients : [],
        doses: Array.isArray(dosesData.data) ? dosesData.data.map((d) => d.strength) : [],
      });
    } catch {
      setAltDetailsVisible(false);
    } finally {
      setAltDetailsLoading(false);
    }
  };

  const searchAlternative = () => {
    if (!selectedAlt || selectedAltDoseIds.length === 0) return;
    router.replace({
      pathname: "/pharmacy-search",
      params: {
        medicineId: String(selectedAlt.id),
        medicineName: selectedAlt.name,
        doseIds: selectedAltDoseIds.join(","),
        doseStrengths: altDoses
          .filter((d) => selectedAltDoseIds.includes(d.doseId))
          .map((d) => d.strength)
          .join(","),
        filters: JSON.stringify(filters),
      },
    });
  };

  // ── JSX shared between map and list layouts ──────────────────────────────────

  const headerCard = (
    <View
      className="mx-4 mb-4 mt-3 rounded-[28px] border border-slate-200 bg-white px-5 py-5"
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        className="flex-row items-center gap-2.5 self-start rounded-xl border border-slate-200 bg-white px-4 py-3"
      >
        <ArrowLeft size={18} color="#475569" />
        <Text className="text-base font-semibold text-slate-600">Nazad na pretragu</Text>
      </TouchableOpacity>

      <View className="mt-4 flex-row items-start gap-3">
        <View className="mt-1 h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
          <Search size={20} color="#2563eb" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-2xl font-bold tracking-tight text-slate-950" numberOfLines={2}>
            {medicineName}
          </Text>
          <Text className="mt-1 text-sm text-slate-500" numberOfLines={1}>
            {selectedDoseStrengths.length > 0
              ? `Doze: ${selectedDoseStrengths.join(", ")}`
              : "Rezultati za odabrane doze"}
          </Text>
        </View>
      </View>
    </View>
  );

  const filterBar = (
    <View className="border-y border-blue-100 bg-white px-4 py-3.5">
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={() => setFiltersOpen(true)}
          className="h-11 flex-row items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4"
        >
          <Filter size={16} color="#2563eb" />
          <Text className="text-sm font-bold text-slate-800">Filteri</Text>
          {activeFiltersCount > 0 && (
            <View className="rounded-full bg-blue-600 px-1.5 py-0.5">
              <Text className="text-[10px] font-bold text-white">{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSortToggle}
          className="h-11 flex-row items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4"
        >
          <SlidersHorizontal size={16} color="#2563eb" />
          <Text className="text-sm font-bold text-slate-800">
            {sort === "az" ? "A-Z" : "Udaljenost"}
          </Text>
          <ChevronDown size={16} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => void requestLocation()}
          disabled={isLocating}
          className={`h-11 w-11 items-center justify-center rounded-full border ${
            userLocation ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
          } disabled:opacity-70`}
        >
          <LocateFixed size={18} color={userLocation ? "#047857" : "#334155"} />
        </TouchableOpacity>
      </View>

      <View className="mt-3 flex-row items-center justify-between gap-3">
        <TouchableOpacity
          onPress={() => setFiltersOpen(true)}
          className="flex-row items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5"
        >
          <MapPin size={12} color="#2563eb" />
          <Text className="text-xs font-semibold text-blue-700">{selectedCityLabel}</Text>
        </TouchableOpacity>

        <View className="flex-row rounded-2xl border border-slate-200 bg-slate-100 p-1">
          <TouchableOpacity
            onPress={() => { setViewMode("list"); setMapSinglePharmacy(null); }}
            className={`rounded-xl px-3.5 py-2 ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
          >
            <Text className={`text-xs font-bold ${viewMode === "list" ? "text-slate-950" : "text-slate-500"}`}>
              Lista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setViewMode("map"); setMapSinglePharmacy(null); }}
            className={`rounded-xl px-3.5 py-2 ${viewMode === "map" ? "bg-white shadow-sm" : ""}`}
          >
            <Text className={`text-xs font-bold ${viewMode === "map" ? "text-slate-950" : "text-slate-500"}`}>
              Mapa
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const alerts = (locationError || notificationMessage || notificationError) ? (
    <View className="px-4 pt-3 gap-2">
      {locationError ? (
        <View className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <Text className="text-sm text-amber-700">{locationError}</Text>
        </View>
      ) : null}
      {notificationMessage ? (
        <View className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <Text className="text-sm text-emerald-700">{notificationMessage}</Text>
        </View>
      ) : null}
      {notificationError ? (
        <View className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
          <Text className="text-sm text-red-700">{notificationError}</Text>
        </View>
      ) : null}
    </View>
  ) : null;

  const filtersModal = (
    <Modal
      visible={filtersOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setFiltersOpen(false)}
    >
      <View className="flex-1 bg-slate-950/40">
        <Pressable className="flex-1" onPress={() => setFiltersOpen(false)} />

        <View
          className="max-h-[85%] rounded-t-[28px] border-t border-slate-200 bg-white"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="items-center pb-2 pt-3">
            <View className="h-1 w-10 rounded-full bg-slate-200" />
          </View>

          <View className="flex-row items-center justify-between gap-4 border-b border-slate-100 px-4 pb-4">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Pretraga apoteka
              </Text>
              <Text className="mt-0.5 text-lg font-bold text-slate-900">Filteri</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => void requestLocation()}
                disabled={isLocating}
                className={`h-10 w-10 items-center justify-center rounded-full border ${
                  userLocation ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                } disabled:opacity-70`}
              >
                <LocateFixed size={16} color={userLocation ? "#047857" : "#475569"} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFiltersOpen(false)}
                className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>
            <View className="items-end">
              <TouchableOpacity
                onPress={() => setFilters(DEFAULT_FILTERS)}
                className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200"
              >
                <RotateCcw size={15} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-slate-500">Naziv apoteke</Text>
              <TextInput
                value={filters.name}
                onChangeText={(t) => setFilters((c) => ({ ...c, name: t }))}
                placeholder="Unesite naziv"
                placeholderTextColor="#94a3b8"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-slate-500">Grad</Text>
              <View className="rounded-2xl border border-slate-200 bg-white p-2 gap-2">
                <View className="flex-row flex-wrap gap-2 px-1 pb-1">
                  <TouchableOpacity
                    onPress={() => setFilters((c) => ({ ...c, cities: [] }))}
                    className={`rounded-full px-3 py-1.5 ${filters.cities.length === 0 ? "bg-blue-600" : "bg-slate-100"}`}
                  >
                    <Text className={`text-xs font-bold ${filters.cities.length === 0 ? "text-white" : "text-slate-700"}`}>
                      Svi gradovi
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setFilters((c) => ({ ...c, cities: [] }))}
                    disabled={filters.cities.length === 0}
                    className="rounded-full bg-slate-100 px-3 py-1.5 disabled:opacity-50"
                  >
                    <Text className="text-xs font-bold text-slate-700">Ocisti izbor</Text>
                  </TouchableOpacity>
                </View>
                {cities.map((city) => {
                  const checked = filters.cities.includes(city.name);
                  return (
                    <TouchableOpacity
                      key={city.id}
                      onPress={() => toggleCity(city.name)}
                      className={`flex-row items-center justify-between rounded-xl border px-3 py-2.5 ${
                        checked ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <Text className="text-sm font-semibold text-slate-700">{city.name}</Text>
                      <View
                        className={`h-5 w-5 items-center justify-center rounded border ${
                          checked ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                        }`}
                      >
                        {checked && <View className="h-2.5 w-2.5 rounded-sm bg-white" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <CheckboxRow
              label="Otvorena sada"
              checked={filters.openNow}
              onPress={() => setFilters((c) => ({ ...c, openNow: !c.openNow }))}
            />

            <CheckboxRow
              label="Dezurna"
              checked={filters.onDuty}
              centered
              onPress={() => setFilters((c) => ({ ...c, onDuty: !c.onDuty }))}
            />

            <View className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-2">
                    <MapPin size={15} color="#2563eb" />
                    <Text className="text-sm font-bold text-slate-900">Lokacija</Text>
                  </View>
                  <Text className="mt-1 text-xs leading-5 text-slate-500">
                    {userLocation
                      ? "Udaljenost i radius su dostupni."
                      : "Potrebna za sortiranje po udaljenosti."}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => void requestLocation()}
                  disabled={isLocating}
                  className={`h-10 w-10 items-center justify-center rounded-xl border ${
                    userLocation ? "border-emerald-200 bg-white" : "border-blue-200 bg-white"
                  } disabled:opacity-70`}
                >
                  <LocateFixed size={16} color={userLocation ? "#047857" : "#2563eb"} />
                </TouchableOpacity>
              </View>
              {locationError ? (
                <Text className="mt-2 text-xs font-medium leading-5 text-red-600">{locationError}</Text>
              ) : null}
            </View>

            <View className={!userLocation ? "opacity-55" : ""}>
              <CheckboxRow
                label="Radius pretrage"
                checked={filters.radiusEnabled}
                disabled={!userLocation}
                onPress={() =>
                  userLocation && setFilters((c) => ({ ...c, radiusEnabled: !c.radiusEnabled }))
                }
              />
              <View className="mt-3 gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-slate-500">Udaljenost</Text>
                  <Text className="text-xs font-semibold text-slate-500">{filters.radius} km</Text>
                </View>
                <View className="flex-row gap-2">
                  {[5, 10, 20, 30, 50].map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => userLocation && setFilters((c) => ({ ...c, radius: r }))}
                      disabled={!userLocation || !filters.radiusEnabled}
                      className={`flex-1 items-center rounded-xl border py-2 disabled:opacity-40 ${
                        filters.radius === r && filters.radiusEnabled
                          ? "border-blue-600 bg-blue-600"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <Text className={`text-xs font-bold ${filters.radius === r && filters.radiusEnabled ? "text-white" : "text-slate-700"}`}>
                        {r}km
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View className="flex-row items-center gap-2 rounded-2xl bg-blue-50 px-3 py-2.5">
              <SlidersHorizontal size={14} color="#2563eb" />
              <Text className="text-xs font-semibold leading-5 text-blue-700">
                Filteri se primjenjuju odmah.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const detailsSheet = (
    <PharmacyDetailsSheet
      visible={detailsVisible}
      loading={detailsLoading}
      error={detailsError}
      pharmacy={detailsPharmacy}
      medicineName={medicineName}
      selectedDoseStrengths={selectedDoseStrengths}
      availableDoseStrengths={detailsContext?.doses.map((d) => d.strength) ?? []}
      distanceLabel={formatDistance(detailsContext?.distance)}
      latestUpdateLabel={formatRelativeUpdate(detailsContext?.doses?.[0]?.lastUpdated)}
      onClose={() => setDetailsVisible(false)}
      onShowOnMap={() => {
        setDetailsVisible(false);
        setMapSinglePharmacy(detailsContext);
        setViewMode("map");
      }}
    />
  );

  // ── Map mode: no outer ScrollView — PharmacyMapView is the only scrollable ──

  if (viewMode === "map") {
    return (
      <View style={{ flex: 1, backgroundColor: "#f8fafc", paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }} className="bg-slate-50">
          {headerCard}
          {filterBar}
          {alerts}
          <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16 }}>
            {isSearchLoading ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            ) : searchError ? (
              <View className="rounded-2xl border border-red-200 bg-white p-5 mt-4" style={CARD_SHADOW}>
                <View className="flex-row items-start gap-3">
                  <View className="rounded-xl bg-red-50 p-2">
                    <AlertCircle size={18} color="#dc2626" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-900">Nije moguce ucitati rezultate.</Text>
                    <Text className="mt-1 text-sm leading-6 text-slate-600">{searchError}</Text>
                    <TouchableOpacity
                      onPress={() => void fetchPharmacies()}
                      className="mt-4 flex-row items-center gap-2 self-start rounded-xl bg-slate-900 px-4 py-2"
                    >
                      <RotateCw size={14} color="#fff" />
                      <Text className="text-sm font-semibold text-white">Pokusaj ponovo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <PharmacyMapView
                pharmacies={mapSinglePharmacy ? [mapSinglePharmacy] : pharmacies}
                userLocation={userLocation}
                isLocating={isLocating}
                onRequestLocation={requestLocation}
                medicineName={medicineName}
                doseStrengths={selectedDoseStrengths}
                fullScreen
              />
            )}
          </View>
          {filtersModal}
          {detailsSheet}
        </View>
      </View>
    );
  }

  // ── List mode: ScrollView with sticky filter bar ───────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc", paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View className="flex-1 bg-slate-50">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 16, 32) }}
          stickyHeaderIndices={[1]}
        >
          {/* [0] Header card — scrolls away */}
          {headerCard}
          {/* [1] Filter bar — stays sticky */}
          {filterBar}

          {alerts}

          {!isSearchLoading && !searchError && (
            <View className="mx-4 mt-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4" style={CARD_SHADOW}>
              <Text className="text-sm font-semibold text-blue-600">
                {pharmacies.length} apoteka za prikaz
              </Text>
              <Text className="mt-1 text-2xl font-bold text-slate-900">Dostupnost lijeka</Text>
              <Text className="mt-1 text-sm text-slate-500">
                Lista prikazuje apoteke koje imaju odabranu dozu na stanju.
              </Text>
            </View>
          )}

          <View className="px-4 pt-4">
            {isSearchLoading ? (
              <LoadingSkeleton />
            ) : searchError ? (
              <View className="rounded-2xl border border-red-200 bg-white p-5" style={CARD_SHADOW}>
                <View className="flex-row items-start gap-3">
                  <View className="rounded-xl bg-red-50 p-2">
                    <AlertCircle size={18} color="#dc2626" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-900">Nije moguce ucitati rezultate.</Text>
                    <Text className="mt-1 text-sm leading-6 text-slate-600">{searchError}</Text>
                    <TouchableOpacity
                      onPress={() => void fetchPharmacies()}
                      className="mt-4 flex-row items-center gap-2 self-start rounded-xl bg-slate-900 px-4 py-2"
                    >
                      <RotateCw size={14} color="#fff" />
                      <Text className="text-sm font-semibold text-white">Pokusaj ponovo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : pharmacies.length === 0 ? (
              <View className="rounded-2xl border border-slate-200 bg-white p-5" style={CARD_SHADOW}>
                <View className="flex-row items-start gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <AlertCircle size={20} color="#64748b" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-900">Nema apoteka za prikaz.</Text>
                    <Text className="mt-1 text-sm leading-6 text-slate-600">
                      {activeFiltersCount > 0
                        ? "Nema rezultata za odabrani lijek sa trenutnim filterima."
                        : "Nema rezultata za odabrani lijek i dozu."}
                    </Text>

                    {notificationMessage ? (
                      <View className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                        <Text className="text-sm font-semibold text-emerald-700">{notificationMessage}</Text>
                      </View>
                    ) : null}
                    {notificationError ? (
                      <View className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
                        <Text className="text-sm font-semibold text-red-600">{notificationError}</Text>
                      </View>
                    ) : null}

                    <View className="mt-4 gap-2.5">
                      {/* Prikaži alternative */}
                      {medicineId && !alternativesLoaded && (
                        <TouchableOpacity
                          onPress={() => void loadAlternatives()}
                          disabled={alternativesLoading}
                          className="h-11 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 disabled:opacity-60"
                        >
                          {alternativesLoading
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Pill size={16} color="#fff" />}
                          <Text className="text-sm font-bold text-white">
                            {alternativesLoading ? "Učitavanje..." : "Prikaži alternative"}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Notify me */}
                      {user ? (
                        <TouchableOpacity
                          onPress={() => void subscribeToNotifications()}
                          disabled={notificationLoading || !!notificationMessage}
                          className="h-11 flex-row items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 disabled:opacity-60"
                        >
                          {notificationLoading
                            ? <ActivityIndicator size="small" color="#2563eb" />
                            : <Target size={16} color="#2563eb" />}
                          <Text className="text-sm font-bold text-blue-700">
                            {notificationLoading ? "Učitavanje..." : "Obavijesti me kad bude dostupno"}
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      {activeFiltersCount > 0 && (
                        <TouchableOpacity
                          onPress={() => setFilters(DEFAULT_FILTERS)}
                          className="h-11 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4"
                        >
                          <X size={16} color="#475569" />
                          <Text className="text-sm font-bold text-slate-700">Očisti filtere</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Alternatives list */}
                    {alternativesLoaded && (
                      <View className="mt-5 border-t border-slate-100 pt-4">
                        {alternativesError ? (
                          <View className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                            <Text className="text-sm font-semibold text-amber-700">{alternativesError}</Text>
                          </View>
                        ) : null}

                        {alternatives.length > 0 && (
                          <>
                            <Text className="mb-3 text-sm font-bold text-slate-900">Odaberite alternativni lijek</Text>
                            <View className="gap-2.5">
                              {alternatives.map((alt) => {
                                const isSelected = selectedAlt?.id === alt.id;
                                return (
                                  <View
                                    key={alt.id}
                                    className={`overflow-hidden rounded-2xl border bg-white ${isSelected ? "border-blue-300" : "border-slate-200"}`}
                                  >
                                    {/* Header row: circle + name */}
                                    <TouchableOpacity
                                      onPress={() => void selectAlternative(alt)}
                                      className="flex-row items-start gap-4 px-5 pt-5 pb-4"
                                    >
                                      <View
                                        className={`mt-0.5 h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-blue-300 bg-blue-100" : "border-blue-200 bg-blue-50"}`}
                                      >
                                        {isSelected
                                          ? <CheckCircle2 size={18} color="#2563eb" />
                                          : <Text className="text-base text-blue-400">○</Text>}
                                      </View>
                                      <View className="flex-1">
                                        <Text className="text-lg font-bold text-slate-900">{alt.name}</Text>
                                        {alt.description ? (
                                          <Text className="mt-2 text-sm leading-6 text-slate-600" numberOfLines={3}>{alt.description}</Text>
                                        ) : null}
                                      </View>
                                    </TouchableOpacity>

                                    {/* Detalji button */}
                                    <TouchableOpacity
                                      onPress={() => void openAltDetails(alt.id)}
                                      className="mx-4 mb-4 flex-row items-center justify-center gap-2 rounded-xl bg-blue-50 py-3.5"
                                    >
                                      <Text className="text-sm font-bold text-blue-600">Detalji</Text>
                                      <ChevronRight size={16} color="#2563eb" />
                                    </TouchableOpacity>

                                    {isSelected && (
                                      <View className="border-t border-slate-100 px-5 pb-5 pt-4">
                                        <Text className="mb-3 text-sm font-semibold text-slate-700">Odaberite dozu</Text>
                                        {altDosesLoading ? (
                                          <ActivityIndicator size="small" color="#2563eb" />
                                        ) : (
                                          <View className="flex-row flex-wrap gap-2">
                                            {altDoses.map((dose) => {
                                              const doseSelected = selectedAltDoseIds.includes(dose.doseId);
                                              return (
                                                <TouchableOpacity
                                                  key={dose.doseId}
                                                  onPress={() => {
                                                    setSelectedAltDoseIds((prev) =>
                                                      doseSelected
                                                        ? prev.filter((id) => id !== dose.doseId)
                                                        : [...prev, dose.doseId]
                                                    );
                                                  }}
                                                  className={`rounded-full px-4 py-2 ${doseSelected ? "border border-blue-600 bg-blue-600" : "border border-slate-200 bg-slate-50"}`}
                                                >
                                                  <Text className={`text-sm font-semibold ${doseSelected ? "text-white" : "text-slate-700"}`}>
                                                    {dose.strength}
                                                  </Text>
                                                </TouchableOpacity>
                                              );
                                            })}
                                          </View>
                                        )}
                                      </View>
                                    )}
                                  </View>
                                );
                              })}
                            </View>

                            {selectedAlt && (
                              <TouchableOpacity
                                onPress={searchAlternative}
                                disabled={selectedAltDoseIds.length === 0 || altDosesLoading}
                                className="mt-4 h-11 flex-row items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 disabled:opacity-40"
                              >
                                <Search size={16} color="#fff" />
                                <Text className="text-sm font-bold text-white">Pretraži ovu alternativu</Text>
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View className="gap-4">
                {pharmacies.map((pharmacy) => (
                  <PharmacyCard
                    key={pharmacy.id}
                    pharmacy={pharmacy}
                    onPress={() => void openDetails(pharmacy)}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {filtersModal}
        {detailsSheet}
        <MedicineDetailsModal
          visible={altDetailsVisible}
          loading={altDetailsLoading}
          medicine={altDetailsMedicine}
          onClose={() => setAltDetailsVisible(false)}
        />
      </View>
    </View>
  );
}

// ─── Pharmacy card (matches web mobile exactly) ───────────────────────────────

function PharmacyCard({
  pharmacy,
  onPress,
}: {
  pharmacy: PharmacySearchResult;
  onPress: () => void;
}) {
  const isOpen = pharmacy.isOpenNow || pharmacy.isOnDuty;
  const distanceLabel = formatDistance(pharmacy.distance);

  return (
    <View
      className="rounded-2xl border border-slate-200 bg-white p-4"
      style={CARD_SHADOW}
    >
      <View className="flex-col gap-4">
        <View className="flex-row items-start gap-3">
          {/* Icon */}
          <View className="mt-0.5 h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
            <Building2 size={18} color="#2563eb" />
          </View>

          <View className="flex-1 min-w-0">
            {/* Name + city badge */}
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="text-base font-bold text-slate-900" numberOfLines={2} style={{ flexShrink: 1 }}>
                {pharmacy.name}
              </Text>
              <View className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1">
                <Text className="text-xs font-semibold text-blue-700">{pharmacy.city}</Text>
              </View>
            </View>

            {/* Address + status */}
            <View className="mt-2.5 gap-2">
              <View className="flex-row items-start gap-2">
                <MapPin size={14} color="#94a3b8" style={{ marginTop: 1 }} />
                <Text className="flex-1 text-xs text-slate-600">{pharmacy.address}</Text>
              </View>

              <View className="flex-row items-center gap-2">
                <Clock3 size={14} color={isOpen ? "#10b981" : "#94a3b8"} />
                <Text className={`text-xs font-semibold ${isOpen ? "text-emerald-600" : "text-slate-500"}`}>
                  {getAvailabilityLabel(pharmacy)}
                </Text>
              </View>
            </View>

            {/* Dose chips */}
            <View className="mt-3 flex-row flex-wrap gap-2">
              {pharmacy.doses.map((dose) => (
                <View
                  key={`${pharmacy.id}-${dose.doseId}`}
                  className="justify-center rounded-xl border border-emerald-100 bg-emerald-50 px-2.5 py-1.5"
                >
                  <Text className="text-[11px] font-bold text-emerald-700">{dose.strength}</Text>
                  <Text className="mt-0.5 text-[11px] font-semibold text-emerald-700/75">
                    {formatRelativeUpdate(dose.lastUpdated)}
                  </Text>
                </View>
              ))}

              {pharmacy.isOnDuty && (
                <View className="items-center justify-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1">
                  <Text className="text-[11px] font-bold text-blue-700">Dezurna</Text>
                </View>
              )}
            </View>

            {/* Distance */}
            {distanceLabel ? (
              <View className="mt-3 self-start flex-row items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2">
                <Navigation size={13} color="#2563eb" />
                <Text className="text-xs font-bold text-blue-700">{distanceLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Full-width Detalji button (matches web) */}
        <TouchableOpacity
          onPress={onPress}
          className="flex-row items-center justify-center gap-2 rounded-xl border border-blue-200/80 bg-white py-2.5"
          style={{
            shadowColor: "#2563eb",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <Text className="text-sm font-semibold text-blue-700">Detalji</Text>
          <ChevronRight size={14} color="#1d4ed8" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <View className="gap-4">
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-5"
          style={CARD_SHADOW}
        >
          <View className="flex-row gap-4">
            <View className="h-10 w-10 rounded-2xl bg-slate-200" />
            <View className="flex-1 gap-3">
              <View className="h-5 w-2/5 rounded bg-slate-200" />
              <View className="h-4 w-4/5 rounded bg-slate-100" />
              <View className="h-4 w-1/2 rounded bg-slate-100" />
              <View className="flex-row gap-2">
                <View className="h-7 w-16 rounded-xl bg-slate-100" />
                <View className="h-7 w-20 rounded-xl bg-slate-100" />
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
