import { ReactNode, useState } from "react";
import { ScrollView, View } from "react-native";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { LoginModal } from "./LoginModal";
import { RegisterModal } from "./RegisterModal";
import { useAuth } from "../context/AuthContext";

type Props = {
  children: ReactNode;
};

export function ScreenLayout({ children }: Props) {
  const { user, logout } = useAuth();
  const [loginVisible, setLoginVisible] = useState(false);
  const [registerVisible, setRegisterVisible] = useState(false);

  return (
    <View className="flex-1 bg-sky-50">
      <Header
        user={user}
        onLoginPress={() => setLoginVisible(true)}
        onRegisterPress={() => setRegisterVisible(true)}
        onLogoutPress={logout}
      />
      <ScrollView
        className="bg-sky-50"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={{ flex: 1 }}>{children}</View>
        <Footer />
      </ScrollView>

      <LoginModal
        visible={loginVisible}
        onClose={() => setLoginVisible(false)}
        onSwitchToRegister={() => {
          setLoginVisible(false);
          setRegisterVisible(true);
        }}
      />
      <RegisterModal
        visible={registerVisible}
        onClose={() => setRegisterVisible(false)}
        onSwitchToLogin={() => {
          setRegisterVisible(false);
          setLoginVisible(true);
        }}
      />
    </View>
  );
}
