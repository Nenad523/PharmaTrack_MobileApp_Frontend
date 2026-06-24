import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Plus, X } from "lucide-react-native";
import type { MedicationDetails, MedicationDose } from "../../lib/admin-types";

type Props = {
  medication: MedicationDetails | null;
  doses: MedicationDose[];
  isBusy: boolean;
  onCreateDoses: (strengths: string[]) => Promise<void>;
  onDeleteDose: (doseId: number) => Promise<void>;
};

export function DosesManager({ medication, doses, isBusy, onCreateDoses, onDeleteDose }: Props) {
  const [strengths, setStrengths] = useState("");

  const submit = async () => {
    const values = strengths
      .split(/[\n,]/)
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length === 0) return;
    await onCreateDoses(values);
    setStrengths("");
  };

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-base font-bold text-slate-900">Doze</Text>
      <Text className="mt-0.5 text-xs text-slate-500 mb-3">
        Dodavanje više jačina odjednom za izabrani lijek.
      </Text>

      {!medication ? (
        <View className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <Text className="text-sm text-slate-500">Izaberi lijek da upravljaš dozama.</Text>
        </View>
      ) : (
        <>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {doses.length === 0 && (
              <Text className="text-sm text-slate-500">Nema unesenih doza.</Text>
            )}
            {doses.map((dose) => (
              <View
                key={dose.id}
                className="flex-row items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1"
              >
                <Text className="text-sm font-semibold text-slate-700">{dose.strength}</Text>
                <TouchableOpacity
                  onPress={() => void onDeleteDose(dose.id)}
                  disabled={isBusy}
                  className="rounded p-0.5"
                >
                  <X size={12} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TextInput
            value={strengths}
            onChangeText={setStrengths}
            placeholder="500mg, 1000mg"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 min-h-[72px]"
            textAlignVertical="top"
          />
          <TouchableOpacity
            onPress={() => void submit()}
            disabled={isBusy || strengths.trim().length === 0}
            className="mt-3 flex-row items-center gap-2 self-start rounded-xl border border-blue-200 px-4 py-2.5 disabled:opacity-60"
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#1d4ed8" />
            ) : (
              <Plus size={16} color="#1d4ed8" />
            )}
            <Text className="text-sm font-bold text-blue-700">Dodaj doze</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
