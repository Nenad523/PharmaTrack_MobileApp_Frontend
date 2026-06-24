import { useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ChevronDown, Trash2 } from "lucide-react-native";
import type { City, PharmacyDetails, PharmacyPayload } from "../../lib/admin-types";

type Props = {
  selectedPharmacy: PharmacyDetails | null;
  cities: City[];
  isBusy: boolean;
  onCreatePharmacy: (payload: PharmacyPayload) => Promise<void>;
  onUpdatePharmacy: (payload: Partial<PharmacyPayload>) => Promise<void>;
  onDeletePharmacy: () => Promise<void>;
};

const empty = { name: "", address: "", latitude: "", longitude: "", city_id: "" };

function mapToForm(p: PharmacyDetails) {
  return {
    name: p.name,
    address: p.address,
    latitude: String(p.latitude),
    longitude: String(p.longitude),
    city_id: String(p.city_id),
  };
}

export function PharmacyEditor({
  selectedPharmacy,
  cities,
  isBusy,
  onCreatePharmacy,
  onUpdatePharmacy,
  onDeletePharmacy,
}: Props) {
  const [form, setForm] = useState(() => (selectedPharmacy ? mapToForm(selectedPharmacy) : empty));
  const [cityPickerVisible, setCityPickerVisible] = useState(false);

  const set = (field: keyof typeof empty, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const selectedCity = cities.find((c) => String(c.id) === form.city_id);

  const submit = async () => {
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    const cityId = parseInt(form.city_id, 10);
    if (!form.name.trim() || !form.address.trim() || isNaN(lat) || isNaN(lng) || isNaN(cityId))
      return;
    const payload: PharmacyPayload = {
      name: form.name.trim(),
      address: form.address.trim(),
      latitude: lat,
      longitude: lng,
      city_id: cityId,
    };
    if (selectedPharmacy) {
      await onUpdatePharmacy(payload);
    } else {
      await onCreatePharmacy(payload);
    }
  };

  const inputClass = "mt-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 bg-white";
  const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-base font-bold text-slate-900 mb-0.5">
        {selectedPharmacy ? "Izmjena apoteke" : "Nova apoteka"}
      </Text>
      <Text className="text-xs text-slate-500 mb-4">
        {selectedPharmacy
          ? `Izmjena podataka za: ${selectedPharmacy.name}`
          : "Osnovni podaci koji se čuvaju direktno na apoteci."}
      </Text>

      <Text className={labelClass}>Naziv</Text>
      <TextInput
        value={form.name}
        onChangeText={(v) => set("name", v)}
        placeholder="Apoteka Zdravlje"
        placeholderTextColor="#94a3b8"
        className={inputClass}
        editable={!isBusy}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text className={labelClass + " mt-3"}>Adresa</Text>
      <TextInput
        value={form.address}
        onChangeText={(v) => set("address", v)}
        placeholder="Bulevar Svetog Petra 12, Podgorica"
        placeholderTextColor="#94a3b8"
        className={inputClass}
        editable={!isBusy}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View className="mt-3 flex-row gap-3">
        <View className="flex-1">
          <Text className={labelClass}>Geog. širina</Text>
          <TextInput
            value={form.latitude}
            onChangeText={(v) => set("latitude", v)}
            placeholder="42.4413"
            placeholderTextColor="#94a3b8"
            keyboardType="decimal-pad"
            className={inputClass}
            editable={!isBusy}
          />
        </View>
        <View className="flex-1">
          <Text className={labelClass}>Geog. dužina</Text>
          <TextInput
            value={form.longitude}
            onChangeText={(v) => set("longitude", v)}
            placeholder="19.2629"
            placeholderTextColor="#94a3b8"
            keyboardType="decimal-pad"
            className={inputClass}
            editable={!isBusy}
          />
        </View>
      </View>

      <Text className={labelClass + " mt-3"}>Grad</Text>
      <TouchableOpacity
        onPress={() => setCityPickerVisible(true)}
        disabled={isBusy || cities.length === 0}
        className="mt-1 flex-row items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 bg-white disabled:opacity-50"
      >
        <Text className={`text-sm ${selectedCity ? "text-slate-900" : "text-slate-400"}`}>
          {selectedCity ? selectedCity.name : "— Izaberi grad —"}
        </Text>
        <ChevronDown size={16} color="#94a3b8" />
      </TouchableOpacity>

      <View className="mt-4 flex-row gap-2">
        <TouchableOpacity
          onPress={() => void submit()}
          disabled={isBusy}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 disabled:opacity-50"
        >
          {isBusy && <ActivityIndicator size="small" color="#fff" />}
          <Text className="text-sm font-bold text-white">
            {selectedPharmacy ? "Sačuvaj izmjene" : "+ Kreiraj apoteku"}
          </Text>
        </TouchableOpacity>

        {selectedPharmacy && (
          <TouchableOpacity
            onPress={() => void onDeletePharmacy()}
            disabled={isBusy}
            className="rounded-xl border border-rose-200 px-3 py-2.5 disabled:opacity-50"
          >
            <Trash2 size={16} color="#be123c" />
          </TouchableOpacity>
        )}
      </View>

      {/* City picker modal */}
      <Modal visible={cityPickerVisible} transparent animationType="slide">
        <TouchableOpacity
          className="flex-1 bg-black/30"
          activeOpacity={1}
          onPress={() => setCityPickerVisible(false)}
        />
        <View className="rounded-t-3xl bg-white pb-8">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100">
            <Text className="text-base font-bold text-slate-900">Izaberi grad</Text>
            <TouchableOpacity onPress={() => setCityPickerVisible(false)}>
              <Text className="text-sm font-semibold text-blue-600">Zatvori</Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="max-h-72">
            {cities.map((city) => (
              <TouchableOpacity
                key={city.id}
                onPress={() => {
                  set("city_id", String(city.id));
                  setCityPickerVisible(false);
                }}
                className={`px-4 py-3 border-b border-slate-50 ${
                  String(city.id) === form.city_id ? "bg-blue-50" : ""
                }`}
              >
                <Text
                  className={`text-sm ${
                    String(city.id) === form.city_id
                      ? "font-bold text-blue-700"
                      : "text-slate-700"
                  }`}
                >
                  {city.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
