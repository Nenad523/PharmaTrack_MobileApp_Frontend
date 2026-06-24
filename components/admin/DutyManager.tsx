import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import type { DutyEntry, DutyPayload, PharmacyDetails } from "../../lib/admin-types";

function formatDateTime(dt: string) {
  return dt.replace("T", " ").slice(0, 16);
}

type Props = {
  pharmacy: PharmacyDetails | null;
  duties: DutyEntry[];
  isBusy: boolean;
  onAdd: (payload: DutyPayload) => Promise<void>;
  onDelete: (dutyId: number) => Promise<void>;
};

const emptyForm = { start_date: "", start_time: "00:00", end_date: "", end_time: "08:00" };

export function DutyManager({ pharmacy, duties, isBusy, onAdd, onDelete }: Props) {
  const [form, setForm] = useState(emptyForm);
  const set = (field: keyof typeof emptyForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleAdd = async () => {
    if (!form.start_date || !form.end_date) return;
    await onAdd({
      start_datetime: `${form.start_date} ${form.start_time}:00`,
      end_datetime: `${form.end_date} ${form.end_time}:00`,
    });
    setForm(emptyForm);
  };

  const inputClass = "rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 bg-white";
  const labelClass = "mb-1 text-xs text-slate-500";

  if (!pharmacy) {
    return (
      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-base font-bold text-slate-900">Dežurstva</Text>
        <Text className="mt-1 text-xs text-slate-400">Izaberi apoteku da upravljaš dežurstvima.</Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-base font-bold text-slate-900">Dežurstva</Text>
      <Text className="mt-0.5 mb-3 text-xs text-slate-500">{pharmacy.name}</Text>

      {duties.length === 0 ? (
        <Text className="mb-3 text-xs text-slate-400">Nema unesenih dežurstava.</Text>
      ) : (
        <View className="mb-4 gap-1">
          {duties.map((d) => (
            <View
              key={d.id}
              className="flex-row items-center gap-2 rounded-xl border border-slate-100 px-3 py-2.5"
            >
              <View className="flex-1">
                <Text className="text-sm text-slate-700">
                  {formatDateTime(d.start_datetime)} → {formatDateTime(d.end_datetime)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => void onDelete(d.id)}
                disabled={isBusy}
                className="rounded-lg p-1.5"
              >
                <Trash2 size={14} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View className="border-t border-slate-100 pt-3 gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Dodaj dežurstvo
        </Text>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Text className={labelClass}>Početak — datum</Text>
            <TextInput
              value={form.start_date}
              onChangeText={(v) => set("start_date", v)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
              className={inputClass}
              editable={!isBusy}
            />
          </View>
          <View className="flex-1">
            <Text className={labelClass}>Početak — vrijeme</Text>
            <TextInput
              value={form.start_time}
              onChangeText={(v) => set("start_time", v)}
              placeholder="HH:MM"
              placeholderTextColor="#94a3b8"
              className={inputClass}
              editable={!isBusy}
            />
          </View>
        </View>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Text className={labelClass}>Kraj — datum</Text>
            <TextInput
              value={form.end_date}
              onChangeText={(v) => set("end_date", v)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
              className={inputClass}
              editable={!isBusy}
            />
          </View>
          <View className="flex-1">
            <Text className={labelClass}>Kraj — vrijeme</Text>
            <TextInput
              value={form.end_time}
              onChangeText={(v) => set("end_time", v)}
              placeholder="HH:MM"
              placeholderTextColor="#94a3b8"
              className={inputClass}
              editable={!isBusy}
            />
          </View>
        </View>
        <TouchableOpacity
          onPress={() => void handleAdd()}
          disabled={isBusy || !form.start_date || !form.end_date}
          className="w-full items-center rounded-xl bg-blue-600 py-2.5 disabled:opacity-50"
        >
          <Text className="text-sm font-bold text-white">+ Dodaj dežurstvo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
