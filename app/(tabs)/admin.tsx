import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Building2, FlaskConical, ShieldCheck } from "lucide-react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { AdminNotice } from "../../components/admin/AdminNotice";
import { DosesManager } from "../../components/admin/DosesManager";
import { ImageUploadPanel } from "../../components/admin/ImageUploadPanel";
import { IngredientsManager } from "../../components/admin/IngredientsManager";
import { MedicationEditor } from "../../components/admin/MedicationEditor";
import { MedicationSearchPanel } from "../../components/admin/MedicationSearchPanel";
import { DutyManager } from "../../components/admin/DutyManager";
import { PharmacyEditor } from "../../components/admin/PharmacyEditor";
import { PharmacyImageUploadPanel } from "../../components/admin/PharmacyImageUploadPanel";
import { PharmacySearchPanel } from "../../components/admin/PharmacySearchPanel";
import { ScheduleExceptionsManager } from "../../components/admin/ScheduleExceptionsManager";
import { WorkingHoursManager } from "../../components/admin/WorkingHoursManager";
import {
  createDoses,
  createDuty,
  createIngredient,
  createMedication,
  createPharmacy,
  createScheduleException,
  createWorkingHours,
  deleteDose,
  deleteDuty,
  deleteMedication,
  updateDose,
  deletePharmacy,
  deleteScheduleException,
  deleteWorkingHours,
  getCities,
  getDutySchedules,
  getIngredients,
  getMedicationDetails,
  getMedicationDoses,
  getPharmacyById,
  getScheduleExceptions,
  getWorkingHours,
  linkIngredients,
  searchMedications,
  searchPharmacies,
  unlinkIngredient,
  updateMedication,
  updatePharmacy,
  updateScheduleException,
  updateWorkingHours,
  uploadMedicationImage,
  uploadPharmacyImage,
  removeMedicationImage,
  removePharmacyImage,
} from "../../lib/admin-api";
import { useAuth } from "../../context/AuthContext";
import type {
  ActiveIngredient,
  AdminNoticeType,
  City,
  DutyEntry,
  MedicationDetails,
  MedicationDose,
  MedicationPayload,
  MedicationSearchResult,
  PharmacyDetails,
  PharmacyPayload,
  PharmacySearchResult,
  ScheduleExceptionEntry,
  ScheduleExceptionPayload,
  WorkingHoursEntry,
  WorkingHoursPayload,
} from "../../lib/admin-types";

type AdminView = "medications" | "pharmacies";

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Došlo je do neočekivane greške.";
}

