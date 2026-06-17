import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NewsCard, type NewsItem } from "../components/NewsCard";
import { apiUrl } from "../lib/api";

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    fetch(apiUrl("/api/v1/news?limit=20"))
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((payload) => {
        if (Array.isArray(payload.data)) setNews(payload.data);
      })
      .catch(() => {});
  }, []);

  return (
    <View className="flex-1 bg-sky-50">
      <View
        className="border-b border-gray-100 bg-white"
        style={{ paddingTop: insets.top }}
      >
        <View className="h-14 flex-row items-center gap-3 px-4">
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-gray-900">
            Aktuelnosti iz svijeta zdravlja
          </Text>
        </View>
      </View>

      <FlatList
        data={news}
        keyExtractor={(item) => item.articleId}
        renderItem={({ item }) => <NewsCard item={item} />}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-5">
            <Text className="text-sm leading-6 text-slate-600">
              Vijesti trenutno nijesu dostupne.
            </Text>
          </View>
        }
      />
    </View>
  );
}
