import { useState } from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Check, ChevronDown, Pencil, Trash2, X } from "lucide-react-native";
import type { PharmacyDetails, WorkingHoursEntry, WorkingHoursPayload } from "../../lib/admin-types";

const DAYS = [
  { value: "Monday",    label: "Ponedjeljak" },
  { value: "Tuesday",   label: "Utorak" },
  { value: "Wednesday", label: "Srijeda" },
  { value: "Thursday",  label: "Četvrtak" },
  { value: "Friday",    label: "Petak" },
  { value: "Saturday",  label: "Subota" },
  { value: "Sunday",    label: "Nedjelja" },
];

const DAY_LABEL: Record<string, string> = Object.fromEntries(
  DAYS.map((d) => [d.value.toLowerCase(), d.label])
);
const dayLabel = (raw: string) => DAY_LABEL[raw.toLowerCase()] ?? raw;

type Props = {
  pharmacy: PharmacyDetails | null;
  workingHours: WorkingHoursEntry[];
  isBusy: boolean;
  onAdd: (payload: WorkingHoursPayload) => Promise<void>;
  onUpdate: (whId: number, payload: Partial<WorkingHoursPayload>) => Promise<void>;
  onDelete: (whId: number) => Promise<void>;
};

export function WorkingHoursManager({ pharmacy, workingHours, isBusy, onAdd, onUpdate, onDelete }: Props) {
  const [newDay, setNewDay] = useState("Monday");
  const [newOpen, setNewOpen] = useState("08:00");
  const [newClose, setNewClose] = useState("20:00");
  const [dayPickerVisible, setDayPickerVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState("");
  const [editClose, setEditClose] = useState("");

  const startEdit = (wh: WorkingHoursEntry) => {
    setEditingId(wh.id);
    setEditOpen(wh.open_time.slice(0, 5));
    setEditClose(wh.close_time.slice(0, 5));
  };

  const confirmEdit = async (whId: number) => {
    await onUpdate(whId, {
      open_time: editOpen + ":00",
      close_time: editClose + ":00",
    });
    setEditingId(null);
  };

  const handleAdd = async () => {
    await onAdd({
      day_of_week: newDay,
      open_time: newOpen + ":00",
      close_time: newClose + ":00",
    });
  };

  const inputClass = "rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white";
  const selectedDayLabel = DAYS.find((d) => d.value === newDay)?.label ?? newDay;

  if (!pharmacy) {
    return (
      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-base font-bold text-slate-900">Radno vrijeme</Text>
        <Text className="mt-1 text-xs text-slate-400">Izaberi apoteku da upravljaš radnim vremenom.</Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-base font-bold text-slate-900">Radno vrijeme</Text>
      <Text className="mt-0.5 mb-3 text-xs text-slate-500">{pharmacy.name}</Text>

      {workingHours.length === 0 ? (
        <Text className="mb-3 text-xs text-slate-400">Nema unesenog radnog vremena.</Text>
      ) : (
        <View className="mb-4 gap-1">
          {workingHours.map((wh) =>
            editingId === wh.id ? (
              <View key={wh.id} className="rounded-xl bg-blue-50 px-3 py-2 gap-2">
                <Text className="text-sm font-medium text-slate-700">{dayLabel(wh.day_of_week)}</Text>
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={editOpen}
                    onChangeText={setEditOpen}
                    placeholder="HH:MM"
                    placeholderTextColor="#94a3b8"
                    className={inputClass + " flex-1"}
                    editable={!isBusy}
                  />
                  <Text className="text-slate-400">–</Text>
                  <TextInput
                    value={editClose}
                    onChangeText={setEditClose}
                    placeholder="HH:MM"
                    placeholderTextColor="#94a3b8"
                    className={inputClass + " flex-1"}
                    editable={!isBusy}
                  />
                  <TouchableOpacity
                    onPress={() => void confirmEdit(wh.id)}
                    disabled={isBusy}
                    className="rounded-lg bg-emerald-50 p-2"
                  >
                    <Check size={16} color="#047857" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditingId(null)}
                    className="rounded-lg bg-slate-100 p-2"
                  >
                    <X size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View
                key={wh.id}
                className="flex-row items-center gap-2 rounded-xl border border-slate-100 px-3 py-2.5"
              >
                <Text className="w-28 text-sm font-medium text-slate-700">
                  {dayLabel(wh.day_of_week)}
                </Text>
                <Text className="flex-1 text-sm text-slate-500">
                  {wh.open_time.slice(0, 5)} – {wh.close_time.slice(0, 5)}
                </Text>
                <TouchableOpacity
                  onPress={() => startEdit(wh)}
                  disabled={isBusy}
                  className="rounded-lg p-1.5"
                >
                  <Pencil size={14} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void onDelete(wh.id)}
                  disabled={isBusy}
                  className="rounded-lg p-1.5"
                >
                  <Trash2 size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            )
          )}
        </View>
      )}

      <View className="border-t border-slate-100 pt-3 gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">Dodaj dan</Text>
        <TouchableOpacity
          onPress={() => setDayPickerVisible(true)}
          disabled={isBusy}
          className="flex-row items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 bg-white"
        >
          <Text className="text-sm text-slate-800">{selectedDayLabel}</Text>
          <ChevronDown size={16} color="#94a3b8" />
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <TextInput
            value={newOpen}
            onChangeText={setNewOpen}
            placeholder="08:00"
            placeholderTextColor="#94a3b8"
            className={inputClass + " flex-1"}
            editable={!isBusy}
          />
          <Text className="text-slate-400">–</Text>
          <TextInput
            value={newClose}
            onChangeText={setNewClose}
            placeholder="20:00"
            placeholderTextColor="#94a3b8"
            className={inputClass + " flex-1"}
            editable={!isBusy}
          />
          <TouchableOpacity
            onPress={() => void handleAdd()}
            disabled={isBusy}
            className="rounded-xl bg-blue-600 px-3 py-2.5 disabled:opacity-50"
          >
            <Text className="text-sm font-bold text-white">+ Dodaj</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={dayPickerVisible} transparent animationType="slide">
        <TouchableOpacity
          className="flex-1 bg-black/30"
          activeOpacity={1}
          onPress={() => setDayPickerVisible(false)}
        />
        <View className="rounded-t-3xl bg-white pb-8">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100">
            <Text className="text-base font-bold text-slate-900">Izaberi dan</Text>
            <TouchableOpacity onPress={() => setDayPickerVisible(false)}>
              <Text className="text-sm font-semibold text-blue-600">Zatvori</Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="max-h-64">
            {DAYS.map((d) => (
              <TouchableOpacity
                key={d.value}
                onPress={() => {
                  setNewDay(d.value);
                  setDayPickerVisible(false);
                }}
                className={`px-4 py-3 border-b border-slate-50 ${d.value === newDay ? "bg-blue-50" : ""}`}
              >
                <Text className={`text-sm ${d.value === newDay ? "font-bold text-blue-700" : "text-slate-700"}`}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
