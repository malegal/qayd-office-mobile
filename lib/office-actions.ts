import { enqueueOperation, makeOfflineId } from "@/lib/offline-store";
import { syncPendingOperations } from "@/lib/sync-engine";

export async function queueSession(officeId: string, input: { caseId: string; sessionDate: string; caseStatus?: string; decision?: string }) {
  const item = await enqueueOperation({ officeId, entityType: "sessions", entityId: makeOfflineId(), operation: "insert", baseUpdatedAt: null, payload: { case_id: input.caseId, session_date: input.sessionDate, case_status: input.caseStatus ?? "محدد", decision: input.decision ?? "" } }); await syncPendingOperations(officeId); return item;
}
export async function queueTask(officeId: string, input: { description: string; date: string }) {
  const item = await enqueueOperation({ officeId, entityType: "tasks", entityId: makeOfflineId(), operation: "insert", baseUpdatedAt: null, payload: { description: input.description, date: input.date, completed: false } }); await syncPendingOperations(officeId); return item;
}
export async function queueExpense(officeId: string, input: { amount: number; expenseDate: string; category: string; description?: string; caseId?: string; officeFileId?: string; scope?: "office" | "case" | "file"; paymentMethod?: string; paidFrom?: string }) {
  const scope = input.scope ?? (input.caseId ? "case" : input.officeFileId ? "file" : "office");
  if (scope === "case" && !input.caseId) throw new Error("اختر القضية المرتبط بها المصروف");
  if (scope === "file" && !input.officeFileId) throw new Error("اختر الملف المرتبط به المصروف");
  const item = await enqueueOperation({ officeId, entityType: "financial_transactions", entityId: makeOfflineId(), operation: "insert", baseUpdatedAt: null, payload: { transaction_type: "expense", transaction_scope: scope, case_id: scope === "case" ? input.caseId : null, office_file_id: scope === "file" ? input.officeFileId : null, amount: input.amount, transaction_date: input.expenseDate, category: input.category, description: input.description ?? "", payment_method: input.paymentMethod ?? null, paid_from: input.paidFrom ?? null } }); await syncPendingOperations(officeId); return item;
}
export async function queueIncome(officeId: string, input: { amount: number; transactionDate: string; category: string; description?: string; caseId?: string; officeFileId?: string; scope?: "office" | "case" | "file"; paymentMethod?: string; paidFrom?: string }) {
  const scope = input.scope ?? (input.caseId ? "case" : input.officeFileId ? "file" : "office");
  if (scope === "case" && !input.caseId) throw new Error("اختر القضية المرتبط بها المتحصل");
  if (scope === "file" && !input.officeFileId) throw new Error("اختر الملف المرتبط به المتحصل");
  const item = await enqueueOperation({ officeId, entityType: "financial_transactions", entityId: makeOfflineId(), operation: "insert", baseUpdatedAt: null, payload: { transaction_type: "income", transaction_scope: scope, case_id: scope === "case" ? input.caseId : null, office_file_id: scope === "file" ? input.officeFileId : null, amount: input.amount, transaction_date: input.transactionDate, category: input.category, description: input.description ?? "", payment_method: input.paymentMethod ?? null, paid_from: input.paidFrom ?? null } }); await syncPendingOperations(officeId); return item;
}
export async function queueFee(officeId: string, input: { caseId: string; total: number; notes?: string }) {
  const item = await enqueueOperation({ officeId, entityType: "fees", entityId: input.caseId, operation: "insert", baseUpdatedAt: null, payload: { total: input.total, paid: 0, notes: input.notes ?? "" } }); await syncPendingOperations(officeId); return item;
}
export async function queuePayment(officeId: string, input: { caseId: string; amount: number; date: string; note?: string }) {
  await enqueueOperation({ officeId, entityType: "payments", entityId: makeOfflineId(), operation: "insert", baseUpdatedAt: null, payload: { case_id: input.caseId, amount: input.amount, date: input.date, note: input.note ?? "" } });
  return queueIncome(officeId, { caseId: input.caseId, amount: input.amount, transactionDate: input.date, category: "دفعة أتعاب", description: input.note, scope: "case" });
}
