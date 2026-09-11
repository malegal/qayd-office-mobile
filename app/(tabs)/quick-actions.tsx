import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { getCurrentMembership, type OfficeMembership } from "@/lib/office-data";
import { queueExpense, queueFee, queuePayment, queueSession } from "@/lib/office-actions";

type ActionType = "session" | "expense" | "fee" | "payment";
const actions: Array<{ key: ActionType; label: string; icon: "calendar.badge.clock" | "wallet.pass.fill" | "briefcase.fill"; hint: string }> = [
  { key: "session", label: "ترحيل جلسة", icon: "calendar.badge.clock", hint: "إضافة جلسة جديدة للقضية" },
  { key: "expense", label: "مصروف", icon: "wallet.pass.fill", hint: "تسجيل مصروف مرتبط بقضية أو ملف" },
  { key: "fee", label: "رسم / أتعاب", icon: "briefcase.fill", hint: "إنشاء إجمالي أتعاب لقضية" },
  { key: "payment", label: "دفعة مقبوضة", icon: "wallet.pass.fill", hint: "تسجيل دفعة وتحديث المتبقي" },
];

function Field({ label, value, onChangeText, placeholder, keyboardType = "default" }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "numeric" }) {
  const colors = useColors();
  return <View className="mb-4"><Text className="text-sm font-bold text-foreground mb-2">{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboardType} className="rounded-2xl px-4 py-3 text-foreground border border-border" style={{ backgroundColor: colors.background, textAlign: "right" }} /></View>;
}

export default function QuickActionsScreen() {
  const colors = useColors();
  const [membership, setMembership] = useState<OfficeMembership | null>(null);
  const [selected, setSelected] = useState<ActionType>("session");
  const [caseId, setCaseId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("رسوم محكمة");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const offline = useOfflineSync(membership?.office_id);

  useEffect(() => { getCurrentMembership().then(setMembership).catch(() => setError("تعذر تحميل عضوية المكتب.")); }, []);

  const selectedAction = useMemo(() => actions.find((item) => item.key === selected)!, [selected]);

  const submit = async () => {
    if (!membership) return;
    if (!caseId.trim()) { setError("أدخل رقم أو رمز القضية أولًا."); return; }
    if ((selected === "expense" || selected === "fee" || selected === "payment") && (!amount || Number(amount) <= 0)) { setError("أدخل مبلغًا صحيحًا."); return; }
    setSaving(true); setError(""); setStatus("");
    try {
      if (selected === "session") await queueSession(membership.office_id, { caseId: caseId.trim(), sessionDate: date, caseStatus: description || "محدد" });
      if (selected === "expense") await queueExpense(membership.office_id, { caseId: caseId.trim(), amount: Number(amount), expenseDate: date, category, description });
      if (selected === "fee") await queueFee(membership.office_id, { caseId: caseId.trim(), total: Number(amount), notes: description });
      if (selected === "payment") await queuePayment(membership.office_id, { caseId: caseId.trim(), amount: Number(amount), date, note: description });
      setStatus(offline.isOnline ? "تم الحفظ وإرسال العملية للمزامنة." : "تم الحفظ محليًا؛ ستتم المزامنة تلقائيًا عند عودة الاتصال.");
      setAmount(""); setDescription("");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "تعذر حفظ العملية.");
    } finally { setSaving(false); }
  };

  return (
    <ScreenContainer className="px-5" safeAreaClassName="bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 18, paddingBottom: 36 }}>
          <View className="mb-5" style={{ direction: "rtl" }}><Text className="text-2xl font-bold text-foreground">إضافة سريعة</Text><Text className="text-sm text-muted mt-1">أنجز الأعمال اليومية حتى عند انقطاع الإنترنت.</Text></View>
          <View className="rounded-2xl px-4 py-3 mb-5 flex-row items-center justify-between" style={{ backgroundColor: offline.isOnline ? `${colors.success}18` : `${colors.warning}22`, borderWidth: 1, borderColor: offline.isOnline ? `${colors.success}55` : `${colors.warning}66`, direction: "rtl" }}><Text className="text-xs font-bold" style={{ color: offline.isOnline ? colors.success : colors.warning }}>{offline.isOnline ? "متصل" : "غير متصل"}</Text><Text className="text-xs text-muted">{offline.pending ? `${offline.pending} عملية تنتظر المزامنة` : "لا عمليات معلقة"}</Text></View>

          <View className="flex-row flex-wrap justify-between mb-5" style={{ direction: "rtl" }}>
            {actions.map((action) => <Pressable key={action.key} onPress={() => { setSelected(action.key); setStatus(""); setError(""); }} className="rounded-2xl p-4 mb-3" style={{ width: "48.2%", backgroundColor: selected === action.key ? colors.foreground : colors.surface, borderWidth: 1, borderColor: selected === action.key ? colors.foreground : colors.border }}><IconSymbol name={action.icon} size={23} color={selected === action.key ? colors.primary : colors.primary} /><Text className="text-sm font-bold mt-3" style={{ color: selected === action.key ? colors.background : colors.foreground }}>{action.label}</Text><Text className="text-xs mt-1" style={{ color: selected === action.key ? "#B9C5D0" : colors.muted }}>{action.hint}</Text></Pressable>)}
          </View>

          <View className="rounded-3xl p-5" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, direction: "rtl" }}>
            <Text className="text-xl font-bold text-foreground mb-5">{selectedAction.label}</Text>
            {!membership ? <View className="items-center py-6"><ActivityIndicator color={colors.primary} /><Text className="text-sm text-muted mt-3">جاري تحميل المكتب...</Text></View> : <>
              <Field label="رقم / رمز القضية" value={caseId} onChangeText={setCaseId} placeholder="مثال: 2026-123" />
              <Field label={selected === "session" ? "تاريخ الجلسة" : "التاريخ"} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
              {selected === "expense" && <Field label="نوع المصروف" value={category} onChangeText={setCategory} placeholder="رسوم محكمة" />}
              {selected !== "session" && <Field label={selected === "fee" ? "إجمالي الأتعاب" : "المبلغ"} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="numeric" />}
              <Field label={selected === "session" ? "ملاحظة الجلسة" : "ملاحظة اختيارية"} value={description} onChangeText={setDescription} placeholder="اكتب ملاحظة مختصرة" />
              {error ? <Text className="text-sm mb-4" style={{ color: colors.error }}>{error}</Text> : null}
              {status ? <Text className="text-sm mb-4" style={{ color: colors.success }}>{status}</Text> : null}
              <Pressable onPress={submit} disabled={saving} style={({ pressed }) => [{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: "center" }, pressed && { opacity: 0.8 }, saving && { opacity: 0.6 }]}>{saving ? <ActivityIndicator color={colors.background} /> : <Text className="text-base font-bold" style={{ color: colors.background }}>حفظ العملية</Text>}</Pressable>
            </>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
