import { View, Text } from "react-native";
import { AlertCircle, CheckCircle2, Info } from "lucide-react-native";
import type { AdminNoticeType } from "../../lib/admin-types";

const styles = {
  success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
  error:   { bg: "#fff1f2", border: "#fecdd3", text: "#9f1239" },
  info:    { bg: "#f0f9ff", border: "#bae6fd", text: "#0c4a6e" },
};

const Icons = {
  success: CheckCircle2,
  error:   AlertCircle,
  info:    Info,
};

export function AdminNotice({ notice }: { notice: AdminNoticeType | null }) {
  if (!notice) return null;
  const s = styles[notice.type];
  const Icon = Icons[notice.type];
  return (
    <View
      className="flex-row items-start gap-2 rounded-xl border px-3 py-2.5"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <Icon size={16} color={s.text} style={{ marginTop: 1 }} />
      <Text className="flex-1 text-sm font-medium" style={{ color: s.text }}>
        {notice.message}
      </Text>
    </View>
  );
}
