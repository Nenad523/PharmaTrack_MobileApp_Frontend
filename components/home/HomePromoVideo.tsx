import { useRef } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { Video, ResizeMode } from "expo-av";

const VIDEO_URL = process.env.EXPO_PUBLIC_HOME_PROMO_VIDEO_URL;

export function HomePromoVideo() {
  const videoRef = useRef<Video>(null);
  const { width } = useWindowDimensions();
  const videoWidth = width - 32; // px-4 on both sides
  const videoHeight = videoWidth * (9 / 16);

  if (!VIDEO_URL) return null;

  return (
    <View className="border-t border-slate-100 bg-white px-4 pb-10 pt-8">
      <Text className="text-2xl font-extrabold tracking-tight text-slate-900">
        Pogledajte PharmaTrack u akciji
      </Text>
      <Text className="mt-2 text-xs leading-6 text-slate-600">
        Kratak prikaz kako aplikacija pomaže korisnicima da brže pronađu
        informacije o ljekovima i apotekama.
      </Text>

      <View
        className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950"
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <Video
          ref={videoRef}
          source={{ uri: VIDEO_URL }}
          style={{ width: videoWidth, height: videoHeight }}
          resizeMode={ResizeMode.COVER}
          useNativeControls
          shouldPlay={false}
        />
      </View>
    </View>
  );
}
