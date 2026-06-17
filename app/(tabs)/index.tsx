import { ScreenLayout } from "../../components/ScreenLayout";
import { HomeFeatures } from "../../components/home/HomeFeatures";
import { HomeHero } from "../../components/home/HomeHero";
import { HomeNews } from "../../components/home/HomeNews";
import { HomePromoVideo } from "../../components/home/HomePromoVideo";
import { HomeQuickActions } from "../../components/home/HomeQuickActions";

export default function HomeScreen() {
  return (
    <ScreenLayout>
      <HomeHero />
      <HomeQuickActions />
      <HomeFeatures />
      <HomePromoVideo />
      <HomeNews />
    </ScreenLayout>
  );
}
