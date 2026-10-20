import React, { useState } from "react";
import { Alert, Platform, Pressable, SafeAreaView, Text, View } from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { AppHeader, AppScroll, ChoiceChips, Field, IconButton, Panel, PrimaryButton, S, SectionTitle, SheetModal, askToConfirm } from "@/components/sales-ui";
import { C } from "@/constants/sales-theme";
import { DATA_KEYS } from "@/lib/sales-domain";
import type { Settings } from "@/lib/sales-domain";
import { useSalesStore } from "@/lib/sales-store";

const tell = (title: string, message: string) => Platform.OS === "web" && typeof window !== "undefined" ? window.alert(`${title}\n${message}`) : Alert.alert(title, message);
const COUNT_LABELS: Record<string, string> = { products: "منتج", customers: "عميل", sales: "فاتورة", expenses: "مصروف", stock_replenishments: "تعبئة", debt_payments: "تسديد" };

export default function SettingsScreen() {
  const store = useSalesStore();
  const [settings, setSettings] = useState<Settings>({ ...store.settings });
  const [backupData, setBackupData] = useState<Record<string, unknown> | null>(null);
  const [backupName, setBackupName] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [importSettings, setImportSettings] = useState(true);
  const save = () => { if (!settings.company.trim() || !settings.repName.trim()) return tell("بيانات ناقصة", "اسم الشركة واسم المندوب مطلوبان."); store.saveSettings(settings); tell("تم الحفظ", "حُفظت إعدادات التطبيق على هذا الجهاز."); };
  const exportBackup = async () => {
    try {
      const directory = FileSystem.cacheDirectory;
      if (!directory) throw new Error("مساحة الملفات المؤقتة غير متاحة");
      const uri = `${directory}مندوب_نسخة_احتياطية_${new Date().toISOString().slice(0, 10)}.json`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(store.backup(), null, 2));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "حفظ أو مشاركة النسخة الاحتياطية" });
      else tell("تم إنشاء النسخة", uri);
    } catch (error) { tell("تعذر التصدير", error instanceof Error ? error.message : "حاول مرة أخرى."); }
  };
  const chooseBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const raw = await FileSystem.readAsStringAsync(asset.uri);
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!DATA_KEYS.some((key) => Array.isArray(parsed[key]))) throw new Error("الملف لا يحتوي على بيانات نسخ احتياطي صالحة");
      setBackupData(parsed); setBackupName(asset.name); setMode("merge"); setImportSettings(true); setImportOpen(true);
    } catch (error) { tell("تعذر فتح النسخة الاحتياطية", error instanceof Error ? error.message : "الملف تالف أو غير صالح."); }
  };
  const commitImport = () => {
    if (!backupData) return;
    const apply = () => {
      try {
        const count = store.importBackup(backupData, mode, importSettings);
        setImportOpen(false); setBackupData(null);
        tell("اكتمل الاستيراد", `تمت معالجة ${count} سجلًا بطريقة ${mode === "merge" ? "الدمج" : "الاستبدال"}.`);
      } catch (error) { tell("تعذر الاستيراد", error instanceof Error ? error.message : "تعذر قراءة البيانات."); }
    };
    if (mode === "replace") askToConfirm("استبدال البيانات", "سيتم استبدال بيانات التطبيق الحالية. هل تريد المتابعة؟", apply);
    else apply();
  };
  const clearData = () => {
    askToConfirm("مسح البيانات", "سيتم مسح كل المنتجات والعملاء والفواتير والمصاريف. هل تريد المتابعة؟", () => {
      askToConfirm("تأكيد أخير", "لا يمكن التراجع عن هذا المسح. هل أنت متأكد؟", () => {
        store.clearAll();
        tell("تم المسح", "مُسحت السجلات المحلية.");
      });
    });
  };
  const countRecords = (key: string) => Array.isArray(backupData?.[key]) ? (backupData?.[key] as unknown[]).length : 0;
  return <SafeAreaView style={S.screen}>
    <AppHeader title="الإعدادات" subtitle="بيانات المندوب ونسخ التطبيق" showSettings={false} action={<IconButton icon="arrow-right" onPress={() => router.back()} accessibilityLabel="رجوع" />} />
    <AppScroll>
      <Panel style={{ gap: 12 }}><SectionTitle title="هوية النشاط" icon="badge-account-outline" />
        <Field label="اسم الشركة" value={settings.company} onChangeText={(company) => setSettings((s) => ({ ...s, company }))} />
        <Field label="اسم المندوب" value={settings.repName} onChangeText={(repName) => setSettings((s) => ({ ...s, repName }))} />
        <Field label="رقم الهاتف" value={settings.phone} onChangeText={(phone) => setSettings((s) => ({ ...s, phone }))} keyboardType="phone-pad" />
        <View style={S.row}><View style={{ flex: 1 }}><Field label="العملة" value={settings.currency} onChangeText={(currency) => setSettings((s) => ({ ...s, currency }))} /></View><View style={{ flex: 1 }}><Field label="هدف هامش الربح %" value={String(settings.marginTarget)} onChangeText={(v) => setSettings((s) => ({ ...s, marginTarget: Number(v) || 0 }))} keyboardType="decimal-pad" /></View></View>
        <PrimaryButton title="حفظ الإعدادات" icon="content-save-outline" onPress={save} />
      </Panel>
      <Panel style={{ gap: 13 }}><SectionTitle title="النسخ الاحتياطي" icon="cloud-lock-outline" /><Text style={{ color: C.muted, fontSize: 11, textAlign: "right", lineHeight: 18 }}>بياناتك محفوظة محليًا على هذا الجهاز. أنشئ نسخة JSON دورية لنقلها أو حفظها خارجيًا.</Text>
        <PrimaryButton title="تصدير نسخة احتياطية" icon="export-variant" onPress={exportBackup} />
        <Pressable onPress={chooseBackup} style={backupButton}><MaterialCommunityIcons name="file-import-outline" size={19} color={C.sand} /><Text style={{ color: C.sand, fontSize: 12, fontWeight: "800" }}>استيراد ملف JSON</Text></Pressable>
      </Panel>
      <Panel style={{ gap: 11 }}><SectionTitle title="حماية البيانات" icon="shield-check-outline" /><Text style={{ color: C.muted, fontSize: 11, textAlign: "right", lineHeight: 18 }}>احذف السجلات المحلية بعد تصدير نسخة احتياطية إذا كنت تريد البدء من جديد.</Text><Pressable onPress={clearData} style={dangerButton}><MaterialCommunityIcons name="delete-sweep-outline" size={18} color={C.red} /><Text style={{ color: C.red, fontSize: 12, fontWeight: "900" }}>مسح كل البيانات</Text></Pressable></Panel>
      <View style={{ alignItems: "center", paddingVertical: 10 }}><Text style={{ color: C.faint, fontSize: 10 }}>مندوب المبيعات · إصدار 3.0 · حفظ محلي دون اتصال</Text></View>
    </AppScroll>
    <SheetModal visible={importOpen} title="معاينة النسخة الاحتياطية" onClose={() => { setImportOpen(false); setBackupData(null); }}>
      <Panel style={{ marginBottom: 14, gap: 7 }}><Text style={{ color: C.sand, textAlign: "right", fontWeight: "800" }}>{backupName}</Text><Text style={{ color: C.muted, textAlign: "right", fontSize: 11 }}>{backupData?.exportedAt ? `تاريخ التصدير: ${new Date(String(backupData.exportedAt)).toLocaleString("ar-DZ")}` : "تاريخ التصدير غير محدد"}</Text></Panel>
      <View style={[S.row, { flexWrap: "wrap", gap: 8, marginBottom: 14 }]}>{DATA_KEYS.map((key) => <View key={key} style={countCard}><Text style={{ color: C.olive, fontSize: 19, fontWeight: "900" }}>{countRecords(key)}</Text><Text style={{ color: C.muted, fontSize: 10 }}>{COUNT_LABELS[key]}</Text></View>)}</View>
      <SectionTitle title="طريقة الاستيراد" /><ChoiceChips value={mode} onChange={setMode} options={[{ value: "merge", label: "دمج مع الحالي" }, { value: "replace", label: "استبدال الحالي" }]} />
      {mode === "replace" ? <Text style={{ color: C.amber, backgroundColor: C.amberWash, padding: 11, borderRadius: 12, marginTop: 10, textAlign: "right", fontSize: 11 }}>سيتم حذف السجلات الحالية واستبدالها بهذه النسخة بعد التأكيد.</Text> : <Text style={{ color: C.muted, marginTop: 10, textAlign: "right", fontSize: 11 }}>ستُضاف السجلات إلى بياناتك الحالية بمعرّفات جديدة.</Text>}
      <Pressable onPress={() => setImportSettings((value) => !value)} style={[S.between, { paddingVertical: 15 }]}><View style={[toggle, importSettings && { backgroundColor: C.olive }]}><View style={[toggleBall, importSettings && { alignSelf: "flex-end" }]} /></View><Text style={{ color: C.sand, fontSize: 12 }}>استيراد إعدادات الشركة أيضًا</Text></Pressable>
      <PrimaryButton title="متابعة الاستيراد" icon="database-import-outline" onPress={commitImport} />
    </SheetModal>
  </SafeAreaView>;
}
const backupButton = { minHeight: 48, borderRadius: 15, backgroundColor: C.cardRaised, borderWidth: 1, borderColor: C.line, paddingHorizontal: 16, flexDirection: "row-reverse" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 9 };
const dangerButton = { minHeight: 45, borderRadius: 14, backgroundColor: C.redWash, borderWidth: 1, borderColor: "#65413D", flexDirection: "row-reverse" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8 };
const countCard = { width: "30%" as const, minHeight: 72, borderRadius: 14, backgroundColor: C.card, alignItems: "center" as const, justifyContent: "center" as const, gap: 3 };
const toggle = { width: 42, height: 24, borderRadius: 15, backgroundColor: C.line, padding: 3 };
const toggleBall = { width: 18, height: 18, borderRadius: 9, backgroundColor: C.sand, alignSelf: "flex-start" as const };
