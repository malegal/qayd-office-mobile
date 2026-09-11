import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { getCurrentMembership, type OfficeMembership } from "@/lib/office-data";
import { getSessions, getTasks, type SessionRow, type TaskRow } from "@/lib/office-lists";
import { queueTask } from "@/lib/office-actions";

export default function SessionsScreen() {
  const colors = useColors();
  const [membership, setMembership] = useState<OfficeMembership | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTasks, setShowTasks] = useState(false);
  const [taskText, setTaskText] = useState("");
  const offline = useOfflineSync(membership?.office_id);
  const load = useCallback(async () => { if (!membership) return; setLoading(true); try { const [nextSessions, nextTasks] = await Promise.all([getSessions(membership.office_id), getTasks(membership.office_id)]); setSessions(nextSessions); setTasks(nextTasks); } finally { setLoading(false); } }, [membership]);
  useEffect(() => { getCurrentMembership().then(setMembership).catch(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  const addTask = async () => { if (!membership || !taskText.trim()) return; await queueTask(membership.office_id, { description: taskText.trim(), date: new Date().toISOString().slice(0, 10) }); setTaskText(""); setShowTasks(false); load(); };

  if (loading && !sessions.length) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /><Text className="text-sm text-muted mt-3">جاري تحميل الجلسات...</Text></ScreenContainer>;
  return <ScreenContainer className="px-5" safeAreaClassName="bg-background">
    <View className="flex-row items-center justify-between mt-5 mb-4" style={{ direction: "rtl" }}><View><Text className="text-2xl font-bold text-foreground">الجلسات والمهام</Text><Text className="text-sm text-muted mt-1">ترحيل سريع ومتابعة يومية.</Text></View><Pressable onPress={() => setShowTasks(!showTasks)} style={{ backgroundColor: colors.primary, borderRadius: 14, padding: 12 }}><IconSymbol name="plus" size={22} color={colors.background} /></Pressable></View>
    <View className="rounded-2xl px-4 py-3 mb-4 flex-row items-center justify-between" style={{ backgroundColor: offline.isOnline ? `${colors.success}18` : `${colors.warning}22`, direction: "rtl" }}><Text className="text-xs font-bold" style={{ color: offline.isOnline ? colors.success : colors.warning }}>{offline.isOnline ? "متصل" : "غير متصل"}</Text><Text className="text-xs text-muted">{offline.pending ? `${offline.pending} معلقة` : "مزامن"}</Text></View>
    {showTasks ? <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, direction: "rtl" }}><Text className="text-sm font-bold text-foreground mb-2">مهمة جديدة</Text><View className="flex-row items-center"><TextInput value={taskText} onChangeText={setTaskText} placeholder="وصف المهمة" placeholderTextColor={colors.muted} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.foreground, textAlign: "right", backgroundColor: colors.background }} /><Pressable onPress={addTask} style={{ backgroundColor: colors.primary, padding: 12, borderRadius: 12, marginRight: 8 }}><Text style={{ color: colors.background, fontWeight: "700" }}>حفظ</Text></Pressable></View></View> : null}
    <FlatList data={sessions} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingBottom: 30 }} ListHeaderComponent={<><Text className="text-lg font-bold text-foreground mb-3" style={{ textAlign: "right" }}>الجلسات القادمة ({sessions.length})</Text><Text className="text-sm text-muted mb-3" style={{ textAlign: "right" }}>المهام المفتوحة: {tasks.length}</Text></>} renderItem={({ item }) => <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, direction: "rtl" }}><View className="flex-row items-center justify-between"><Text className="text-sm font-bold text-foreground">{item.session_date}</Text><IconSymbol name="calendar.badge.clock" size={21} color={colors.primary} /></View><Text className="text-xs text-muted mt-2">القضية: {item.case_id}</Text><Text className="text-xs text-muted mt-1">{item.case_status || "بدون حالة"}</Text></View>} ListEmptyComponent={<Text className="text-sm text-muted text-center py-8">لا توجد جلسات مسجلة.</Text>} />
  </ScreenContainer>;
}
