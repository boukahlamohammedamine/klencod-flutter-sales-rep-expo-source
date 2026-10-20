import React from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { router } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { AppHeader, AppScroll, EmptyState, Panel, S, SectionTitle, StatCard } from "@/components/sales-ui";
import { C } from "@/constants/sales-theme";
import { customerDebt, money, todayISO } from "@/lib/sales-domain";
import { useSalesStore } from "@/lib/sales-store";

export default function HomeScreen() {
  const data = useSalesStore();
  const today = todayISO();
  const daySales = data.sales.filter((sale) => sale.date.slice(0, 10) === today);
  const dayExpenses = data.expenses.filter((expense) => expense.date === today).reduce((sum, expense) => sum + expense.amount, 0);
  const revenue = daySales.reduce((sum, sale) => sum + sale.total, 0);
  const profit = daySales.reduce((sum, sale) => sum + sale.grossProfit, 0);
  const debt = data.customers.reduce((sum, customer) => sum + Math.max(0, customerDebt(data, customer.id)), 0);
  const lowStock = data.products.filter((product) => product.stock > 0 && product.stock <= product.minStock);
  const stockValue = data.products.reduce((sum, product) => sum + product.stock * product.factoryPrice, 0);
  const marginPct = revenue > 0 ? profit / revenue * 100 : 0;
  const targetMargin = data.settings.marginTarget || 20;
  const activities = [
    ...data.sales.map((sale) => ({ id: `sale-${sale.id}`, date: sale.date, title: `فاتورة #${sale.id} · ${sale.customerName}`, amount: money(sale.total, data.settings.currency), icon: "receipt-text-outline", tone: C.olive, path: "/(tabs)/sales" as const })),
    ...data.expenses.map((expense) => ({ id: `expense-${expense.id}`, date: `${expense.date}T00:00:00`, title: expense.description || "مصروف", amount: `− ${money(expense.amount, data.settings.currency)}`, icon: "cash-minus", tone: C.red, path: "/(tabs)/expenses" as const })),
    ...data.stock_replenishments.map((receipt) => ({ id: `stock-${receipt.id}`, date: receipt.date, title: `تعبئة مخزون ${receipt.voucher ? `· ${receipt.voucher}` : ""}`, amount: `${receipt.items.length} أصناف`, icon: "tray-arrow-down", tone: C.blue, path: "/(tabs)/stock" as const })),
    ...data.debt_payments.map((payment) => ({ id: `payment-${payment.id}`, date: `${payment.date}T00:00:00`, title: `تسديد · ${data.customers.find((customer) => Number(customer.id) === Number(payment.customerId))?.name || "عميل"}`, amount: `+ ${money(payment.amount, data.settings.currency)}`, icon: "cash-check", tone: C.green, path: "/(tabs)/customers" as const })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const dateLabel = new Date().toLocaleDateString("ar-DZ", { weekday: "long", day: "numeric", month: "long" });
  const shortcuts = [
    { label: "بيع جديد", icon: "cart-plus", path: "/(tabs)/sales" as const },
    { label: "إضافة منتج", icon: "package-variant-plus", path: "/(tabs)/stock" as const },
    { label: "تقرير الفترة", icon: "chart-box-outline", path: "/(tabs)/reports" as const },
  ];
  return <SafeAreaView style={S.screen}>
    <AppHeader title="مندوب المبيعات" subtitle={dateLabel} action={<View style={brandMark}><MaterialCommunityIcons name="map-marker-path" size={17} color={C.olive} /></View>} />
    <AppScroll>
      <Panel style={{ backgroundColor: C.oliveWash, borderColor: "#52633A", padding: 18 }}>
        <View style={[S.between, { alignItems: "flex-start" }]}>
          <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, textAlign: "right" }}>صافي الربح اليوم</Text><Text style={{ color: C.sand, fontSize: 29, fontWeight: "900", textAlign: "right", marginTop: 8 }}>{money(profit - dayExpenses, data.settings.currency)}</Text><Text style={{ color: C.muted, fontSize: 11, textAlign: "right", marginTop: 5 }}>بعد خصم المصاريف المسجلة اليوم</Text></View>
          <View style={heroIcon}><MaterialCommunityIcons name="chart-timeline-variant" size={23} color={C.olive} /></View>
        </View>
        <View style={[S.row, { gap: 22, marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderColor: "#4A5739" }]}>
          <MiniMetric label="المبيعات" value={money(revenue, data.settings.currency)} />
          <View style={{ width: 1, backgroundColor: "#4A5739" }} />
          <MiniMetric label="عدد الفواتير" value={`${daySales.length}`} />
          <View style={{ width: 1, backgroundColor: "#4A5739" }} />
          <MiniMetric label="المصاريف" value={money(dayExpenses, data.settings.currency)} />
        </View>
      </Panel>

      <View style={S.row}>
        <StatCard label="إجمالي الديون" value={money(debt, data.settings.currency)} icon="account-cash-outline" tone="amber" />
        <StatCard label="أصناف منخفضة" value={`${lowStock.length} صنف`} icon="package-variant" tone={lowStock.length ? "red" : "green"} hint="بحسب الحد الأدنى للمخزون" />
      </View>
      <View style={S.row}>
        <StatCard label="هامش اليوم" value={`${marginPct.toFixed(1)}%`} icon="speedometer" tone={marginPct >= targetMargin ? "green" : marginPct >= targetMargin * 0.7 ? "amber" : "red"} hint={`الهدف ${targetMargin}%`} />
        <StatCard label="قيمة المخزون" value={money(stockValue, data.settings.currency)} icon="warehouse" tone="blue" hint="بحسب سعر المصنع" />
      </View>

      <View style={{ gap: 11 }}>
        <SectionTitle title="اختصارات سريعة" icon="lightning-bolt-outline" />
        <View style={S.row}>
          {shortcuts.map((item) => <Pressable key={item.label} onPress={() => router.push(item.path)} style={({ pressed }) => [shortcut, pressed && { opacity: 0.75 }]}>
            <MaterialCommunityIcons name={item.icon as never} size={21} color={C.olive} />
            <Text style={{ color: C.sand, fontSize: 11, fontWeight: "800", textAlign: "center" }}>{item.label}</Text>
          </Pressable>)}
        </View>
      </View>

      <View style={{ gap: 11 }}>
        <SectionTitle title="تنبيه المخزون" icon="alert-outline" action={<Text style={{ color: C.amber, fontSize: 11 }}>{lowStock.length} صنف</Text>} />
        {lowStock.length ? <Panel style={{ gap: 12 }}>{lowStock.slice(0, 4).map((product, index) => <View key={product.id} style={[S.between, index ? divider : null]}>
          <View style={[S.row, { gap: 9 }]}><MaterialCommunityIcons name="chevron-left" size={16} color={C.faint} /><Text style={{ color: C.red, fontSize: 12, fontWeight: "800" }}>{product.stock} / {product.minStock}</Text></View>
          <View style={{ flex: 1 }}><Text style={{ color: C.sand, fontWeight: "700", textAlign: "right" }}>{product.name}</Text><Text style={{ color: C.faint, fontSize: 10, textAlign: "right", marginTop: 2 }}>المتاح / الحد الأدنى</Text></View>
        </View>)}<Pressable onPress={() => router.push("/(tabs)/stock")} style={{ alignItems: "center", paddingTop: 3 }}><Text style={{ color: C.olive, fontSize: 12, fontWeight: "800" }}>إدارة المخزون ←</Text></Pressable></Panel> : <Panel><Text style={{ color: C.green, fontWeight: "800", textAlign: "center" }}>كل الأصناف ضمن مستوى المخزون المطلوب</Text></Panel>}
      </View>

      <View style={{ gap: 11 }}>
        <SectionTitle title="آخر الفواتير" icon="receipt-text-outline" action={<Pressable onPress={() => router.push("/(tabs)/sales")}><Text style={{ color: C.olive, fontSize: 11 }}>عرض الكل</Text></Pressable>} />
        {data.sales.length ? <Panel style={{ gap: 12 }}>{[...data.sales].sort((a, b) => b.id - a.id).slice(0, 4).map((sale, index) => <View key={sale.id} style={[S.between, index ? divider : null]}>
          <View style={{ alignItems: "flex-start" }}><Text style={{ color: C.sand, fontSize: 13, fontWeight: "900" }}>{money(sale.total, data.settings.currency)}</Text><Text style={{ color: sale.remaining > 0 ? C.amber : C.green, fontSize: 10, marginTop: 3 }}>{sale.remaining > 0 ? `متبقي ${money(sale.remaining, data.settings.currency)}` : "مكتملة"}</Text></View>
          <View style={{ flex: 1 }}><Text style={{ color: C.sand, fontSize: 12, fontWeight: "800", textAlign: "right" }}>#{sale.id} · {sale.customerName}</Text><Text style={{ color: C.faint, fontSize: 10, textAlign: "right", marginTop: 3 }}>{new Date(sale.date).toLocaleString("ar-DZ")}</Text></View>
          <MaterialCommunityIcons name="receipt" size={18} color={C.olive} />
        </View>)}</Panel> : <EmptyState title="لا توجد فواتير بعد" subtitle="ابدأ أول عملية بيع من تبويب المبيعات" icon="receipt-text-outline" />}
      </View>
      <View style={{ gap: 11 }}>
        <SectionTitle title="آخر العمليات" icon="history" />
        {activities.length ? <Panel style={{ gap: 11 }}>{activities.map((item, index) => <Pressable key={item.id} onPress={() => router.push(item.path)} style={[S.between, index ? divider : null]}>
          <Text style={{ color: item.tone, fontSize: 11, fontWeight: "800" }}>{item.amount}</Text>
          <View style={{ flex: 1, paddingHorizontal: 10 }}><Text numberOfLines={1} style={{ color: C.sand, fontSize: 11, fontWeight: "700", textAlign: "right" }}>{item.title}</Text><Text style={{ color: C.faint, fontSize: 9, textAlign: "right", marginTop: 3 }}>{new Date(item.date).toLocaleString("ar-DZ")}</Text></View>
          <MaterialCommunityIcons name={item.icon as never} size={17} color={item.tone} />
        </Pressable>)}</Panel> : <EmptyState title="لا توجد عمليات بعد" subtitle="ستظهر هنا المبيعات والتعبئات والتسديدات" icon="history" />}
      </View>
    </AppScroll>
  </SafeAreaView>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 10, textAlign: "right" }}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={{ color: C.sand, fontSize: 12, fontWeight: "800", textAlign: "right", marginTop: 4 }}>{value}</Text></View>;
}

const brandMark = { width: 42, height: 42, borderRadius: 15, backgroundColor: C.oliveWash, alignItems: "center" as const, justifyContent: "center" as const, borderWidth: 1, borderColor: C.line };
const heroIcon = { width: 47, height: 47, borderRadius: 16, backgroundColor: "#253020", alignItems: "center" as const, justifyContent: "center" as const, marginLeft: 14 };
const shortcut = { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, gap: 9, minHeight: 84, marginHorizontal: 4, padding: 11, backgroundColor: C.card, borderRadius: 17, borderWidth: 1, borderColor: C.line };
const divider = { borderTopWidth: 1 as const, borderColor: C.line, paddingTop: 12 };
