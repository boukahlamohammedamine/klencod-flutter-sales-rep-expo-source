import React, { useMemo, useState } from "react";
import { Alert, Platform, SafeAreaView, Text, View } from "react-native";
import { AppHeader, AppScroll, ChoiceChips, EmptyState, Field, Panel, PrimaryButton, S, SectionTitle, StatCard } from "@/components/sales-ui";
import { C } from "@/constants/sales-theme";
import { buildReport, EXPENSE_CATEGORIES, money, PRICE_LABEL, todayISO } from "@/lib/sales-domain";
import { useSalesStore } from "@/lib/sales-store";
import { printPeriodReport } from "@/lib/printing";

const initialDay = todayISO();
const firstOfMonth = `${initialDay.slice(0, 7)}-01`;
const tell = (title: string, message: string) => Platform.OS === "web" && typeof window !== "undefined" ? window.alert(`${title}\n${message}`) : Alert.alert(title, message);

export default function ReportsScreen() {
  const store = useSalesStore();
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(initialDay);
  const report = useMemo(() => buildReport(store, from, to), [store, from, to]);
  const preset = (key: "today" | "month" | "week") => {
    const today = todayISO();
    setTo(today);
    if (key === "today") setFrom(today);
    else if (key === "month") setFrom(`${today.slice(0, 7)}-01`);
    else { const date = new Date(); date.setDate(date.getDate() - 6); setFrom(date.toISOString().slice(0, 10)); }
  };
  const print = async () => { try { await printPeriodReport(report, store.settings); } catch { tell("تعذرت الطباعة", "لم يتم فتح خدمة الطباعة على هذا الجهاز."); } };
  return <SafeAreaView style={S.screen}>
    <AppHeader title="التقارير" subtitle="راجع أداء المبيعات خلال فترة" />
    <AppScroll>
      <Panel style={{ gap: 13 }}><SectionTitle title="الفترة الزمنية" icon="calendar-range" /><ChoiceChips value={`${from}|${to}`} onChange={(value) => { const [start, end] = value.split("|"); setFrom(start); setTo(end); }} options={[{ value: `${initialDay}|${initialDay}`, label: "اليوم" }, { value: `${firstOfMonth}|${initialDay}`, label: "هذا الشهر" }, { value: (() => { const d = new Date(); d.setDate(d.getDate() - 6); return `${d.toISOString().slice(0, 10)}|${initialDay}`; })(), label: "آخر 7 أيام" }]} />
        <View style={S.row}><View style={{ flex: 1 }}><Field label="من" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" /></View><View style={{ flex: 1 }}><Field label="إلى" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" /></View></View>
      </Panel>
      <View style={S.row}><StatCard label="المبيعات" value={money(report.totalRevenue, store.settings.currency)} icon="cash-register" tone="olive" hint={`${report.sales.length} فاتورة`} /><StatCard label="ربح البيع" value={money(report.totalGrossProfit, store.settings.currency)} icon="trending-up" tone="green" /></View>
      <View style={S.row}><StatCard label="المصاريف" value={money(report.totalExpenses, store.settings.currency)} icon="cash-minus" tone="amber" hint={`${report.expenses.length} مصروف`} /><StatCard label="صافي الربح" value={money(report.netProfit, store.settings.currency)} icon="chart-donut" tone={report.netProfit >= 0 ? "green" : "red"} /></View>
      <Panel style={{ gap: 11 }}><SectionTitle title="النتيجة المالية" icon="scale-balance" /><SummaryRow label="تكلفة البضاعة المباعة" value={money(report.totalCostOfGoods, store.settings.currency)} color={C.red} /><SummaryRow label="هامش الربح" value={`${report.grossMarginPct.toFixed(1)}% / هدف ${store.settings.marginTarget || 20}%`} color={report.grossMarginPct >= (store.settings.marginTarget || 20) ? C.green : C.amber} /><View style={{ height: 5, backgroundColor: C.surface, borderRadius: 8, overflow: "hidden" }}><View style={{ width: `${Math.min(100, Math.max(0, report.grossMarginPct / ((store.settings.marginTarget || 20) * 2) * 100))}%`, height: 5, backgroundColor: report.grossMarginPct >= (store.settings.marginTarget || 20) ? C.green : C.amber }} /></View><SummaryRow label="التحصيل النقدي" value={money(report.cashIn, store.settings.currency)} color={C.green} /><SummaryRow label="المصاريف المدفوعة" value={money(report.totalExpenses, store.settings.currency)} color={C.red} /><SummaryRow label="متبقي المبيعات الآجلة" value={money(report.creditOut, store.settings.currency)} color={C.amber} /><SummaryRow label="إجمالي ديون العملاء" value={money(report.totalDebtAll, store.settings.currency)} color={C.amber} /></Panel>
      <Panel style={{ gap: 12 }}><SectionTitle title="المبيعات حسب نوع السعر" icon="tag-multiple-outline" />{report.byPrice.map((entry) => <View key={entry.type} style={S.between}><View style={{ alignItems: "flex-start" }}><Text style={{ color: C.sand, fontSize: 11, fontWeight: "800" }}>{money(entry.revenue, store.settings.currency)}</Text><Text style={{ color: C.green, fontSize: 9, marginTop: 3 }}>ربح {money(entry.profit, store.settings.currency)}</Text></View><Text style={{ color: C.muted, fontSize: 12 }}>{PRICE_LABEL[entry.type]} · {entry.count} فاتورة</Text></View>)}</Panel>
      <Panel style={{ gap: 12 }}><SectionTitle title="أكثر المنتجات ربحًا" icon="trophy-outline" />{report.topItems.length ? report.topItems.map((item, index) => <View key={item.name} style={[S.between, { borderTopWidth: index ? 1 : 0, borderColor: C.line, paddingTop: index ? 10 : 0 }]}><Text style={{ color: C.green, fontSize: 12, fontWeight: "900" }}>{money(item.profit, store.settings.currency)}</Text><View style={{ flex: 1, alignItems: "flex-end" }}><Text style={{ color: C.sand, textAlign: "right", fontSize: 12, fontWeight: "800" }}>{item.name}</Text><Text style={{ color: C.faint, textAlign: "right", fontSize: 10, marginTop: 3 }}>{item.qty} وحدة · {money(item.revenue, store.settings.currency)}</Text></View><View style={rank}><Text style={{ color: C.olive, fontWeight: "900", fontSize: 11 }}>{index + 1}</Text></View></View>) : <EmptyState title="لا توجد مبيعات لهذه الفترة" icon="chart-box-outline" />}</Panel>
      <Panel style={{ gap: 12 }}><SectionTitle title="المصاريف حسب الفئة" icon="chart-pie-outline" />{report.expenseBreakdown.length ? report.expenseBreakdown.map((item) => <SummaryRow key={item.category} label={EXPENSE_CATEGORIES.find((c) => c.key === item.category)?.label || "أخرى"} value={money(item.amount, store.settings.currency)} />) : <Text style={{ color: C.faint, textAlign: "right", fontSize: 11 }}>لا توجد مصاريف مسجلة للفترة</Text>}</Panel>
      <Panel style={{ gap: 11 }}><SectionTitle title="الفواتير ضمن الفترة" icon="receipt-text-outline" />{report.sales.length ? [...report.sales].sort((a, b) => b.id - a.id).map((sale) => <View key={sale.id} style={[S.between, { borderTopWidth: 1, borderColor: C.line, paddingTop: 9 }]}><Text style={{ color: C.sand, fontSize: 11, fontWeight: "900" }}>{money(sale.total, store.settings.currency)}</Text><Text style={{ color: C.muted, fontSize: 11 }}>#{sale.id} · {sale.customerName} · {sale.date.slice(0, 10)}</Text></View>) : <Text style={{ color: C.faint, textAlign: "right", fontSize: 11 }}>لا توجد فواتير</Text>}</Panel>
      <PrimaryButton title="طباعة التقرير" icon="printer-outline" onPress={print} />
    </AppScroll>
  </SafeAreaView>;
}
function SummaryRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return <View style={S.between}><Text style={{ color: color || C.sand, fontSize: 12, fontWeight: "800" }}>{value}</Text><Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text></View>;
}
const rank = { width: 30, height: 30, borderRadius: 11, backgroundColor: C.oliveWash, alignItems: "center" as const, justifyContent: "center" as const, marginLeft: 9 };
