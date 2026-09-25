import { supabase } from "@/lib/supabase";
import { listPendingOperations, removeOperation, updateOperation, type OutboxItem } from "@/lib/offline-store";

let activeSync: Promise<SyncSummary> | null = null;
export type SyncSummary = { synced: number; conflicts: number; failed: number; pending: number };
async function online() { try { const Network = await import("expo-network"); const state = await Network.getNetworkStateAsync(); return Boolean(state.isConnected && state.isInternetReachable !== false); } catch { return true; } }

function approvalAction(operation: string): "create" | "update" | "delete" | "reschedule" | "archive" {
  if (operation === "update" || operation === "delete" || operation === "reschedule" || operation === "archive") return operation;
  return "create";
}

/**
 * يربط نوع الكيان المحلي (بصيغة الجمع) بالاسم المفرد المتوقّع في قيد قاعدة البيانات
 * وفي مركز اعتماد المالك (reviewTableMap).
 * كان الخلل السابق يرسل "sessions"/"tasks"/"fees"/"payments" فتخالف قيد approval_requests_entity_type_check.
 */
const ENTITY_TYPE_MAP: Record<string, string> = {
  sessions: "session",
  tasks: "task",
  fees: "fee",
  payments: "payment",
  expenses: "expense",
  financial_transactions: "financial_transaction",
  legal_files: "legal_file",
  service_actions: "service_action",
  proceedings: "proceeding",
  cases: "case",
  notes: "note",
};

export function approvalEntityType(entityType: string) {
  return ENTITY_TYPE_MAP[entityType] ?? entityType;
}

async function push(item: OutboxItem) {
  // سياسة المكتب الجديدة: لا يكتب الهاتف في الجداول التشغيلية مباشرة.
  // كل جلسة/مهمة/قضية/ملاحظة/ملف/أتعاب/دفعة/مصروف/نفقة تصبح طلباً يراجعه المالك.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول لإرسال طلب الاعتماد");

  const baseRow = {
    id: item.operationId,
    office_id: item.officeId,
    requested_by: user.id,
    entity_type: approvalEntityType(item.entityType),
    entity_id: item.entityId,
    action: approvalAction(item.operation),
    payload: item.payload,
    base_updated_at: item.baseUpdatedAt,
    reason: (item.payload as Record<string, unknown>).reason ?? "طلب مقدم من تطبيق الهاتف",
    status: "pending",
  };

  const attachment = item.attachment ?? null;
  if (attachment) {
    // نحاول إرفاق الصورة في عمود attachment_url إن وُجد.
    const { error } = await supabase.from("approval_requests").upsert({ ...baseRow, attachment_url: attachment }, { onConflict: "id" });
    if (!error) return { status: "applied" };
    // إذا لم يكن العمود موجوداً بعد (لم يُنفّذ الترحيل)، نُعيد المحاولة دون المرفق.
    const { error: retryError } = await supabase.from("approval_requests").upsert(
      { ...baseRow, reason: `${baseRow.reason} · مرفق صورة رول` },
      { onConflict: "id" },
    );
    if (retryError) throw retryError;
    return { status: "applied" };
  }

  const { error } = await supabase.from("approval_requests").upsert(baseRow, { onConflict: "id" });
  if (error) throw error;
  return { status: "applied" };
}

export async function syncPendingOperations(officeId?: string): Promise<SyncSummary> {
  if (activeSync) return activeSync;
  activeSync = (async () => {
    if (!(await online())) return { synced: 0, conflicts: 0, failed: 0, pending: (await listPendingOperations(officeId)).length };
    const items = await listPendingOperations(officeId); let synced = 0, conflicts = 0, failed = 0;
    for (const item of items) try {
      await updateOperation(item.operationId, { attempts: item.attempts + 1, lastError: null });
      const result = await push(item);
      if (result.status === "conflict") {
        conflicts++;
        await updateOperation(item.operationId, { status: "conflict", lastError: "طلب الاعتماد تعارض مع عملية أخرى" });
      } else if (result.status === "rejected") {
        failed++;
        await updateOperation(item.operationId, { status: "error", lastError: "رفض الخادم طلب الاعتماد" });
      } else {
        synced++;
        await removeOperation(item.operationId);
      }
    } catch (error) {
      failed++;
      await updateOperation(item.operationId, { lastError: error instanceof Error ? error.message : "تعذر إرسال طلب الاعتماد" });
    }
    return { synced, conflicts, failed, pending: (await listPendingOperations(officeId)).length };
  })();
  try { return await activeSync; } finally { activeSync = null; }
}
