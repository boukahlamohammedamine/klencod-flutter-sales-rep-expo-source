import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, SafeAreaView, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { AppHeader, AppScroll, ChoiceChips, EmptyState, Field, IconButton, Panel, PrimaryButton, S, SectionTitle, SheetModal } from "@/components/sales-ui";
import { C } from "@/constants/sales-theme";
import { EXPENSE_CATEGORIES, money, todayISO } from "@/lib/sales-domain";
import type { Expense, ExpenseCategory } from "@/lib/sales-domain";
import { useSalesStore } from "@/lib/sales-store";

const tell = (title: string, message: string) => Platform.OS === "web" && typeof window !== "undefined" ? window.alert(`${title}\n${message}`) : Alert.alert(title, message);
const confirm = (message: string, action: () => void) => Platform.OS === "web" && typeof window !== "undefined" ? (window.confirm(message) && action()) : Alert.alert("تأكيد الحذف", message, [{ text: "إلغاء", style: "cancel" }, { text: "حذف", style: "destructive", onPress: action }]);

export default function ExpensesScreen() {
  const store = useSalesStore();
  const [filter, setFilter] = useState<"all" | ExpenseCategory>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({ category: "fuel" as ExpenseCategory, date: todayISO(), amount: "", description: "" });
  const now = todayISO(); const month = now.slice(0, 7);
  const todayTotal = store.expenses.filter((e) => e.date === now).reduce((sum, e) => sum + e.amount, 0);
  const monthTotal = store.expenses.filter((e) => e.date.startsWith(month)).reduce((sum, e) => sum + e.amount, 0);
  const entries = useMemo(() => [...store.expenses].filter((e) => filter === "all" || e.category === filter).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id), [store.expenses, filter]);
  const openForm = (expense?: Expense) => { setEditing(expense || null); setForm(expense ? { category: expense.category, date: expense.date, amount: String(expense.amount), description: expense.description } : { category: "fuel", date: todayISO(), amount: "", description: "" }); setOpen(true); };
  const save = () => { const amount = Number(form.amount); if (!Number.isFinite(amount) || amount <= 0) return tell("مبلغ غير صحيح", "أدخل مبلغًا أكبر من صفر."); store.saveExpense({ ...(editing ? { id: editing.id } : {}), category: form.category, date: form.date, amount, description: form.description }); setOpen(false); };
  return <SafeAreaView style={S.screen}>
    <AppHeader title="المصاريف" subtitle="سجل النفقات اليومية" action={<IconButton icon="plus" onPress={() => openForm()} accessibilityLabel="إضافة مصروف" tint={C.olive} />} />
    <AppScroll>
      <View style={S.row}><ExpenseTotal label="اليوم" value={todayTotal} currency={store.settings.currency} icon="calendar-today" /><ExpenseTotal label="هذا الشهر" value={monthTotal} currency={store.settings.currency} icon="calendar-month-outline" /></View>
      <PrimaryButton title="تسجيل مصروف" icon="cash-minus" onPress={() => openForm()} />
      <ChoiceChips value={filter} onChange={setFilter} options={[{ value: "all", label: "كل الفئات" }, ...EXPENSE_CATEGORIES.map((item) => ({ value: item.key, label: item.label }))]} />
      <SectionTitle title={`السجل (${entries.length})`} icon="cash-multiple" />
      {entries.length ? entries.map((expense) => <ExpenseCard key={expense.id} expense={expense} currency={store.settings.currency} onEdit={() => openForm(expense)} onDelete={() => confirm("حذف سجل هذا المصروف؟", () => store.deleteExpense(expense.id))} />) : <EmptyState title="لا توجد مصاريف في هذه القائمة" subtitle="سجّل المصروف لتضمينه في التقارير" icon="cash-minus" />}
    </AppScroll>
    <SheetModal visible={open} title={editing ? "تعديل المصروف" : "مصروف جديد"} onClose={() => setOpen(false)}>
      <SectionTitle title="الفئة" icon="shape-outline" />
      <ChoiceChips value={form.category} onChange={(category) => setForm((f) => ({ ...f, category }))} options={EXPENSE_CATEGORIES.map((item) => ({ value: item.key, label: item.label }))} />
      <View style={{ height: 12 }} /><Field label="المبلغ" value={form.amount} onChangeText={(amount) => setForm((f) => ({ ...f, amount }))} keyboardType="decimal-pad" prefix={store.settings.currency} />
      <Field label="التاريخ (YYYY-MM-DD)" value={form.date} onChangeText={(date) => setForm((f) => ({ ...f, date }))} />
      <Field label="الوصف" value={form.description} onChangeText={(description) => setForm((f) => ({ ...f, description }))} placeholder="اختياري" multiline />
      <PrimaryButton title="حفظ المصروف" icon="content-save-outline" onPress={save} />
      {editing ? <Pressable onPress={() => confirm("حذف المصروف؟", () => { store.deleteExpense(editing.id); setOpen(false); })} style={{ alignItems: "center", padding: 14 }}><Text style={{ color: C.red, fontWeight: "800" }}>حذف المصروف</Text></Pressable> : null}
    </SheetModal>
  </SafeAreaView>;
}
function ExpenseTotal({ label, value, currency, icon }: { label: string; value: number; currency: string; icon: string }) {
  return <Panel style={{ flex: 1, padding: 14, gap: 10 }}><View style={S.between}><MaterialCommunityIcons name={icon as never} size={18} color={C.olive} /><Text style={{ color: C.muted, fontSize: 11 }}>{label}</Text></View><Text numberOfLines={1} adjustsFontSizeToFit style={{ color: C.sand, textAlign: "right", fontSize: 15, fontWeight: "900" }}>{money(value, currency)}</Text></Panel>;
}
function ExpenseCard({ expense, currency, onEdit, onDelete }: { expense: Expense; currency: string; onEdit: () => void; onDelete: () => void }) {
  const category = EXPENSE_CATEGORIES.find((item) => item.key === expense.category) || EXPENSE_CATEGORIES[4];
  return <Panel style={{ padding: 13, marginBottom: 1 }}><View style={S.between}>
    <View style={[S.row, { gap: 5 }]}><IconButton icon="trash-can-outline" onPress={onDelete} accessibilityLabel="حذف المصروف" tint={C.red} size={17} /><IconButton icon="pencil-outline" onPress={onEdit} accessibilityLabel="تعديل المصروف" tint={C.olive} size={17} /></View>
    <View style={{ flex: 1, paddingRight: 10 }}><Text style={{ color: C.sand, fontWeight: "800", textAlign: "right" }}>{expense.description || category.label}</Text><Text style={{ color: C.muted, fontSize: 10, textAlign: "right", marginTop: 4 }}>{expense.date} · {category.label}</Text></View>
    <View style={[iconWrap, { backgroundColor: C.amberWash }]}><MaterialCommunityIcons name={category.icon as never} size={18} color={C.amber} /></View>
  </View><Text style={{ color: C.amber, textAlign: "left", fontSize: 14, fontWeight: "900", marginTop: -25, marginLeft: 98 }}>{money(expense.amount, currency)}</Text></Panel>;
}
const iconWrap = { width: 40, height: 40, borderRadius: 14, alignItems: "center" as const, justifyContent: "center" as const };
