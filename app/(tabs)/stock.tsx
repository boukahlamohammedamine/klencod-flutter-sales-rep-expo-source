import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, SafeAreaView, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { AppHeader, AppScroll, ChoiceChips, EmptyState, Field, IconButton, Panel, PrimaryButton, S, SearchField, SectionTitle, SheetModal } from "@/components/sales-ui";
import { C } from "@/constants/sales-theme";
import { marginPercent, money, todayISO } from "@/lib/sales-domain";
import type { Product } from "@/lib/sales-domain";
import { useSalesStore } from "@/lib/sales-store";

const tell = (title: string, message: string) => Platform.OS === "web" && typeof window !== "undefined" ? window.alert(`${title}\n${message}`) : Alert.alert(title, message);
const confirm = (title: string, message: string, action: () => void) => Platform.OS === "web" && typeof window !== "undefined" ? (window.confirm(message) && action()) : Alert.alert(title, message, [{ text: "إلغاء", style: "cancel" }, { text: "حذف", style: "destructive", onPress: action }]);

export default function StockScreen() {
  const store = useSalesStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [productOpen, setProductOpen] = useState(false);
  const [replenishOpen, setReplenishOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", unit: "قطعة", stock: "0", minStock: "5", factoryPrice: "", wholesalePrice: "", retailPrice: "" });
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [replenishMeta, setReplenishMeta] = useState({ date: todayISO(), voucher: "", note: "" });
  const visible = useMemo(() => store.products.filter((p) => {
    if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "low" && (p.stock <= 0 || p.stock > p.minStock)) return false;
    if (filter === "out" && p.stock > 0) return false;
    return true;
  }).sort((a, b) => a.stock - b.stock), [store.products, query, filter]);
  const lowCount = store.products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  const openForm = (product?: Product) => {
    setEditing(product || null);
    setForm(product ? { name: product.name, unit: product.unit, stock: String(product.stock), minStock: String(product.minStock), factoryPrice: String(product.factoryPrice), wholesalePrice: String(product.wholesalePrice), retailPrice: String(product.retailPrice) } : { name: "", unit: "قطعة", stock: "0", minStock: "5", factoryPrice: "", wholesalePrice: "", retailPrice: "" });
    setProductOpen(true);
  };
  const updateForm = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = () => {
    if (!form.name.trim()) return tell("بيانات ناقصة", "أدخل اسم المنتج أولًا.");
    store.saveProduct({ ...(editing ? { id: editing.id } : {}), name: form.name, unit: form.unit || "قطعة", stock: Math.max(0, Number(form.stock) || 0), minStock: Number(form.minStock) || 5, factoryPrice: Number(form.factoryPrice) || 0, wholesalePrice: Number(form.wholesalePrice) || 0, retailPrice: Number(form.retailPrice) || 0 });
    setProductOpen(false);
  };
  const saveReplenishment = () => {
    const items = store.products.map((p) => ({ productId: p.id, name: p.name, qty: Math.max(0, Number(quantities[p.id]) || 0) })).filter((item) => item.qty > 0);
    if (!items.length) return tell("لا توجد كميات", "أدخل كمية لصنف واحد على الأقل.");
    store.replenish({ date: `${replenishMeta.date}T${new Date().toTimeString().slice(0, 8)}`, voucher: replenishMeta.voucher, note: replenishMeta.note, items });
    setReplenishOpen(false); setQuantities({});
  };
  const openReplenish = () => {
    setQuantities(Object.fromEntries(store.products.map((p) => [p.id, "0"])));
    setReplenishMeta({ date: todayISO(), voucher: "", note: "" });
    setReplenishOpen(true);
  };
  return <SafeAreaView style={S.screen}>
    <AppHeader title="المخزون" subtitle={`${store.products.length} صنف · ${lowCount} بحاجة للمتابعة`} action={<IconButton icon="package-variant-plus" onPress={() => openForm()} accessibilityLabel="إضافة منتج" tint={C.olive} />} />
    <AppScroll>
      <Pressable accessibilityRole="button" accessibilityLabel="تعبئة المخزون" accessibilityState={{ disabled: store.products.length === 0 }} disabled={store.products.length === 0} onPress={openReplenish} style={({ pressed }) => [replenishAction, store.products.length === 0 ? { opacity: 0.55 } : null, pressed ? { opacity: 0.82, transform: [{ scale: 0.99 }] } : null]}>
        <View style={replenishIcon}><MaterialCommunityIcons name="tray-arrow-down" size={23} color={C.bg} /></View>
        <View style={{ flex: 1, gap: 4 }}><Text style={{ color: C.sand, fontSize: 15, fontWeight: "900", textAlign: "right" }}>تعبئة المخزون</Text><Text style={{ color: C.muted, fontSize: 11, textAlign: "right" }}>{store.products.length ? "تسجيل الأصناف المستلمة وإضافة الكميات إلى الرصيد" : "أضف منتجًا أولًا لتسجيل التعبئة"}</Text></View>
        <MaterialCommunityIcons name="chevron-left" size={20} color={C.olive} />
      </Pressable>
      <SearchField value={query} onChangeText={setQuery} placeholder="ابحث عن منتج" />
      <ChoiceChips value={filter} onChange={setFilter} options={[{ value: "all", label: `الكل ${store.products.length}` }, { value: "low", label: `منخفض ${lowCount}` }, { value: "out", label: "نافد" }]} />
      <SectionTitle title="قائمة الأصناف" icon="package-variant-closed" />
      {visible.length ? visible.map((product) => <ProductCard key={product.id} product={product} currency={store.settings.currency} onEdit={() => openForm(product)} onDelete={() => confirm("حذف المنتج؟", `سيتم حذف «${product.name}» من قائمة الأصناف.`, () => store.deleteProduct(product.id))} />) : <EmptyState title="لا توجد أصناف مطابقة" subtitle="أضف منتجًا أو غيّر التصفية" icon="package-variant" />}
      <Panel style={{ gap: 10 }}><SectionTitle title="آخر تعبئة" icon="truck-fast-outline" />{store.stock_replenishments.length ? [...store.stock_replenishments].reverse().slice(0, 3).map((receipt) => <View key={receipt.id} style={[S.between, { borderTopColor: C.line, borderTopWidth: 1, paddingTop: 9 }]}><Text style={{ color: C.olive, fontWeight: "800", fontSize: 12 }}>{receipt.items.length} أصناف</Text><Text style={{ color: C.muted, fontSize: 11 }}>{receipt.voucher || receipt.date.slice(0, 10)}</Text></View>) : <Text style={{ color: C.faint, fontSize: 12, textAlign: "right" }}>لم تُسجّل تعبئة بعد</Text>}</Panel>
    </AppScroll>
    <SheetModal visible={productOpen} title={editing ? "تعديل المنتج" : "منتج جديد"} onClose={() => setProductOpen(false)}>
      <Field label="اسم المنتج" value={form.name} onChangeText={(v) => updateForm("name", v)} placeholder="مثال: زيت نباتي 1L" />
      <View style={S.row}><View style={{ flex: 1 }}><Field label="الوحدة" value={form.unit} onChangeText={(v) => updateForm("unit", v)} placeholder="قطعة" /></View><View style={{ flex: 1 }}><Field label="الكمية المتاحة" value={form.stock} onChangeText={(v) => updateForm("stock", v)} keyboardType="decimal-pad" /></View></View>
      <Field label="الحد الأدنى للمخزون" value={form.minStock} onChangeText={(v) => updateForm("minStock", v)} keyboardType="decimal-pad" />
      <SectionTitle title="الأسعار" icon="tag-outline" />
      <View style={S.row}><View style={{ flex: 1 }}><Field label="سعر المصنع" value={form.factoryPrice} onChangeText={(v) => updateForm("factoryPrice", v)} keyboardType="decimal-pad" prefix={store.settings.currency} /></View><View style={{ flex: 1 }}><Field label="سعر الجملة" value={form.wholesalePrice} onChangeText={(v) => updateForm("wholesalePrice", v)} keyboardType="decimal-pad" prefix={store.settings.currency} /></View></View>
      <Field label="سعر التجزئة" value={form.retailPrice} onChangeText={(v) => updateForm("retailPrice", v)} keyboardType="decimal-pad" prefix={store.settings.currency} />
      {Number(form.factoryPrice) > 0 ? <Panel style={{ padding: 12 }}><Text style={{ color: C.muted, fontSize: 11, textAlign: "right" }}>الهامش: جملة {marginPercent(Number(form.factoryPrice), Number(form.wholesalePrice)).toFixed(1)}% · تجزئة {marginPercent(Number(form.factoryPrice), Number(form.retailPrice)).toFixed(1)}%</Text></Panel> : null}
      <PrimaryButton title="حفظ المنتج" icon="content-save-outline" onPress={save} />
      {editing ? <Pressable onPress={() => confirm("حذف المنتج؟", `حذف «${editing.name}»؟`, () => { store.deleteProduct(editing.id); setProductOpen(false); })} style={{ alignItems: "center", padding: 14 }}><Text style={{ color: C.red, fontWeight: "800" }}>حذف هذا المنتج</Text></Pressable> : null}
    </SheetModal>
    <SheetModal visible={replenishOpen} title="استلام تعبئة المخزون" onClose={() => setReplenishOpen(false)}>
      <Field label="تاريخ الاستلام (YYYY-MM-DD)" value={replenishMeta.date} onChangeText={(v) => setReplenishMeta((m) => ({ ...m, date: v }))} />
      <Field label="رقم الوصل" value={replenishMeta.voucher} onChangeText={(v) => setReplenishMeta((m) => ({ ...m, voucher: v }))} />
      <View style={{ gap: 8, marginVertical: 12 }}>{store.products.map((product) => <View key={product.id} style={[S.between, { backgroundColor: C.card, padding: 12, borderRadius: 13 }]}>
        <View style={{ width: 84 }}><Field label="الكمية" value={quantities[product.id] || "0"} onChangeText={(v) => setQuantities((q) => ({ ...q, [product.id]: v }))} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Text style={{ color: C.sand, fontSize: 12, fontWeight: "800", textAlign: "right" }}>{product.name}</Text><Text style={{ color: C.muted, fontSize: 10, textAlign: "right", marginTop: 4 }}>المخزون الحالي {product.stock} {product.unit}</Text></View>
      </View>)}</View>
      <Field label="ملاحظة" value={replenishMeta.note} onChangeText={(v) => setReplenishMeta((m) => ({ ...m, note: v }))} multiline placeholder="اختياري" />
      <PrimaryButton title="تأكيد الاستلام" icon="check" onPress={saveReplenishment} />
    </SheetModal>
  </SafeAreaView>;
}

