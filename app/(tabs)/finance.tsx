import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { getCurrentMembership, type OfficeMembership } from "@/lib/office-data";
import { getCases, getExpenses, getFees, getPayments, type ExpenseRow, type FeeRow, type PaymentRow } from "@/lib/office-lists";

type FinanceRow =
  | { kind: "expense"; row: ExpenseRow }
  | { kind: "fee"; row: FeeRow }
  | { kind: "payment"; row: PaymentRow };

export default function FinanceScreen() {
  const colors = useColors();
  const [membership, setMembership] = useState<OfficeMembership | null>(null);
  const [rows, setRows] = useState<FinanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const offline = useOfflineSync(membership?.office_id);
  const load = useCallback(async () => {
    if (!membership) return;
    setLoading(true);
    try {
      const cases = await getCases(membership.office_id);
      const caseIds = cases.map((item) => item.id);
      if (!caseIds.length) { setRows([]); return; }
      const [expenses, fees, payments] = await Promise.all([getExpenses(membership.office_id), getFees(membership.office_id, caseIds), getPayments(membership.office_id, caseIds)]);
      setRows([
        ...expenses.map((row) => ({ kind: "expense" as const, row })),
        ...fees.map((row) => ({ kind: "fee" as const, row })),
        ...payments.map((row) => ({ kind: "payment" as const, row })),
      ]);
    } finally { setLoading(false); }
  }, [membership]);
  useEffect(() => { getCurrentMembership().then(setMembership).catch(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  if (loading && !rows.length) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /><Text className="text-sm text-muted mt-3">جاري تحميل الحسابات...</Text></ScreenContainer>;
  return <ScreenContainer className="px-5" safeAreaClassName="bg-background">
    <View className="flex-row items-center justify-between mt-5 mb-4" style={{ direction: "rtl" }}><View><Text className="text-2xl font-bold text-foreground">المالية</Text><Text className="text-sm text-muted mt-1">المصروفات والأتعاب والدفعات.</Text></View><Pressable onPress={() => router.push("/(tabs)/quick-actions")} style={{ backgroundColor: colors.primary, borderRadius: 14, padding: 12 }}><IconSymbol name="plus" size={22} color={colors.background} /></Pressable></View>
    <View className="rounded-2xl px-4 py-3 mb-4 flex-row items-center justify-between" style={{ backgroundColor: offline.isOnline ? `${colors.success}18` : `${colors.warning}22`, direction: "rtl" }}><Text className="text-xs font-bold" style={{ color: offline.isOnline ? colors.success : colors.warning }}>{offline.isOnline ? "متصل" : "غير متصل"}</Text><Text className="text-xs text-muted">{offline.pending ? `${offline.pending} معلقة` : "مزامن"}</Text></View>
    <FlatList data={rows} keyExtractor={(item, index) => `${item.kind}-${item.kind === "expense" ? item.row.id : item.kind === "fee" ? item.row.case_id : item.row.id}-${index}`} contentContainerStyle={{ paddingBottom: 30 }} ListHeaderComponent={<Text className="text-lg font-bold text-foreground mb-3" style={{ textAlign: "right" }}>آخر العمليات ({rows.length})</Text>} renderItem={({ item }) => <FinanceCard item={item} colors={colors} />} ListEmptyComponent={<Text className="text-sm text-muted text-center py-8">لا توجد عمليات مالية للقضايا الحالية.</Text>} />
  </ScreenContainer>;
}

function FinanceCard({ item, colors }: { item: FinanceRow; colors: ReturnType<typeof useColors> }) {
  if (item.kind === "expense") return <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, direction: "rtl" }}><View className="flex-row items-center justify-between"><Text className="text-sm font-bold text-foreground">مصروف · {item.row.category}</Text><Text className="text-sm font-bold" style={{ color: colors.error }}>{Number(item.row.amount).toFixed(2)}</Text></View><Text className="text-xs text-muted mt-2">{item.row.expense_date} · القضية: {item.row.case_id || "ملف"}</Text><Text className="text-xs text-muted mt-1">{item.row.description || "بدون ملاحظة"}</Text></View>;
  if (item.kind === "fee") return <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, direction: "rtl" }}><View className="flex-row items-center justify-between"><Text className="text-sm font-bold text-foreground">أتعاب القضية</Text><Text className="text-sm font-bold" style={{ color: colors.primary }}>{Number(item.row.total).toFixed(2)}</Text></View><Text className="text-xs text-muted mt-2">القضية: {item.row.case_id} · المقبوض: {Number(item.row.paid).toFixed(2)}</Text><Text className="text-xs text-muted mt-1">المتبقي: {Number(item.row.remaining).toFixed(2)}</Text></View>;
  return <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, direction: "rtl" }}><View className="flex-row items-center justify-between"><Text className="text-sm font-bold text-foreground">دفعة مقبوضة</Text><Text className="text-sm font-bold" style={{ color: colors.success }}>{Number(item.row.amount).toFixed(2)}</Text></View><Text className="text-xs text-muted mt-2">{item.row.date} · القضية: {item.row.case_id}</Text><Text className="text-xs text-muted mt-1">{item.row.note || "بدون ملاحظة"}</Text></View>;
}
