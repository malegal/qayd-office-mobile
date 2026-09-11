import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import { listPendingOperations } from "@/lib/offline-store";
import { syncPendingOperations, type SyncSummary } from "@/lib/sync-engine";

export function useOfflineSync(officeId?: string) {
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);
  const [lastResult, setLastResult] = useState<SyncSummary | null>(null);

  const refreshPending = useCallback(async () => {
    setPending((await listPendingOperations(officeId)).length);
  }, [officeId]);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncPendingOperations(officeId);
      setLastResult(result);
      setPending(result.pending);
      return result;
    } finally {
      setSyncing(false);
    }
  }, [officeId]);

  useEffect(() => {
    let mounted = true;
    refreshPending();

    if (Platform.OS === "web") {
      const browserOnline = () => mounted && setIsOnline(navigator.onLine);
      setIsOnline(navigator.onLine);
      window.addEventListener("online", browserOnline);
      window.addEventListener("offline", browserOnline);
      return () => {
        mounted = false;
        window.removeEventListener("online", browserOnline);
        window.removeEventListener("offline", browserOnline);
      };
    }

    let unsubscribe: (() => void) | undefined;
    import("expo-network").then(async (Network) => {
      const state = await Network.getNetworkStateAsync();
      if (mounted) setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
      const subscription = Network.addNetworkStateListener((next) => {
        const connected = Boolean(next.isConnected && next.isInternetReachable !== false);
        if (mounted) {
          setIsOnline(connected);
          if (connected) syncNow();
        }
      });
      unsubscribe = () => subscription.remove();
      if (mounted && state.isConnected) syncNow();
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [refreshPending, syncNow]);

  return { isOnline, syncing, pending, lastResult, syncNow, refreshPending };
}
