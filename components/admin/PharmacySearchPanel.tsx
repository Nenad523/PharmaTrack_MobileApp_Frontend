import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Search } from "lucide-react-native";
import type { PharmacyDetails, PharmacySearchResult } from "../../lib/admin-types";

type Props = {
  searchTerm: string;
  results: PharmacySearchResult[];
  selectedPharmacy: PharmacyDetails | null;
  isSearching: boolean;
  onSearchChange: (v: string) => void;
  onSelectPharmacy: (id: number) => void;
};

export function PharmacySearchPanel({
  searchTerm,
  results,
  selectedPharmacy,
  isSearching,
  onSearchChange,
  onSelectPharmacy,
}: Props) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-center justify-between gap-3 mb-3">
        <View>
          <Text className="text-base font-bold text-slate-900">Apoteke</Text>
          <Text className="mt-0.5 text-xs text-slate-500">Pretraga i izbor apoteke za administraciju.</Text>
        </View>
        {isSearching && <ActivityIndicator size="small" color="#2563eb" />}
      </View>

      <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <Search size={16} color="#94a3b8" />
        <TextInput
          value={searchTerm}
          onChangeText={onSearchChange}
          placeholder="Unesi naziv apoteke..."
          placeholderTextColor="#94a3b8"
          className="flex-1 text-sm text-slate-900"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View className="mt-3 gap-2">
        {!isSearching && searchTerm.trim().length >= 2 && results.length === 0 && (
          <View className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <Text className="text-sm text-slate-500">Nema rezultata za &quot;{searchTerm}&quot;.</Text>
          </View>
        )}

        {results.map((pharmacy) => {
          const isSelected = selectedPharmacy?.id === pharmacy.id;
          return (
            <TouchableOpacity
              key={pharmacy.id}
              onPress={() => onSelectPharmacy(pharmacy.id)}
              className={`rounded-xl border px-3 py-3 ${
                isSelected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
              }`}
            >
              <Text
                className={`text-sm font-bold ${isSelected ? "text-blue-700" : "text-slate-900"}`}
              >
                {pharmacy.name}
              </Text>
              <Text className="mt-0.5 text-xs text-slate-400">{pharmacy.address}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
