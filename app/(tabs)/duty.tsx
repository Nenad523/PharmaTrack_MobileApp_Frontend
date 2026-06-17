import { View, Text } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";

export default function DutyScreen() {
  return (
    <ScreenLayout>
      <View className="items-center justify-center py-20">
        <Text className="text-slate-500">Dežurne apoteke — uskoro</Text>
      </View>
    </ScreenLayout>
  );
}
