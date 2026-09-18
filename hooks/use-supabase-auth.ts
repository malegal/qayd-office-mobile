import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { clearOfflineData } from "@/lib/offline-store";
import { getCurrentMembershipFresh } from "@/lib/office-data";
import { registerCurrentDevice, revokeLocalAccess } from "@/lib/member-control";

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const checkAccess = async (activeSession: Session | null) => {
      if (!activeSession) return;
      const membership = await getCurrentMembershipFresh().catch(() => undefined);
      if (membership === null) {
        await revokeLocalAccess().catch(() => undefined);
        if (mounted) setSession(null);
        return;
      }
      if (membership) await registerCurrentDevice(membership.office_id).catch(() => undefined);
    };

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
      await checkAccess(data.session);
    });

    const interval = setInterval(() => {
      supabase.auth.getSession().then(({ data }) => checkAccess(data.session));
    }, 60_000);
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      void checkAccess(nextSession);
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await clearOfflineData();
  }, []);

  return { session, loading, signOut };
}
