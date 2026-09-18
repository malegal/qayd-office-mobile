import { readCachedJson, cacheJson } from "@/lib/offline-store";
import { supabase } from "@/lib/supabase";
export type CaseRow = { id: string; office_id?: string; case_code: string | null; client_name: string | null; client_phone?: string | null; client_email?: string | null; client_address?: string | null; client_role?: string | null; case_number?: string | null; case_year?: string | null; case_subject: string | null; court_name: string | null; circuit?: string | null; case_type?: string | null; opponent_name?: string | null; opponent_phone?: string | null; opponent_email?: string | null; opponent_address?: string | null; opponent_role?: string | null; archived: number };
export type OfficeFileRow = { id: string; file_code: string | null; title: string | null; client_name: string | null; status: string | null; file_type: string | null };
export type SessionRow = { id: string; case_id: string; session_date: string; case_status: string | null; decision: string | null };
export type TaskRow = { id: string; description: string; date: string; completed: boolean };
export type ExpenseRow = { id: string; case_id: string | null; office_file_id: string | null; amount: number; expense_date: string; category: string; description: string | null };
export type FeeRow = { case_id: string; total: number; paid: number; remaining: number; notes: string | null };
export type PaymentRow = { id: number; case_id: string; amount: number; date: string; note: string | null };
export type FinancialTransaction = { id: string; office_id: string; transaction_type: "income" | "expense"; transaction_scope: "office" | "case" | "file"; case_id: string | null; office_file_id: string | null; amount: number; transaction_date: string; category: string; description: string | null; payment_method: string | null; paid_from: string | null };
export type CaseDetails = { case: CaseRow; sessions: SessionRow[]; fees: FeeRow | null; payments: PaymentRow[]; transactions: FinancialTransaction[]; totals: { income: number; expenses: number; net: number; paid: number; remaining: number } };
async function list<T>(table: string, officeId: string, select: string, cacheKey: string, configure?: (query: any) => any): Promise<T[]> {
  try { let query = supabase.from(table).select(select).limit(500); query = configure ? configure(query) : query.eq("office_id", officeId); const { data, error } = await query; if (error) throw error; const rows = (data ?? []) as T[]; await cacheJson(`${cacheKey}:${officeId}`, rows); return rows; }
  catch (error) { const cached = await readCachedJson<T[]>(`${cacheKey}:${officeId}`); if (cached) return cached; throw error; }
}
export const getCases = (officeId: string) => list<CaseRow>("cases", officeId, "id, office_id, case_code, client_name, client_phone, client_email, client_address, client_role, case_number, case_year, case_subject, court_name, circuit, case_type, opponent_name, opponent_phone, opponent_email, opponent_address, opponent_role, archived", "cases", q => q.eq("office_id", officeId).eq("archived", 0).order("created_at", { ascending: false }));
export const getOfficeFiles = (officeId: string) => list<OfficeFileRow>("office_files", officeId, "id, file_code, title, client_name, status, file_type", "office-files", q => q.eq("office_id", officeId).eq("archived", false).order("updated_at", { ascending: false }));
export const getSessions = (officeId: string) => list<SessionRow>("sessions", officeId, "id, case_id, session_date, case_status, decision", "sessions", q => q.eq("office_id", officeId).order("session_date", { ascending: true }));
export const getTasks = (officeId: string) => list<TaskRow>("tasks", officeId, "id, description, date, completed", "tasks", q => q.eq("office_id", officeId).eq("completed", false).order("date", { ascending: true }));
export const getExpenses = (officeId: string) => list<ExpenseRow>("expenses", officeId, "id, case_id, office_file_id, amount, expense_date, category, description", "expenses", q => q.eq("office_id", officeId).order("expense_date", { ascending: false }));
export const getFees = (officeId: string, caseIds: string[]) => list<FeeRow>("fees", officeId, "case_id, total, paid, remaining, notes", "fees", q => q.in("case_id", caseIds));
export const getPayments = (officeId: string, caseIds: string[]) => list<PaymentRow>("payments", officeId, "id, case_id, amount, date, note", "payments", q => q.in("case_id", caseIds).order("date", { ascending: false }));
export const getFinancialTransactions = (officeId: string) => list<FinancialTransaction>("financial_transactions", officeId, "id, office_id, transaction_type, transaction_scope, case_id, office_file_id, amount, transaction_date, category, description, payment_method, paid_from", "financial-transactions", q => q.eq("office_id", officeId).order("transaction_date", { ascending: false }));

export async function getCaseDetails(officeId: string, caseId: string, includeFinancial = true): Promise<CaseDetails> {
  const { data: caseRow, error: caseError } = await supabase.from("cases").select("id, office_id, case_code, client_name, client_phone, client_email, client_address, client_role, case_number, case_year, case_subject, court_name, circuit, case_type, opponent_name, opponent_phone, opponent_email, opponent_address, opponent_role, archived").eq("office_id", officeId).eq("id", caseId).single();
  if (caseError) throw caseError;
  const [sessions, feesRows, payments, transactions] = await Promise.all([
    getSessions(officeId).then((rows) => rows.filter((row) => row.case_id === caseId)),
    includeFinancial ? getFees(officeId, [caseId]) : Promise.resolve([]),
    includeFinancial ? getPayments(officeId, [caseId]) : Promise.resolve([]),
    includeFinancial ? getFinancialTransactions(officeId).then((rows) => rows.filter((row) => row.case_id === caseId)) : Promise.resolve([]),
  ]);
  const income = transactions.filter((x) => x.transaction_type === "income").reduce((sum, x) => sum + Number(x.amount), 0);
  const expenses = transactions.filter((x) => x.transaction_type === "expense").reduce((sum, x) => sum + Number(x.amount), 0);
  const fees = feesRows[0] ?? null;
  const paid = fees ? Number(fees.paid ?? 0) : income;
  const remaining = fees ? Math.max(Number(fees.total ?? 0) - paid, 0) : 0;
  return { case: caseRow as CaseRow, sessions, fees, payments, transactions, totals: { income, expenses, net: income - expenses, paid, remaining } };
}
