import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { SessionDecisionModal } from "@/components/session-decision-modal";
import { useColors } from "@/hooks/use-colors";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { getCases, getSessions, type CaseRow, type SessionRow } from "@/lib/office-lists";
import { getCurrentMembership, type OfficeMembership } from "@/lib/office-data";
import { buildRoll, groupRoll, formatArabicDate, shiftDateKey, todayKey, sessionTime, type RollItem } from "@/lib/office-roll";

export default function RollScreen() {
  const colors = useColors();
  const [membership, setMembership] = useState<OfficeMembership | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [dateKey, setDateKey] = useState(todayKey());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState<RollItem | null>(null);
  const offline = useOfflineSync(membership?.office_id);

  const load = useCallback(async (officeId: string) => {
    setError("");
    try {
      const [caseRows, sessionRows] = await Promise.all([getCases(officeId), getSessions(officeId)]);
      setCases(caseRows);
      setSessions(sessionRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل رول اليوم.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    getCurrentMembership()
      .then((m) => {
        setMembership(m);
        if (m) load(m.office_id);
        else setLoading(false);
      })
      .catch((e) => { setError(e instanceof Error ? e.message : "تعذر معرفة المكتب."); setLoading(false); });
  }, [load]);

  const refresh = () => { if (membership) { setRefreshing(true); load(membership.office_id); } };

  const roll = useMemo(() => buildRoll(sessions, cases, dateKey), [sessions, cases, dateKey]);
  const groups = useMemo(() => groupRoll(roll), [roll]);

  const isToday = dateKey === todayKey();

  if (loading) {
    return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /><Text className="text-sm text-muted mt-3">جارٍ تحميل رول اليوم...</Text></ScreenContainer>;
  }

  return (
    <ScreenContainer className="px-5" safeAreaClassName="bg-background">
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingTop: 18, paddingBottom: 36 }}
      >
        <View className="flex-row items-center justify-between mb-4" style={{ direction: "rtl" }}>
          <View>
            <Text className="text-2xl font-bold text-foreground">رول اليوم</Text>
            <Text className="text-sm text-muted mt-1">{formatArabicDate(dateKey)}</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/dashboard")} style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, pressed && { opacity: 0.7 }]}>
            <IconSymbol name="chart.bar.fill" size={24} color={colors.primary} />
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between mb-4" style={{ direction: "rtl" }}>
          <Pressable onPress={() => setDateKey(shiftDateKey(dateKey, -1))} style={{ width: 44, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <IconSymbol name="chevron.left" size={22} color={colors.primary} />
          </Pressable>
          <Pressable onPress={() => setDateKey(todayKey())} style={{ paddingHorizontal: 16, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: isToday ? colors.primary : colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <Text className="text-sm font-bold" style={{ color: isToday ? colors.background : colors.foreground }}>{isToday ? "اليوم" : "العودة لليوم"}</Text>
          </Pressable>
          <Pressable onPress={() => setDateKey(shiftDateKey(dateKey, 1))} style={{ width: 44, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <IconSymbol name="chevron.right" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <View className="rounded-2xl px-4 py-3 mb-4 flex-row items-center justify-between" style={{ backgroundColor: offline.isOnline ? `${colors.success}18` : `${colors.warning}22`, direction: "rtl" }}>
          <Text className="text-xs font-bold" style={{ color: offline.isOnline ? colors.success : colors.warning }}>{offline.isOnline ? "متصل" : "غير متصل — يعمل دون اتصال"}</Text>
          <Text className="text-xs text-muted">{roll.length} جلسة اليوم{offline.pending > 0 ? ` · ${offline.pending} معلقة` : ""}</Text>
        </View>

        {error ? <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: `${colors.error}18`, borderWidth: 1, borderColor: `${colors.error}55`, direction: "rtl" }}><Text className="text-sm" style={{ color: colors.error }}>{error}</Text><Pressable onPress={refresh} style={{ marginTop: 8, alignSelf: "flex-start" }}><Text className="text-sm font-bold" style={{ color: colors.primary }}>إعادة المحاولة</Text></Pressable></View> : null}

        {!roll.length ? (
          <View className="rounded-3xl p-8 items-center" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <IconSymbol name="building.columns.fill" size={40} color={colors.primary} />
            <Text className="text-base font-bold text-foreground mt-4">لا توجد جلسات في هذا اليوم</Text>
            <Text className="text-sm text-muted mt-2 text-center">تنقّل بين الأيام أو ابحث عن قضية من تبويب القضايا لترحيل جلسة.</Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={`${group.court}-${group.circuit}`} className="mb-5">
              <View className="flex-row items-center mb-3" style={{ direction: "rtl" }}>
                <IconSymbol name="building.columns.fill" size={18} color={colors.primary} />
                <Text className="text-base font-bold text-foreground mr-2">{group.court}</Text>
                <Text className="text-xs text-muted mr-2">· {group.circuit}</Text>
              </View>
              {group.items.map((item) => (
                <RollCard key={item.session.id} item={item} colors={colors} onTransfer={() => setActive(item)} />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <SessionDecisionModal
        visible={Boolean(active)}
        onClose={() => setActive(null)}
        officeId={membership?.office_id ?? ""}
        item={active}
        onSubmitted={refresh}
      />
    </ScreenContainer>
  );
}

function RollCard({ item, colors, onTransfer }: { item: RollItem; colors: ReturnType<typeof useColors>; onTransfer: () => void }) {
  const c = item.case;
  const time = sessionTime(item.session.session_date);
  const done = Boolean(item.session.decision);
  return (
    <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: done ? `${colors.success}66` : colors.border, direction: "rtl" }}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <View className="w-7 h-7 rounded-lg items-center justify-center ml-2" style={{ backgroundColor: `${colors.primary}20` }}>
              <Text className="text-xs font-bold" style={{ color: colors.primary }}>{item.rollNumber}</Text>
            </View>
            <Text className="text-sm font-bold text-foreground flex-1" numberOfLines={1}>{c?.client_name || "بدون اسم عميل"}</Text>
          </View>
          <Text className="text-xs text-muted mt-1">القضية: {c?.case_number || c?.case_code || "غير مسجل"}{c?.case_year ? ` / ${c.case_year}` : ""}</Text>
          <Text className="text-xs text-muted mt-1">{item.court} · {item.circuit}{time ? ` · ${time}` : ""}</Text>
          <Text className="text-xs mt-1" style={{ color: done ? colors.success : colors.muted }}>{done ? `القرار: ${item.session.decision}` : `الحالة: ${item.session.case_status || "غير محددة"}`}</Text>
        </View>
      </View>
      <Pressable onPress={onTransfer} style={({ pressed }) => [{ marginTop: 12, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 11, alignItems: "center", flexDirection: "row", justifyContent: "center", opacity: pressed ? 0.8 : 1 }]}>
        <IconSymbol name="building.columns.fill" size={18} color={colors.background} />
        <Text className="text-sm font-bold mr-2" style={{ color: colors.background }}>{done ? "تعديل القرار / ترحيل" : "إثبات القرار والترحيل"}</Text>
      </Pressable>
    </View>
  );
}
