import { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, Linking } from "react-native";
import { ExternalLink } from "lucide-react-native";
import { apiUrl } from "../../lib/api";

type NewsItem = {
  articleId: string;
  title: string;
  description: string | null;
  link: string;
  imageUrl: string | null;
  source: string | null;
  category: string | null;
  publishedAt: string;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sr-Latn-ME", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const SHADOW = {
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
} as const;

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
            <View
              key={item.articleId}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              style={SHADOW}
            >
              {item.imageUrl && (
                <Image
                  source={{ uri: item.imageUrl }}
                  className="h-36 w-full"
                  resizeMode="cover"
                />
              )}

              <View className="p-3">
                <View className="flex-row flex-wrap items-center gap-2">
                  <View className="rounded-full bg-blue-50 px-2.5 py-1">
                    <Text className="text-[11px] font-semibold text-blue-600">
                      {item.category ?? "Zdravlje"}
                    </Text>
                  </View>
                  <Text className="text-[11px] text-slate-400">
                    {formatDate(item.publishedAt)}
                  </Text>
                </View>

                <Text className="mt-1.5 text-[15px] font-semibold leading-5 text-slate-900">
                  {item.title}
                </Text>

                {item.description && (
                  <Text
                    className="mt-1 text-[11px] leading-5 text-slate-500"
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                )}

                <TouchableOpacity
                  className="mt-2 flex-row items-center gap-1.5"
                  onPress={() => Linking.openURL(item.link)}
                >
                  <ExternalLink size={14} color="#64748b" />
                  <Text className="text-[11px] font-medium text-slate-500">
                    {item.source
                      ? `Otvori na ${item.source}`
                      : "Otvori originalnu vijest"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
