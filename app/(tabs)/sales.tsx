import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, SafeAreaView, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { AppHeader, AppScroll, ChoiceChips, EmptyState, Field, IconButton, Panel, PrimaryButton, S, SearchField, SectionTitle, SheetModal } from "@/components/sales-ui";
import { C } from "@/constants/sales-theme";
import { marginAmount, money, PRICE_LABEL, productPrice, saleTotals } from "@/lib/sales-domain";
import type { CartLine, PriceType, Sale } from "@/lib/sales-domain";
import { useSalesStore } from "@/lib/sales-store";
import { printSaleReceipt } from "@/lib/printing";

const tell = (title: string, message: string) => Platform.OS === "web" && typeof window !== "undefined" ? window.alert(`${title}\n${message}`) : Alert.alert(title, message);
const confirm = (message: string, action: () => void) => Platform.OS === "web" && typeof window !== "undefined" ? (window.confirm(message) && action()) : Alert.alert("تأكيد الحذف", message, [{ text: "إلغاء", style: "cancel" }, { text: "حذف", style: "destructive", onPress: action }]);

export default function SalesScreen() {
  const store = useSalesStore();
  const [query, setQuery] = useState("");
  const [saleOpen, setSaleOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [priceType, setPriceType] = useState<PriceType>("retail");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");
  const [paymentType, setPaymentType] = useState("نقدي");
  const [notes, setNotes] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [detail, setDetail] = useState<Sale | null>(null);
  const shownSales = useMemo(() => [...store.sales].sort((a, b) => b.id - a.id).filter((sale) => !query || `${sale.customerName} ${sale.id}`.toLowerCase().includes(query.toLowerCase())), [store.sales, query]);
  const totals = saleTotals(cart, Number(discount) || 0, Number(paid) || 0);
  const visibleProducts = store.products.filter((product) => product.stock > 0 && product.name.toLowerCase().includes(productQuery.toLowerCase())).slice(0, 8);
  const startSale = () => { setCart([]); setPriceType("retail"); setCustomerId(null); setDiscount(""); setPaid(""); setPaymentType("نقدي"); setNotes(""); setProductQuery(""); setSaleOpen(true); };
  const addProduct = (product: (typeof store.products)[number]) => setCart((current) => {
    const existing = current.find((line) => line.product.id === product.id);
    if (existing) { if (existing.quantity >= product.stock) { tell("المخزون غير كافٍ", `لا تتجاوز كمية ${product.name} المتاحة.`); return current; } return current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line); }
    return [...current, { product, quantity: 1, price: productPrice(product, priceType) }];
  });
  const changePrice = (type: PriceType) => { setPriceType(type); setCart((items) => items.map((line) => ({ ...line, price: productPrice(line.product, type) }))); };
  const quantity = (productId: number, delta: number) => setCart((items) => items.map((line) => line.product.id !== productId ? line : { ...line, quantity: Math.min(line.product.stock, Math.max(1, line.quantity + delta)) }));
  const saveSale = () => {
    try {
      const sale = store.createSale({ customerId, priceType, cart, discount: Number(discount) || 0, paid: Number(paid) || 0, paymentType, notes });
      setSaleOpen(false); setDetail(sale); setDetailOpen(true);
    } catch (error) { tell("تعذر حفظ الفاتورة", error instanceof Error ? error.message : "تحقق من البيانات"); }
  };
  const print = async (sale: Sale) => { try { await printSaleReceipt(sale, store.settings); } catch { tell("تعذرت الطباعة", "لم يتم فتح خدمة الطباعة على هذا الجهاز."); } };
  return <SafeAreaView style={S.screen}>
    <AppHeader title="المبيعات" subtitle={`${store.sales.length} فاتورة محفوظة`} action={<IconButton icon="cart-plus" onPress={startSale} accessibilityLabel="بيع جديد" tint={C.olive} />} />
    <AppScroll>
      <View style={[S.between, { backgroundColor: C.oliveWash, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: C.line }]}><View><Text style={{ color: C.sand, fontSize: 16, fontWeight: "900", textAlign: "right" }}>فاتورة جديدة</Text><Text style={{ color: C.muted, fontSize: 11, textAlign: "right", marginTop: 4 }}>سجّل البيع واطبع الإيصال مباشرة</Text></View><PrimaryButton title="ابدأ البيع" icon="plus" onPress={startSale} /></View>
      <SearchField value={query} onChangeText={setQuery} placeholder="ابحث برقم الفاتورة أو العميل" />
      <SectionTitle title="سجل الفواتير" icon="receipt-text-outline" />
      {shownSales.length ? shownSales.map((sale) => <Pressable key={sale.id} onPress={() => { setDetail(sale); setDetailOpen(true); }} style={({ pressed }) => [saleCard, pressed ? { opacity: 0.78 } : null]}>
        <View style={S.between}><View style={{ alignItems: "flex-start" }}><Text style={{ color: C.sand, fontSize: 15, fontWeight: "900" }}>{money(sale.total, store.settings.currency)}</Text><View style={[S.row, { gap: 4, marginTop: 5 }]}><MaterialCommunityIcons name={sale.remaining > 0 ? "clock-alert-outline" : "check-circle-outline"} size={12} color={sale.remaining > 0 ? C.amber : C.green} /><Text style={{ color: sale.remaining > 0 ? C.amber : C.green, fontSize: 10 }}>{sale.remaining > 0 ? `باقي ${money(sale.remaining, store.settings.currency)}` : "مسددة"}</Text></View></View><View style={{ flex: 1 }}><Text style={{ color: C.sand, textAlign: "right", fontWeight: "800" }}>فاتورة #{sale.id} · {sale.customerName}</Text><Text style={{ color: C.muted, fontSize: 10, textAlign: "right", marginTop: 5 }}>{PRICE_LABEL[sale.priceType]} · {sale.paymentType} · {new Date(sale.date).toLocaleDateString("ar-DZ")}</Text></View><View style={saleBadge}><MaterialCommunityIcons name="receipt" size={19} color={C.olive} /></View></View>
        <View style={[S.between, { borderTopWidth: 1, borderColor: C.line, paddingTop: 9, marginTop: 12 }]}><Text style={{ color: C.green, fontSize: 10, fontWeight: "700" }}>ربح {money(sale.grossProfit, store.settings.currency)}</Text><Text style={{ color: C.faint, fontSize: 10 }}>{sale.items.length} أصناف</Text></View>
      </Pressable>) : <EmptyState title="لا توجد مبيعات بعد" subtitle="أنشئ فاتورة البيع الأولى" icon="receipt-text-outline" />}
    </AppScroll>
    <SheetModal visible={saleOpen} title="إنشاء فاتورة" onClose={() => setSaleOpen(false)}>
      <SectionTitle title="نوع السعر" icon="tag-outline" />
      <ChoiceChips value={priceType} onChange={changePrice} options={[{ value: "factory", label: "مصنع" }, { value: "wholesale", label: "جملة" }, { value: "retail", label: "تجزئة" }]} />
      <View style={{ height: 12 }} /><SectionTitle title="العميل" icon="account-outline" />
      <ChoiceChips value={customerId === null ? "walk-in" : String(customerId)} onChange={(v) => setCustomerId(v === "walk-in" ? null : Number(v))} options={[{ value: "walk-in", label: "عميل عرضي" }, ...store.customers.map((c) => ({ value: String(c.id), label: c.name }))]} />
      <View style={{ height: 12 }} /><SectionTitle title="أضف منتجات" icon="package-variant-closed" />
      <SearchField value={productQuery} onChangeText={setProductQuery} placeholder="ابحث عن منتج متاح" />
      <View style={{ gap: 7, marginTop: 8 }}>{visibleProducts.map((product) => <Pressable key={product.id} onPress={() => addProduct(product)} style={({ pressed }) => [productPick, pressed && { opacity: 0.7 }]}>
        <View style={[S.row, { gap: 7 }]}><MaterialCommunityIcons name="plus-circle-outline" size={21} color={C.olive} /><Text style={{ color: C.sand, fontWeight: "900" }}>{money(productPrice(product, priceType), store.settings.currency)}</Text></View><View style={{ flex: 1 }}><Text style={{ color: C.sand, textAlign: "right", fontWeight: "800" }}>{product.name}</Text><Text style={{ color: C.muted, textAlign: "right", fontSize: 10, marginTop: 3 }}>متاح {product.stock} {product.unit}</Text></View>
      </Pressable>)}</View>
      <View style={{ height: 12 }} /><SectionTitle title={`السلة (${cart.length})`} icon="cart-outline" />
      {cart.length ? <View style={{ gap: 8, marginTop: 8 }}>{cart.map((line) => <Panel key={line.product.id} style={{ padding: 11 }}><View style={S.between}><Pressable onPress={() => setCart((items) => items.filter((item) => item.product.id !== line.product.id))}><MaterialCommunityIcons name="delete-outline" size={19} color={C.red} /></Pressable><View style={{ flex: 1 }}><Text style={{ color: C.sand, textAlign: "right", fontWeight: "800" }}>{line.product.name}</Text><Text style={{ color: C.muted, textAlign: "right", fontSize: 10, marginTop: 3 }}>{money(line.price, store.settings.currency)} / وحدة</Text></View><View style={[S.row, { gap: 12, marginHorizontal: 9 }]}><Pressable onPress={() => quantity(line.product.id, 1)}><MaterialCommunityIcons name="plus-circle" size={22} color={C.olive} /></Pressable><Text style={{ color: C.sand, fontWeight: "900" }}>{line.quantity}</Text><Pressable onPress={() => line.quantity > 1 && quantity(line.product.id, -1)}><MaterialCommunityIcons name="minus-circle-outline" size={22} color={C.muted} /></Pressable></View><Text style={{ color: C.olive, fontWeight: "900" }}>{money(line.price * line.quantity, store.settings.currency)}</Text></View><Text style={{ color: marginAmount(line.product.factoryPrice, line.price, line.quantity) >= 0 ? C.green : C.red, fontSize: 10, textAlign: "left", marginTop: 7 }}>هامش {money(marginAmount(line.product.factoryPrice, line.price, line.quantity), store.settings.currency)} · {((line.price - line.product.factoryPrice) / (line.price || 1) * 100).toFixed(1)}%</Text></Panel>)}</View> : <Text style={{ color: C.faint, textAlign: "center", fontSize: 11, padding: 10 }}>اختر صنفًا من القائمة لإضافته</Text>}
      <View style={{ height: 12 }} /><View style={S.row}><View style={{ flex: 1 }}><Field label="الخصم" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" prefix={store.settings.currency} /></View><View style={{ flex: 1 }}><Field label="المدفوع" value={paid} onChangeText={setPaid} keyboardType="decimal-pad" prefix={store.settings.currency} /></View></View>
      <SectionTitle title="طريقة الدفع" /><ChoiceChips value={paymentType} onChange={setPaymentType} options={[{ value: "نقدي", label: "نقدي" }, { value: "آجل", label: "آجل" }, { value: "تحويل", label: "تحويل" }]} />
      <View style={{ height: 9 }} /><Field label="ملاحظات" value={notes} onChangeText={setNotes} multiline placeholder="اختياري" />
      <Panel style={{ gap: 9, marginVertical: 7 }}><TotalRow label="المجموع" value={money(totals.subtotal, store.settings.currency)} /><TotalRow label="الخصم" value={`− ${money(Number(discount) || 0, store.settings.currency)}`} color={C.amber} /><TotalRow label="الإجمالي" value={money(totals.total, store.settings.currency)} strong /><TotalRow label="ربح البيع" value={money(totals.grossProfit, store.settings.currency)} color={C.green} /><TotalRow label="المتبقي" value={money(totals.remaining, store.settings.currency)} color={totals.remaining > 0 ? C.amber : C.green} /></Panel>
      <PrimaryButton title="حفظ الفاتورة" icon="check" onPress={saveSale} disabled={!cart.length} />
    </SheetModal>
    <SheetModal visible={detailOpen} title={detail ? `فاتورة #${detail.id}` : "تفاصيل الفاتورة"} onClose={() => setDetailOpen(false)}>
      {detail ? <>
        <Panel style={{ gap: 9 }}><View style={S.between}><Text style={{ color: C.sand, fontWeight: "900" }}>{detail.customerName}</Text><Text style={{ color: C.muted, fontSize: 11 }}>{new Date(detail.date).toLocaleString("ar-DZ")}</Text></View><Text style={{ color: C.muted, fontSize: 11, textAlign: "right" }}>{PRICE_LABEL[detail.priceType]} · {detail.paymentType}</Text></Panel>
        <SectionTitle title="تفاصيل الأصناف" icon="format-list-bulleted" />
        {detail.items.map((item, index) => <View key={`${item.productId}-${index}`} style={[S.between, { paddingVertical: 10, borderBottomWidth: 1, borderColor: C.line }]}><Text style={{ color: C.sand, fontSize: 12, fontWeight: "800" }}>{money(item.total, store.settings.currency)}</Text><View><Text style={{ color: C.sand, textAlign: "right", fontWeight: "700" }}>{item.name}</Text><Text style={{ color: C.faint, textAlign: "right", fontSize: 10, marginTop: 3 }}>{item.qty} × {money(item.price, store.settings.currency)}</Text></View></View>)}
        <Panel style={{ gap: 8, marginTop: 12 }}><TotalRow label="الإجمالي" value={money(detail.total, store.settings.currency)} strong /><TotalRow label="الربح الإجمالي" value={money(detail.grossProfit, store.settings.currency)} color={C.green} /><TotalRow label="المدفوع" value={money(detail.paid, store.settings.currency)} /><TotalRow label="المتبقي" value={money(detail.remaining, store.settings.currency)} color={detail.remaining > 0 ? C.amber : C.green} /></Panel>
        <View style={[S.row, { gap: 8, marginTop: 12 }]}><PrimaryButton title="طباعة الإيصال" icon="printer-outline" onPress={() => print(detail)} style={{ flex: 1 }} /><PrimaryButton title="إغلاق" icon="check" onPress={() => setDetailOpen(false)} style={{ flex: 1, backgroundColor: C.cardRaised }} /></View>
        <Pressable onPress={() => confirm(`حذف الفاتورة رقم ${detail.id} وإرجاع كمياتها إلى المخزون؟`, () => { store.deleteSale(detail.id); setDetailOpen(false); })} style={{ alignItems: "center", padding: 14 }}><Text style={{ color: C.red, fontWeight: "800" }}>حذف الفاتورة وإرجاع المخزون</Text></Pressable>
      </> : null}
    </SheetModal>
  </SafeAreaView>;
}
function TotalRow({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return <View style={S.between}><Text style={{ color: color || (strong ? C.olive : C.sand), fontSize: strong ? 15 : 12, fontWeight: strong ? "900" : "700" }}>{value}</Text><Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text></View>;
}
const saleCard = { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14 };
const saleBadge = { width: 42, height: 42, borderRadius: 14, backgroundColor: C.oliveWash, alignItems: "center" as const, justifyContent: "center" as const };
const productPick = { flexDirection: "row-reverse" as const, alignItems: "center" as const, gap: 10, padding: 11, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line };