function ProductCard({ product, currency, onEdit, onDelete }: { product: Product; currency: string; onEdit: () => void; onDelete: () => void }) {
  const tone = product.stock <= 0 ? C.red : product.stock <= product.minStock ? C.amber : C.green;
  return <Panel style={{ gap: 12, padding: 14 }}>
    <View style={S.between}>
      <View style={S.row}><IconButton icon="trash-can-outline" onPress={onDelete} accessibilityLabel="حذف المنتج" tint={C.red} size={18} /><IconButton icon="pencil-outline" onPress={onEdit} accessibilityLabel="تعديل المنتج" tint={C.olive} size={18} /></View>
      <View style={{ flex: 1, paddingRight: 12 }}><Text style={{ color: C.sand, fontSize: 15, fontWeight: "900", textAlign: "right" }}>{product.name}</Text><Text style={{ color: C.muted, fontSize: 10, textAlign: "right", marginTop: 4 }}>{product.unit} · حد أدنى {product.minStock}</Text></View>
      <View style={[badge, { backgroundColor: `${tone}18` }]}><Text style={{ color: tone, fontWeight: "900", fontSize: 12 }}>{product.stock}</Text></View>
    </View>
    <View style={[S.row, { gap: 8 }]}>{[["مصنع", product.factoryPrice], ["جملة", product.wholesalePrice], ["تجزئة", product.retailPrice]].map(([label, price]) => <View key={String(label)} style={priceBox}><Text style={{ color: C.faint, fontSize: 9, textAlign: "right" }}>{label}</Text><Text style={{ color: C.paper, fontSize: 11, fontWeight: "800", textAlign: "right", marginTop: 4 }}>{money(Number(price), currency)}</Text></View>)}</View>
    <View style={[S.between, { paddingHorizontal: 3 }]}><Text style={{ color: C.green, fontSize: 10, fontWeight: "800" }}>هامش التجزئة {marginPercent(product.factoryPrice, product.retailPrice).toFixed(1)}%</Text><Text style={{ color: C.olive, fontSize: 10, fontWeight: "800" }}>هامش الجملة {marginPercent(product.factoryPrice, product.wholesalePrice).toFixed(1)}%</Text></View>
  </Panel>;
}
const replenishAction = { minHeight: 72, flexDirection: "row-reverse" as const, alignItems: "center" as const, gap: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.olive, borderRadius: 18 };
const replenishIcon = { width: 46, height: 46, borderRadius: 15, backgroundColor: C.olive, alignItems: "center" as const, justifyContent: "center" as const };
const badge = { width: 46, height: 46, borderRadius: 16, alignItems: "center" as const, justifyContent: "center" as const };
const priceBox = { flex: 1, backgroundColor: C.surface, borderRadius: 11, padding: 9 };
