import { useState } from "react";
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native";
import { ImageUp } from "lucide-react-native";
import type { MedicationDetails } from "../../lib/admin-types";

type Props = {
  medication: MedicationDetails | null;
  isBusy: boolean;
  onUploadImage: (uri: string) => Promise<void>;
};

export function ImageUploadPanel({ medication, isBusy, onUploadImage }: Props) {
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const pickImage = async () => {
    setPicking(true);
    try {
      // Dynamic import so the module is only loaded on native
      const ImagePicker = await import("expo-image-picker");
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.9,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        setPendingUri(result.assets[0].uri);
      }
    } catch {
      // expo-image-picker not available (e.g. web preview)
    } finally {
      setPicking(false);
    }
  };

  const upload = async () => {
    if (!pendingUri) return;
    await onUploadImage(pendingUri);
    setPendingUri(null);
  };

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-base font-bold text-slate-900">Slika lijeka</Text>
      <Text className="mt-0.5 text-xs text-slate-500 mb-3">
        Upload slike koristi naziv izabranog lijeka.
      </Text>

      {!medication ? (
        <View className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <Text className="text-sm text-slate-500">Izaberi lijek prije upload-a slike.</Text>
        </View>
      ) : (
        <>
          <View className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {medication.img_url ? (
              <Image
                source={{ uri: medication.img_url }}
                className="h-40 w-full"
                resizeMode="cover"
              />
            ) : (
              <View className="h-40 items-center justify-center">
                <Text className="text-sm font-medium text-slate-500">Slika nije dodata.</Text>
              </View>
            )}
          </View>

          {pendingUri && (
            <View className="mb-3 overflow-hidden rounded-xl border border-blue-200">
              <Image source={{ uri: pendingUri }} className="h-40 w-full" resizeMode="cover" />
            </View>
          )}

          <View className="flex-row flex-wrap gap-2">
            <TouchableOpacity
              onPress={() => void pickImage()}
              disabled={isBusy || picking}
              className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 disabled:opacity-60"
            >
              {picking ? (
                <ActivityIndicator size="small" color="#475569" />
              ) : (
                <ImageUp size={16} color="#475569" />
              )}
              <Text className="text-sm font-bold text-slate-700">
                {pendingUri ? "Promijeni" : "Odaberi sliku"}
              </Text>
            </TouchableOpacity>

            {pendingUri && (
              <TouchableOpacity
                onPress={() => void upload()}
                disabled={isBusy}
                className="flex-row items-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 disabled:opacity-60"
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color="#1d4ed8" />
                ) : (
                  <ImageUp size={16} color="#1d4ed8" />
                )}
                <Text className="text-sm font-bold text-blue-700">Upload slike</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}
