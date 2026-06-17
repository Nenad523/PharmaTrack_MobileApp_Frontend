import { Tabs } from "expo-router";
import { Clock, Home, Search } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          borderTopColor: "#f3f4f6",
          backgroundColor: "rgba(255,255,255,0.95)",
        },
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Početna",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: "Pretraga",
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="duty"
        options={{
          title: "Dežurne",
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
