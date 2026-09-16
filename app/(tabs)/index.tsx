import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { getDashboardData, type DashboardData } from "@/lib/office-data";
import { supabase } from "@/lib/supabase";

const statCards = [
  { key: "cases", label: "قضايا نشطة", icon: "briefcase.fill" as const },
  { key: "files", label: "ملفات مهنية", icon: "briefcase.fill" as const },
  { key: "upcomingSessions", label: "جلسات قادمة", icon: "calendar.badge.clock" as const },
  { key: "openTasks", label: "مهام مفتوحة", icon: "checklist" as const },
  { key: "expenses", label: "مصروفات مسجلة", icon: "wallet.pass.fill" as const },
];

export default function DashboardScreen() {
  const colors = useColors();
  const { session, loading: authLoading, signOut } = useSupabaseAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const offline = useOfflineSync(dashboard?.membership.office_id);

  const loadDashboard = useCallback(async () => {
    if (!session) return;
    setError("");
    try {
      const data = await getDashboardData();
      setDashboard(data);
      if (!data) setError("هذا الحساب غير مرتبط بمكتب بعد.");
    } catch {
      setError("تعذر تحميل بيانات المكتب. تحقق من الاتصال والصلاحيات.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    if (!authLoading && !session) router.replace("/");
    if (session) loadDashboard();
  }, [authLoading, session, loadDashboard]);

  const refresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => loadDashboard(), 60_000);
    return () => clearInterval(timer);
  }, [session, loadDashboard]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  if (authLoading || loading) {
    return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /><Text className="text-sm text-muted mt-3">جاري تحميل لوحة المكتب...</Text></ScreenContainer>;
  }

  const stats = dashboard?.stats;
  const displayName = dashboard?.membership.display_name || "فريق المكتب";

  return (
    <ScreenContainer className="px-5" safeAreaClassName="bg-background">
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingTop: 18, paddingBottom: 32 }}
      >
        <View className="flex-row items-center justify-between mb-7" style={{ direction: "rtl" }}>
          <View>
            <Text className="text-sm text-muted mb-1">صباح الخير</Text>
            <Text className="text-2xl font-bold text-foreground">{displayName}</Text>
          </View>
          <Pressable onPress={handleSignOut} style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, pressed && { opacity: 0.7 }]}>
            <IconSymbol name="person.crop.circle" size={25} color={colors.primary} />
          </Pressable>
        </View>

        <View className="rounded-2xl px-4 py-3 mb-5 flex-row items-center justify-between" style={{ backgroundColor: offline.isOnline ? `${colors.success}18` : `${colors.warning}22`, borderWidth: 1, borderColor: offline.isOnline ? `${colors.success}55` : `${colors.warning}66`, direction: "rtl" }}>
          <Text className="text-xs font-bold" style={{ color: offline.isOnline ? colors.success : colors.warning }}>{offline.isOnline ? "متصل — تتم المزامنة تلقائيًا" : "غير متصل — يمكنك متابعة العمل"}</Text>
          {offline.pending > 0 ? <Pressable onPress={offline.syncNow}><Text className="text-xs font-bold" style={{ color: colors.primary }}>{offline.pending} قيد الانتظار · مزامنة</Text></Pressable> : <Text className="text-xs text-muted">لا تغييرات معلقة</Text>}
        </View>

        <View className="rounded-3xl p-5 mb-5" style={{ backgroundColor: colors.foreground, direction: "rtl" }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs mb-2" style={{ color: colors.primary }}>QAYD OFFICE</Text>
              <Text className="text-2xl font-bold" style={{ color: colors.background }}>إدارة المكتب في مكان واحد</Text>
              <Text className="text-sm mt-2 leading-6" style={{ color: "#B9C5D0" }}>تابع القضايا، الجلسات، المهام والحسابات اليومية بأمان.</Text>
            </View>
            <IconSymbol name="chart.bar.fill" size={48} color={colors.primary} />
          </View>
        </View>

        {error ? <View className="rounded-2xl p-4 mb-5" style={{ backgroundColor: `${colors.error}18`, borderWidth: 1, borderColor: `${colors.error}55`, direction: "rtl" }}><Text className="text-sm" style={{ color: colors.error }}>{error}</Text><Pressable onPress={refresh} style={{ marginTop: 10, alignSelf: "flex-start" }}><Text className="text-sm font-bold" style={{ color: colors.primary }}>إعادة المحاولة</Text></Pressable></View> : null}

        <View className="flex-row flex-wrap justify-between" style={{ direction: "rtl" }}>
          {statCards.map((card) => (
            <View key={card.key} className="rounded-2xl p-4 mb-3" style={{ width: "48.2%", minHeight: 112, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <View className="flex-row items-center justify-between mb-4">
                <IconSymbol name={card.icon} size={22} color={colors.primary} />
                <Text className="text-2xl font-bold text-foreground">{stats?.[card.key as keyof typeof stats] ?? "—"}</Text>
              </View>
              <Text className="text-xs text-muted">{card.label}</Text>
            </View>
          ))}
        </View>

        <View className="rounded-2xl p-4 mt-2" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, direction: "rtl" }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-foreground">الجلسات القادمة</Text>
            <Text className="text-xs font-bold" style={{ color: colors.primary }}>عرض الكل</Text>
          </View>
          {dashboard?.upcomingSessions.length ? dashboard.upcomingSessions.map((item) => (
            <View key={item.id} className="flex-row items-center py-3" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              <View className="w-10 h-10 rounded-xl items-center justify-center ml-3" style={{ backgroundColor: `${colors.primary}20` }}><IconSymbol name="calendar.badge.clock" size={20} color={colors.primary} /></View>
              <View className="flex-1"><Text className="text-sm font-bold text-foreground">{item.session_date}</Text><Text className="text-xs text-muted mt-1">{item.case_status || "جلسة قضية"}</Text></View>
              <Text className="text-xs text-muted">{item.case_id}</Text>
            </View>
          )) : <Text className="text-sm text-muted py-3">لا توجد جلسات قادمة مسجلة.</Text>}
        </View>

        <View className="rounded-2xl p-4 mt-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, direction: "rtl" }}>
          <View className="flex-row items-center justify-between mb-4"><Text className="text-lg font-bold text-foreground">المهام المفتوحة</Text><IconSymbol name="checklist" size={22} color={colors.primary} /></View>
          {dashboard?.openTasks.length ? dashboard.openTasks.map((task) => (
            <View key={task.id} className="py-3" style={{ borderTopWidth: 1, borderTopColor: colors.border }}><Text className="text-sm font-bold text-foreground">{task.description}</Text><Text className="text-xs text-muted mt-1">الاستحقاق: {task.date}</Text></View>
          )) : <Text className="text-sm text-muted py-3">لا توجد مهام مفتوحة.</Text>}
        </View>

        <Pressable onPress={() => supabase.auth.signOut()} style={({ pressed }) => [{ alignItems: "center", paddingVertical: 18 }, pressed && { opacity: 0.6 }]}><Text className="text-sm font-bold" style={{ color: colors.error }}>تسجيل الخروج</Text></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
