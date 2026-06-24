import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Search } from "lucide-react-native";
import type { MedicationDetails, MedicationSearchResult } from "../../lib/admin-types";

type Props = {
  searchTerm: string;
  results: MedicationSearchResult[];
  selectedMedication: MedicationDetails | null;
  isSearching: boolean;
  onSearchChange: (v: string) => void;
  onSelectMedication: (id: number) => void;
};

export function MedicationSearchPanel({
  searchTerm,
  results,
  selectedMedication,
  isSearching,
  onSearchChange,
  onSelectMedication,
}: Props) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-center justify-between gap-3 mb-3">
        <View>
          <Text className="text-base font-bold text-slate-900">Lijekovi</Text>
          <Text className="mt-0.5 text-xs text-slate-500">Pretraga i izbor lijeka za administraciju.</Text>
        </View>
        {isSearching && <ActivityIndicator size="small" color="#2563eb" />}
      </View>

      <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <Search size={16} color="#94a3b8" />
        <TextInput
          value={searchTerm}
          onChangeText={onSearchChange}
          placeholder="Unesi najmanje 3 karaktera"
          placeholderTextColor="#94a3b8"
          className="flex-1 text-sm text-slate-900"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View className="mt-3 gap-2">
        {searchTerm.trim().length > 0 && searchTerm.trim().length < 3 && (
          <View className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
            <Text className="text-sm text-amber-800">Potrebna su najmanje 3 karaktera.</Text>
          </View>
        )}

        {searchTerm.trim().length >= 3 && !isSearching && results.length === 0 && (
          <View className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <Text className="text-sm text-slate-500">Nema rezultata za ovu pretragu.</Text>
          </View>
        )}

        {results.map((medication) => {
          const isSelected = selectedMedication?.id === medication.id;
          return (
            <TouchableOpacity
              key={medication.id}
              onPress={() => onSelectMedication(medication.id)}
              className={`rounded-xl border px-3 py-3 ${
                isSelected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
              }`}
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                    {medication.name}
                  </Text>
                  <Text className="mt-1 text-xs leading-5 text-slate-500" numberOfLines={2}>
                    {medication.description || "Opis nije unesen."}
                  </Text>
                </View>
                <View className="rounded-md bg-slate-100 px-2 py-1">
                  <Text className="text-xs font-semibold text-slate-600">#{medication.id}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
