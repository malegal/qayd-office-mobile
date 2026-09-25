import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Field, DateField, SelectField } from "@/components/form-fields";
import { useColors } from "@/hooks/use-colors";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { getCases, getExpenses, type CaseRow, type ExpenseRow } from "@/lib/office-lists";
import { getCurrentMembership, type OfficeMembership } from "@/lib/office-data";
import { queueExpense } from "@/lib/office-actions";

const CATEGORIES = ["رسوم قضائية", "تصوير ومستندات", "اكراميات", "مصاريف انتقال", "رسوم محضرين", "مصروفات تشغيلية", "أخرى"];

export default function ExpensesScreen() {
  const colors = useColors();
  const [membership, setMembership] = useState<OfficeMembership | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const offline = useOfflineSync(membership?.office_id);

  const load = useCallback(async (officeId: string) => {
    setError("");
    try {
      const [rows, caseRows] = await Promise.all([getExpenses(officeId), getCases(officeId)]);
      setExpenses(rows);
      setCases(caseRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل المصروفات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getCurrentMembership()
      .then((m) => { setMembership(m); if (m) load(m.office_id); else setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : "تعذر معرفة المكتب."); setLoading(false); });
  }, [load]);

  const caseName = (id: string | null) => cases.find((c) => c.id === id)?.client_name || "قضية";

  if (loading) {
    return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /><Text className="text-sm text-muted mt-3">جارٍ تحميل المصروفات...</Text></ScreenContainer>;
  }

  return (
    <ScreenContainer className="px-5" safeAreaClassName="bg-background">
      <View className="flex-row items-center justify-between mt-5 mb-4" style={{ direction: "rtl" }}>
        <View>
          <Text className="text-2xl font-bold text-foreground">المصروفات</Text>
          <Text className="text-sm text-muted mt-1">رسوم، تصوير، اكراميات، ومصاريف القضايا.</Text>
        </View>
        <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [{ backgroundColor: colors.primary, borderRadius: 14, padding: 12, opacity: pressed ? 0.8 : 1 }]}>
          <IconSymbol name="plus" size={22} color={colors.background} />
        </Pressable>
      </View>

      <View className="rounded-2xl px-4 py-3 mb-4 flex-row items-center justify-between" style={{ backgroundColor: offline.isOnline ? `${colors.success}18` : `${colors.warning}22`, direction: "rtl" }}>
        <Text className="text-xs font-bold" style={{ color: offline.isOnline ? colors.success : colors.warning }}>{offline.isOnline ? "متصل" : "غير متصل"}</Text>
        <Text className="text-xs text-muted">{expenses.length} مصروف مسجل</Text>
      </View>

      {error ? <Text className="text-xs mb-3" style={{ color: colors.error, textAlign: "right" }}>{error}</Text> : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {expenses.length ? expenses.map((item) => (
          <View key={item.id} className="rounded-2xl p-4 mb-3" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, direction: "rtl" }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-foreground">{item.category}</Text>
              <Text className="text-sm font-bold" style={{ color: colors.error }}>{Number(item.amount).toFixed(2)} ج.م</Text>
            </View>
            <Text className="text-xs text-muted mt-2">{item.expense_date}{item.case_id ? ` · ${caseName(item.case_id)}` : " · مصروف مكتب"}</Text>
            {item.description ? <Text className="text-xs text-muted mt-1">{item.description}</Text> : null}
          </View>
        )) : <View className="rounded-3xl p-8 items-center" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}><IconSymbol name="wallet.pass.fill" size={36} color={colors.primary} /><Text className="text-sm text-muted mt-3">لا توجد مصروفات مسجلة بعد.</Text></View>}
      </ScrollView>

      {membership ? <ExpenseModal visible={open} onClose={() => setOpen(false)} officeId={membership.office_id} cases={cases} onSaved={() => { setOpen(false); load(membership.office_id); }} /> : null}
    </ScreenContainer>
  );
}

