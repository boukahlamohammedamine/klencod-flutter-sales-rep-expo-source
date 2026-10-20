import React from "react";
import { Alert, KeyboardTypeOptions, Modal, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { C, R } from "@/constants/sales-theme";

export const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 30, gap: 16 },
  row: { flexDirection: "row-reverse", alignItems: "center" },
  between: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  textRight: { textAlign: "right", writingDirection: "rtl" },
  title: { color: C.sand, fontSize: 22, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  subtitle: { color: C.muted, fontSize: 12, textAlign: "right", writingDirection: "rtl", marginTop: 3 },
  card: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, padding: 16 },
  label: { color: C.muted, fontSize: 12, fontWeight: "700", textAlign: "right", writingDirection: "rtl" },
  value: { color: C.sand, fontSize: 18, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  field: { backgroundColor: C.surface, color: C.sand, borderWidth: 1, borderColor: C.line, borderRadius: R.control, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, textAlign: "right", writingDirection: "rtl" },
});

export function AppHeader({ title, subtitle, showSettings = true, action }: { title: string; subtitle?: string; showSettings?: boolean; action?: React.ReactNode }) {
  return <View style={[S.between, { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14 }]}>
    <View style={{ flex: 1 }}><Text style={S.title}>{title}</Text>{subtitle ? <Text style={S.subtitle}>{subtitle}</Text> : null}</View>
    <View style={[S.row, { gap: 8 }]}>{action}{showSettings ? <IconButton icon="cog-outline" onPress={() => router.push("/settings")} accessibilityLabel="الإعدادات" /> : null}</View>
  </View>;
}

export function AppScroll({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[S.scroll, style]}>{children}</ScrollView>;
}

export function IconButton({ icon, onPress, accessibilityLabel, tint = C.sand, size = 20 }: { icon: string; onPress: () => void; accessibilityLabel: string; tint?: string; size?: number }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
    <MaterialCommunityIcons name={icon as never} size={size} color={tint} />
  </Pressable>;
}

export function Panel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[S.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action, icon }: { title: string; action?: React.ReactNode; icon?: string }) {
  return <View style={[S.between, { marginBottom: 2 }]}>
    <View style={[S.row, { gap: 8 }]}>{icon ? <MaterialCommunityIcons name={icon as never} size={17} color={C.olive} /> : null}<Text style={{ color: C.sand, fontSize: 15, fontWeight: "900", textAlign: "right" }}>{title}</Text></View>
    {action}
  </View>;
}

export function StatCard({ label, value, icon, tone = "olive", hint }: { label: string; value: string; icon: string; tone?: "olive" | "green" | "amber" | "red" | "blue"; hint?: string }) {
  const color = { olive: C.olive, green: C.green, amber: C.amber, red: C.red, blue: C.blue }[tone];
  return <View style={[styles.statCard, { borderRightColor: color }]}>
    <View style={[S.between, { alignItems: "flex-start" }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}><MaterialCommunityIcons name={icon as never} size={17} color={color} /></View>
      <Text style={S.label}>{label}</Text>
    </View>
    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.statValue, { color }]}>{value}</Text>
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>;
}

export function PrimaryButton({ title, icon, onPress, style, disabled }: { title: string; icon?: string; onPress: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.primary, style, pressed ? styles.pressed : null, disabled ? styles.disabled : null]}>
    {icon ? <MaterialCommunityIcons name={icon as never} size={18} color={C.bg} /> : null}<Text style={styles.primaryText}>{title}</Text>
  </Pressable>;
}
export function QuietButton({ title, icon, onPress, style }: { title: string; icon?: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quiet, style, pressed ? styles.pressed : null]}>
    {icon ? <MaterialCommunityIcons name={icon as never} size={17} color={C.sand} /> : null}<Text style={styles.quietText}>{title}</Text>
  </Pressable>;
}

