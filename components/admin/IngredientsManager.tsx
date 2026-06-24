import { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Plus, X } from "lucide-react-native";
import type { ActiveIngredient, MedicationDetails } from "../../lib/admin-types";

type Props = {
  medication: MedicationDetails | null;
  ingredients: ActiveIngredient[];
  isBusy: boolean;
  onCreateIngredient: (name: string) => Promise<void>;
  onLinkIngredients: (ids: number[]) => Promise<void>;
  onUnlinkIngredient: (id: number) => Promise<void>;
};

export function IngredientsManager({
  medication,
  ingredients,
  isBusy,
  onCreateIngredient,
  onLinkIngredients,
  onUnlinkIngredient,
}: Props) {
  const [newName, setNewName] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const linkedIds = useMemo(
    () => new Set(medication?.activeIngredients.map((i) => i.id) ?? []),
    [medication]
  );
  const available = useMemo(
    () => ingredients.filter((i) => !linkedIds.has(i.id)),
    [ingredients, linkedIds]
  );

  const toggle = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const submitNew = async () => {
    const name = newName.trim();
    if (name.length < 2) return;
    await onCreateIngredient(name);
    setNewName("");
  };

  const submitLink = async () => {
    if (selectedIds.length === 0) return;
    await onLinkIngredients(selectedIds);
    setSelectedIds([]);
  };

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-base font-bold text-slate-900">Aktivne supstance</Text>
      <Text className="mt-0.5 text-xs text-slate-500 mb-4">
        Kreiranje supstanci i povezivanje sa izabranim lijekom.
      </Text>

      {/* Create new ingredient */}
      <View className="flex-row gap-2 mb-4">
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="Nova aktivna supstanca"
          placeholderTextColor="#94a3b8"
          maxLength={100}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={() => void submitNew()}
          disabled={isBusy || newName.trim().length < 2}
          className="flex-row items-center gap-1.5 rounded-xl border border-emerald-200 px-3 py-2.5 disabled:opacity-60"
        >
          <Plus size={16} color="#047857" />
          <Text className="text-sm font-bold text-emerald-700">Dodaj</Text>
        </TouchableOpacity>
      </View>

      {!medication ? (
        <View className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <Text className="text-sm text-slate-500">Izaberi lijek da dodaš supstance.</Text>
        </View>
      ) : (
        <>
          {/* Linked ingredients */}
          <Text className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
            Povezane supstance
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {medication.activeIngredients.length === 0 && (
              <Text className="text-sm text-slate-500">Nema povezanih supstanci.</Text>
            )}
            {medication.activeIngredients.map((ingredient) => (
              <View
                key={ingredient.id}
                className="flex-row items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1"
              >
                <Text className="text-sm font-semibold text-slate-700">{ingredient.name}</Text>
                <TouchableOpacity
                  onPress={() => void onUnlinkIngredient(ingredient.id)}
                  disabled={isBusy}
                  className="rounded p-0.5"
                >
                  <X size={12} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Available to link */}
          <Text className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
            Dodaj iz liste
          </Text>
          <View className="max-h-44 rounded-xl border border-slate-200 p-1 mb-3">
            <ScrollView nestedScrollEnabled>
              {available.length === 0 ? (
                <View className="px-2 py-3">
                  <Text className="text-sm text-slate-500">Sve dostupne supstance su već povezane.</Text>
                </View>
              ) : (
                available.map((ingredient) => {
                  const checked = selectedIds.includes(ingredient.id);
                  return (
                    <TouchableOpacity
                      key={ingredient.id}
                      onPress={() => toggle(ingredient.id)}
                      className="flex-row items-center gap-2 rounded-lg px-2 py-2.5"
                    >
                      <View
                        className={`h-4 w-4 rounded border items-center justify-center ${
                          checked ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                        }`}
                      >
                        {checked && (
                          <Text className="text-white text-xs leading-none">✓</Text>
                        )}
                      </View>
                      <Text className="text-sm text-slate-700">{ingredient.name}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
          <TouchableOpacity
            onPress={() => void submitLink()}
            disabled={isBusy || selectedIds.length === 0}
            className="flex-row items-center gap-2 self-start rounded-xl border border-blue-200 px-4 py-2.5 disabled:opacity-60"
          >
            <Plus size={16} color="#1d4ed8" />
            <Text className="text-sm font-bold text-blue-700">Poveži supstance</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
