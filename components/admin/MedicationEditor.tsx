import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Plus, Save, Trash2 } from "lucide-react-native";
import type { MedicationDetails, MedicationPayload } from "../../lib/admin-types";

type Props = {
  selectedMedication: MedicationDetails | null;
  isBusy: boolean;
  onCreateMedication: (payload: MedicationPayload) => Promise<void>;
  onUpdateMedication: (payload: MedicationPayload) => Promise<void>;
  onDeleteMedication: () => Promise<void>;
};

export function MedicationEditor({
  selectedMedication,
  isBusy,
  onCreateMedication,
  onUpdateMedication,
  onDeleteMedication,
}: Props) {
  const [name, setName] = useState(selectedMedication?.name ?? "");
  const [description, setDescription] = useState(selectedMedication?.description ?? "");

  const submit = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 3) return;
    const payload: MedicationPayload = {
      name: trimmedName,
      description: description.trim() || undefined,
    };
    if (selectedMedication) {
      await onUpdateMedication(payload);
    } else {
      await onCreateMedication(payload);
    }
  };

  const inputClass =
    "mt-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 bg-white";

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-start justify-between gap-3 mb-4">
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900">
            {selectedMedication ? "Izmjena lijeka" : "Novi lijek"}
          </Text>
          <Text className="mt-0.5 text-xs text-slate-500">
            Osnovni podaci koji se čuvaju direktno na lijeku.
          </Text>
        </View>
        {selectedMedication && (
          <View className="rounded-lg bg-slate-100 px-2.5 py-1">
            <Text className="text-xs font-bold text-slate-600">ID {selectedMedication.id}</Text>
          </View>
        )}
      </View>

      <Text className="text-xs font-bold uppercase tracking-wide text-slate-500">Naziv</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Paracetamol Galenika"
        placeholderTextColor="#94a3b8"
        maxLength={100}
        className={inputClass}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Opis</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Opis lijeka, namjena i osnovne napomene."
        placeholderTextColor="#94a3b8"
        maxLength={1000}
        multiline
        numberOfLines={4}
        className={inputClass + " min-h-[88px] leading-6"}
        textAlignVertical="top"
      />

      <View className="mt-4 flex-row flex-wrap gap-2">
        <TouchableOpacity
          onPress={() => void submit()}
          disabled={isBusy || name.trim().length < 3}
          className="flex-row items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 disabled:opacity-60"
        >
          {isBusy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : selectedMedication ? (
            <Save size={16} color="#fff" />
          ) : (
            <Plus size={16} color="#fff" />
          )}
          <Text className="text-sm font-bold text-white">
            {selectedMedication ? "Sačuvaj izmjene" : "Kreiraj lijek"}
          </Text>
        </TouchableOpacity>

        {selectedMedication && (
          <TouchableOpacity
            onPress={() => void onDeleteMedication()}
            disabled={isBusy}
            className="flex-row items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 disabled:opacity-60"
          >
            <Trash2 size={16} color="#be123c" />
            <Text className="text-sm font-bold text-rose-700">Obriši</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
