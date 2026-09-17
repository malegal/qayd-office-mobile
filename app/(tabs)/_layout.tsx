import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { getCurrentMembership, type OfficeMembership } from "@/lib/office-data";
import { useOfflineSync } from "@/hooks/use-offline-sync";

function SyncBootstrap() {
  const [officeId, setOfficeId] = useState<string>();
  const { syncNow } = useOfflineSync(officeId);
  useEffect(() => { getCurrentMembership().then((membership) => setOfficeId(membership?.office_id)).catch(() => undefined); }, []);
  useEffect(() => {
    if (!officeId) return;
    const run = () => { syncNow().catch(() => undefined); };
    run();
    const interval = setInterval(run, 60_000);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") run(); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [officeId, syncNow]);
  return null;
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;
  const [membership, setMembership] = useState<OfficeMembership | null>(null);
  useEffect(() => { getCurrentMembership().then(setMembership).catch(() => setMembership(null)); }, []);
  const canSeeFinance = membership?.role === "manager" || membership?.role === "accountant";

  return (
    <>
      <SyncBootstrap />
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
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="quick-actions"
        options={{
          title: "إضافة",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus.circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: "الجلسات",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar.badge.clock" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          title: "القضايا",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="briefcase.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="files"
        options={{
          title: "الملفات",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="briefcase.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: "المالية",
          href: canSeeFinance ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="wallet.pass.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pending"
        options={{
          title: "المعلقة",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="checklist" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "الإشعارات",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="checklist" color={color} />,
        }}
      />
    </Tabs>
    </>
  );
}
