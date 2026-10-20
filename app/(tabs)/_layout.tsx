import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/constants/sales-theme";

const TAB_ICONS: Record<string, string> = {
  index: "view-dashboard-outline", stock: "package-variant-closed", customers: "account-group-outline",
  sales: "receipt-text-outline", expenses: "cash-minus", reports: "chart-box-outline",
};
const TAB_LABELS: Record<string, string> = {
  index: "الرئيسية", stock: "المخزون", customers: "العملاء", sales: "المبيعات", expenses: "المصاريف", reports: "التقارير",
};
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 8 : Math.max(insets.bottom, 7);
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: C.olive,
    tabBarInactiveTintColor: C.faint,
    tabBarLabel: TAB_LABELS[route.name] || route.name,
    tabBarLabelStyle: { fontSize: 9, fontWeight: "700", marginTop: 1, marginBottom: 2 },
    tabBarIcon: ({ color }) => <MaterialCommunityIcons name={(TAB_ICONS[route.name] || "circle-outline") as never} size={20} color={color} />,
    tabBarStyle: { height: 57 + bottomPadding, paddingTop: 5, paddingBottom: bottomPadding, backgroundColor: C.surface, borderTopColor: C.line, borderTopWidth: 1 },
  })}>
    <Tabs.Screen name="index" />
    <Tabs.Screen name="stock" />
    <Tabs.Screen name="customers" />
    <Tabs.Screen name="sales" />
    <Tabs.Screen name="expenses" />
    <Tabs.Screen name="reports" />
  </Tabs>;
}
