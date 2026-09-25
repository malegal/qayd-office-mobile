import { Redirect, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, AppState, Platform, View } from "react-native";
import { useEffect, useState } from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { getCurrentMembership, type OfficeMembership } from "@/lib/office-data";
import { initOfflineStore } from "@/lib/offline-store";

function SyncRunner({ officeId }: { officeId: string }) {
  const { syncNow } = useOfflineSync(officeId);

  useEffect(() => {
    const run = () => { syncNow().catch(() => undefined); };
    run();
    const interval = setInterval(run, 60_000);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") run(); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [syncNow]);

  return null;
}

export default function TabLayout() {
  const colors = useColors();
  const { session, loading: authLoading } = useSupabaseAuth();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;
  const [membership, setMembership] = useState<OfficeMembership | null | undefined>(undefined);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initOfflineStore()
      .catch((error) => console.warn("تعذر تهيئة التخزين المحلي:", error))
      .finally(() => setDbReady(true));
  }, []);

  useEffect(() => {
    if (!session) return;
    getCurrentMembership().then(setMembership).catch((error) => {
      console.warn("تعذر تحميل عضوية المكتب:", error);
      setMembership(null);
    });
  }, [session]);

  const canSeeFinance = membership?.role === "manager" || membership?.role === "accountant";

  if (authLoading || !dbReady || (session && membership === undefined)) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (!session) return <Redirect href="/" />;
  if (membership === null) return <Redirect href="/onboarding" />;

  return (
    <>
      <SyncRunner officeId={membership!.office_id} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            paddingTop: 8,
            paddingBottom: bottomPadding,
            height: tabBarHeight,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            borderTopWidth: 0.5,
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "الرول", tabBarIcon: ({ color }) => <IconSymbol size={28} name="building.columns.fill" color={color} /> }} />
        <Tabs.Screen name="cases" options={{ title: "القضايا", tabBarIcon: ({ color }) => <IconSymbol size={28} name="briefcase.fill" color={color} /> }} />
        <Tabs.Screen name="expenses" options={{ title: "المصروفات", tabBarIcon: ({ color }) => <IconSymbol size={28} name="wallet.pass.fill" color={color} /> }} />
        <Tabs.Screen name="tasks" options={{ title: "المهام", tabBarIcon: ({ color }) => <IconSymbol size={28} name="checklist" color={color} /> }} />
        <Tabs.Screen name="finance" options={{ title: "المالية", href: canSeeFinance ? undefined : null, tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} /> }} />
        <Tabs.Screen name="dashboard" options={{ title: "الرئيسية", href: null, tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} /> }} />
        <Tabs.Screen name="quick-actions" options={{ title: "إضافة", href: null, tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus.circle" color={color} /> }} />
        <Tabs.Screen name="sessions" options={{ title: "الجلسات", href: null, tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar.badge.clock" color={color} /> }} />
        <Tabs.Screen name="files" options={{ title: "الملفات", href: null, tabBarIcon: ({ color }) => <IconSymbol size={28} name="folder.fill" color={color} /> }} />
        <Tabs.Screen name="legal-files" options={{ title: "الملفات القانونية", href: null, tabBarIcon: ({ color }) => <IconSymbol size={28} name="folder.badge.plus" color={color} /> }} />
        <Tabs.Screen name="pending" options={{ title: "المعلقة", href: null, tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} /> }} />
        <Tabs.Screen name="notifications" options={{ title: "الإشعارات", href: null, tabBarIcon: ({ color }) => <IconSymbol size={28} name="bell.fill" color={color} /> }} />
      </Tabs>
    </>
  );
}
