import { supabase } from "@/lib/supabase";
import { clearOfflineData } from "@/lib/offline-store";

export async function revokeLocalAccess() {
  await clearOfflineData();
  await supabase.auth.signOut({ scope: "local" });
}
