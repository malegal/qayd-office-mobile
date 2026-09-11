import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { getCurrentMembership, type OfficeMembership } from "@/lib/office-data";
import { getOfficeFiles, type OfficeFileRow } from "@/lib/office-lists";

export default function FilesScreen() {
  const colors = useColors();
  const [membership, setMembership] = useState<OfficeMembership | null>(null);
  const [files, setFiles] = useState<OfficeFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const offline = useOfflineSync(membership?.office_id);
  const load = useCallback(async () => { if (!membership) return; setLoading(true); try { setFiles(await getOfficeFiles(membership.office_id)); } finally { setLoading(false); } }, [membership]);
  useEffect(() => { getCurrentMembership().then(setMembership).catch(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  if (loading && !files.length) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /><Text className="text-sm text-muted mt-3">جاري تحميل الملفات...</Text></ScreenContainer>;
  return <ScreenContainer className="px-5" safeAreaClassName="bg-background"><View className="mt-5 mb-4" style={{ direction: "rtl" }}><Text className="text-2xl font-bold text-foreground">الملفات المهنية</Text><Text className="text-sm text-muted mt-1">عرض مختصر للملفات دون تحميل المستندات الحساسة.</Text></View><View className="rounded-2xl px-4 py-3 mb-4 flex-row items-center justify-between" style={{ backgroundColor: offline.isOnline ? `${colors.success}18` : `${colors.warning}22`, direction: "rtl" }}><Text className="text-xs font-bold" style={{ color: offline.isOnline ? colors.success : colors.warning }}>{offline.isOnline ? "متصل" : "غير متصل"}</Text><Text className="text-xs text-muted">{files.length} ملف</Text></View><FlatList data={files} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingBottom: 30 }} renderItem={({ item }) => <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, direction: "rtl" }}><View className="flex-row items-center justify-between"><Text className="text-base font-bold text-foreground">{item.file_code || item.id}</Text><IconSymbol name="briefcase.fill" size={21} color={colors.primary} /></View><Text className="text-sm text-muted mt-2">{item.title || "بدون عنوان"}</Text><Text className="text-xs text-muted mt-1">{item.client_name || "بدون اسم عميل"} · {item.status || "بدون حالة"}</Text></View>} ListEmptyComponent={<Text className="text-sm text-muted text-center py-8">لا توجد ملفات مهنية.</Text>} /></ScreenContainer>;
}
