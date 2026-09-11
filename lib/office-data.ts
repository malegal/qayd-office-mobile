import { supabase } from "@/lib/supabase";
import { cacheJson, readCachedJson } from "@/lib/offline-store";

export type OfficeMembership = {
  user_id: string;
  office_id: string;
  role: "manager" | "lawyer" | "staff" | "accountant";
  display_name: string | null;
};

export type DashboardData = {
  membership: OfficeMembership;
  stats: {
    cases: number;
    files: number;
    upcomingSessions: number;
    openTasks: number;
    expenses: number;
  };
  upcomingSessions: Array<{
    id: string;
    case_id: string;
    session_date: string;
    case_status: string | null;
    decision: string | null;
  }>;
  openTasks: Array<{
    id: string;
    description: string;
    date: string;
    completed: boolean;
  }>;
};

async function countRows(table: string, officeId: string, filters: Record<string, unknown> = {}) {
  let query = supabase.from(table).select("id", { count: "exact", head: true }).eq("office_id", officeId);
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function getCurrentMembership() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from("office_members")
      .select("user_id, office_id, role, display_name")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) await cacheJson(`membership:${user.id}`, data);
    return data as OfficeMembership | null;
  } catch (error) {
    const cached = await readCachedJson<OfficeMembership>(`membership:${user.id}`);
    if (cached) return cached;
    throw error;
  }
}

export async function getDashboardData(): Promise<DashboardData | null> {
  const membership = await getCurrentMembership();
  if (!membership) return null;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const [cases, files, openTasks, expenses, upcomingSessionsRows, openTasksRows] = await Promise.all([
      countRows("cases", membership.office_id, { archived: 0 }),
      countRows("office_files", membership.office_id, { archived: false }),
      countRows("tasks", membership.office_id, { completed: false }),
      countRows("expenses", membership.office_id),
      supabase
        .from("sessions")
        .select("id, case_id, session_date, case_status, decision")
        .eq("office_id", membership.office_id)
        .gte("session_date", today)
        .order("session_date", { ascending: true })
        .limit(5),
      supabase
        .from("tasks")
        .select("id, description, date, completed")
        .eq("office_id", membership.office_id)
        .eq("completed", false)
        .order("date", { ascending: true })
        .limit(5),
    ]);

    if (upcomingSessionsRows.error) throw upcomingSessionsRows.error;
    if (openTasksRows.error) throw openTasksRows.error;

    const result = {
      membership,
      stats: { cases, files, upcomingSessions: upcomingSessionsRows.data?.length ?? 0, openTasks, expenses },
      upcomingSessions: upcomingSessionsRows.data ?? [],
      openTasks: openTasksRows.data ?? [],
    };
    await cacheJson(`dashboard:${membership.office_id}`, result);
    return result;
  } catch (error) {
    const cached = await readCachedJson<DashboardData>(`dashboard:${membership.office_id}`);
    if (cached) return cached;
    throw error;
  }
}
