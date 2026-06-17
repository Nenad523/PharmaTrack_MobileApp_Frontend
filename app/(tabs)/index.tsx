import { ScrollView, View } from "react-native";
import { Header } from "../../components/Header";
import { HomeFeatures } from "../../components/home/HomeFeatures";
import { HomeHero } from "../../components/home/HomeHero";
import { HomeQuickActions } from "../../components/home/HomeQuickActions";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-white">
      <Header />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        <HomeHero />
        <HomeQuickActions />
        <HomeFeatures />
      </ScrollView>
    </View>
  );
}
