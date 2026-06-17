import { ScrollView, View } from "react-native";
import { Header } from "../../components/Header";
import { HomeHero } from "../../components/home/HomeHero";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-white">
      <Header />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <HomeHero />
      </ScrollView>
    </View>
  );
}
