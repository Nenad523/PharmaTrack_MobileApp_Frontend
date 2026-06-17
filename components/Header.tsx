import { View, Text, TouchableOpacity } from "react-native";
import { Pill } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HeaderProps = {
  onLoginPress?: () => void;
};

export function Header({ onLoginPress }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="border-b border-gray-100 bg-white"
      style={{ paddingTop: insets.top }}
    >
      <View className="h-14 flex-row items-center justify-between px-4">
        <View className="flex-row items-center gap-2">
          <Pill size={20} color="#3b82f6" />
          <Text className="text-xl font-bold text-gray-900">PharmaTrack</Text>
        </View>

        <TouchableOpacity
          onPress={onLoginPress}
          className="rounded-lg border border-slate-200 px-3 py-2"
        >
          <Text className="text-sm font-medium text-slate-700">Prijava</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
