import { supabase } from "@/lib/supabase";
import { cacheJson, readCachedJson } from "@/lib/offline-store";
import type { CaseRow } from "@/lib/office-lists";

export type OfficeMembership = {
  user_id: string;
  office_id: string;
  role: "manager" | "lawyer" | "staff" | "accountant" | "member";
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
    case: Pick<CaseRow, "id" | "case_code" | "client_name" | "opponent_name" | "case_number" | "case_year" | "court_name" | "circuit" | "case_subject"> | null;
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

async function safeCountRows(table: string, officeId: string, filters: Record<string, unknown> = {}) {
  try { return await countRows(table, officeId, filters); } catch { return 0; }
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
    const [cases, files, openTasks, expenses, upcomingSessionsRows, casesRows, openTasksRows] = await Promise.all([
      membership.role === "manager" ? safeCountRows("cases", membership.office_id, { archived: 0 }) : Promise.resolve(0),
      safeCountRows("office_files", membership.office_id, { archived: false }),
      safeCountRows("tasks", membership.office_id, { completed: false }),
      safeCountRows("expenses", membership.office_id),
      supabase
        .from("sessions")
        .select("id, case_id, session_date, case_status, decision")
        .eq("office_id", membership.office_id)
        .gte("session_date", today)
        .order("session_date", { ascending: true })
        .limit(5),
      supabase
        .from("cases")
        .select("id, case_code, client_name, opponent_name, case_number, case_year, court_name, circuit, case_subject")
        .eq("office_id", membership.office_id)
        .eq("archived", 0)
        .limit(500),
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
    if (casesRows.error) throw casesRows.error;
    const upcomingCases = (casesRows.data ?? []) as unknown as CaseRow[];
    const upcomingSessions = (upcomingSessionsRows.data ?? []).map((session) => ({
      ...session,
      case: upcomingCases.find((item) => item.id === session.case_id) ?? null,
    }));

    const result = {
      membership,
      stats: { cases, files, upcomingSessions: upcomingSessions.length, openTasks, expenses },
      upcomingSessions,
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


export type LegalFileRow = { id: string; office_id: string; file_code: string; file_type: string; title: string; status: string; client_name: string; client_phone: string | null; description: string | null; updated_at: string };
export type ProceedingRow = { id: string; legal_file_id: string; proceeding_type: string; court_name: string | null; circuit: string | null; case_number: string | null; case_year: string | null; status: string; judgment_summary: string | null };
export type ServiceActionRow = { id: string; legal_file_id: string; action_type: string; authority: string | null; next_followup_at: string | null; status: string; result: string | null };

export async function getLegalFiles(officeId: string) {
  const { data, error } = await supabase.from("legal_files").select("id, office_id, file_code, file_type, title, status, client_name, client_phone, description, updated_at").eq("office_id", officeId).order("updated_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []) as LegalFileRow[];
}
export async function getProceedings(officeId: string, legalFileId: string) {
  const { data, error } = await supabase.from("proceedings").select("id, legal_file_id, proceeding_type, court_name, circuit, case_number, case_year, status, judgment_summary").eq("office_id", officeId).eq("legal_file_id", legalFileId).order("created_at", { ascending: true }).limit(100);
  if (error) throw error;
  return (data ?? []) as ProceedingRow[];
}
export async function getServiceActions(officeId: string, legalFileId: string) {
  const { data, error } = await supabase.from("service_actions").select("id, legal_file_id, action_type, authority, next_followup_at, status, result").eq("office_id", officeId).eq("legal_file_id", legalFileId).order("next_followup_at", { ascending: true }).limit(100);
  if (error) throw error;
  return (data ?? []) as ServiceActionRow[];
}
