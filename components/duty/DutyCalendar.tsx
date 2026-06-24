import { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react-native";

const MONTH_LABELS = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
];
const MONTH_NAMES = [
  "januar", "februar", "mart", "april", "maj", "jun",
  "jul", "avgust", "septembar", "oktobar", "novembar", "decembar",
];
const WEEKDAY_LABELS = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];

const padTwo = (n: number) => String(n).padStart(2, "0");

export const getLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`;

export const parseDateKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
};

export const formatShortDate = (date: Date) =>
  `${date.getDate()}. ${MONTH_NAMES[date.getMonth()]}`;

export const formatFullDate = (dateKey: string) => {
  const WEEKDAY_NAMES = [
    "nedjelja", "ponedjeljak", "utorak", "srijeda", "četvrtak", "petak", "subota",
  ];
  const date = parseDateKey(dateKey);
  const weekday = WEEKDAY_NAMES[date.getDay()];
  const month = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalized}, ${day}. ${month} ${date.getFullYear()}.`;
};

const getMondayFirstIndex = (date: Date) => (date.getDay() + 6) % 7;
const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

type CalendarDay = { date: Date; dateKey: string; isCurrentMonth: boolean };

type Props = {
  selectedDate: string;
  onDateChange: (dateKey: string) => void;
};

export function DutyCalendar({ selectedDate, onDateChange }: Props) {
  const [viewDate, setViewDate] = useState(() => parseDateKey(selectedDate));
  const todayKey = getLocalDateKey(new Date());

  const visibleDays = useMemo<CalendarDay[]>(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const leadingDays = getMondayFirstIndex(firstDay);
    const daysInCurrentMonth = getDaysInMonth(year, month);
    const daysInPreviousMonth = getDaysInMonth(year, month - 1);
    const days: CalendarDay[] = [];

    for (let i = leadingDays - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPreviousMonth - i);
      days.push({ date, dateKey: getLocalDateKey(date), isCurrentMonth: false });
    }
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const date = new Date(year, month, day);
      days.push({ date, dateKey: getLocalDateKey(date), isCurrentMonth: true });
    }
    const trailing = 42 - days.length;
    for (let day = 1; day <= trailing; day++) {
      const date = new Date(year, month + 1, day);
      days.push({ date, dateKey: getLocalDateKey(date), isCurrentMonth: false });
    }
    return days;
  }, [viewDate]);

  const changeMonth = (offset: number) =>
    setViewDate((cur) => new Date(cur.getFullYear(), cur.getMonth() + offset, 1));

  const handleDayClick = (day: CalendarDay) => {
    setViewDate(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
    onDateChange(day.dateKey);
  };

  const handleTodayClick = () => {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    onDateChange(todayKey);
  };

  return (
    <View>
      {/* Month navigation header */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
            <CalendarDays size={16} color="#2563eb" />
          </View>
          <View>
            <Text className="text-xs font-semibold uppercase text-blue-600">Datum</Text>
            <Text className="text-sm font-bold text-slate-900">
              {MONTH_LABELS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white"
            accessibilityLabel="Prethodni mjesec"
          >
            <ChevronLeft size={16} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => changeMonth(1)}
            className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white"
            accessibilityLabel="Sljedeći mjesec"
          >
            <ChevronRight size={16} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday labels */}
      <View className="mb-1 flex-row">
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={{ width: "14.28%" }} className="items-center">
            <Text className="text-[11px] font-semibold text-slate-400">{label}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View className="flex-row flex-wrap">
        {visibleDays.map((day) => {
          const isSelected = day.dateKey === selectedDate;
          const isToday = day.dateKey === todayKey;
          return (
            <View key={day.dateKey} style={{ width: "14.28%" }} className="items-center py-0.5">
              <TouchableOpacity
                onPress={() => handleDayClick(day)}
                className={`h-9 w-9 items-center justify-center rounded-xl ${
                  isSelected
                    ? "bg-blue-600"
                    : isToday
                      ? "border border-blue-200 bg-blue-50"
                      : ""
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isSelected
                      ? "text-white"
                      : isToday
                        ? "text-blue-700"
                        : day.isCurrentMonth
                          ? "text-slate-800"
                          : "text-slate-300"
                  }`}
                >
                  {day.date.getDate()}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Today shortcut */}
      <TouchableOpacity
        onPress={handleTodayClick}
        className="mt-4 w-full items-center rounded-xl border border-blue-100 bg-blue-50 px-3 py-2"
      >
        <Text className="text-sm font-semibold text-blue-700">
          Danas, {formatShortDate(new Date())}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
