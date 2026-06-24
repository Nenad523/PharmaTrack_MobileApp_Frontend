import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock3,
  MapPin,
  Phone,
  Power,
  RotateCw,
  Sparkles,
  X,
} from "lucide-react-native";
import { apiUrl } from "../../lib/api";
import {
  DutyCalendar,
  formatFullDate,
  formatShortDate,
  getLocalDateKey,
  parseDateKey,
} from "../../components/duty/DutyCalendar";

// ─── Types ─────────────────────────────────────────────────────────────────────

const ALL_CITIES = "all";

type City = { id: number; name: string };

type DutyPharmacy = {
  id: number;
  name: string;
  address: string;
  city: string;
  phone?: string | null;
  dutyStart: string;
  dutyEnd: string;
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
  dutySchedule: { startDatetime: string; endDatetime: string } | null;
};

// ─── Time helpers ──────────────────────────────────────────────────────────────

const parseDateTimeParts = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T| )(\d{2}):(\d{2})/);
  if (!match) return null;
  return { year: match[1], month: match[2], day: match[3], hour: match[4], minute: match[5] };
};

const formatTime = (value: string | null | undefined): string => {
  if (!value) return "Nije dostupno";
  const parts = parseDateTimeParts(value);
  if (parts) return `${parts.hour}:${parts.minute}`;
  const m = value.match(/^(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  return value;
};

const formatDutyTimeRange = (start: string, end: string) =>
  `${formatTime(start)} – ${formatTime(end)}`;

const formatDateTime = (value: string): string => {
  if (!value) return "Nije dostupno";
  const parts = parseDateTimeParts(value);
  if (parts) return `${parts.day}.${parts.month}.${parts.year}. ${parts.hour}:${parts.minute}`;
  return value;
};

const formatWorkingHoursRange = (open: string, close: string) => {
  const o = formatTime(open);
  const c = formatTime(close);
  if (o === "00:00" && c === "00:00") return "24h";
  return `${o} – ${c}`;
};

// ─── Shared styles ─────────────────────────────────────────────────────────────

const CARD_SHADOW = {
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
} as const;

const FALLBACK_CITIES: City[] = [
  { id: 1, name: "Podgorica" }, { id: 2, name: "Nikšić" },
  { id: 3, name: "Herceg Novi" }, { id: 4, name: "Budva" },
  { id: 5, name: "Bar" }, { id: 6, name: "Ulcinj" },
  { id: 7, name: "Kotor" }, { id: 8, name: "Tivat" },
  { id: 9, name: "Cetinje" }, { id: 10, name: "Bijelo Polje" },
];

// ─── API helpers ───────────────────────────────────────────────────────────────

async function getErrorMessage(res: Response): Promise<string> {
  try {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const data = (await res.json()) as { error?: { message?: string }; message?: string };
      const msg = data.error?.message ?? data.message;
      if (Array.isArray(msg)) return (msg as string[]).join(", ");
      return (msg as string | undefined) || "Podaci nijesu dostupni.";
    }
    return (await res.text()) || "Podaci nijesu dostupni.";
  } catch {
    return "Podaci nijesu dostupni.";
  }
}

function normalizePharmacyDetails(raw: Record<string, unknown>): PharmacyDetails {
  const d = raw as {
    id: number; name: string; address: string; city: string;
    latitude?: number | string | null; longitude?: number | string | null;
    isActive?: boolean | number; isOnDuty?: boolean;
    phones?: string[]; workingHours?: WorkingHours[];
    dutySchedule?: { startDatetime: string; endDatetime: string } | null;
  };
  const toNum = (v: number | string | null | undefined) => {
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "string") { const n = parseFloat(v); return isFinite(n) ? n : null; }
    return null;
  };
  return {
    id: d.id, name: d.name, address: d.address, city: d.city,
    latitude: toNum(d.latitude), longitude: toNum(d.longitude),
    isActive: d.isActive === true || d.isActive === 1,
    isOnDuty: d.isOnDuty === true,
    phones: Array.isArray(d.phones) ? d.phones : [],
    workingHours: Array.isArray(d.workingHours) ? d.workingHours : [],
    dutySchedule: d.dutySchedule ?? null,
  };
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <View className="gap-3">
      {[1, 2, 3].map((i) => (
        <View key={i} className="rounded-2xl border border-slate-200 bg-white p-4" style={CARD_SHADOW}>
          <View className="flex-row items-start gap-3">
            <View className="h-10 w-10 rounded-2xl bg-slate-200" />
            <View className="flex-1 gap-2">
              <View className="h-5 w-2/5 rounded bg-slate-200" />
              <View className="h-4 w-4/5 rounded bg-slate-100" />
              <View className="h-4 w-1/2 rounded bg-slate-100" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Pharmacy card ─────────────────────────────────────────────────────────────

function DutyPharmacyCard({
  pharmacy,
  isSelected,
  onToggle,
}: {
  pharmacy: DutyPharmacy;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const phones = pharmacy.phone
    ? pharmacy.phone.split(",").map((p) => p.trim()).filter(Boolean)
    : [];

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4" style={CARD_SHADOW}>
      <View className="gap-4">
        {/* Top row: icon + name + address + phone */}
        <View className="flex-row items-start gap-3">
          <View className="mt-0.5 h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
            <Building2 size={18} color="#2563eb" />
          </View>
          <View className="min-w-0 flex-1 gap-2.5">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="text-base font-bold text-slate-900">{pharmacy.name}</Text>
              <View className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5">
                <Text className="text-xs font-semibold text-blue-700">{pharmacy.city}</Text>
              </View>
            </View>
            <View className="flex-row items-start gap-2">
              <MapPin size={14} color="#94a3b8" style={{ marginTop: 2, flexShrink: 0 }} />
              <Text className="flex-1 text-sm text-slate-600">{pharmacy.address}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Phone size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
              <Text className="text-sm text-slate-600">
                {phones.length > 0 ? phones.join(", ") : "Nije dostupno"}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom row: time chip + details button */}
        <View className="flex-row items-center gap-2">
          <View className="flex-row items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2">
            <Clock3 size={14} color="#2563eb" />
            <Text className="text-xs font-bold text-blue-700">
              {formatDutyTimeRange(pharmacy.dutyStart, pharmacy.dutyEnd)}
            </Text>
          </View>
          <View className="flex-1" />
          <TouchableOpacity
            onPress={onToggle}
            className={`flex-row items-center gap-1.5 rounded-xl border px-4 py-2 ${
              isSelected
                ? "border-blue-200 bg-blue-600"
                : "border-blue-200 bg-white"
            }`}
          >
            <Text className={`text-sm font-semibold ${isSelected ? "text-white" : "text-blue-700"}`}>
              Detalji
            </Text>
            <ChevronRight
              size={14}
              color={isSelected ? "#fff" : "#2563eb"}
              style={{ transform: [{ rotate: isSelected ? "90deg" : "0deg" }] }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Details bottom sheet ──────────────────────────────────────────────────────

function DetailsSheet({
  pharmacy,
  isLoading,
  error,
  onClose,
}: {
  pharmacy: PharmacyDetails | null;
  isLoading: boolean;
  error: string;
  onClose: () => void;
}) {
  const visible = isLoading || !!error || !!pharmacy;

  const openMaps = (p: PharmacyDetails) => {
    const addr = encodeURIComponent(`${p.address}, ${p.city}, Crna Gora`);
    if (p.latitude && p.longitude) {
      void Linking.openURL(`https://maps.google.com/?q=${p.latitude},${p.longitude}`);
    } else {
      void Linking.openURL(`https://maps.google.com/?q=${addr}`);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 bg-black/50"
        activeOpacity={1}
        onPress={onClose}
      />
      <View className="rounded-t-[28px] bg-white pb-6" style={{ maxHeight: "88%" }}>
        {/* Drag handle */}
        <View className="items-center pt-3 pb-1">
          <View className="h-1.5 w-14 rounded-full bg-slate-200" />
        </View>

        {isLoading ? (
          <View className="items-center px-5 py-8">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="mt-3 text-sm text-slate-500">Učitavanje detalja...</Text>
          </View>
        ) : error || !pharmacy ? (
          <View className="px-5 py-4">
            <Text className="text-base font-bold text-red-600">Detalji nijesu dostupni.</Text>
            <Text className="mt-1 text-sm text-slate-600">{error || "Nema podataka."}</Text>
            <TouchableOpacity
              onPress={onClose}
              className="mt-4 self-start rounded-xl bg-slate-900 px-4 py-2"
            >
              <Text className="text-sm font-semibold text-white">Zatvori</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} className="px-5">
            {/* Sheet header */}
            <View className="flex-row items-start justify-between gap-3 border-b border-slate-100 pb-4 pt-2">
              <View className="min-w-0 flex-1">
                <Text className="text-xs font-semibold uppercase text-blue-600">Detalji apoteke</Text>
                <Text className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
                  {pharmacy.name}
                </Text>
                <Text className="mt-0.5 text-sm font-medium text-slate-500">{pharmacy.city}</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
                accessibilityLabel="Zatvori"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View className="gap-4 py-4">
              {/* Status row */}
              <View className="flex-row gap-3">
                <View className="flex-1 flex-row items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-4">
                  <Power
                    size={18}
                    color={pharmacy.isActive ? "#059669" : "#94a3b8"}
                    style={{ marginTop: 1 }}
                  />
                  <View>
                    <Text className="text-sm font-semibold text-slate-900">Status</Text>
                    <Text className="mt-0.5 text-sm text-slate-600">
                      {pharmacy.isActive ? "Aktivna" : "Neaktivna"}
                    </Text>
                  </View>
                </View>
                <View className="flex-1 flex-row items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-4">
                  <Sparkles
                    size={18}
                    color={pharmacy.isOnDuty ? "#2563eb" : "#94a3b8"}
                    style={{ marginTop: 1 }}
                  />
                  <View>
                    <Text className="text-sm font-semibold text-slate-900">Dežurstvo</Text>
                    <Text
                      className={`mt-0.5 text-sm font-semibold ${
                        pharmacy.isOnDuty ? "text-blue-700" : "text-slate-600"
                      }`}
                    >
                      {pharmacy.isOnDuty ? "Dežurna sada" : "Nije dežurna"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Location */}
              <View className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <View className="flex-row items-start gap-3">
                  <View className="rounded-2xl border border-blue-100 bg-white p-2.5">
                    <Building2 size={18} color="#2563eb" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="text-sm font-semibold text-slate-900">Lokacija</Text>
                      <TouchableOpacity
                        onPress={() => openMaps(pharmacy)}
                        className="flex-row items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-1.5"
                      >
                        <MapPin size={12} color="#2563eb" />
                        <Text className="text-xs font-semibold text-blue-700">Mapa</Text>
                      </TouchableOpacity>
                    </View>
                    <View className="mt-2 flex-row items-start gap-2">
                      <MapPin size={14} color="#94a3b8" style={{ marginTop: 2, flexShrink: 0 }} />
                      <Text className="flex-1 text-sm leading-5 text-slate-600">
                        {pharmacy.address}
                      </Text>
                    </View>
                    <Text className="mt-1 text-sm font-medium text-slate-500">{pharmacy.city}</Text>
                  </View>
                </View>
              </View>

              {/* Contact */}
              <View>
                <Text className="mb-2.5 text-sm font-semibold text-slate-900">Kontakt</Text>
                {pharmacy.phones.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {pharmacy.phones.map((phone) => (
                      <TouchableOpacity
                        key={phone}
                        onPress={() => void Linking.openURL(`tel:${phone}`)}
                        className="flex-row items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5"
                      >
                        <Phone size={13} color="#475569" />
                        <Text className="text-sm font-semibold text-slate-700">{phone}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text className="text-sm text-slate-500">Nije dostupno.</Text>
                )}
              </View>

              {/* Duty schedule */}
              {pharmacy.dutySchedule && (
                <View>
                  <Text className="mb-2.5 text-sm font-semibold text-slate-900">Dežurni termin</Text>
                  <View className="rounded-2xl border border-slate-200 bg-white p-4">
                    <View className="flex-row items-start gap-3">
                      <CalendarClock size={18} color="#2563eb" style={{ marginTop: 1 }} />
                      <View className="gap-1">
                        <Text className="text-sm text-slate-600">
                          Od{" "}
                          <Text className="font-semibold text-slate-900">
                            {formatDateTime(pharmacy.dutySchedule.startDatetime)}
                          </Text>
                        </Text>
                        <Text className="text-sm text-slate-600">
                          Do{" "}
                          <Text className="font-semibold text-slate-900">
                            {formatDateTime(pharmacy.dutySchedule.endDatetime)}
                          </Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Working hours */}
              <View>
                <Text className="mb-2.5 text-sm font-semibold text-slate-900">Radno vrijeme</Text>
                <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {pharmacy.workingHours.length > 0 ? (
                    pharmacy.workingHours.map((wh, i) => (
                      <View
                        key={`${wh.day_of_week}-${i}`}
                        className="flex-row items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                      >
                        <Text className="text-sm font-semibold text-slate-800">
                          {wh.day_of_week}
                        </Text>
                        <Text className="text-sm text-slate-600">
                          {formatWorkingHoursRange(wh.open_time, wh.close_time)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text className="px-4 py-3 text-sm text-slate-500">
                      Radno vrijeme nije dostupno.
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function DutyScreen() {
  const insets = useSafeAreaInsets();

  const [selectedDate, setSelectedDate] = useState(() => getLocalDateKey(new Date()));
  const [selectedCity, setSelectedCity] = useState(ALL_CITIES);
  const [cities, setCities] = useState<City[]>(FALLBACK_CITIES);

  const [pharmacies, setPharmacies] = useState<DutyPharmacy[]>([]);
  const [isDutyLoading, setIsDutyLoading] = useState(true);
  const [dutyError, setDutyError] = useState("");

  const [detailsPharmacyId, setDetailsPharmacyId] = useState<number | null>(null);
  const [detailsPharmacy, setDetailsPharmacy] = useState<PharmacyDetails | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const detailsRequestId = useRef(0);

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);

  // ── Load cities ──
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/cities"), { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { data?: { id: number; name: string }[] };
        const items = data.data;
        if (Array.isArray(items) && items.length > 0) setCities(items);
      } catch {}
    };
    void load();
    return () => controller.abort();
  }, []);

  // ── Load duty pharmacies ──
  const loadDutyPharmacies = useCallback(
    async (signal?: AbortSignal) => {
      setIsDutyLoading(true);
      setDutyError("");
      try {
        const res = await fetch(apiUrl(`/api/v1/pharmacies/duty?date=${selectedDate}`), { signal });
        if (!res.ok) {
          const msg = await getErrorMessage(res);
          if (res.status === 404 && msg.toLowerCase().includes("nema dežurnih")) {
            setPharmacies([]);
            return;
          }
          setDutyError(msg);
          setPharmacies([]);
          return;
        }
        const data = (await res.json()) as { data?: DutyPharmacy[] };
        setPharmacies(Array.isArray(data.data) ? data.data : []);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setDutyError("Došlo je do greške pri učitavanju dežurnih apoteka.");
        setPharmacies([]);
      } finally {
        if (!signal?.aborted) setIsDutyLoading(false);
      }
    },
    [selectedDate]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadDutyPharmacies(controller.signal);
    return () => controller.abort();
  }, [loadDutyPharmacies]);

  // ── Filter by city ──
  const filteredPharmacies = useMemo(
    () =>
      selectedCity === ALL_CITIES
        ? pharmacies
        : pharmacies.filter((p) => p.city === selectedCity),
    [pharmacies, selectedCity]
  );

  // ── Load pharmacy details ──
  const loadDetails = useCallback(
    async (pharmacyId: number) => {
      if (detailsPharmacyId === pharmacyId) {
        setDetailsPharmacyId(null);
        setDetailsPharmacy(null);
        setDetailsError("");
        setIsDetailsLoading(false);
        return;
      }
      const reqId = detailsRequestId.current + 1;
      detailsRequestId.current = reqId;
      setDetailsPharmacyId(pharmacyId);
      setDetailsPharmacy(null);
      setDetailsError("");
      setIsDetailsLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/v1/pharmacies/${pharmacyId}`));
        if (reqId !== detailsRequestId.current) return;
        if (!res.ok) {
          setDetailsError(await getErrorMessage(res));
          return;
        }
        const data = (await res.json()) as { data: Record<string, unknown> };
        if (reqId !== detailsRequestId.current) return;
        setDetailsPharmacy(normalizePharmacyDetails(data.data));
      } catch {
        if (reqId === detailsRequestId.current)
          setDetailsError("Greška pri učitavanju detalja apoteke.");
      } finally {
        if (reqId === detailsRequestId.current) setIsDetailsLoading(false);
      }
    },
    [detailsPharmacyId]
  );

  const handleDateChange = (dateKey: string) => {
    setSelectedDate(dateKey);
    setCalendarVisible(false);
    setDetailsPharmacyId(null);
    setDetailsPharmacy(null);
    setDetailsError("");
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setCityPickerVisible(false);
    setDetailsPharmacyId(null);
    setDetailsPharmacy(null);
    setDetailsError("");
  };

  const selectedCityLabel =
    selectedCity === ALL_CITIES ? "Svi gradovi" : selectedCity;

  const showDetails = isDetailsLoading || !!detailsError || !!detailsPharmacy;

  // ── Sticky filter bar ──
  const filterBar = (
    <View className="border-b border-blue-100 bg-sky-50/95 px-4 py-3">
      <View className="flex-row gap-2">
        {/* Date chip */}
        <TouchableOpacity
          onPress={() => setCalendarVisible(true)}
          className="flex-1 flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
        >
          <CalendarDays size={14} color="#2563eb" />
          <Text className="flex-1 text-sm font-semibold text-slate-800" numberOfLines={1}>
            {formatShortDate(parseDateKey(selectedDate))}
          </Text>
          <ChevronDown size={14} color="#94a3b8" />
        </TouchableOpacity>

        {/* City chip */}
        <TouchableOpacity
          onPress={() => setCityPickerVisible(true)}
          className="flex-1 flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
        >
          <MapPin size={14} color="#2563eb" />
          <Text className="flex-1 text-sm font-semibold text-slate-800" numberOfLines={1}>
            {selectedCityLabel}
          </Text>
          <ChevronDown size={14} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc", paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 16, 32) }}
        stickyHeaderIndices={[1]}
      >
        {/* [0] Page header — scrolls away */}
        <View className="border-b border-slate-100 bg-white px-4 py-5">
          <Text className="text-xs font-semibold uppercase text-blue-600">Raspored</Text>
          <Text className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Dežurne apoteke
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            {formatFullDate(selectedDate)}
          </Text>
        </View>

        {/* [1] Filter bar — stays sticky */}
        {filterBar}

        {/* [2] Summary card */}
        <View className="mx-4 mt-4 rounded-[20px] border border-slate-200 bg-white px-4 py-4" style={CARD_SHADOW}>
          <Text className="text-sm font-semibold text-blue-600">
            {isDutyLoading ? "Učitavanje rasporeda..." : `${filteredPharmacies.length} apoteka za prikaz`}
          </Text>
          <Text className="mt-1 text-xl font-bold text-slate-900">Dežurne apoteke</Text>
          <View className="mt-2 flex-row items-center gap-1.5">
            <MapPin size={11} color="#2563eb" />
            <Text className="text-xs font-medium text-blue-700">{selectedCityLabel}</Text>
          </View>
        </View>

        {/* [3] Pharmacy list */}
        <View className="px-4 pt-4">
          {isDutyLoading ? (
            <LoadingSkeleton />
          ) : dutyError ? (
            <View className="rounded-2xl border border-red-200 bg-white p-5" style={CARD_SHADOW}>
              <View className="flex-row items-start gap-3">
                <View className="rounded-xl bg-red-50 p-2">
                  <AlertCircle size={18} color="#dc2626" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900">
                    Nije moguće učitati dežurne apoteke.
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-slate-600">{dutyError}</Text>
                  <TouchableOpacity
                    onPress={() => void loadDutyPharmacies()}
                    className="mt-4 flex-row items-center gap-2 self-start rounded-xl bg-slate-900 px-4 py-2"
                  >
                    <RotateCw size={14} color="#fff" />
                    <Text className="text-sm font-semibold text-white">Pokušaj ponovo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : filteredPharmacies.length === 0 ? (
            <View className="rounded-2xl border border-slate-200 bg-white p-5" style={CARD_SHADOW}>
              <View className="flex-row items-start gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <AlertCircle size={20} color="#64748b" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900">Nema dežurnih apoteka.</Text>
                  <Text className="mt-1 text-sm leading-5 text-slate-600">
                    Za izabrani datum i grad trenutno nema dostupnih zapisa.
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="gap-3">
              {pharmacies.length !== filteredPharmacies.length && (
                <Text className="text-sm text-slate-500">
                  Prikazano {filteredPharmacies.length} od {pharmacies.length} apoteka za ovaj datum.
                </Text>
              )}
              {filteredPharmacies.map((pharmacy) => (
                <DutyPharmacyCard
                  key={pharmacy.id}
                  pharmacy={pharmacy}
                  isSelected={detailsPharmacyId === pharmacy.id}
                  onToggle={() => void loadDetails(pharmacy.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Calendar modal */}
      <Modal
        visible={calendarVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => setCalendarVisible(false)}
        />
        <View
          className="rounded-t-[28px] bg-white px-5 pb-8 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom + 16, 24) }}
        >
          {/* Drag handle */}
          <View className="mb-4 items-center">
            <View className="h-1.5 w-14 rounded-full bg-slate-200" />
          </View>
          <DutyCalendar selectedDate={selectedDate} onDateChange={handleDateChange} />
        </View>
      </Modal>

      {/* City picker modal */}
      <Modal
        visible={cityPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCityPickerVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => setCityPickerVisible(false)}
        />
        <View
          className="rounded-t-3xl bg-white pb-2"
          style={{ maxHeight: "60%", paddingBottom: Math.max(insets.bottom + 8, 16) }}
        >
          <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-4">
            <Text className="text-base font-bold text-slate-900">Izaberi grad</Text>
            <TouchableOpacity onPress={() => setCityPickerVisible(false)}>
              <Text className="text-sm font-semibold text-blue-600">Zatvori</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {/* All cities option */}
            <TouchableOpacity
              onPress={() => handleCityChange(ALL_CITIES)}
              className={`border-b border-slate-50 px-4 py-3.5 ${
                selectedCity === ALL_CITIES ? "bg-blue-50" : ""
              }`}
            >
              <Text
                className={`text-sm ${
                  selectedCity === ALL_CITIES
                    ? "font-bold text-blue-700"
                    : "text-slate-700"
                }`}
              >
                Svi gradovi
              </Text>
            </TouchableOpacity>
            {cities.map((city) => (
              <TouchableOpacity
                key={city.id}
                onPress={() => handleCityChange(city.name)}
                className={`border-b border-slate-50 px-4 py-3.5 ${
                  selectedCity === city.name ? "bg-blue-50" : ""
                }`}
              >
                <Text
                  className={`text-sm ${
                    selectedCity === city.name
                      ? "font-bold text-blue-700"
                      : "text-slate-700"
                  }`}
                >
                  {city.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Pharmacy details sheet */}
      {showDetails && (
        <DetailsSheet
          pharmacy={detailsPharmacy}
          isLoading={isDetailsLoading}
          error={detailsError}
          onClose={() => {
            setDetailsPharmacyId(null);
            setDetailsPharmacy(null);
            setDetailsError("");
            setIsDetailsLoading(false);
          }}
        />
      )}
    </View>
  );
}
