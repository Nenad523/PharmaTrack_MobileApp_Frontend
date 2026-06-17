import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { NewsCard, type NewsItem } from "../NewsCard";
import { apiUrl } from "../../lib/api";

export function HomeNews() {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    fetch(apiUrl("/api/v1/news?limit=4"))
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((payload) => {
        if (Array.isArray(payload.data)) setNews(payload.data);
      })
      .catch(() => {});
  }, []);

  return (
    <View className="border-t border-slate-100 px-4 py-8">
      <Text className="text-lg font-bold tracking-tight text-slate-800">
        Aktuelnosti iz svijeta zdravlja
      </Text>

      {news.length > 0 ? (
        <View className="mt-4 gap-2.5">
          {news.map((item) => (
            <NewsCard key={item.articleId} item={item} />
          ))}
        </View>
      ) : (
        <View className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-5">
          <Text className="text-sm leading-6 text-slate-600">
            Vijesti trenutno nijesu dostupne. Nakon prvog uspješnog backend
            sinhronizovanja pojaviće se ovdje automatski.
          </Text>
        </View>
      )}
    </View>
  );
}
