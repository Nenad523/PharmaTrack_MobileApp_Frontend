import { View, Text } from "react-native";
import { Pill } from "lucide-react-native";

const SERVICES = ["Pretraga ljekova", "Dežurne apoteke", "Mapa apoteka"];
const CONTACT = ["info@pharmatrack.me", "+382 20 123 456", "Podgorica, Crna Gora"];

export function Footer() {
  return (
    <View className="border-t border-gray-200 bg-white px-4 py-6">
      <View className="mb-3 flex-row items-center gap-2">
        <Pill size={16} color="#3b82f6" />
        <Text className="text-sm font-bold text-gray-900">PharmaTrack</Text>
      </View>

      <Text className="text-xs leading-6 text-gray-600">
        Brzo pronađite ljekove u apotekama širom Crne Gore. Ažurirani podaci o
        dostupnosti i dežurnim apotekama.
      </Text>

      <View className="mt-5 flex-row gap-6">
        <View className="flex-1">
          <Text className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-900">
            Servisi
          </Text>
          {SERVICES.map((s) => (
            <Text key={s} className="mb-1.5 text-xs text-gray-600">{s}</Text>
          ))}
        </View>

        <View className="flex-1">
          <Text className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-900">
            Kontakt
          </Text>
          {CONTACT.map((s) => (
            <Text key={s} className="mb-1.5 text-xs text-gray-600">{s}</Text>
          ))}
        </View>
      </View>

      <View className="mt-5 border-t border-gray-200 pt-4">
        <Text className="text-center text-[10px] text-gray-500">
          © {new Date().getFullYear()} PharmaTrack. Sva prava zadržana.
        </Text>
      </View>
    </View>
  );
}
