import { View, Text, TouchableOpacity } from "react-native";
import { Pill, LogOut } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AuthUser } from "../lib/auth";

type HeaderProps = {
  user?: AuthUser | null;
  onLoginPress?: () => void;
  onRegisterPress?: () => void;
  onLogoutPress?: () => void;
};

export function Header({ user, onLoginPress, onRegisterPress, onLogoutPress }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="border-b border-gray-100 bg-white"
      style={{ paddingTop: insets.top }}
    >
      <View className="h-16 flex-row items-center justify-between px-4">
        <View className="flex-row items-center gap-2">
          <Pill size={22} color="#3b82f6" />
          <Text className="text-xl font-bold text-gray-900">PharmaTrack</Text>
        </View>

        {user ? (
          <View className="flex-row items-center gap-3">
            <Text className="text-sm font-medium text-slate-600" numberOfLines={1}>
              {user.fullName.split(" ")[0]}
            </Text>
            <TouchableOpacity
              onPress={onLogoutPress}
              className="rounded-lg border border-slate-200 p-2.5"
            >
              <LogOut size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={onLoginPress}
              className="rounded-lg border border-slate-200 px-4 py-2.5"
            >
              <Text className="text-sm font-medium text-slate-700">Prijava</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onRegisterPress}
              className="rounded-lg bg-blue-600 px-4 py-2.5"
            >
              <Text className="text-sm font-medium text-white">Registracija</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
