import { View, Text } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";

export default function NotificationsScreen() {
  return (
    <ScreenLayout>
      <View className="flex-1 items-center justify-center px-4 py-20">
        <Text className="text-lg font-semibold text-slate-700">Notifikacije</Text>
        <Text className="mt-2 text-sm text-slate-400">Uskoro dostupno.</Text>
      </View>
    </ScreenLayout>
  );
}
