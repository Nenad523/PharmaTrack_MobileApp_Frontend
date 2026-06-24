import { useState } from "react";
import { Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Check, ChevronDown, Pencil, Trash2, X } from "lucide-react-native";
import type {
  PharmacyDetails,
  ScheduleExceptionEntry,
  ScheduleExceptionPayload,
} from "../../lib/admin-types";

const REASONS = [
  { value: "holiday",       label: "Državni praznik" },
  { value: "special_hours", label: "Posebno radno vrijeme" },
  { value: "closure",       label: "Zatvoreno" },
];
const reasonLabel = (v: string) => REASONS.find((r) => r.value === v)?.label ?? v;

const emptyForm: ScheduleExceptionPayload = {
  exception_date: "",
  name: "",
  open_time: "",
  close_time: "",
  is_closed: false,
  reason: "holiday",
};

type Props = {
  pharmacy: PharmacyDetails | null;
  exceptions: ScheduleExceptionEntry[];
  isBusy: boolean;
  onAdd: (payload: ScheduleExceptionPayload) => Promise<void>;
  onUpdate: (exId: number, payload: Partial<ScheduleExceptionPayload>) => Promise<void>;
  onDelete: (exId: number) => Promise<void>;
};

export function ScheduleExceptionsManager({
  pharmacy,
  exceptions,
  isBusy,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [form, setForm] = useState<ScheduleExceptionPayload>(emptyForm);
  const [reasonPickerVisible, setReasonPickerVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<ScheduleExceptionPayload>(emptyForm);
  const [editReasonVisible, setEditReasonVisible] = useState(false);

  const setField = <K extends keyof ScheduleExceptionPayload>(
    field: K,
    value: ScheduleExceptionPayload[K]
  ) => setForm((prev) => ({ ...prev, [field]: value }));

  const setEditField = <K extends keyof ScheduleExceptionPayload>(
    field: K,
    value: ScheduleExceptionPayload[K]
  ) => setEditState((prev) => ({ ...prev, [field]: value }));

  const startEdit = (ex: ScheduleExceptionEntry) => {
    setEditingId(ex.id);
    setEditState({
      exception_date: ex.exception_date,
      name: ex.name,
      open_time: ex.open_time ?? "",
      close_time: ex.close_time ?? "",
      is_closed: ex.is_closed,
      reason: ex.reason,
    });
  };

  const confirmEdit = async (exId: number) => {
    const payload: Partial<ScheduleExceptionPayload> = {
      exception_date: editState.exception_date,
      name: editState.name,
      is_closed: editState.is_closed,
      reason: editState.reason,
    };
    if (!editState.is_closed) {
      if (editState.open_time) payload.open_time = editState.open_time + ":00";
      if (editState.close_time) payload.close_time = editState.close_time + ":00";
    }
    await onUpdate(exId, payload);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!form.exception_date || !form.name) return;
    const payload: ScheduleExceptionPayload = {
      exception_date: form.exception_date,
      name: form.name,
      is_closed: form.is_closed,
      reason: form.reason,
    };
    if (!form.is_closed) {
      if (form.open_time) payload.open_time = form.open_time + ":00";
      if (form.close_time) payload.close_time = form.close_time + ":00";
    }
    await onAdd(payload);
    setForm(emptyForm);
  };

  const inputClass = "rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 bg-white";
  const labelClass = "mb-1 text-xs text-slate-500";

  if (!pharmacy) {
    return (
      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-base font-bold text-slate-900">Izuzeci rasporeda</Text>
        <Text className="mt-1 text-xs text-slate-400">Izaberi apoteku da upravljaš izuzecima.</Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-base font-bold text-slate-900">Izuzeci rasporeda</Text>
      <Text className="mt-0.5 mb-3 text-xs text-slate-500">
        Praznici, posebne smjene, zatvoreno — {pharmacy.name}
      </Text>

      {exceptions.length === 0 ? (
        <Text className="mb-3 text-xs text-slate-400">Nema unesenih izuzetaka.</Text>
      ) : (
        <View className="mb-4 gap-1">
          {exceptions.map((ex) =>
            editingId === ex.id ? (
              <View key={ex.id} className="rounded-xl border border-blue-200 bg-blue-50 p-3 gap-2">
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Text className={labelClass}>Datum</Text>
                    <TextInput
                      value={editState.exception_date}
                      onChangeText={(v) => setEditField("exception_date", v)}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#94a3b8"
                      className={inputClass}
                      editable={!isBusy}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={labelClass}>Naziv</Text>
                    <TextInput
                      value={editState.name}
                      onChangeText={(v) => setEditField("name", v)}
                      placeholder="Nova Godina"
                      placeholderTextColor="#94a3b8"
                      className={inputClass}
                      editable={!isBusy}
                    />
                  </View>
                </View>
                <View className="flex-row items-center justify-between">
                  <TouchableOpacity
                    onPress={() => setEditReasonVisible(true)}
                    className="flex-row items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <Text className="text-sm text-slate-700">{reasonLabel(editState.reason)}</Text>
                    <ChevronDown size={14} color="#94a3b8" />
                  </TouchableOpacity>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm text-slate-600">Zatvoreno</Text>
                    <Switch
                      value={editState.is_closed}
                      onValueChange={(v) => setEditField("is_closed", v)}
                      trackColor={{ true: "#2563eb" }}
                      disabled={isBusy}
                    />
                  </View>
                </View>
                {!editState.is_closed && (
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Text className={labelClass}>Otvaranje</Text>
                      <TextInput
                        value={editState.open_time}
                        onChangeText={(v) => setEditField("open_time", v)}
                        placeholder="HH:MM"
                        placeholderTextColor="#94a3b8"
                        className={inputClass}
                        editable={!isBusy}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className={labelClass}>Zatvaranje</Text>
                      <TextInput
                        value={editState.close_time}
                        onChangeText={(v) => setEditField("close_time", v)}
                        placeholder="HH:MM"
                        placeholderTextColor="#94a3b8"
                        className={inputClass}
                        editable={!isBusy}
                      />
                    </View>
                  </View>
                )}
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => void confirmEdit(ex.id)}
                    disabled={isBusy}
                    className="flex-row items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2"
                  >
                    <Check size={14} color="#fff" />
                    <Text className="text-sm font-semibold text-white">Sačuvaj</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditingId(null)}
                    className="flex-row items-center gap-1 rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <X size={14} color="#64748b" />
                    <Text className="text-sm text-slate-600">Odustani</Text>
                  </TouchableOpacity>
                </View>

                <Modal visible={editReasonVisible} transparent animationType="slide">
                  <TouchableOpacity className="flex-1 bg-black/30" activeOpacity={1} onPress={() => setEditReasonVisible(false)} />
                  <View className="rounded-t-3xl bg-white pb-8">
                    <View className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100">
                      <Text className="text-base font-bold text-slate-900">Razlog</Text>
                      <TouchableOpacity onPress={() => setEditReasonVisible(false)}>
                        <Text className="text-sm font-semibold text-blue-600">Zatvori</Text>
                      </TouchableOpacity>
                    </View>
                    {REASONS.map((r) => (
                      <TouchableOpacity
                        key={r.value}
                        onPress={() => { setEditField("reason", r.value); setEditReasonVisible(false); }}
                        className={`px-4 py-3 border-b border-slate-50 ${r.value === editState.reason ? "bg-blue-50" : ""}`}
                      >
                        <Text className={`text-sm ${r.value === editState.reason ? "font-bold text-blue-700" : "text-slate-700"}`}>
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Modal>
              </View>
            ) : (
              <View key={ex.id} className="flex-row items-center gap-2 rounded-xl border border-slate-100 px-3 py-2.5">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    <Text className="text-sm font-medium text-slate-700">{ex.exception_date}</Text>
                    <Text className="text-slate-300">|</Text>
                    <Text className="text-sm text-slate-600">{ex.name}</Text>
                    {ex.is_closed ? (
                      <View className="rounded-full bg-rose-100 px-2 py-0.5">
                        <Text className="text-xs font-medium text-rose-700">Zatvoreno</Text>
                      </View>
                    ) : ex.open_time ? (
                      <Text className="text-xs text-slate-400">
                        {ex.open_time.slice(0, 5)} – {ex.close_time?.slice(0, 5)}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity onPress={() => startEdit(ex)} disabled={isBusy} className="rounded-lg p-1.5">
                  <Pencil size={14} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void onDelete(ex.id)} disabled={isBusy} className="rounded-lg p-1.5">
                  <Trash2 size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            )
          )}
        </View>
      )}

      {/* Add new exception */}
      <View className="border-t border-slate-100 pt-3 gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">Dodaj izuzetak</Text>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Text className={labelClass}>Datum</Text>
            <TextInput
              value={form.exception_date}
              onChangeText={(v) => setField("exception_date", v)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
              className={inputClass}
              editable={!isBusy}
            />
          </View>
          <View className="flex-1">
            <Text className={labelClass}>Naziv</Text>
            <TextInput
              value={form.name}
              onChangeText={(v) => setField("name", v)}
              placeholder="Nova Godina"
              placeholderTextColor="#94a3b8"
              className={inputClass}
              editable={!isBusy}
            />
          </View>
        </View>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => setReasonPickerVisible(true)}
            className="flex-row items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            <Text className="text-sm text-slate-700">{reasonLabel(form.reason)}</Text>
            <ChevronDown size={14} color="#94a3b8" />
          </TouchableOpacity>
          <View className="flex-row items-center gap-2">
            <Text className="text-sm text-slate-600">Zatvoreno</Text>
            <Switch
              value={form.is_closed}
              onValueChange={(v) => setField("is_closed", v)}
              trackColor={{ true: "#2563eb" }}
              disabled={isBusy}
            />
          </View>
        </View>
        {!form.is_closed && (
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className={labelClass}>Otvaranje</Text>
              <TextInput
                value={form.open_time}
                onChangeText={(v) => setField("open_time", v)}
                placeholder="HH:MM"
                placeholderTextColor="#94a3b8"
                className={inputClass}
                editable={!isBusy}
              />
            </View>
            <View className="flex-1">
              <Text className={labelClass}>Zatvaranje</Text>
              <TextInput
                value={form.close_time}
                onChangeText={(v) => setField("close_time", v)}
                placeholder="HH:MM"
                placeholderTextColor="#94a3b8"
                className={inputClass}
                editable={!isBusy}
              />
            </View>
          </View>
        )}
        <TouchableOpacity
          onPress={() => void handleAdd()}
          disabled={isBusy || !form.exception_date || !form.name}
          className="w-full items-center rounded-xl bg-blue-600 py-2.5 disabled:opacity-50"
        >
          <Text className="text-sm font-bold text-white">+ Dodaj izuzetak</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={reasonPickerVisible} transparent animationType="slide">
        <TouchableOpacity className="flex-1 bg-black/30" activeOpacity={1} onPress={() => setReasonPickerVisible(false)} />
        <View className="rounded-t-3xl bg-white pb-8">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100">
            <Text className="text-base font-bold text-slate-900">Razlog</Text>
            <TouchableOpacity onPress={() => setReasonPickerVisible(false)}>
              <Text className="text-sm font-semibold text-blue-600">Zatvori</Text>
            </TouchableOpacity>
          </View>
          {REASONS.map((r) => (
            <TouchableOpacity
              key={r.value}
              onPress={() => { setField("reason", r.value); setReasonPickerVisible(false); }}
              className={`px-4 py-3 border-b border-slate-50 ${r.value === form.reason ? "bg-blue-50" : ""}`}
            >
              <Text className={`text-sm ${r.value === form.reason ? "font-bold text-blue-700" : "text-slate-700"}`}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  );
}
