import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from "react-native";

import { Mail, Lock, X } from "lucide-react-native";
import { apiUrl } from "../lib/api";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
};

type Errors = { email?: string; password?: string };

const getErrorMessage = async (res: Response): Promise<string> => {
  try {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const data = await res.json();
      return data?.error?.message ?? data?.message ?? "Greška pri prijavi";
    }
    return (await res.text()) || "Greška pri prijavi";
  } catch {
    return "Greška pri prijavi";
  }
};

export function LoginModal({ visible, onClose, onSwitchToRegister }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setErrors({});
    setGeneralError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSwitch = () => {
    resetForm();
    onSwitchToRegister();
  };

  const validate = (): boolean => {
    const newErrors: Errors = {};
    const trimmed = email.trim();
    if (!trimmed) newErrors.email = "Email adresa je obavezna.";
    else if (!/\S+@\S+\.\S+/.test(trimmed))
      newErrors.email = "Unesite ispravnu email adresu.";
    if (!password) newErrors.password = "Lozinka je obavezna.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setGeneralError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/auth/login"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        setGeneralError(await getErrorMessage(res));
        return;
      }
      handleClose();
    } catch {
      setGeneralError("Došlo je do greške. Pokušajte ponovo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable className="flex-1 bg-black/60" onPress={handleClose}>
          <View
            className="mt-auto rounded-t-3xl bg-white px-6 pb-10 pt-6"
            onStartShouldSetResponder={() => true}
          >
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-2xl font-bold text-gray-900">
                Prijavite se
              </Text>
              <TouchableOpacity onPress={handleClose} hitSlop={12}>
                <X size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {generalError ? (
              <Text className="mb-3 text-center text-sm text-red-500">
                {generalError}
              </Text>
            ) : null}

            <View className="mb-4">
              <Text className="mb-1.5 text-sm font-medium text-slate-700">
                Email adresa
              </Text>
              <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <Mail size={18} color="#94a3b8" />
                <TextInput
                  className="ml-2.5 flex-1 text-sm text-slate-900"
                  placeholder="email@gmail.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setErrors((p) => ({ ...p, email: undefined }));
                    setGeneralError("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
              {errors.email ? (
                <Text className="mt-1 text-xs text-red-500">
                  {errors.email}
                </Text>
              ) : null}
            </View>

            <View className="mb-6">
              <Text className="mb-1.5 text-sm font-medium text-slate-700">
                Lozinka
              </Text>
              <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <Lock size={18} color="#94a3b8" />
                <TextInput
                  className="ml-2.5 flex-1 text-sm text-slate-900"
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setErrors((p) => ({ ...p, password: undefined }));
                    setGeneralError("");
                  }}
                  secureTextEntry
                  editable={!loading}
                />
              </View>
              {errors.password ? (
                <Text className="mt-1 text-xs text-red-500">
                  {errors.password}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              className="items-center rounded-xl bg-blue-600 py-3.5"
              onPress={handleSubmit}
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-sm font-semibold text-white">
                  Prijavi se
                </Text>
              )}
            </TouchableOpacity>

            <Text className="mt-4 text-center text-sm text-gray-500">
              Nemate nalog?{" "}
              <Text
                className="font-semibold text-blue-600"
                onPress={handleSwitch}
              >
                Registrujte se
              </Text>
            </Text>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
