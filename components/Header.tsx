import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, useWindowDimensions } from "react-native";
import { Pill, ChevronDown, LogOut, User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AuthUser } from "../lib/auth";

type HeaderProps = {
  user?: AuthUser | null;
  onLoginPress?: () => void;
  onRegisterPress?: () => void;
  onLogoutPress?: () => void;
};

type ButtonLayout = { x: number; y: number; width: number; height: number };

export function Header({ user, onLoginPress, onRegisterPress, onLogoutPress }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [btnLayout, setBtnLayout] = useState<ButtonLayout | null>(null);
  const btnRef = useRef<View>(null);

  const roleLabel = user?.role === "admin" ? "Admin" : "Korisnik";

  const openDropdown = () => {
    btnRef.current?.measureInWindow((x, y, width, height) => {
      setBtnLayout({ x, y, width, height });
      setDropdownOpen(true);
    });
  };

  const dropdownTop = btnLayout ? btnLayout.y + btnLayout.height + 6 : 0;
  const dropdownRight = btnLayout ? screenWidth - btnLayout.x - btnLayout.width : 16;

  return (
    <View
      className="border-b border-gray-100 bg-white"
      style={{ paddingTop: insets.top }}
    >
      <View className="h-16 flex-row items-center justify-between px-4">
        <View className="flex-row items-center gap-2">
          <Pill size={22} color="#3b82f6" />
          <Text className="text-xl font-bold text-gray-900">PharmaTrack</Text>
        </View>

        {user ? (
          <>
            <TouchableOpacity
              ref={btnRef}
              className="flex-row items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5"
              onPress={openDropdown}
            >
              <Text className="text-base font-medium text-slate-700">{roleLabel}</Text>
              <ChevronDown size={18} color="#64748b" />
            </TouchableOpacity>

            <Modal
              visible={dropdownOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setDropdownOpen(false)}
            >
              <Pressable
                className="flex-1"
                onPress={() => setDropdownOpen(false)}
              >
                <View
                  className="absolute rounded-xl border border-slate-200 bg-white"
                  style={{
                    top: dropdownTop,
                    right: dropdownRight,
                    minWidth: 180,
                    shadowColor: "#0f172a",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                >
                  <View className="border-b border-slate-100 px-5 py-4">
                    <View className="flex-row items-center gap-2">
                      <User size={17} color="#94a3b8" />
                      <Text className="text-sm text-slate-400">{roleLabel}</Text>
                    </View>
                    <Text className="mt-1 text-base font-semibold text-slate-800">
                      {user.fullName}
                    </Text>
                  </View>

                  <TouchableOpacity
                    className="flex-row items-center gap-3 px-5 py-4"
                    onPress={() => {
                      setDropdownOpen(false);
                      onLogoutPress?.();
                    }}
                  >
                    <LogOut size={17} color="#ef4444" />
                    <Text className="text-base font-medium text-red-500">Odjava</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Modal>
          </>
        ) : (
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={onLoginPress}
              className="rounded-lg border border-slate-200 px-4 py-2.5"
            >
              <Text className="text-sm font-medium text-slate-700">Prijava</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onRegisterPress}
              className="rounded-lg bg-blue-600 px-4 py-2.5"
            >
              <Text className="text-sm font-medium text-white">Registracija</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
