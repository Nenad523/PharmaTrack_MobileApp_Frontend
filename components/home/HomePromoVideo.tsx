import { useRef } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { Video, ResizeMode } from "expo-av";

const VIDEO_URL = process.env.EXPO_PUBLIC_HOME_PROMO_VIDEO_URL;

export function HomePromoVideo() {
  const videoRef = useRef<Video>(null);
  const { width } = useWindowDimensions();
  const videoWidth = width - 32; // px-4 on both sides
  const videoHeight = videoWidth * (11 / 16);

  if (!VIDEO_URL) return null;

  return (
    <View className="border-t border-slate-100 bg-white px-4 pb-10 pt-8">
      <Text className="text-3xl font-extrabold tracking-tight text-slate-900">
        Pogledajte PharmaTrack u akciji
      </Text>
      <Text className="mt-3 text-base leading-7 text-slate-600">
        Kratak prikaz kako aplikacija pomaže korisnicima da brže pronađu
        informacije o ljekovima i apotekama.
      </Text>

      <Video
        ref={videoRef}
        source={{ uri: VIDEO_URL }}
        style={{
          width: videoWidth,
          height: videoHeight,
          marginTop: 16,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: "#e2e8f0",
        }}
        resizeMode={ResizeMode.COVER}
        useNativeControls
        shouldPlay={false}
      />
    </View>
  );
}
