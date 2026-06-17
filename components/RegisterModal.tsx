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
  ScrollView,
} from "react-native";
import { User, Mail, Lock, X } from "lucide-react-native";
import { apiUrl } from "../lib/api";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
};

type Errors = { fullName?: string; email?: string; password?: string };

const validatePassword = (pwd: string): string | null => {
  if (pwd.length < 12) return "Lozinka mora imati najmanje 12 karaktera.";
  if (!/[A-Z]/.test(pwd)) return "Lozinka mora sadržavati najmanje jedno VELIKO slovo.";
  if (!/[a-z]/.test(pwd)) return "Lozinka mora sadržavati najmanje jedno malo slovo.";
  if (!/[0-9]/.test(pwd)) return "Lozinka mora sadržavati najmanje jedan broj.";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd))
    return "Lozinka mora sadržavati najmanje jedan specijalni karakter.";
  return null;
};

const getErrorMessage = async (res: Response): Promise<string> => {
  try {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const data = await res.json();
      return data?.error?.message ?? data?.message ?? "Greška pri registraciji";
    }
    return (await res.text()) || "Greška pri registraciji";
  } catch {
    return "Greška pri registraciji";
  }
};

export function RegisterModal({ visible, onClose, onSwitchToLogin }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setErrors({});
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSwitch = () => {
    resetForm();
    onSwitchToLogin();
  };

  const validate = (): boolean => {
    const newErrors: Errors = {};
    if (!fullName.trim()) newErrors.fullName = "Ime i prezime je obavezno.";
    const trimmedEmail = email.trim();
    if (!trimmedEmail) newErrors.email = "Email adresa je obavezna.";
    else if (!/\S+@\S+\.\S+/.test(trimmedEmail))
      newErrors.email = "Unesite ispravnu email adresu.";
    if (!password) newErrors.password = "Lozinka je obavezna.";
    else {
      const pwdError = validatePassword(password);
      if (pwdError) newErrors.password = pwdError;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/auth/register"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
        }),
      });
      if (!res.ok) {
        const msg = await getErrorMessage(res);
        setErrors({ email: msg });
        return;
      }
      setSuccess(true);
    } catch {
      setErrors({ email: "Došlo je do greške. Pokušajte ponovo." });
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
          <Pressable
            className="mt-auto rounded-t-3xl bg-white px-6 pb-10 pt-6"
            onPress={() => {}}
          >
            <TouchableOpacity
              className="absolute right-5 top-5"
              onPress={handleClose}
            >
              <X size={20} color="#9ca3af" />
            </TouchableOpacity>

            <Text className="mb-6 text-center text-2xl font-bold text-gray-900">
              Kreirajte nalog
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {success ? (
                <View className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                  <Text className="text-center font-semibold text-green-700">
                    Nalog kreiran.
                  </Text>
                  <Text className="mt-1 text-center text-sm text-green-600">
                    Posjetite svoj gmail nalog za verifikaciju.
                  </Text>
                </View>
              ) : null}

              <View className="mb-4">
                <Text className="mb-1.5 text-sm font-medium text-slate-700">
                  Ime i Prezime
                </Text>
                <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <User size={18} color="#94a3b8" />
                  <TextInput
                    className="ml-2.5 flex-1 text-sm text-slate-900"
                    placeholder="Vaše ime i prezime"
                    placeholderTextColor="#94a3b8"
                    value={fullName}
                    onChangeText={(v) => {
                      setFullName(v);
                      setErrors((p) => ({ ...p, fullName: undefined }));
                    }}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
                {errors.fullName ? (
                  <Text className="mt-1 text-xs text-red-500">
                    {errors.fullName}
                  </Text>
                ) : null}
              </View>

              <View className="mb-4">
                <Text className="mb-1.5 text-sm font-medium text-slate-700">
                  Email Adresa
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
                disabled={loading || success}
                style={{ opacity: loading || success ? 0.7 : 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-white">
                    {success ? "Registracija uspješna" : "Registruj se"}
                  </Text>
                )}
              </TouchableOpacity>

              <Text className="mt-4 text-center text-sm text-gray-500">
                Već imate nalog?{" "}
                <Text
                  className="font-semibold text-blue-600"
                  onPress={handleSwitch}
                >
                  Prijavite se
                </Text>
              </Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
