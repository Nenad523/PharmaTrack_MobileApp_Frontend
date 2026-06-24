import {
  Modal,
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
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
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1">
        {/* Tappable backdrop at the top */}
        <Pressable className="bg-black/50" style={{ flex: 0.4 }} onPress={onClose} />

        {/* Sheet — fills from here to bottom */}
        <View className="rounded-t-3xl bg-white" style={{ flex: 3 }}>
          {/* Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="h-1 w-10 rounded-full bg-slate-200" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-100">
            <Text className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              Detalji lijeka
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white"
            >
              <X size={15} color="#64748b" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center gap-3">
              <ActivityIndicator color="#2563eb" size="large" />
              <Text className="text-sm text-slate-500">Učitavanje detalja...</Text>
            </View>
          ) : medicine ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 40 }}
            >
              <Text className="text-center text-2xl font-bold text-slate-900">
                {medicine.name}
              </Text>

              {medicine.img_url ? (
                <Image
                  source={{ uri: medicine.img_url }}
                  className="h-40 w-full rounded-2xl"
                  resizeMode="contain"
                />
              ) : null}

              {medicine.doses.length > 0 && (
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-slate-900">Dostupne doze</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {medicine.doses.map((dose, i) => (
                      <View
                        key={`${dose}-${i}`}
                        className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1"
                      >
                        <Text className="text-sm font-semibold text-emerald-700">{dose}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View className="gap-2">
                <Text className="text-sm font-semibold text-slate-900">Opis</Text>
                <Text className="text-sm leading-6 text-slate-600">{medicine.description}</Text>
              </View>

              <View className="gap-2">
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
                    <Text className="text-sm leading-6 text-slate-600">
                      Prikazane informacije služe isključivo u informativne svrhe i ne
                      predstavljaju zamjenu za savjet ljekara ili farmaceuta.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
