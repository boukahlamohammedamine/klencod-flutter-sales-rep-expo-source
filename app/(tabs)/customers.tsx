import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, SafeAreaView, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { AppHeader, AppScroll, ChoiceChips, EmptyState, Field, IconButton, Panel, PrimaryButton, S, SearchField, SectionTitle, SheetModal } from "@/components/sales-ui";
import { C } from "@/constants/sales-theme";
import { customerDebt, money, todayISO } from "@/lib/sales-domain";
import type { Customer } from "@/lib/sales-domain";
import { useSalesStore } from "@/lib/sales-store";

const tell = (title: string, message: string) => Platform.OS === "web" && typeof window !== "undefined" ? window.alert(`${title}\n${message}`) : Alert.alert(title, message);
const confirm = (message: string, action: () => void) => Platform.OS === "web" && typeof window !== "undefined" ? (window.confirm(message) && action()) : Alert.alert("تأكيد الحذف", message, [{ text: "إلغاء", style: "cancel" }, { text: "حذف", style: "destructive", onPress: action }]);

export default function CustomersScreen() {
  const store = useSalesStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "debt" | "clear">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", type: "تجزئة", address: "" });
  const [payment, setPayment] = useState({ amount: "", date: todayISO(), note: "" });
  const debtors = store.customers.filter((customer) => customerDebt(store, customer.id) > 0).length;
  const visible = useMemo(() => store.customers.filter((customer) => {
    const match = `${customer.name} ${customer.phone || ""}`.toLowerCase().includes(query.toLowerCase());
    const debt = customerDebt(store, customer.id);
    return match && (filter === "all" || (filter === "debt" ? debt > 0 : debt <= 0));
  }).sort((a, b) => customerDebt(store, b.id) - customerDebt(store, a.id)), [store.customers, store.sales, store.debt_payments, query, filter]);
  const openForm = (customer?: Customer) => {
    setEditing(customer || null);
    setForm(customer ? { name: customer.name, phone: customer.phone || "", type: customer.type || "تجزئة", address: customer.address || "" } : { name: "", phone: "", type: "تجزئة", address: "" });
    setFormOpen(true);
  };
  const save = () => {
    if (!form.name.trim()) return tell("بيانات ناقصة", "أدخل اسم العميل.");
    store.saveCustomer({ ...(editing ? { id: editing.id } : {}), ...form }); setFormOpen(false);
  };
  const removeCustomer = (customer: Customer) => {
    const hasHistory = store.sales.some((sale) => Number(sale.customerId) === customer.id) || store.debt_payments.some((payment) => Number(payment.customerId) === customer.id);
    if (hasHistory) return tell("تعذر حذف العميل", "لدى هذا العميل فواتير أو تسديدات محفوظة. أبقه للحفاظ على سجل الحركة والديون.");
    confirm(`حذف العميل «${customer.name}»؟`, () => { store.deleteCustomer(customer.id); setFormOpen(false); });
  };
  const showPayment = (customer: Customer) => {
    setSelected(customer); setPayment({ amount: Math.max(0, customerDebt(store, customer.id)).toFixed(2), date: todayISO(), note: "" });
    setDetailOpen(false); setPaymentOpen(true);
  };
  const savePayment = () => {
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) return tell("مبلغ غير صحيح", "أدخل مبلغ تسديد موجبًا.");
    if (!selected) return;
    store.addDebtPayment({ customerId: selected.id, amount, date: payment.date, note: payment.note }); setPaymentOpen(false);
  };
  const openDetail = (customer: Customer) => { setSelected(customer); setDetailOpen(true); };
  const selectedDebt = selected ? Math.max(0, customerDebt(store, selected.id)) : 0;
  const customerSales = selected ? [...store.sales].filter((sale) => Number(sale.customerId) === selected.id).sort((a, b) => b.id - a.id) : [];
  const payments = selected ? store.debt_payments.filter((item) => item.customerId === selected.id).sort((a, b) => b.id - a.id) : [];
  const customerPurchases = customerSales.reduce((sum, sale) => sum + sale.total, 0);
  const customerPaid = customerSales.reduce((sum, sale) => sum + sale.paid, 0);
  return <SafeAreaView style={S.screen}>
    <AppHeader title="العملاء" subtitle={`${store.customers.length} عميل · ${debtors} لديهم رصيد`} action={<IconButton icon="account-plus-outline" onPress={() => openForm()} accessibilityLabel="إضافة عميل" tint={C.olive} />} />
    <AppScroll>
      <SearchField value={query} onChangeText={setQuery} placeholder="الاسم أو رقم الهاتف" />
      <ChoiceChips value={filter} onChange={setFilter} options={[{ value: "all", label: "الكل" }, { value: "debt", label: `عليهم دين ${debtors}` }, { value: "clear", label: "بدون دين" }]} />
      <SectionTitle title="سجل العملاء" icon="account-group-outline" />
      {visible.length ? visible.map((customer) => <CustomerCard key={customer.id} customer={customer} debt={customerDebt(store, customer.id)} currency={store.settings.currency} onPress={() => openDetail(customer)} />) : <EmptyState title="لا يوجد عملاء مطابقون" subtitle="أضف عميلك الأول أو جرّب بحثًا آخر" icon="account-search-outline" />}
    </AppScroll>
    <SheetModal visible={formOpen} title={editing ? "تعديل بيانات العميل" : "إضافة عميل"} onClose={() => setFormOpen(false)}>
      <Field label="اسم العميل" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
      <Field label="رقم الهاتف" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
      <SectionTitle title="نوع العميل" />
      <ChoiceChips value={form.type} onChange={(type) => setForm((f) => ({ ...f, type }))} options={[{ value: "تجزئة", label: "تجزئة" }, { value: "جملة", label: "جملة" }]} />
      <View style={{ height: 13 }} /><Field label="العنوان" value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} multiline />
      <PrimaryButton title="حفظ العميل" icon="content-save-outline" onPress={save} />
      {editing ? <Pressable onPress={() => removeCustomer(editing)} style={{ alignItems: "center", padding: 14 }}><Text style={{ color: C.red, fontWeight: "800" }}>حذف العميل</Text></Pressable> : null}
    </SheetModal>
    <SheetModal visible={detailOpen} title="ملف العميل" onClose={() => setDetailOpen(false)}>
      {selected ? <>
        <Panel style={{ gap: 11 }}><View style={S.between}><View><Text style={{ color: C.sand, fontSize: 19, fontWeight: "900", textAlign: "right" }}>{selected.name}</Text><Text style={{ color: C.muted, fontSize: 12, textAlign: "right", marginTop: 5 }}>{selected.phone || "لا يوجد هاتف"} · {selected.type || "تجزئة"}</Text></View><View style={customerAvatar}><MaterialCommunityIcons name="account-outline" size={24} color={C.olive} /></View></View><Text style={{ color: C.muted, fontSize: 11, textAlign: "right" }}>{selected.address || "لا يوجد عنوان مسجل"}</Text><View style={[S.row, { gap: 8 }]}><CustomerMetric label="المشتريات" amount={customerPurchases} currency={store.settings.currency} /><CustomerMetric label="المدفوع" amount={customerPaid} currency={store.settings.currency} /></View><View style={[S.between, { borderTopWidth: 1, borderColor: C.line, paddingTop: 12 }]}><Text style={{ color: selectedDebt > 0 ? C.amber : C.green, fontSize: 18, fontWeight: "900" }}>{money(selectedDebt, store.settings.currency)}</Text><Text style={{ color: C.muted, fontSize: 11 }}>الدين الحالي</Text></View></Panel>
        <View style={[S.row, { gap: 9 }]}><PrimaryButton title="تسجيل تسديد" icon="cash-check" onPress={() => showPayment(selected)} style={{ flex: 1 }} /><PrimaryButton title="تعديل" icon="pencil-outline" onPress={() => { setDetailOpen(false); openForm(selected); }} style={{ flex: 1, backgroundColor: C.cardRaised }} /></View>
        <SectionTitle title={`الفواتير (${customerSales.length})`} icon="receipt-text-outline" />
        {customerSales.length ? customerSales.map((sale) => <Panel key={sale.id} style={{ padding: 12, marginBottom: 8 }}><View style={S.between}><View><Text style={{ color: C.sand, fontWeight: "900" }}>{money(sale.total, store.settings.currency)}</Text><Text style={{ color: sale.remaining > 0 ? C.amber : C.green, fontSize: 10, marginTop: 4 }}>{sale.remaining > 0 ? `متبقي ${money(sale.remaining, store.settings.currency)}` : "مسددة"}</Text></View><View><Text style={{ color: C.sand, fontSize: 12, fontWeight: "800", textAlign: "right" }}>فاتورة #{sale.id}</Text><Text style={{ color: C.faint, fontSize: 10, textAlign: "right", marginTop: 4 }}>{new Date(sale.date).toLocaleDateString("ar-DZ")}</Text></View></View></Panel>) : <Text style={{ color: C.faint, textAlign: "right", fontSize: 12 }}>لا توجد فواتير للعميل</Text>}
        {payments.length ? <><SectionTitle title="التسديدات" icon="cash-check" />{payments.map((item) => <View key={item.id} style={[S.between, { paddingVertical: 8, borderBottomWidth: 1, borderColor: C.line }]}><Text style={{ color: C.green, fontWeight: "800" }}>+{money(item.amount, store.settings.currency)}</Text><View><Text style={{ color: C.sand, fontSize: 12, textAlign: "right" }}>{item.note || "تسديد دين"}</Text><Text style={{ color: C.faint, fontSize: 10, textAlign: "right", marginTop: 3 }}>{item.date}</Text></View></View>)}</> : null}
      </> : null}
    </SheetModal>
    <SheetModal visible={paymentOpen} title="تسجيل تسديد" onClose={() => setPaymentOpen(false)}>
      <Panel style={{ marginBottom: 16, gap: 5 }}><Text style={{ color: C.sand, textAlign: "right", fontWeight: "800" }}>{selected?.name}</Text><Text style={{ color: C.amber, textAlign: "right", fontSize: 12 }}>الرصيد الحالي {money(selectedDebt, store.settings.currency)}</Text></Panel>
      <Field label="مبلغ التسديد" value={payment.amount} onChangeText={(v) => setPayment((p) => ({ ...p, amount: v }))} keyboardType="decimal-pad" prefix={store.settings.currency} />
      <Field label="تاريخ التسديد" value={payment.date} onChangeText={(v) => setPayment((p) => ({ ...p, date: v }))} placeholder="YYYY-MM-DD" />
      <Field label="ملاحظة" value={payment.note} onChangeText={(v) => setPayment((p) => ({ ...p, note: v }))} multiline />
      <PrimaryButton title="حفظ التسديد" icon="check" onPress={savePayment} />
    </SheetModal>
  </SafeAreaView>;
}

function CustomerCard({ customer, debt, currency, onPress }: { customer: Customer; debt: number; currency: string; onPress: () => void }) {
  const hasDebt = debt > 0;
  return <Pressable onPress={onPress} style={({ pressed }) => [customerCard, pressed ? { opacity: 0.78 } : null]}>
    <View style={[S.between, { gap: 12 }]}><View style={{ alignItems: "flex-start" }}><Text style={{ color: hasDebt ? C.amber : C.green, fontSize: 14, fontWeight: "900" }}>{hasDebt ? money(debt, currency) : "صافي"}</Text><Text style={{ color: C.faint, fontSize: 9, marginTop: 3 }}>{hasDebt ? "رصيد مستحق" : "لا يوجد دين"}</Text></View><View style={{ flex: 1 }}><Text style={{ color: C.sand, fontSize: 14, fontWeight: "900", textAlign: "right" }}>{customer.name}</Text><Text style={{ color: C.muted, fontSize: 10, textAlign: "right", marginTop: 5 }}>{customer.phone || "بدون رقم هاتف"} · {customer.type || "تجزئة"}</Text></View><View style={[customerAvatar, { width: 40, height: 40 }]}><MaterialCommunityIcons name="account-outline" size={20} color={C.olive} /></View></View>
    <View style={{ height: 3, borderRadius: 4, backgroundColor: C.surface, marginTop: 12, overflow: "hidden" }}><View style={{ height: 3, width: hasDebt ? "100%" : "0%", backgroundColor: hasDebt ? C.amber : C.green }} /></View>
  </Pressable>;
}
function CustomerMetric({ label, amount, currency }: { label: string; amount: number; currency: string }) {
  return <View style={metricBox}><Text style={{ color: C.sand, fontSize: 12, fontWeight: "800", textAlign: "center" }}>{money(amount, currency)}</Text><Text style={{ color: C.faint, fontSize: 10, textAlign: "center", marginTop: 4 }}>{label}</Text></View>;
}
const customerCard = { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 15 };
const customerAvatar = { width: 49, height: 49, borderRadius: 17, backgroundColor: C.oliveWash, borderWidth: 1, borderColor: C.line, alignItems: "center" as const, justifyContent: "center" as const };
const metricBox = { flex: 1, padding: 11, borderRadius: 12, backgroundColor: C.cardRaised };
