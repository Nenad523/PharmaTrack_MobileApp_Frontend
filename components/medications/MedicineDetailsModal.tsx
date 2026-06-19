import {
  Modal,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { X, AlertTriangle } from "lucide-react-native";
import { MedicineDetails } from "../../lib/medication-types";

type Props = {
  visible: boolean;
  loading: boolean;
  medicine: MedicineDetails | null;
  onClose: () => void;
};

export function MedicineDetailsModal({ visible, loading, medicine, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        <View className="flex-row items-center justify-between border-b border-slate-100 px-6 py-5">
          <Text className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Detalji lijeka
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
          >
            <X size={16} color="#64748b" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center gap-3">
            <ActivityIndicator color="#2563eb" size="large" />
            <Text className="text-sm text-slate-500">Učitavanje detalja...</Text>
          </View>
        ) : medicine ? (
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="px-6 py-5 gap-6">
              <Text className="text-center text-2xl font-bold text-slate-900">
                {medicine.name}
              </Text>

              {medicine.img_url ? (
                <Image
                  source={{ uri: medicine.img_url }}
                  className="h-44 w-full rounded-2xl"
                  resizeMode="contain"
                />
              ) : null}

              {medicine.doses.length > 0 && (
                <View className="gap-3">
                  <Text className="text-sm font-semibold text-slate-900">Dostupne doze</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {medicine.doses.map((dose, i) => (
                      <View
                        key={`${dose}-${i}`}
                        className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1"
                      >
                        <Text className="text-xs font-semibold text-emerald-700">{dose}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View className="gap-2">
                <Text className="text-sm font-semibold text-slate-900">Opis</Text>
                <Text className="text-sm leading-7 text-slate-600">{medicine.description}</Text>
              </View>

              <View className="gap-3">
                <Text className="text-sm font-semibold text-slate-900">Aktivne supstance</Text>
                {medicine.activeIngredients.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {medicine.activeIngredients.map((ing) => (
                      <View
                        key={ing.id}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1"
                      >
                        <Text className="text-sm font-medium text-slate-700">{ing.name}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="text-sm text-slate-500">Nije dostupno.</Text>
                )}
              </View>

              <View className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <View className="flex-row items-start gap-3">
                  <View className="rounded-xl bg-white/80 p-2">
                    <AlertTriangle size={16} color="#f59e0b" />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-sm font-semibold text-slate-900">Informativni prikaz</Text>
                    <Text className="text-sm leading-6 text-slate-700">
                      Prikazane informacije služe isključivo u informativne svrhe i ne
                      predstavljaju zamjenu za savjet ljekara ili farmaceuta.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}
