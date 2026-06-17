import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { quickActions } from "./data";

const SHADOW = {
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
} as const;

export function HomeQuickActions() {
  const rows = [quickActions.slice(0, 2), quickActions.slice(2, 4)];

  return (
    <View className="gap-3 px-4 pb-6 pt-2">
      {rows.map((row, i) => (
        <View key={i} className="flex-row gap-3">
          {row.map((action) => {
            const Icon = action.icon;

            if (action.locked) {
              return (
                <View
                  key={action.title}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 opacity-60"
                >
                  <View className="flex-row items-start justify-between">
                    <Icon size={22} color="#94a3b8" />
                    <View className="rounded-full bg-slate-100 px-2.5 py-1">
                      <Text className="text-xs font-medium text-slate-500">
                        Prijava
                      </Text>
                    </View>
                  </View>
                  <Text className="mt-4 text-base font-semibold text-slate-900">
                    {action.title}
                  </Text>
                  <Text className="mt-1.5 text-sm leading-5 text-slate-500">
                    {action.description}
                  </Text>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={action.title}
                className="flex-1 rounded-2xl border border-slate-200 bg-white p-5"
                style={SHADOW}
                onPress={() => router.push(action.href as never)}
              >
                <Icon size={22} color="#2563eb" />
                <Text className="mt-4 text-base font-semibold text-slate-900">
                  {action.title}
                </Text>
                <Text className="mt-1.5 text-sm leading-5 text-slate-500">
                  {action.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}
