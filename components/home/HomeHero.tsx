import { View, Text, TouchableOpacity } from "react-native";
import { ArrowRight, Clock3, Pill, Search } from "lucide-react-native";
import { router } from "expo-router";

export function HomeHero() {
  return (
    <View className="items-center px-4 pb-10 pt-14">
      <View
        className="mb-6 h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-white"
        style={{
          shadowColor: "#2563eb",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <Pill size={28} color="#2563eb" />
      </View>

      <Text className="max-w-xs text-center text-3xl font-bold tracking-tight text-slate-900">
        Pronađite ljekove.{" "}
        <Text className="text-blue-600">Brzo i pouzdano.</Text>
      </Text>

      <Text className="mt-4 max-w-sm text-center text-sm leading-6 text-slate-600">
        PharmaTrack vam pomaže da pronađete dostupne ljekove u apotekama širom
        Crne Gore, provjerite dežurne apoteke i budete u toku sa zdravstvenim
        novostima.
      </Text>

      <View className="mt-8 w-full flex-row gap-3">
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3"
          style={{
            shadowColor: "#2563eb",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={() => router.push("/(tabs)/medications")}
        >
          <Search size={16} color="white" />
          <Text className="text-sm font-semibold text-white">Pretraga</Text>
          <ArrowRight size={16} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
          onPress={() => router.push("/(tabs)/duty")}
        >
          <Clock3 size={16} color="#374151" />
          <Text className="text-sm font-semibold text-slate-700">Dežurne</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
