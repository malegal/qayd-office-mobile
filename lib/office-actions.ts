import { enqueueOperation, makeOfflineId } from "@/lib/offline-store";
import { syncPendingOperations } from "@/lib/sync-engine";

export async function queueSession(officeId: string, input: { caseId: string; sessionDate: string; caseStatus?: string; decision?: string }) {
  const item = await enqueueOperation({
    officeId,
    entityType: "sessions",
    entityId: makeOfflineId(),
    operation: "insert",
    baseUpdatedAt: null,
    payload: {
      case_id: input.caseId,
      session_date: input.sessionDate,
      case_status: input.caseStatus ?? "محدد",
      decision: input.decision ?? "",
    },
  });
  await syncPendingOperations(officeId);
  return item;
}

export async function queueTask(officeId: string, input: { description: string; date: string }) {
  const item = await enqueueOperation({
    officeId,
    entityType: "tasks",
    entityId: makeOfflineId(),
    operation: "insert",
    baseUpdatedAt: null,
    payload: { description: input.description, date: input.date, completed: false },
  });
  await syncPendingOperations(officeId);
  return item;
}

export async function queueExpense(officeId: string, input: { amount: number; expenseDate: string; category: string; description?: string; caseId?: string; officeFileId?: string }) {
  if (!input.caseId && !input.officeFileId) throw new Error("يجب ربط المصروف بقضية أو ملف");
  const item = await enqueueOperation({
    officeId,
    entityType: "expenses",
    entityId: makeOfflineId(),
    operation: "insert",
    baseUpdatedAt: null,
    payload: {
      amount: input.amount,
      expense_date: input.expenseDate,
      category: input.category,
      description: input.description ?? "",
      case_id: input.caseId ?? "",
      office_file_id: input.officeFileId ?? "",
      receipt_path: "",
    },
  });
  await syncPendingOperations(officeId);
  return item;
}

export async function queueFee(officeId: string, input: { caseId: string; total: number; notes?: string }) {
  const item = await enqueueOperation({
    officeId,
    entityType: "fees",
    entityId: input.caseId,
    operation: "insert",
    baseUpdatedAt: null,
    payload: { total: input.total, paid: 0, notes: input.notes ?? "" },
  });
  await syncPendingOperations(officeId);
  return item;
}

export async function queuePayment(officeId: string, input: { caseId: string; amount: number; date: string; note?: string }) {
  const item = await enqueueOperation({
    officeId,
    entityType: "payments",
    entityId: input.caseId,
    operation: "insert",
    baseUpdatedAt: null,
    payload: { amount: input.amount, date: input.date, note: input.note ?? "" },
  });
  await syncPendingOperations(officeId);
  return item;
}
