import { View, Text } from "react-native";
import { ScreenLayout } from "../../components/ScreenLayout";

export default function MedicationsScreen() {
  return (
    <ScreenLayout>
      <View className="items-center justify-center py-20">
        <Text className="text-slate-500">Pretraga ljekova — uskoro</Text>
      </View>
    </ScreenLayout>
  );
}
