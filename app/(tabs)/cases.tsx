import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { getCurrentMembership, type OfficeMembership } from "@/lib/office-data";
import { getCases, type CaseRow } from "@/lib/office-lists";

export default function CasesScreen() {
  const colors = useColors();
  const [membership, setMembership] = useState<OfficeMembership | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const offline = useOfflineSync(membership?.office_id);
  const load = useCallback(async () => { if (!membership) return; setLoading(true); try { setCases(await getCases(membership.office_id)); } finally { setLoading(false); } }, [membership]);
  useEffect(() => { getCurrentMembership().then(setMembership).catch(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  if (loading && !cases.length) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /><Text className="text-sm text-muted mt-3">جاري تحميل القضايا...</Text></ScreenContainer>;
  return <ScreenContainer className="px-5" safeAreaClassName="bg-background"><View className="flex-row items-center justify-between mt-5 mb-4" style={{ direction: "rtl" }}><View><Text className="text-2xl font-bold text-foreground">القضايا</Text><Text className="text-sm text-muted mt-1">القضايا النشطة في مكتبك.</Text></View><Pressable onPress={() => router.push("/(tabs)/quick-actions")} style={{ backgroundColor: colors.primary, borderRadius: 14, padding: 12 }}><IconSymbol name="plus" size={22} color={colors.background} /></Pressable></View><View className="rounded-2xl px-4 py-3 mb-4 flex-row items-center justify-between" style={{ backgroundColor: offline.isOnline ? `${colors.success}18` : `${colors.warning}22`, direction: "rtl" }}><Text className="text-xs font-bold" style={{ color: offline.isOnline ? colors.success : colors.warning }}>{offline.isOnline ? "متصل" : "غير متصل"}</Text><Text className="text-xs text-muted">{cases.length} قضية</Text></View><FlatList data={cases} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingBottom: 30 }} renderItem={({ item }) => <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, direction: "rtl" }}><View className="flex-row items-center justify-between"><Text className="text-base font-bold text-foreground">{item.case_code || item.id}</Text><IconSymbol name="briefcase.fill" size={21} color={colors.primary} /></View><Text className="text-sm text-muted mt-2">{item.client_name || "بدون اسم عميل"}</Text><Text className="text-xs text-muted mt-1">{item.case_subject || item.court_name || "بدون وصف"}</Text></View>} ListEmptyComponent={<Text className="text-sm text-muted text-center py-8">لا توجد قضايا نشطة.</Text>} /></ScreenContainer>;
}
