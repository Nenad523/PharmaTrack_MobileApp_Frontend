import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
  Search,
  TrendingUp,
  X,
} from "lucide-react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { MedicineDetailsModal } from "../../components/medications/MedicineDetailsModal";
import { apiUrl } from "../../lib/api";
import type {
  ActiveIngredient,
  MedicationDose,
  MedicineDetails,
  MedicineSearchResult,
} from "../../lib/medication-types";

const CARD_SHADOW = {
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
} as const;

const BLUE_SHADOW = {
  shadowColor: "#2563eb",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
} as const;

export default function MedicationsScreen() {
  const [mode, setMode] = useState<"medication" | "symptom">("medication");
  const [searchTerm, setSearchTerm] = useState("");
  const [popularMedicines, setPopularMedicines] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<MedicineSearchResult[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [selectedMedicineId, setSelectedMedicineId] = useState<number | null>(null);
  const [selectedMedicineDoses, setSelectedMedicineDoses] = useState<MedicationDose[]>([]);
  const [selectedDoses, setSelectedDoses] = useState<MedicationDose[]>([]);
  const [isLoadingDoses, setIsLoadingDoses] = useState(false);
  const [detailsMedicine, setDetailsMedicine] = useState<MedicineDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedSearch = searchTerm.trim();
  const hasMinimumChars = trimmedSearch.length >= 3;
  const selectedMedicine = searchResults.find((m) => m.id === selectedMedicineId);
  const isSearchButtonEnabled = Boolean(selectedMedicine) && selectedDoses.length > 0;

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch(apiUrl("/api/v1/medication/popular"));
        if (!resp.ok) return;
        const data = (await resp.json()) as { data: { name: string }[] };
        setPopularMedicines(
          Array.isArray(data.data) ? data.data.map((r) => r.name) : []
        );
      } catch {}
    };
    void load();
  }, []);

  useEffect(() => {
    if (!hasMinimumChars) {
      setSearchResults([]);
      setIsLoadingSearch(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsLoadingSearch(true);
      try {
        const path =
          mode === "symptom"
            ? `/api/v1/medication/search?symptom=${encodeURIComponent(trimmedSearch)}`
            : `/api/v1/medication/search?name=${encodeURIComponent(trimmedSearch)}`;
        const resp = await fetch(apiUrl(path));
        if (!resp.ok) {
          setSearchResults([]);
          return;
        }
        const data = (await resp.json()) as { data: MedicineSearchResult[] };
        setSearchResults(Array.isArray(data.data) ? data.data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsLoadingSearch(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmedSearch, hasMinimumChars, mode]);

  useEffect(() => {
    if (selectedMedicineId === null) {
      setSelectedMedicineDoses([]);
      return;
    }
    const load = async () => {
      setIsLoadingDoses(true);
      try {
        const resp = await fetch(
          apiUrl(`/api/v1/medication/${selectedMedicineId}/doses`)
        );
        if (!resp.ok) {
          setSelectedMedicineDoses([]);
          return;
        }
        const data = (await resp.json()) as { data: MedicationDose[] };
        setSelectedMedicineDoses(
          Array.isArray(data.data)
            ? data.data.filter((d) => d.strength?.trim())
            : []
        );
      } catch {
        setSelectedMedicineDoses([]);
      } finally {
        setIsLoadingDoses(false);
      }
    };
    void load();
  }, [selectedMedicineId]);

  const resetSearch = () => {
    setSelectedMedicineId(null);
    setSelectedDoses([]);
    setSelectedMedicineDoses([]);
  };

  const handleModeChange = (newMode: "medication" | "symptom") => {
    setMode(newMode);
    setSearchTerm("");
    setSearchResults([]);
    resetSearch();
  };

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    resetSearch();
  };

  const handlePopularClick = (name: string) => {
    setSearchTerm(name);
    resetSearch();
  };

  const handleSelectMedicine = (id: number) => {
    setSelectedMedicineId((prev) => (prev === id ? null : id));
    setSelectedDoses([]);
    setSelectedMedicineDoses([]);
  };

  const handleDoseClick = (dose: MedicationDose | "all") => {
    if (dose === "all") {
      const allSelected = selectedMedicineDoses.every((d) =>
        selectedDoses.some((s) => s.id === d.id)
      );
      setSelectedDoses(allSelected ? [] : selectedMedicineDoses);
      return;
    }
    setSelectedDoses((prev) =>
      prev.some((d) => d.id === dose.id)
        ? prev.filter((d) => d.id !== dose.id)
        : [...prev, dose]
    );
  };

  const isDoseActive = (dose: MedicationDose | "all") => {
    if (dose === "all") {
      return (
        selectedMedicineDoses.length > 0 &&
        selectedMedicineDoses.every((d) => selectedDoses.some((s) => s.id === d.id))
      );
    }
    return selectedDoses.some((d) => d.id === dose.id);
  };

  const handleToggleDetails = async (id: number) => {
    setDetailsMedicine(null);
    setIsLoadingDetails(true);
    setDetailsVisible(true);
    try {
      const [detResp, dosesResp] = await Promise.all([
        fetch(apiUrl(`/api/v1/medication/${id}`)),
        fetch(apiUrl(`/api/v1/medication/${id}/doses`)),
      ]);
      const detData = (await detResp.json()) as {
        data: {
          id: number;
          name: string;
          description: string;
          img_url?: string;
          activeIngredients?: ActiveIngredient[];
        };
      };
      const dosesData = (await dosesResp.json()) as { data: MedicationDose[] };
      const doses = Array.isArray(dosesData.data)
        ? dosesData.data.map((d) => d.strength)
        : [];
      setDetailsMedicine({
        id: detData.data.id,
        name: detData.data.name,
        description: detData.data.description,
        img_url: detData.data.img_url || undefined,
        activeIngredients: Array.isArray(detData.data.activeIngredients)
          ? detData.data.activeIngredients
          : [],
        doses,
      });
    } catch {
      setDetailsVisible(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeDetails = () => {
    setDetailsVisible(false);
    setDetailsMedicine(null);
  };

  return (
    <ScreenLayout>
      <View className="px-4 pt-6 pb-10 gap-4">
        {/* Mode Toggle */}
        <View
          className="flex-row rounded-2xl border border-slate-200 bg-white p-1"
          style={CARD_SHADOW}
        >
          {(["medication", "symptom"] as const).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => handleModeChange(m)}
              className={`flex-1 items-center rounded-xl py-2.5 ${
                mode === m ? "bg-blue-600" : ""
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  mode === m ? "text-white" : "text-slate-600"
                }`}
              >
                {m === "medication" ? "Lijek" : "Simptom"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Card */}
        <View
          className="rounded-2xl border border-blue-200 bg-white p-4 gap-4"
          style={CARD_SHADOW}
        >
          {/* Title */}
          <View className="gap-1">
            <Text className="text-xl font-bold text-slate-900">
              {mode === "symptom" ? "Pretraga po simptomu" : "Pretraga lijekova"}
            </Text>
            <Text className="text-sm text-slate-500">
              {mode === "symptom"
                ? "Unesite simptom i pronaći ćemo odgovarajuće lijekove"
                : "Unesite naziv lijeka ili odaberite iz popularnih"}
            </Text>
          </View>

          {/* Search Input */}
          <View className="flex-row h-14 items-center rounded-2xl border border-slate-200 bg-white px-4 gap-3">
            <Search size={18} color="#94a3b8" />
            <TextInput
              value={searchTerm}
              onChangeText={handleSearchChange}
              placeholder={
                mode === "symptom"
                  ? "Unesite simptom (min. 3 karaktera)"
                  : "Unesite naziv lijeka (min. 3 karaktera)"
              }
              placeholderTextColor="#94a3b8"
              className="flex-1 text-sm text-slate-900"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => handleSearchChange("")}>
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Symptom Warning */}
          {!hasMinimumChars && mode === "symptom" && (
            <View className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
              <View className="flex-row items-start gap-3">
                <View className="rounded-xl bg-white/80 p-2">
                  <AlertTriangle size={16} color="#f59e0b" />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-sm font-semibold text-slate-900">Važna napomena</Text>
                  <Text className="text-xs leading-5 text-slate-700">
                    Preporuke na osnovu simptoma služe isključivo u informativne
                    svrhe i ne predstavljaju zamjenu za stručno mišljenje
                    farmaceuta ili ljekara.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Popular Medicines */}
          {!hasMinimumChars && mode === "medication" && popularMedicines.length > 0 && (
            <View className="gap-3">
              <View className="flex-row items-center gap-2">
                <TrendingUp size={14} color="#64748b" />
                <Text className="text-sm font-semibold text-slate-700">Popularno</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {popularMedicines.map((name) => (
                    <TouchableOpacity
                      key={name}
                      onPress={() => handlePopularClick(name)}
                      className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5"
                    >
                      <Text className="text-xs font-semibold text-blue-700">{name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Search Loading */}
          {isLoadingSearch && (
            <View className="items-center py-4">
              <ActivityIndicator color="#2563eb" />
            </View>
          )}

          {/* Search Results */}
          {hasMinimumChars && !isLoadingSearch && !selectedMedicine && (
            <View className="gap-3">
              <Text className="text-xs text-slate-500">
                Rezultati pretrage:{" "}
                <Text className="font-semibold text-slate-900">{trimmedSearch}</Text>
              </Text>

              {searchResults.length === 0 ? (
                <View
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                  style={CARD_SHADOW}
                >
                  <View className="flex-row items-start gap-3">
                    <View className="rounded-xl bg-slate-100 p-2">
                      <Info size={18} color="#64748b" />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="text-sm font-semibold text-slate-900">
                        Nema rezultata
                      </Text>
                      <Text className="text-xs leading-5 text-slate-500">
                        Nismo pronašli lijek za pojam &ldquo;{trimmedSearch}&rdquo;.
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="gap-3">
                  {searchResults.map((medicine) => {
                    const isSelected = selectedMedicineId === medicine.id;
                    return (
                      <View
                        key={medicine.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                        style={CARD_SHADOW}
                      >
                        <View className="flex-row items-start gap-3">
                          <TouchableOpacity
                            onPress={() => handleSelectMedicine(medicine.id)}
                            className={`mt-0.5 h-8 w-8 items-center justify-center rounded-full border ${
                              isSelected
                                ? "border-blue-300 bg-blue-100"
                                : "border-blue-200 bg-blue-50"
                            }`}
                            style={{ flexShrink: 0 }}
                          >
                            <Text
                              className={`text-sm font-semibold ${
                                isSelected ? "text-blue-700" : "text-blue-500"
                              }`}
                            >
                              {isSelected ? "●" : "○"}
                            </Text>
                          </TouchableOpacity>

                          <View className="flex-1 gap-1">
                            <Text className="text-base font-semibold text-slate-900">
                              {medicine.name}
                            </Text>
                            <Text
                              className="text-xs leading-5 text-slate-600"
                              numberOfLines={2}
                            >
                              {medicine.description}
                            </Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => void handleToggleDetails(medicine.id)}
                            className="flex-row items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2"
                            style={{ flexShrink: 0 }}
                          >
                            <Text className="text-xs font-semibold text-blue-700">
                              Detalji
                            </Text>
                            <ChevronRight size={14} color="#1d4ed8" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Selected Medicine + Dose Picker */}
          {hasMinimumChars && selectedMedicine && (
            <View className="overflow-hidden rounded-2xl border border-blue-200">
              <View className="p-4">
                <View className="flex-row items-start gap-3">
                  <TouchableOpacity
                    onPress={() => handleSelectMedicine(selectedMedicine.id)}
                    className="mt-0.5 h-8 w-8 items-center justify-center rounded-full border border-blue-300 bg-blue-100"
                    style={{ flexShrink: 0 }}
                  >
                    <CheckCircle2 size={16} color="#1d4ed8" />
                  </TouchableOpacity>

                  <View className="flex-1 gap-1">
                    <Text className="text-base font-semibold text-slate-900">
                      {selectedMedicine.name}
                    </Text>
                    <Text className="text-xs leading-5 text-slate-600" numberOfLines={2}>
                      {selectedMedicine.description}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => void handleToggleDetails(selectedMedicine.id)}
                    className="flex-row items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2"
                    style={{ flexShrink: 0 }}
                  >
                    <Text className="text-xs font-semibold text-blue-700">Detalji</Text>
                    <ChevronRight size={14} color="#1d4ed8" />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="border-t border-slate-200 px-4 py-4 gap-3">
                <Text className="text-sm font-semibold text-slate-700">Odaberite dozu</Text>
                {isLoadingDoses ? (
                  <View className="flex-row gap-2">
                    {[1, 2, 3].map((i) => (
                      <View key={i} className="h-7 w-16 rounded-full bg-slate-200" />
                    ))}
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => handleDoseClick("all")}
                        className={`rounded-full border px-3 py-1.5 ${
                          isDoseActive("all")
                            ? "border-blue-600 bg-blue-600"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isDoseActive("all") ? "text-white" : "text-slate-700"
                          }`}
                        >
                          Sve
                        </Text>
                      </TouchableOpacity>

                      {selectedMedicineDoses.map((dose) => (
                        <TouchableOpacity
                          key={dose.id}
                          onPress={() => handleDoseClick(dose)}
                          className={`rounded-full border px-3 py-1.5 ${
                            isDoseActive(dose)
                              ? "border-blue-600 bg-blue-600"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              isDoseActive(dose) ? "text-white" : "text-slate-700"
                            }`}
                          >
                            {dose.strength}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            </View>
          )}

          {/* Search Pharmacies CTA */}
          {isSearchButtonEnabled && (
            <TouchableOpacity
              className="items-center rounded-2xl bg-blue-600 py-4"
              style={BLUE_SHADOW}
              onPress={() => {
                // Navigation to pharmacy search will be wired when that screen exists
                // router.push(`/(tabs)/pharmacies?medicineId=${selectedMedicine!.id}&...`)
              }}
            >
              <Text className="text-sm font-semibold text-white">
                Pronađi u apotekama
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <MedicineDetailsModal
        visible={detailsVisible}
        loading={isLoadingDetails}
        medicine={detailsMedicine}
        onClose={closeDetails}
      />
    </ScreenLayout>
  );
}
