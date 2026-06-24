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
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Filter,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── PharmacyMapView — pure RN OSM tile map (no native map packages) ─────────

const TILE_SIZE = 256;
const MAP_ZOOM = 10;
const N_TILES = 1 << MAP_ZOOM;

function lng2tilef(lng: number): number {
  return ((lng + 180) / 360) * N_TILES;
}

function lat2tilef(lat: number): number {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * N_TILES;
}

function latLngToPixel(
  lat: number,
  lng: number,
  tileX0: number,
  tileY0: number
): { x: number; y: number } {
  return {
    x: (lng2tilef(lng) - tileX0) * TILE_SIZE,
    y: (lat2tilef(lat) - tileY0) * TILE_SIZE,
  };
}

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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const mapHeight = Math.max(windowHeight - 290, 360);
  const containerSize = fullScreen ? ({ flex: 1 } as const) : { height: mapHeight };

  const pharmaciesWithCoords = useMemo(
    () =>
      pharmacies
        .map((p) => {
          const lat = normalizeNumber(p.latitude);
          const lng = normalizeNumber(p.longitude);
          if (lat === null || lng === null) return null;
          return { ...p, latitude: lat, longitude: lng };
        })
        .filter(
          (p): p is PharmacySearchResult & { latitude: number; longitude: number } => p !== null
        ),
    [pharmacies]
  );

  const { tileX0, tileY0, tileX1, tileY1, tiles } = useMemo(() => {
    const lats: number[] = pharmaciesWithCoords.map((p) => p.latitude);
    const lngs: number[] = pharmaciesWithCoords.map((p) => p.longitude);
    if (userLocation) {
      const ul = normalizeNumber(userLocation.latitude);
      const ug = normalizeNumber(userLocation.longitude);
      if (ul !== null) lats.push(ul);
      if (ug !== null) lngs.push(ug);
    }

    const minLat = lats.length > 0 ? Math.min(...lats) : 41.8;
    const maxLat = lats.length > 0 ? Math.max(...lats) : 43.5;
    const minLng = lngs.length > 0 ? Math.min(...lngs) : 18.4;
    const maxLng = lngs.length > 0 ? Math.max(...lngs) : 20.4;

    const tileX0 = Math.max(0, Math.floor(lng2tilef(minLng)) - 1);
    const tileY0 = Math.max(0, Math.floor(lat2tilef(maxLat)) - 1);
    const tileX1 = Math.min(N_TILES - 1, Math.floor(lng2tilef(maxLng)) + 1);
    const tileY1 = Math.min(N_TILES - 1, Math.floor(lat2tilef(minLat)) + 1);

    const tiles: { x: number; y: number }[] = [];
    for (let ty = tileY0; ty <= tileY1; ty++) {
      for (let tx = tileX0; tx <= tileX1; tx++) {
        tiles.push({ x: tx, y: ty });
      }
    }

    return { tileX0, tileY0, tileX1, tileY1, tiles };
  }, [pharmaciesWithCoords, userLocation]);

  const mapW = (tileX1 - tileX0 + 1) * TILE_SIZE;
  const mapH = (tileY1 - tileY0 + 1) * TILE_SIZE;

  const selectedPharmacy = useMemo(
    () => (selectedId !== null ? pharmaciesWithCoords.find((p) => p.id === selectedId) ?? null : null),
    [selectedId, pharmaciesWithCoords]
  );

  if (pharmaciesWithCoords.length === 0) {
    return (
      <View
        style={[containerSize, { borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: "#e2e8f0" }]}
        className="items-center justify-center bg-white"
      >
        <View className="items-center px-6">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
            <MapPin size={24} color="#2563eb" />
          </View>
          <Text className="mt-4 text-xl font-bold text-slate-900">Nema rezultata za mapu</Text>
          <Text className="mt-2 text-center text-sm leading-6 text-slate-500">
            Apoteke bez koordinata ne mogu biti prikazane na mapi.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[containerSize, { borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: "#e2e8f0" }]}
    >
      {/* Dismiss callout on background tap */}
      <Pressable style={{ flex: 1 }} onPress={() => setSelectedId(null)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ width: mapW, height: mapH }}>
              {/* OSM tile images */}
              {tiles.map((tile) => (
                <Image
                  key={`${tile.x}-${tile.y}`}
                  source={{ uri: `https://basemaps.cartocdn.com/rastertiles/voyager/${MAP_ZOOM}/${tile.x}/${tile.y}.png` }}
                  style={{
                    position: "absolute",
                    left: (tile.x - tileX0) * TILE_SIZE,
                    top: (tile.y - tileY0) * TILE_SIZE,
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                  }}
                />
              ))}

              {/* User location */}
              {userLocation &&
                (() => {
                  const ulat = normalizeNumber(userLocation.latitude);
                  const ulng = normalizeNumber(userLocation.longitude);
                  if (ulat === null || ulng === null) return null;
                  const { x, y } = latLngToPixel(ulat, ulng, tileX0, tileY0);
                  return (
                    <View
                      style={{
                        position: "absolute",
                        left: x - 16,
                        top: y - 16,
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: "#7c3aed",
                        borderWidth: 3,
                        borderColor: "white",
                        alignItems: "center",
                        justifyContent: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        elevation: 6,
                        zIndex: 5,
                      }}
                    >
                      <Text style={{ color: "white", fontSize: 9, fontWeight: "700" }}>Ja</Text>
                    </View>
                  );
                })()}

              {/* Pharmacy markers */}
              {pharmaciesWithCoords.map((pharmacy) => {
                const { x, y } = latLngToPixel(pharmacy.latitude, pharmacy.longitude, tileX0, tileY0);
                const color = pharmacy.isOnDuty ? "#2563eb" : pharmacy.isOpenNow ? "#10b981" : "#ef4444";
                const isSelected = selectedId === pharmacy.id;

                return (
                  <TouchableOpacity
                    key={pharmacy.id}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedId(isSelected ? null : pharmacy.id);
                    }}
                    style={{ position: "absolute", left: x - 16, top: y - 38, zIndex: isSelected ? 20 : 10 }}
                    activeOpacity={0.8}
                  >
                    {/* Callout above selected marker */}
                    {isSelected && (
                      <View
                        style={{
                          position: "absolute",
                          bottom: 44,
                          left: -86,
                          width: 220,
                          backgroundColor: "white",
                          borderRadius: 14,
                          padding: 12,
                          gap: 6,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.15,
                          shadowRadius: 12,
                          elevation: 8,
                          borderWidth: 1,
                          borderColor: "#e2e8f0",
                        }}
                      >
                        <Text style={{ fontWeight: "700", fontSize: 13, color: "#0f172a", lineHeight: 18 }} numberOfLines={2}>
                          {pharmacy.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#64748b" }} numberOfLines={1}>
                          {pharmacy.address}
                        </Text>
                        <View
                          style={{
                            alignSelf: "flex-start",
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 99,
                            backgroundColor: pharmacy.isOnDuty ? "#eff6ff" : pharmacy.isOpenNow ? "#ecfdf5" : "#fef2f2",
                            borderWidth: 1,
                            borderColor: pharmacy.isOnDuty ? "#bfdbfe" : pharmacy.isOpenNow ? "#a7f3d0" : "#fecaca",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: pharmacy.isOnDuty ? "#1d4ed8" : pharmacy.isOpenNow ? "#059669" : "#dc2626",
                            }}
                          >
                            {pharmacy.isOnDuty ? "Dezurna" : pharmacy.isOpenNow ? "Radi" : "Ne radi"}
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: "#ecfdf5",
                            borderRadius: 8,
                            padding: 8,
                            borderWidth: 1,
                            borderColor: "#d1fae5",
                            gap: 4,
                          }}
                        >
                          <Text style={{ fontSize: 9, fontWeight: "700", color: "#059669", textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Dostupne doze
                          </Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                            {pharmacy.doses.slice(0, 4).map((dose) => (
                              <View
                                key={dose.doseId}
                                style={{ backgroundColor: "#d1fae5", borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: "#a7f3d0" }}
                              >
                                <Text style={{ fontSize: 10, fontWeight: "700", color: "#065f46" }}>{dose.strength}</Text>
                              </View>
                            ))}
                            {pharmacy.doses.length > 4 && (
                              <Text style={{ fontSize: 10, color: "#64748b" }}>+{pharmacy.doses.length - 4}</Text>
                            )}
                          </View>
                        </View>
                        {/* Callout arrow */}
                        <View
                          style={{
                            position: "absolute",
                            bottom: -8,
                            left: 102,
                            width: 16,
                            height: 16,
                            backgroundColor: "white",
                            transform: [{ rotate: "45deg" }],
                            borderRightWidth: 1,
                            borderBottomWidth: 1,
                            borderColor: "#e2e8f0",
                          }}
                        />
                      </View>
                    )}

                    {/* Pin body */}
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: color,
                        borderWidth: isSelected ? 3 : 2,
                        borderColor: "white",
                        alignItems: "center",
                        justifyContent: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 4,
                        elevation: 5,
                      }}
                    >
                      <Text style={{ color: "white", fontSize: 16, fontWeight: "900", lineHeight: 20 }}>+</Text>
                    </View>
                    {/* Pin tail */}
                    <View
                      style={{
                        alignSelf: "center",
                        marginTop: -4,
                        width: 10,
                        height: 10,
                        backgroundColor: color,
                        transform: [{ rotate: "45deg" }],
                      }}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>
      </Pressable>

      {/* Locate me button — top-right overlay */}
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

      {/* Status legend — bottom-left overlay */}
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
                    onPress={openMaps}
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
                    onPress={openMaps}
                    className="flex-row items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5"
                  >
                    <Copy size={12} color="#1d4ed8" />
                    <Text className="text-xs font-semibold text-blue-700">Otvori</Text>
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
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SearchSort>("az");
  const [viewMode, setViewMode] = useState<SearchViewMode>("list");
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
      const ok = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
      if (ok > 0) {
        setNotificationMessage(ok === doseIds.length ? "Pretplata je sacuvana." : "Dio pretplata je sacuvan.");
      } else {
        setNotificationError("Pretplata nije uspjela.");
      }
    } catch {
      setNotificationError("Pretplata nije uspjela.");
    } finally {
      setNotificationLoading(false);
    }
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
        className="flex-row items-center gap-2 self-start"
      >
        <ArrowLeft size={16} color="#64748b" />
        <Text className="text-sm font-semibold text-slate-500">Nazad na pretragu</Text>
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
            onPress={() => setViewMode("list")}
            className={`rounded-xl px-3.5 py-2 ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
          >
            <Text className={`text-xs font-bold ${viewMode === "list" ? "text-slate-950" : "text-slate-500"}`}>
              Lista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode("map")}
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
                pharmacies={pharmacies}
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
                      Nema rezultata za odabrani lijek i dozu.
                    </Text>
                    <View className="mt-4 gap-2.5">
                      {user ? (
                        <TouchableOpacity
                          onPress={() => void subscribeToNotifications()}
                          disabled={notificationLoading}
                          className="h-11 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 disabled:opacity-60"
                        >
                          {notificationLoading
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Target size={16} color="#fff" />}
                          <Text className="text-sm font-bold text-white">
                            {notificationLoading ? "Ucitavanje..." : "Obavijesti me kad bude dostupno"}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {activeFiltersCount > 0 && (
                        <TouchableOpacity
                          onPress={() => setFilters(DEFAULT_FILTERS)}
                          className="h-11 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4"
                        >
                          <X size={16} color="#475569" />
                          <Text className="text-sm font-bold text-slate-700">Ocisti filtere</Text>
                        </TouchableOpacity>
                      )}
                    </View>
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