export function SearchField({ value, onChangeText, placeholder = "ابحث هنا..." }: { value: string; onChangeText: (value: string) => void; placeholder?: string }) {
  return <View style={styles.search}>
    <MaterialCommunityIcons name="magnify" size={19} color={C.faint} />
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.faint} style={[S.field, { flex: 1, borderWidth: 0, backgroundColor: "transparent", paddingVertical: 10 }]} />
  </View>;
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, multiline, prefix }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: KeyboardTypeOptions; multiline?: boolean; prefix?: string }) {
  return <View style={{ gap: 7, marginBottom: 12 }}>
    <Text style={S.label}>{label}</Text>
    <View style={[S.row, styles.fieldWrap, multiline ? { alignItems: "flex-start" } : null]}>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.faint} keyboardType={keyboardType} multiline={multiline} textAlignVertical={multiline ? "top" : "center"} style={[S.field, { flex: 1, borderWidth: 0 }, multiline ? { minHeight: 82 } : null]} />
      {prefix ? <Text style={{ color: C.muted, fontSize: 12, paddingRight: 10 }}>{prefix}</Text> : null}
    </View>
  </View>;
}

export function ChoiceChips<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return <View style={[S.row, { flexWrap: "wrap", gap: 8 }]}>{options.map((option) => {
    const active = value === option.value;
    return <Pressable key={option.value} onPress={() => onChange(option.value)} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={{ color: active ? C.bg : C.muted, fontSize: 12, fontWeight: "800" }}>{option.label}</Text>
    </Pressable>;
  })}</View>;
}

export function EmptyState({ title, subtitle, icon = "inbox-outline" }: { title: string; subtitle?: string; icon?: string }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><MaterialCommunityIcons name={icon as never} size={25} color={C.olive} /></View><Text style={{ color: C.sand, fontSize: 14, fontWeight: "800" }}>{title}</Text>{subtitle ? <Text style={{ color: C.muted, fontSize: 12, textAlign: "center" }}>{subtitle}</Text> : null}</View>;
}

export function SheetModal({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><View style={styles.sheet}>
      <View style={styles.handle} /><View style={[S.between, { marginBottom: 18 }]}><Text style={styles.sheetTitle}>{title}</Text><IconButton icon="close" onPress={onClose} accessibilityLabel="إغلاق" /></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 30 }}>{children}</ScrollView>
    </View></View>
  </Modal>;
}

export function askToConfirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web" && typeof window !== "undefined") { if (window.confirm(message)) onConfirm(); return; }
  Alert.alert(title, message, [{ text: "إلغاء", style: "cancel" }, { text: "تأكيد", style: "destructive", onPress: onConfirm }]);
}

export const styles = StyleSheet.create({
  iconButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  statCard: { flex: 1, minWidth: "46%", backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, borderRightWidth: 3, padding: 13, gap: 7 },
  statIcon: { width: 29, height: 29, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 17, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  hint: { fontSize: 10, color: C.faint, textAlign: "right" },
  primary: { minHeight: 48, borderRadius: 15, backgroundColor: C.olive, paddingHorizontal: 16, flexDirection: "row-reverse", gap: 8, alignItems: "center", justifyContent: "center" },
  primaryText: { color: C.bg, fontSize: 13, fontWeight: "900" },
  quiet: { minHeight: 43, borderRadius: 14, paddingHorizontal: 13, backgroundColor: C.cardRaised, borderWidth: 1, borderColor: C.line, flexDirection: "row-reverse", gap: 7, alignItems: "center", justifyContent: "center" },
  quietText: { color: C.sand, fontSize: 12, fontWeight: "800" },
  search: { flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 15, paddingHorizontal: 12 },
  fieldWrap: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: R.control, minHeight: 48, paddingHorizontal: 5 },
  chip: { borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 9 },
  chipActive: { backgroundColor: C.olive, borderColor: C.olive },
  empty: { minHeight: 160, alignItems: "center", justifyContent: "center", gap: 10, padding: 20, backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: C.oliveWash },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.62)", justifyContent: "flex-end" },
  sheet: { maxHeight: "92%", backgroundColor: C.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderColor: C.line, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  handle: { height: 4, width: 38, alignSelf: "center", backgroundColor: C.line, borderRadius: 2, marginBottom: 15 },
  sheetTitle: { color: C.sand, fontSize: 18, fontWeight: "900", textAlign: "right", flex: 1 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
});
