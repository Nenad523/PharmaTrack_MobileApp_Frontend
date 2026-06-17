import { Bell, Clock3, Search, Stethoscope } from "lucide-react-native";

export type QuickAction =
  | { title: string; description: string; icon: typeof Search; href: string; locked?: false }
  | { title: string; description: string; icon: typeof Search; locked: true; href?: string };

export const quickActions: QuickAction[] = [
  {
    title: "Pretraga ljekova",
    description: "Pronađite ljekove u apotekama širom Crne Gore.",
    icon: Search,
    href: "/(tabs)/medications",
  },
  {
    title: "Dežurne apoteke",
    description: "Pogledajte raspored dežurnih apoteka po gradu.",
    icon: Clock3,
    href: "/(tabs)/duty",
  },
  {
    title: "Notifikacije",
    description: "Primajte obavještenja o dostupnosti ljekova.",
    icon: Bell,
    locked: true,
  },
  {
    title: "Pretraga po simptomima",
    description: "Pronađite odgovarajuće ljekove prema simptomima.",
    icon: Stethoscope,
    locked: true,
  },
];
