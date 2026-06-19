import { View, Text, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ArrowLeft, Search } from "lucide-react-native";

export default function PharmacySearchScreen() {
  const { medicineName } = useLocalSearchParams<{
    medicineId: string;
    medicineName: string;
    doseIds: string;
    doseStrengths: string;
  }>();

  return (
    <View className="flex-1 bg-sky-50">
      {/* Header */}
      <View className="bg-white border-b border-slate-100 px-4 pt-14 pb-4 flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
        >
          <ArrowLeft size={18} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xs text-slate-500">Pretraga apoteka</Text>
          <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
            {medicineName}
          </Text>
        </View>
      </View>

      {/* Placeholder */}
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <View className="h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-white"
          style={{
            shadowColor: "#2563eb",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Search size={28} color="#2563eb" />
        </View>
        <Text className="text-xl font-bold text-slate-900">Pretraga apoteka</Text>
        <Text className="text-center text-sm leading-6 text-slate-500">
          Ova stranica će prikazivati apoteke u kojima je dostupan lijek{" "}
          <Text className="font-semibold text-slate-700">{medicineName}</Text>.
        </Text>
      </View>
    </View>
  );
}
