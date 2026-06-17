import { View, Text } from "react-native";
import { features } from "./data";

const SHADOW = {
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
} as const;

export function HomeFeatures() {
  const rows = [features.slice(0, 2), features.slice(2, 4)];

  return (
    <View className="border-t border-slate-100 px-4 pb-10 pt-8">
      <Text className="text-2xl font-bold tracking-tight text-slate-900">
        Kako PharmaTrack funkcioniše
      </Text>

      <View className="mt-5 gap-3">
        {rows.map((row, i) => (
          <View key={i} className="flex-row gap-3">
            {row.map((feature) => {
              const Icon = feature.icon;
              return (
                <View
                  key={feature.title}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white p-5"
                  style={SHADOW}
                >
                  <Icon size={24} color="#2563eb" />
                  <Text className="mt-4 text-base font-semibold text-slate-900">
                    {feature.title}
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-slate-600">
                    {feature.description}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
