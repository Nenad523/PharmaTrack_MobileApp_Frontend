import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Audio } from "expo-av";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
  Lock,
  Mic,
  Pill,
  Search,
  TrendingUp,
  X,
} from "lucide-react-native";
import { router } from "expo-router";
import { ScreenLayout } from "../../components/ScreenLayout";
import { MedicineDetailsModal } from "../../components/medications/MedicineDetailsModal";
import { apiUrl } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import type {
  ActiveIngredient,
  MedicationDose,
  MedicineDetails,
  MedicineSearchResult,
} from "../../lib/medication-types";

const CARD_SHADOW = {
  shadowColor: "#2563eb",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 24,
  elevation: 6,
} as const;

const BLUE_SHADOW = {
  shadowColor: "#2563eb",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 4,
} as const;

const INPUT_SHADOW = {
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 3,
  elevation: 1,
} as const;

export default function MedicationsScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"medication" | "symptom">("medication");
  const [showLoginNotice, setShowLoginNotice] = useState(false);
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

  // Voice search
  const [voiceState, setVoiceState] = useState<"idle" | "recording" | "processing">("idle");
  const [voiceError, setVoiceError] = useState("");
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (voiceState === "recording") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.35, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [voiceState]);

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

  useEffect(() => {
    if (!user && mode === "symptom") {
      setMode("medication");
      setSearchTerm("");
      setSearchResults([]);
    }
  }, [user]);

  const resetSearch = () => {
    setSelectedMedicineId(null);
    setSelectedDoses([]);
    setSelectedMedicineDoses([]);
  };

  const handleModeChange = (newMode: "medication" | "symptom") => {
    if (newMode === "symptom" && !user) {
      setShowLoginNotice(true);
      return;
    }
    setShowLoginNotice(false);
    setMode(newMode);
    setSearchTerm("");
    setSearchResults([]);
    resetSearch();
  };

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    setShowLoginNotice(false);
    resetSearch();
  };

  const handlePopularClick = (name: string) => {
    setSearchTerm(name);
    resetSearch();
  };

  const handleVoicePress = async () => {
    setVoiceError("");

    if (voiceState === "processing") return;

    if (voiceState === "recording") {
      // Stop recording and transcribe
      setVoiceState("processing");
      try {
        await recordingRef.current?.stopAndUnloadAsync();
        const uri = recordingRef.current?.getURI();
        recordingRef.current = null;
        if (!uri) throw new Error("Snimak nije dostupan.");

        const formData = new FormData();
        formData.append("audio", { uri, type: "audio/m4a", name: "voice.m4a" } as any);

        const res = await fetch(apiUrl("/api/v1/medication/transcribe"), {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Greška pri prepoznavanju govora.");
        const data = (await res.json()) as { text: string };
        const text = data.text?.trim();
        if (text) {
          handleSearchChange(text);
        } else {
          setVoiceError("Nije prepoznat govor. Pokušajte ponovo.");
        }
      } catch (e) {
        setVoiceError(e instanceof Error ? e.message : "Greška pri glasovnoj pretrazi.");
      } finally {
        setVoiceState("idle");
      }
      return;
    }

    // Start recording
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setVoiceError("Dozvola za mikrofon nije odobrena.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setVoiceState("recording");
    } catch {
      setVoiceError("Nije moguće pokrenuti snimanje.");
    }
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
      setDetailsMedicine({
        id: detData.data.id,
        name: detData.data.name,
        description: detData.data.description,
        img_url: detData.data.img_url || undefined,
        activeIngredients: Array.isArray(detData.data.activeIngredients)
          ? detData.data.activeIngredients
          : [],
        doses: Array.isArray(dosesData.data)
          ? dosesData.data.map((d) => d.strength)
          : [],
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
      <View className="px-4 pt-10 pb-32">
        {/* Main Card */}
        <View
          className="rounded-3xl border border-blue-200/90 bg-white p-6"
          style={CARD_SHADOW}
        >
          {/* Icon */}
          <View
            className="mb-5 h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-white"
            style={{
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Pill size={32} color="#2563eb" />
          </View>

          {/* Title & subtitle */}
          <Text className="text-4xl font-bold tracking-tight text-slate-900">
            {mode === "symptom" ? "Pretraga po simptomu" : "Pretraga ljekova"}
          </Text>
          <Text className="mt-3 text-base leading-7 text-slate-600">
            {mode === "symptom"
              ? "Opišite simptome i naš sistem će predložiti odgovarajuće lijekove uz pomoć AI analize."
              : "Pronađite dostupne ljekove, odaberite željenu dozu i nastavite ka pretrazi apoteka širom Crne Gore."}
          </Text>

          {/* Mode Toggle */}
          <View className="mt-6 flex-row rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <TouchableOpacity
              onPress={() => handleModeChange("medication")}
              className={`flex-1 items-center rounded-xl py-2.5 ${
                mode === "medication" ? "bg-blue-600" : ""
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  mode === "medication" ? "text-white" : "text-slate-500"
                }`}
              >
                Lijek
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleModeChange("symptom")}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
                mode === "symptom" ? "bg-blue-600" : ""
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  mode === "symptom" ? "text-white" : "text-slate-500"
                }`}
              >
                Simptom
              </Text>
              {!user && (
                <Lock
                  size={12}
                  color={mode === "symptom" ? "#fff" : "#94a3b8"}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Login notice for symptom mode */}
          {showLoginNotice && !user && (
            <View className="mt-3 flex-row items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <Lock size={14} color="#2563eb" style={{ marginTop: 1 }} />
              <Text className="flex-1 text-xs leading-5 text-blue-800">
                Pretraga po simptomu dostupna je samo prijavljenim korisnicima.
                Prijavite se da biste koristili ovu funkciju.
              </Text>
            </View>
          )}

          {/* Search Input */}
          <View
            className={`mt-5 flex-row h-14 items-center rounded-2xl border bg-white px-4 gap-3 ${voiceState === "recording" ? "border-red-300" : "border-slate-200"}`}
            style={INPUT_SHADOW}
          >
            <Search size={18} color="#94a3b8" />
            <TextInput
              value={searchTerm}
              onChangeText={handleSearchChange}
              placeholder={
                voiceState === "recording"
                  ? "Slušam..."
                  : mode === "symptom"
                  ? "Unesite simptom (min. 3 karaktera)"
                  : "Unesite naziv lijeka (min. 3 karaktera)"
              }
              placeholderTextColor={voiceState === "recording" ? "#f87171" : "#94a3b8"}
              className="flex-1 text-base text-slate-900"
              autoCapitalize="none"
              autoCorrect={false}
              editable={voiceState === "idle"}
            />
            {searchTerm.length > 0 && voiceState === "idle" && (
              <TouchableOpacity onPress={() => handleSearchChange("")} hitSlop={8}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
            {searchTerm.length > 0 && voiceState === "idle" && (
              <View className="h-5 w-px bg-slate-200" />
            )}
            <TouchableOpacity onPress={() => void handleVoicePress()} hitSlop={8}>
              {voiceState === "processing" ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Mic size={20} color={voiceState === "recording" ? "#ef4444" : "#94a3b8"} />
                </Animated.View>
              )}
            </TouchableOpacity>
          </View>
          {voiceError ? (
            <Text className="mt-2 text-xs font-medium text-red-500">{voiceError}</Text>
          ) : null}

          {/* Symptom Warning */}
          {!hasMinimumChars && mode === "symptom" && (
            <View className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <View className="flex-row items-start gap-3">
                <View className="rounded-xl bg-white/80 p-2">
                  <AlertTriangle size={20} color="#f59e0b" />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-base font-semibold text-slate-900">
                    Važna napomena
                  </Text>
                  <Text className="text-sm leading-6 text-slate-700">
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
            <View className="mt-6">
              <View className="flex-row items-center gap-2 mb-4">
                <TrendingUp size={14} color="#64748b" />
                <Text className="text-sm font-semibold text-slate-700">Popularno</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {popularMedicines.map((name) => (
                  <TouchableOpacity
                    key={name}
                    onPress={() => handlePopularClick(name)}
                    className="rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5"
                  >
                    <Text className="text-sm font-semibold text-blue-700">{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Search Loading */}
          {isLoadingSearch && (
            <View className="mt-6 items-center py-4">
              <ActivityIndicator color="#2563eb" />
            </View>
          )}

          {/* Search Results */}
          {hasMinimumChars && !isLoadingSearch && !selectedMedicine && (
            <View className="mt-6 gap-3">
              <Text className="text-xs text-slate-500">
                Rezultati pretrage:{" "}
                <Text className="font-semibold text-slate-900">{trimmedSearch}</Text>
              </Text>

              {searchResults.length === 0 ? (
                <View className="rounded-2xl border border-slate-200 bg-white p-4">
                  <View className="flex-row items-start gap-3">
                    <View className="rounded-xl bg-slate-100 p-2.5">
                      <Info size={22} color="#64748b" />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="text-lg font-semibold text-slate-900">
                        Nema rezultata
                      </Text>
                      <Text className="text-sm leading-6 text-slate-500">
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
                      >
                        <View className="flex-row items-start gap-3">
                          <TouchableOpacity
                            onPress={() => handleSelectMedicine(medicine.id)}
                            className={`mt-0.5 h-9 w-9 items-center justify-center rounded-full border ${
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
                            <Text className="text-lg font-semibold text-slate-900">
                              {medicine.name}
                            </Text>
                            <Text
                              className="text-sm leading-6 text-slate-600"
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
                            <Text className="text-sm font-semibold text-blue-700">
                              Detalji
                            </Text>
                            <ChevronRight size={16} color="#1d4ed8" />
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
            <View className="mt-6 overflow-hidden rounded-2xl border border-blue-200">
              <View className="p-4">
                <View className="flex-row items-start gap-3">
                  <TouchableOpacity
                    onPress={() => handleSelectMedicine(selectedMedicine.id)}
                    className="mt-0.5 h-9 w-9 items-center justify-center rounded-full border border-blue-300 bg-blue-100"
                    style={{ flexShrink: 0 }}
                  >
                    <CheckCircle2 size={16} color="#1d4ed8" />
                  </TouchableOpacity>

                  <View className="flex-1 gap-1">
                    <Text className="text-lg font-semibold text-slate-900">
                      {selectedMedicine.name}
                    </Text>
                    <Text
                      className="text-sm leading-6 text-slate-600"
                      numberOfLines={2}
                    >
                      {selectedMedicine.description}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => void handleToggleDetails(selectedMedicine.id)}
                    className="flex-row items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2"
                    style={{ flexShrink: 0 }}
                  >
                    <Text className="text-sm font-semibold text-blue-700">Detalji</Text>
                    <ChevronRight size={16} color="#1d4ed8" />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="border-t border-slate-200 px-4 py-4 gap-3">
                <Text className="text-sm font-semibold text-slate-700">
                  Odaberite dozu
                </Text>
                {isLoadingDoses ? (
                  <View className="flex-row gap-2">
                    {[1, 2, 3].map((i) => (
                      <View key={i} className="h-7 w-16 rounded-full bg-slate-200" />
                    ))}
                  </View>
                ) : (
                  <View className="flex-row flex-wrap gap-2">
                    <TouchableOpacity
                      onPress={() => handleDoseClick("all")}
                      className={`rounded-full border px-3 py-1.5 ${
                        isDoseActive("all")
                          ? "border-blue-600 bg-blue-600"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
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
                          className={`text-sm font-semibold ${
                            isDoseActive(dose) ? "text-white" : "text-slate-700"
                          }`}
                        >
                          {dose.strength}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Search Pharmacies CTA */}
          {isSearchButtonEnabled && (
            <TouchableOpacity
              className="mt-5 items-center rounded-2xl bg-blue-600 py-4"
              style={BLUE_SHADOW}
              onPress={() => {
                if (!selectedMedicine) return;
                router.push({
                  pathname: "/pharmacy-search",
                  params: {
                    medicineId: String(selectedMedicine.id),
                    medicineName: selectedMedicine.name,
                    doseIds: selectedDoses.map((d) => d.id).join(","),
                    doseStrengths: selectedDoses.map((d) => d.strength).join(","),
                  },
                });
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
