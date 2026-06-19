import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Bell, BellOff, CheckCircle2, Clock, Mail, Trash2 } from "lucide-react-native";
import { ScreenLayout } from "../../components/ScreenLayout";
import { apiUrl } from "../../lib/api";
import { authHeader } from "../../lib/auth";
import { useAuth } from "../../context/AuthContext";

type NotificationItem = {
  id: number;
  dose_id: number;
  medication_name: string;
  strength: string;
  is_notified: number;
  created_at: string;
};

const CARD_SHADOW = {
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
} as const;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("sr-Latn-ME", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [emailEnabled, setEmailEnabled] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const headers = await authHeader();
      const res = await fetch(apiUrl("/api/v1/notifications"), { headers });
      if (!res.ok) return;
      const data = (await res.json()) as { data: NotificationItem[] };
      const list = Array.isArray(data.data) ? data.data : [];
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const handleUnsubscribe = async (id: number) => {
    setDeletingId(id);
    try {
      const headers = await authHeader();
      const res = await fetch(apiUrl(`/api/v1/notifications/${id}`), {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setItems((prev) => prev.filter((n) => n.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) {
    return (
      <ScreenLayout>
        <View className="flex-1 items-center justify-center px-8 py-20">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
            <BellOff size={28} color="#94a3b8" />
          </View>
          <Text className="text-center text-lg font-semibold text-slate-700">
            Prijavite se
          </Text>
          <Text className="mt-2 text-center text-sm leading-6 text-slate-400">
            Da biste koristili notifikacije, morate biti prijavljeni.
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View className="px-4 pt-6 pb-10 gap-4">
        {/* Header card */}
        <View
          className="rounded-3xl border border-blue-200/90 bg-white p-6"
          style={CARD_SHADOW}
        >
          <View
            className="mb-5 h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-white"
            style={{
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Bell size={32} color="#2563eb" />
          </View>
          <Text className="text-4xl font-bold tracking-tight text-slate-900">
            Notifikacije
          </Text>
          <Text className="mt-3 text-base leading-7 text-slate-600">
            Primajte obavještenja čim željeni lijek postane dostupan u apoteci.
          </Text>
        </View>

        {/* Channels card */}
        <View
          className="rounded-3xl border border-slate-200 bg-white p-5"
          style={CARD_SHADOW}
        >
          <Text className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
            Kanali obavještavanja
          </Text>

          {/* Email toggle */}
          <View className="flex-row items-center justify-between py-3 border-b border-slate-100">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <Mail size={17} color="#2563eb" />
              </View>
              <View>
                <Text className="text-sm font-semibold text-slate-800">
                  Email obavještenja
                </Text>
                <Text className="text-xs text-slate-400">
                  Slanje na {user.email}
                </Text>
              </View>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              trackColor={{ false: "#e2e8f0", true: "#bfdbfe" }}
              thumbColor={emailEnabled ? "#2563eb" : "#94a3b8"}
            />
          </View>

          {/* Push toggle — placeholder */}
          <View className="flex-row items-center justify-between py-3 opacity-50">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                <Bell size={17} color="#64748b" />
              </View>
              <View>
                <Text className="text-sm font-semibold text-slate-800">
                  Push obavještenja
                </Text>
                <Text className="text-xs text-slate-400">Uskoro dostupno</Text>
              </View>
            </View>
            <Switch
              value={false}
              disabled
              trackColor={{ false: "#e2e8f0", true: "#bfdbfe" }}
              thumbColor="#94a3b8"
            />
          </View>
        </View>

        {/* Subscriptions list */}
        <View>
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Moje pretplate
              {!loading && items.length > 0 && (
                <Text className="text-blue-500">{"  "}{items.length}</Text>
              )}
            </Text>
          </View>

          {loading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#2563eb" />
            </View>
          ) : items.length === 0 ? (
            <View
              className="rounded-3xl border border-slate-200 bg-white p-8 items-center"
              style={CARD_SHADOW}
            >
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200">
                <BellOff size={24} color="#94a3b8" />
              </View>
              <Text className="text-base font-semibold text-slate-700">
                Nemate aktivnih pretplata
              </Text>
              <Text className="mt-2 text-center text-sm leading-6 text-slate-400">
                Pretplatite se na dostupnost lijeka kroz pretragu ljekova.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {items.map((item) => {
                const notified = item.is_notified === 1;
                const isDeleting = deletingId === item.id;

                return (
                  <View
                    key={item.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5"
                    style={CARD_SHADOW}
                  >
                    <View className="flex-row items-start gap-4">
                      {/* Status icon */}
                      <View
                        className={`mt-0.5 h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${
                          notified ? "bg-emerald-50 border border-emerald-100" : "bg-blue-50 border border-blue-100"
                        }`}
                      >
                        {notified ? (
                          <CheckCircle2 size={20} color="#10b981" />
                        ) : (
                          <Clock size={20} color="#2563eb" />
                        )}
                      </View>

                      {/* Info */}
                      <View className="flex-1 gap-1">
                        <Text className="text-base font-semibold text-slate-900">
                          {item.medication_name}
                        </Text>
                        <Text className="text-sm text-slate-500">
                          {item.strength}
                        </Text>
                        <View className="mt-2 flex-row items-center gap-2 flex-wrap">
                          <View
                            className={`rounded-full px-2.5 py-1 ${
                              notified
                                ? "bg-emerald-50 border border-emerald-100"
                                : "bg-blue-50 border border-blue-100"
                            }`}
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                notified ? "text-emerald-700" : "text-blue-700"
                              }`}
                            >
                              {notified ? "Obaviješten" : "Čeka dostupnost"}
                            </Text>
                          </View>
                          <Text className="text-xs text-slate-400">
                            {formatDate(item.created_at)}
                          </Text>
                        </View>
                      </View>

                      {/* Unsubscribe */}
                      <TouchableOpacity
                        onPress={() => void handleUnsubscribe(item.id)}
                        disabled={isDeleting}
                        className="h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 flex-shrink-0"
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color="#ef4444" />
                        ) : (
                          <Trash2 size={16} color="#ef4444" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </ScreenLayout>
  );
}
