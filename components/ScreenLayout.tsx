import { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { Footer } from "./Footer";
import { Header } from "./Header";

type Props = {
  children: ReactNode;
  onLoginPress?: () => void;
};

export function ScreenLayout({ children, onLoginPress }: Props) {
  return (
    <View className="flex-1 bg-white">
      <Header onLoginPress={onLoginPress} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {children}
        <Footer />
      </ScrollView>
    </View>
  );
}
