import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { clearOfflineData } from "@/lib/offline-store";
import { acceptInvite, createOffice } from "@/lib/office-onboarding";
import {
  clearPendingInvite,
  clearPendingOffice,
  getPendingInvite,
  getPendingOffice,
} from "@/lib/pending-intent";

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let processing = false;

    const completePendingIntent = async (activeSession: Session | null) => {
      if (!activeSession || processing) return;
      processing = true;
      try {
        const pendingInvite = await getPendingInvite();
        if (pendingInvite) {
          await acceptInvite(pendingInvite.code, pendingInvite.displayName);
          await clearPendingInvite();
        }

        const pendingOffice = await getPendingOffice();
        if (pendingOffice) {
          await createOffice(pendingOffice.name, pendingOffice.email);
          await clearPendingOffice();
        }
      } catch (error) {
        console.warn("تعذر إكمال العملية المعلقة بعد تسجيل الدخول:", error);
      } finally {
        processing = false;
      }
    };

    const applySession = async (nextSession: Session | null) => {
      await completePendingIntent(nextSession);
      if (mounted) {
        setSession(nextSession);
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => applySession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await clearOfflineData();
  }, []);

  return { session, loading, signOut };
}