export default function AdminScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [view, setView] = useState<AdminView>("medications");

  // ─── Medications state ──────────────────────────────────────────────────────
  const [notice, setNotice] = useState<AdminNoticeType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<MedicationSearchResult[]>([]);
  const [selectedMedication, setSelectedMedication] = useState<MedicationDetails | null>(null);
  const [selectedDoses, setSelectedDoses] = useState<MedicationDose[]>([]);
  const [ingredients, setIngredients] = useState<ActiveIngredient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Pharmacy state ─────────────────────────────────────────────────────────
  const [pharmSearchTerm, setPharmSearchTerm] = useState("");
  const [pharmResults, setPharmResults] = useState<PharmacySearchResult[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<PharmacyDetails | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHoursEntry[]>([]);
  const [duties, setDuties] = useState<DutyEntry[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleExceptionEntry[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [pharmSearching, setPharmSearching] = useState(false);
  const [pharmSelecting, setPharmSelecting] = useState(false);
  const [pharmBusy, setPharmBusy] = useState(false);
  const pharmDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshIngredients = async () => setIngredients(await getIngredients());

  const refreshMedication = async (id: number) => {
    const [details, doses] = await Promise.all([
      getMedicationDetails(id),
      getMedicationDoses(id),
    ]);
    setSelectedMedication(details);
    setSelectedDoses(doses);
  };

  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = (n: AdminNoticeType) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(n);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 4000);
  };

  const runAction = async (action: () => Promise<void>, msg: string) => {
    setIsBusy(true);
    setNotice(null);
    try {
      await action();
      showNotice({ type: "success", message: msg });
    } catch (e) {
      showNotice({ type: "error", message: errMsg(e) });
    } finally {
      setIsBusy(false);
    }
  };

  const runPharmAction = async (action: () => Promise<void>, msg: string) => {
    setPharmBusy(true);
    setNotice(null);
    try {
      await action();
      showNotice({ type: "success", message: msg });
    } catch (e) {
      showNotice({ type: "error", message: errMsg(e) });
    } finally {
      setPharmBusy(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    refreshIngredients().catch((e) => showNotice({ type: "error", message: errMsg(e) }));
    getCities().then(setCities).catch((e) => showNotice({ type: "error", message: errMsg(e) }));
  }, [isAdmin]);

  // medication debounced search
  useEffect(() => {
    if (!isAdmin) return;
    const trimmed = searchTerm.trim();
    if (trimmed.length < 3) { setSearchResults([]); setIsSearching(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        setSearchResults(await searchMedications(trimmed));
      } catch (e) {
        setSearchResults([]);
        showNotice({ type: "error", message: errMsg(e) });
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [isAdmin, searchTerm]);

  // pharmacy debounced search
  useEffect(() => {
    if (!isAdmin) return;
    const trimmed = pharmSearchTerm.trim();
    if (trimmed.length < 2) { setPharmResults([]); setPharmSearching(false); return; }
    if (pharmDebounceRef.current) clearTimeout(pharmDebounceRef.current);
    pharmDebounceRef.current = setTimeout(async () => {
      setPharmSearching(true);
      try {
        setPharmResults(await searchPharmacies(trimmed));
      } catch (e) {
        setPharmResults([]);
        showNotice({ type: "error", message: errMsg(e) });
      } finally {
        setPharmSearching(false);
      }
    }, 300);
    return () => { if (pharmDebounceRef.current) clearTimeout(pharmDebounceRef.current); };
  }, [isAdmin, pharmSearchTerm]);

  const selectMedication = async (id: number) => {
    setIsSelecting(true);
    setNotice(null);
    try { await refreshMedication(id); }
    catch (e) { showNotice({ type: "error", message: errMsg(e) }); }
    finally { setIsSelecting(false); }
  };

  const refreshPharmacyData = async (id: number) => {
    const [details, wh, duty, ex] = await Promise.all([
      getPharmacyById(id),
      getWorkingHours(id),
      getDutySchedules(id),
      getScheduleExceptions(id),
    ]);
    setSelectedPharmacy(details);
    setWorkingHours(wh);
    setDuties(duty);
    setExceptions(ex);
  };

  const selectPharmacy = async (id: number) => {
    setPharmSelecting(true);
    setNotice(null);
    try { await refreshPharmacyData(id); }
    catch (e) { showNotice({ type: "error", message: errMsg(e) }); }
    finally { setPharmSelecting(false); }
  };

  // ─── Medication handlers ─────────────────────────────────────────────────────

  const handleCreateMedication = async (payload: MedicationPayload) =>
    runAction(async () => {
      const result = await createMedication(payload);
      setSearchTerm(payload.name);
      await refreshMedication(result.id);
    }, "Lijek je kreiran.");

  const handleUpdateMedication = async (payload: MedicationPayload) => {
    if (!selectedMedication) return;
    await runAction(async () => {
      await updateMedication(selectedMedication.id, payload);
      await refreshMedication(selectedMedication.id);
      setSearchTerm(payload.name);
    }, "Izmjene su sačuvane.");
  };

  const handleDeleteMedication = async () => {
    if (!selectedMedication) return;
    Alert.alert(
      "Obriši lijek",
      `Obrisati lijek "${selectedMedication.name}"?`,
      [
        { text: "Odustani", style: "cancel" },
        {
          text: "Obriši",
          style: "destructive",
          onPress: () =>
            void runAction(async () => {
              await deleteMedication(selectedMedication.id);
              setSearchResults((prev) => prev.filter((m) => m.id !== selectedMedication.id));
              setSelectedMedication(null);
              setSelectedDoses([]);
            }, "Lijek je obrisan."),
        },
      ]
    );
  };

  const handleCreateIngredient = async (name: string) =>
    runAction(async () => { await createIngredient(name); await refreshIngredients(); }, "Aktivna supstanca je dodata.");

  const handleLinkIngredients = async (ids: number[]) => {
    if (!selectedMedication) return;
    await runAction(async () => { await linkIngredients(selectedMedication.id, ids); await refreshMedication(selectedMedication.id); }, "Supstance su povezane sa lijekom.");
  };

  const handleUnlinkIngredient = async (id: number) => {
    if (!selectedMedication) return;
    await runAction(async () => { await unlinkIngredient(selectedMedication.id, id); await refreshMedication(selectedMedication.id); }, "Supstanca je uklonjena.");
  };

  const handleCreateDoses = async (strengths: string[]) => {
    if (!selectedMedication) return;
    await runAction(async () => { await createDoses(selectedMedication.id, strengths); await refreshMedication(selectedMedication.id); }, "Doze su dodate.");
  };

  const handleUpdateDose = async (doseId: number, is_refundable: boolean) => {
    if (!selectedMedication) return;
    await runAction(async () => { await updateDose(selectedMedication.id, doseId, is_refundable); await refreshMedication(selectedMedication.id); }, is_refundable ? "Doza označena kao refundabilna." : "Doza označena kao nerefundabilna.");
  };

  const handleDeleteDose = async (doseId: number) => {
    if (!selectedMedication) return;
    await runAction(async () => { await deleteDose(selectedMedication.id, doseId); await refreshMedication(selectedMedication.id); }, "Doza je obrisana.");
  };

  const handleUploadImage = async (uri: string) => {
    if (!selectedMedication) return;
    await runAction(async () => { await uploadMedicationImage(selectedMedication.name, uri); await refreshMedication(selectedMedication.id); }, "Slika lijeka je uploadovana.");
  };

  const handleRemoveMedicationImage = async () => {
    if (!selectedMedication) return;
    await runAction(async () => { await removeMedicationImage(selectedMedication.id); await refreshMedication(selectedMedication.id); }, "Slika lijeka je uklonjena.");
  };

  // ─── Pharmacy handlers ───────────────────────────────────────────────────────

  const handleCreatePharmacy = async (payload: PharmacyPayload) =>
    runPharmAction(async () => {
      const result = await createPharmacy(payload);
      setPharmSearchTerm(payload.name);
      await refreshPharmacyData(result.id);
    }, "Apoteka je kreirana.");

  const handleUpdatePharmacy = async (payload: Partial<PharmacyPayload>) => {
    if (!selectedPharmacy) return;
    await runPharmAction(async () => { await updatePharmacy(selectedPharmacy.id, payload); await refreshPharmacyData(selectedPharmacy.id); }, "Izmjene su sačuvane.");
  };

  const handleDeletePharmacy = async () => {
    if (!selectedPharmacy) return;
    Alert.alert(
      "Obriši apoteku",
      `Obrisati apoteku "${selectedPharmacy.name}"?`,
      [
        { text: "Odustani", style: "cancel" },
        {
          text: "Obriši",
          style: "destructive",
          onPress: () =>
            void runPharmAction(async () => {
              await deletePharmacy(selectedPharmacy.id);
              setPharmResults((prev) => prev.filter((p) => p.id !== selectedPharmacy.id));
              setSelectedPharmacy(null);
              setWorkingHours([]);
              setDuties([]);
              setExceptions([]);
            }, "Apoteka je obrisana."),
        },
      ]
    );
  };

  const handleAddWorkingHours = async (payload: WorkingHoursPayload) => {
    if (!selectedPharmacy) return;
    await runPharmAction(async () => { await createWorkingHours(selectedPharmacy.id, payload); setWorkingHours(await getWorkingHours(selectedPharmacy.id)); }, "Radno vrijeme je dodato.");
  };

  const handleUpdateWorkingHours = async (whId: number, payload: Partial<WorkingHoursPayload>) => {
    if (!selectedPharmacy) return;
    await runPharmAction(async () => { await updateWorkingHours(selectedPharmacy.id, whId, payload); setWorkingHours(await getWorkingHours(selectedPharmacy.id)); }, "Radno vrijeme je izmijenjeno.");
  };

  const handleDeleteWorkingHours = async (whId: number) => {
    if (!selectedPharmacy) return;
    await runPharmAction(async () => { await deleteWorkingHours(selectedPharmacy.id, whId); setWorkingHours((prev) => prev.filter((w) => w.id !== whId)); }, "Radno vrijeme je obrisano.");
  };

  const handleAddDuty = async (payload: import("../../lib/admin-types").DutyPayload) => {
    if (!selectedPharmacy) return;
    await runPharmAction(async () => { await createDuty(selectedPharmacy.id, payload); setDuties(await getDutySchedules(selectedPharmacy.id)); }, "Dežurstvo je dodato.");
  };

  const handleDeleteDuty = async (dutyId: number) => {
    if (!selectedPharmacy) return;
    await runPharmAction(async () => { await deleteDuty(selectedPharmacy.id, dutyId); setDuties((prev) => prev.filter((d) => d.id !== dutyId)); }, "Dežurstvo je obrisano.");
  };

  const handleAddException = async (payload: ScheduleExceptionPayload) => {
    if (!selectedPharmacy) return;
    await runPharmAction(async () => { await createScheduleException(selectedPharmacy.id, payload); setExceptions(await getScheduleExceptions(selectedPharmacy.id)); }, "Izuzetak je dodat.");
  };

  const handleUpdateException = async (exId: number, payload: Partial<ScheduleExceptionPayload>) => {
    if (!selectedPharmacy) return;
    await runPharmAction(async () => { await updateScheduleException(selectedPharmacy.id, exId, payload); setExceptions(await getScheduleExceptions(selectedPharmacy.id)); }, "Izuzetak je izmijenjen.");
  };

  const handleDeleteException = async (exId: number) => {
    if (!selectedPharmacy) return;
    await runPharmAction(async () => { await deleteScheduleException(selectedPharmacy.id, exId); setExceptions((prev) => prev.filter((e) => e.id !== exId)); }, "Izuzetak je obrisan.");
  };

  const handleUploadPharmacyImage = async (uri: string) => {
    if (!selectedPharmacy) return;
    await runPharmAction(async () => { await uploadPharmacyImage(selectedPharmacy.id, uri); await refreshPharmacyData(selectedPharmacy.id); }, "Slika apoteke je uploadovana.");
  };

  const handleRemovePharmacyImage = async () => {
    if (!selectedPharmacy) return;
    await runPharmAction(async () => { await removePharmacyImage(selectedPharmacy.id); await refreshPharmacyData(selectedPharmacy.id); }, "Slika apoteke je uklonjena.");
  };

  if (!isAdmin) {
    return (
      <ScreenLayout>
        <View className="px-4 pt-10 pb-32">
          <View className="rounded-2xl border border-slate-200 bg-white p-6">
            <View className="flex-row items-start gap-3">
              <View className="rounded-xl bg-blue-50 p-2">
                <ShieldCheck size={20} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-slate-900">Admin panel</Text>
                <Text className="mt-2 text-sm leading-6 text-slate-600">
                  Panel je dostupan nakon prijave admin nalogom.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-6 pb-32 gap-4">
          {/* Header */}
          <View className="flex-row items-center justify-between flex-wrap gap-3">
            <View>
              <View className="flex-row items-center gap-1.5 mb-1">
                <ShieldCheck size={14} color="#2563eb" />
                <Text className="text-sm font-bold text-blue-700">Admin panel</Text>
              </View>
              <Text className="text-2xl font-bold text-slate-900">
                {view === "medications" ? "Upravljanje lijekovima" : "Upravljanje apotekama"}
              </Text>
            </View>

            {/* View switcher */}
            <View className="flex-row rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <TouchableOpacity
                onPress={() => setView("medications")}
                className={`flex-row items-center gap-2 px-4 py-2 ${
                  view === "medications" ? "bg-blue-600" : ""
                }`}
              >
                <FlaskConical size={16} color={view === "medications" ? "#fff" : "#64748b"} />
                <Text
                  className={`text-sm font-semibold ${
                    view === "medications" ? "text-white" : "text-slate-600"
                  }`}
                >
                  Lijekovi
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setView("pharmacies")}
                className={`flex-row items-center gap-2 px-4 py-2 ${
                  view === "pharmacies" ? "bg-blue-600" : ""
                }`}
              >
                <Building2 size={16} color={view === "pharmacies" ? "#fff" : "#64748b"} />
                <Text
                  className={`text-sm font-semibold ${
                    view === "pharmacies" ? "text-white" : "text-slate-600"
                  }`}
                >
                  Apoteke
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notice */}
          <AdminNotice notice={notice} />

          {/* Medications view */}
          {view === "medications" && (
            <>
              <MedicationSearchPanel
                searchTerm={searchTerm}
                results={searchResults}
                selectedMedication={selectedMedication}
                isSearching={isSearching || isSelecting}
                onSearchChange={setSearchTerm}
                onSelectMedication={selectMedication}
              />
              <MedicationEditor
                key={selectedMedication?.id ?? "new"}
                selectedMedication={selectedMedication}
                isBusy={isBusy}
                onCreateMedication={handleCreateMedication}
                onUpdateMedication={handleUpdateMedication}
                onDeleteMedication={handleDeleteMedication}
              />
              <ImageUploadPanel
                medication={selectedMedication}
                isBusy={isBusy}
                onUploadImage={handleUploadImage}
                onRemoveImage={handleRemoveMedicationImage}
              />
              <IngredientsManager
                medication={selectedMedication}
                ingredients={ingredients}
                isBusy={isBusy}
                onCreateIngredient={handleCreateIngredient}
                onLinkIngredients={handleLinkIngredients}
                onUnlinkIngredient={handleUnlinkIngredient}
              />
              <DosesManager
                medication={selectedMedication}
                doses={selectedDoses}
                isBusy={isBusy}
                onCreateDoses={handleCreateDoses}
                onDeleteDose={handleDeleteDose}
                onUpdateDose={handleUpdateDose}
              />
            </>
          )}

          {/* Pharmacies view */}
          {view === "pharmacies" && (
            <>
              <PharmacySearchPanel
                searchTerm={pharmSearchTerm}
                results={pharmResults}
                selectedPharmacy={selectedPharmacy}
                isSearching={pharmSearching || pharmSelecting}
                onSearchChange={setPharmSearchTerm}
                onSelectPharmacy={selectPharmacy}
              />
              <PharmacyEditor
                key={selectedPharmacy?.id ?? "new-pharmacy"}
                selectedPharmacy={selectedPharmacy}
                cities={cities}
                isBusy={pharmBusy || pharmSelecting}
                onCreatePharmacy={handleCreatePharmacy}
                onUpdatePharmacy={handleUpdatePharmacy}
                onDeletePharmacy={handleDeletePharmacy}
              />
              <PharmacyImageUploadPanel
                pharmacy={selectedPharmacy}
                isBusy={pharmBusy || pharmSelecting}
                onUploadImage={handleUploadPharmacyImage}
                onRemoveImage={handleRemovePharmacyImage}
              />
              <WorkingHoursManager
                pharmacy={selectedPharmacy}
                workingHours={workingHours}
                isBusy={pharmBusy || pharmSelecting}
                onAdd={handleAddWorkingHours}
                onUpdate={handleUpdateWorkingHours}
                onDelete={handleDeleteWorkingHours}
              />
              <DutyManager
                pharmacy={selectedPharmacy}
                duties={duties}
                isBusy={pharmBusy || pharmSelecting}
                onAdd={handleAddDuty}
                onDelete={handleDeleteDuty}
              />
              <ScheduleExceptionsManager
                pharmacy={selectedPharmacy}
                exceptions={exceptions}
                isBusy={pharmBusy || pharmSelecting}
                onAdd={handleAddException}
                onUpdate={handleUpdateException}
                onDelete={handleDeleteException}
              />
            </>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
