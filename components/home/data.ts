import { Bell, Clock3, MapPin, Search, ShieldCheck, Stethoscope } from "lucide-react-native";

export type QuickAction =
  | { title: string; description: string; icon: typeof Search; href: string; locked?: false }
  | { title: string; description: string; icon: typeof Search; locked: true; href?: string };

export type Feature = {
  title: string;
  description: string;
  icon: typeof Search;
};

export const features: Feature[] = [
  {
    title: "Pretraga ljekova",
    description:
      "Pretražite bazu podataka ljekova dostupnih u Crnoj Gori po nazivu, dozi ili aktivnoj supstanci.",
    icon: Search,
  },
  {
    title: "Lokacije apoteka",
    description:
      "Pronađite najbliže apoteke koje imaju traženi lijek na zalihama sa kontakt informacijama.",
    icon: MapPin,
  },
  {
    title: "Dežurne apoteke",
    description:
      "Provjerite koje apoteke su dežurne danas ili bilo koji dan u mjesecu putem kalendara.",
    icon: Clock3,
  },
  {
    title: "Pouzdani podaci",
    description:
      "Podaci se redovno ažuriraju u saradnji sa apotekama i nadležnim institucijama.",
    icon: ShieldCheck,
  },
];

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
