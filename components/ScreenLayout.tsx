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
    <View className="flex-1 bg-sky-50">
      <Header onLoginPress={onLoginPress} />
      <ScrollView
        className="bg-sky-50"
        showsVerticalScrollIndicator={false}
      >
        {children}
        <Footer />
      </ScrollView>
    </View>
  );
}