function ExpenseModal({ visible, onClose, officeId, cases, onSaved }: { visible: boolean; onClose: () => void; officeId: string; cases: CaseRow[]; onSaved: () => void }) {
  const colors = useColors();
  const offline = useOfflineSync(officeId);
  const [scope, setScope] = useState<"office" | "case">("office");
  const [caseId, setCaseId] = useState("");
  const [caseSearch, setCaseSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setScope("office"); setCaseId(""); setCaseSearch(""); setAmount(""); setCategory(CATEGORIES[0]); setDate(new Date().toISOString().slice(0, 10)); setDescription(""); setError(""); }
  }, [visible]);

  const options = cases.filter((item) => `${item.case_code ?? ""} ${item.client_name ?? ""} ${item.opponent_name ?? ""} ${item.case_number ?? ""}`.toLowerCase().includes(caseSearch.toLowerCase()));

  const submit = async () => {
    if (!(Number(amount) > 0)) return setError("أدخل مبلغًا صحيحًا.");
    if (scope === "case" && !caseId) return setError("اختر القضية المرتبطة بالمصروف.");
    setSaving(true);
    setError("");
    try {
      await queueExpense(officeId, { scope, caseId: scope === "case" ? caseId : undefined, amount: Number(amount), expenseDate: date, category, description });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حفظ المصروف.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "#0009", justifyContent: "flex-end" }}>
        <View style={{ maxHeight: "92%", backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, direction: "rtl" }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-foreground">تسجيل مصروف</Text>
            <Pressable onPress={onClose} style={{ padding: 6 }}><IconSymbol name="xmark" size={22} color={colors.muted} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
            <View className="flex-row mb-4" style={{ direction: "rtl" }}>
              {(["office", "case"] as const).map((s) => (
                <Pressable key={s} onPress={() => setScope(s)} style={{ borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, marginLeft: 8, backgroundColor: scope === s ? colors.primary : colors.surface, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: scope === s ? colors.background : colors.foreground, fontWeight: "700", fontSize: 13 }}>{s === "office" ? "مصروف مكتب" : "مصروف قضية"}</Text>
                </Pressable>
              ))}
            </View>
            {scope === "case" ? <>
              <Field label="ابحث عن القضية" value={caseSearch} onChangeText={setCaseSearch} placeholder="اسم العميل أو رقم الدعوى" />
              {options.slice(0, 6).map((item) => (
                <Pressable key={item.id} onPress={() => { setCaseId(item.id); setCaseSearch(`${item.client_name || "بدون اسم"} · ${item.case_number || item.case_code || item.id}`); }} style={{ padding: 10, borderWidth: 1, borderColor: item.id === caseId ? colors.primary : colors.border, borderRadius: 10, marginBottom: 6, backgroundColor: colors.surface }}>
                  <Text className="text-sm font-bold text-foreground" style={{ textAlign: "right" }}>{item.client_name || "بدون اسم"}</Text>
                  <Text className="text-xs text-muted mt-1" style={{ textAlign: "right" }}>رقم الدعوى: {item.case_number || "غير مسجل"}</Text>
                </Pressable>
              ))}
            </> : null}
            <Field label="المبلغ *" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="numeric" />
            <SelectField label="نوع المصروف" value={category} options={CATEGORIES} onChange={setCategory} />
            <DateField label="التاريخ" value={date} onChange={setDate} />
            <Field label="ملاحظة" value={description} onChangeText={setDescription} placeholder="وصف مختصر (اختياري)" multiline />
            {error ? <Text className="text-sm mb-3" style={{ color: colors.error }}>{error}</Text> : null}
          </ScrollView>
          <Pressable onPress={submit} disabled={saving} style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: "center", opacity: saving ? 0.6 : 1 }}>
            {saving ? <ActivityIndicator color={colors.background} /> : <Text className="text-base font-bold" style={{ color: colors.background }}>حفظ المصروف</Text>}
          </Pressable>
          <Text className="text-xs text-muted mt-2 text-center">{offline.isOnline ? "سيُرسل المصروف لمركز اعتماد المالك." : "سيُحفظ محليًا ويُرسل عند عودة الاتصال."}</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
