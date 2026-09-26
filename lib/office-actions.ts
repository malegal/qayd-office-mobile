import { enqueueOperation, makeOfflineId } from "@/lib/offline-store";
import { syncPendingOperations } from "@/lib/sync-engine";

function uuid() {
  const candidate = makeOfflineId();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)) return candidate;
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const h = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function queue(officeId: string, input: Parameters<typeof enqueueOperation>[0]) {
  const item = await enqueueOperation(input);
  await syncPendingOperations(officeId);
  return item;
}

export function queueSession(officeId: string, input: { caseId: string; sessionDate: string; caseStatus?: string; decision?: string }) {
  const finalDate = input.sessionDate.includes("T") ? input.sessionDate : `${input.sessionDate}T09:00:00`;
  return queue(officeId, { officeId, entityType: "sessions", entityId: uuid(), operation: "insert", baseUpdatedAt: null, payload: { case_id: input.caseId, session_date: finalDate, case_status: input.caseStatus ?? "محدد", decision: input.decision ?? "" } });
}

export async function queueSessionDecision(officeId: string, input: {
  sessionId: string;
  decision: string;
  caseStatus: string;
  nextDate: string;
  caseId: string;
  requiredAction?: string;
  courtName?: string | null;
  circuit?: string | null;
  notes?: string;
  attachment?: string | null;
}) {
  const decisionItem = await queue(officeId, {
    officeId,
    entityType: "sessions",
    entityId: input.sessionId,
    operation: "update",
    baseUpdatedAt: null,
    payload: { decision: input.decision, case_status: input.caseStatus },
    attachment: input.attachment ?? null,
  });

  const nextSessionDate = input.nextDate.includes("T") ? input.nextDate : `${input.nextDate}T09:00:00`;

  const nextItem = await queue(officeId, {
    officeId,
    entityType: "sessions",
    entityId: uuid(),
    operation: "insert",
    baseUpdatedAt: null,
    payload: {
      case_id: input.caseId,
      session_date: nextSessionDate,
      case_status: "مؤجلة",
      decision: "",
      required_action: input.requiredAction ?? "",
      court_name: input.courtName ?? null,
      circuit: input.circuit ?? null,
      responsible_name: null,
      followup_date: null,
      reason: input.notes ? `ترحيل من الرول · ${input.notes}` : "ترحيل من الرول",
    },
  });
  return { decisionItem, nextItem };
}

export function queueTask(officeId: string, input: { description: string; date: string }) {
  return queue(officeId, { officeId, entityType: "tasks", entityId: uuid(), operation: "insert", baseUpdatedAt: null, payload: { description: input.description, date: input.date, completed: false } });
}

export function queueExpense(officeId: string, input: { amount: number; expenseDate: string; category: string; description?: string; caseId?: string; officeFileId?: string; scope?: "office" | "case" | "file"; paymentMethod?: string; paidFrom?: string }) {
  if (!(input.amount > 0)) throw new Error("يجب أن يكون مبلغ المصروف أكبر من صفر");
  const scope = input.scope ?? (input.caseId ? "case" : input.officeFileId ? "file" : "office");
  if (scope === "case" && !input.caseId) throw new Error("اختر القضية المرتبط بها المصروف");
  if (scope === "file" && !input.officeFileId) throw new Error("اختر الملف المرتبط به المصروف");
  return queue(officeId, { officeId, entityType: "financial_transactions", entityId: uuid(), operation: "insert", baseUpdatedAt: null, payload: { transaction_type: "expense", transaction_scope: scope, case_id: scope === "case" ? input.caseId : null, office_file_id: scope === "file" ? input.officeFileId : null, amount: input.amount, transaction_date: input.expenseDate, category: input.category, description: input.description ?? "", payment_method: input.paymentMethod ?? null, paid_from: input.paidFrom ?? null } });
}

export function queueIncome(officeId: string, input: { amount: number; transactionDate: string; category: string; description?: string; caseId?: string; officeFileId?: string; scope?: "office" | "case" | "file"; paymentMethod?: string; paidFrom?: string }) {
  if (!(input.amount > 0)) throw new Error("يجب أن يكون مبلغ القبض أكبر من صفر");
  const scope = input.scope ?? (input.caseId ? "case" : input.officeFileId ? "file" : "office");
  if (scope === "case" && !input.caseId) throw new Error("اختر القضية المرتبط بها المتحصل");
  if (scope === "file" && !input.officeFileId) throw new Error("اختر الملف المرتبط به المتحصل");
  return queue(officeId, { officeId, entityType: "financial_transactions", entityId: uuid(), operation: "insert", baseUpdatedAt: null, payload: { transaction_type: "income", transaction_scope: scope, case_id: scope === "case" ? input.caseId : null, office_file_id: scope === "file" ? input.officeFileId : null, amount: input.amount, transaction_date: input.transactionDate, category: input.category, description: input.description ?? "", payment_method: input.paymentMethod ?? null, paid_from: input.paidFrom ?? null } });
}

export function queueFee(officeId: string, input: { caseId: string; total: number; notes?: string }) {
  return queue(officeId, { officeId, entityType: "fees", entityId: input.caseId, operation: "insert", baseUpdatedAt: null, payload: { total: input.total, paid: 0, notes: input.notes ?? "" } });
}

export async function queuePayment(officeId: string, input: { caseId: string; amount: number; date: string; note?: string }) {
  await queue(officeId, { officeId, entityType: "payments", entityId: uuid(), operation: "insert", baseUpdatedAt: null, payload: { case_id: input.caseId, amount: input.amount, date: input.date, note: input.note ?? "" } });
  return queueIncome(officeId, { caseId: input.caseId, amount: input.amount, transactionDate: input.date, category: "دفعة أتعاب", description: input.note, scope: "case" });
}
