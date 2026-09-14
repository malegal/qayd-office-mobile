import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getCurrentMembership, type OfficeMembership } from "@/lib/office-data";
import { listPendingOperations, type OutboxItem } from "@/lib/offline-store";
import { syncPendingOperations } from "@/lib/sync-engine";
export default function PendingScreen() {
  const colors = useColors(); const [membership, setMembership] = useState<OfficeMembership | null>(null); const [items, setItems] = useState<OutboxItem[]>([]); const [loading, setLoading] = useState(true); const [message, setMessage] = useState("");
  const load = useCallback(async () => { const m = membership ?? await getCurrentMembership(); if (!m) return; setMembership(m); setItems(await listPendingOperations(m.office_id)); setLoading(false); }, [membership]);
  useEffect(() => { load().catch((e) => { setMessage(e instanceof Error ? e.message : "تعذر تحميل العمليات"); setLoading(false); }); }, [load]);
  const retry = async () => { if (!membership) return; setMessage("جاري إعادة المحاولة..."); const result = await syncPendingOperations(membership.office_id); await load(); setMessage(`نجحت ${result.synced} · فشلت ${result.failed} · معلقة ${result.pending}`); };
  if (loading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /></ScreenContainer>;
  return <ScreenContainer className="px-5" safeAreaClassName="bg-background"><View className="mt-5 mb-4" style={{ direction: "rtl" }}><Text className="text-2xl font-bold text-foreground">العمليات المعلقة</Text><Text className="text-sm text-muted mt-1">تظهر هنا الحركات التي تنتظر المزامنة.</Text></View><Pressable onPress={retry} style={{ backgroundColor: colors.primary, borderRadius: 14, padding: 14, alignItems: "center", marginBottom: 16 }}><Text style={{ color: colors.background, fontWeight: "700" }}>إعادة المزامنة الآن</Text></Pressable>{message ? <Text className="text-sm text-muted mb-4" style={{ textAlign: "right" }}>{message}</Text> : null}<FlatList data={items} keyExtractor={(item) => item.operationId} renderItem={({ item }) => <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 10, direction: "rtl" }}><Text className="text-sm font-bold text-foreground">{item.entityType} · {item.operation}</Text><Text className="text-xs text-muted mt-1">رقم العملية: {item.operationId.slice(0, 8)} · المحاولات: {item.attempts}</Text>{item.lastError ? <Text className="text-xs mt-2" style={{ color: colors.error }}>{item.lastError}</Text> : null}</View>} ListEmptyComponent={<Text className="text-sm text-muted text-center py-8">لا توجد عمليات معلقة.</Text>} /></ScreenContainer>;
}
