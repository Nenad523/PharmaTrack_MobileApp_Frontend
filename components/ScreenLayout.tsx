import { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { Footer } from "./Footer";
import { Header } from "./Header";

type Props = {
  children: ReactNode;
  onLoginPress?: () => void;
  onRegisterPress?: () => void;
};

export function ScreenLayout({ children, onLoginPress, onRegisterPress }: Props) {
  return (
    <View className="flex-1 bg-sky-50">
      <Header onLoginPress={onLoginPress} onRegisterPress={onRegisterPress} />
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
