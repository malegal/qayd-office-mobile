import { supabase } from "@/lib/supabase";
import { listPendingOperations, removeOperation, updateOperation, type OutboxItem } from "@/lib/offline-store";

let activeSync: Promise<SyncSummary> | null = null;
export type SyncSummary = { synced: number; conflicts: number; failed: number; pending: number };
async function online() { try { const Network = await import("expo-network"); const state = await Network.getNetworkStateAsync(); return Boolean(state.isConnected && state.isInternetReachable !== false); } catch { return true; } }

async function push(item: OutboxItem) {
  // العمليات المالية الجديدة تستخدم الجدول الموحد مباشرة مع RLS؛ بقية الكيانات تستخدم RPC التوافقية.
  if (item.entityType === "approval_requests") {
    const { error } = await supabase.from("approval_requests").upsert({ id: item.entityId, ...item.payload, office_id: item.officeId }, { onConflict: "id" });
    if (error) throw error;
    return { status: "applied" };
  }
  if (item.entityType === "financial_transactions") {
    const { error } = await supabase.from("financial_transactions").upsert({ id: item.entityId, ...item.payload, office_id: item.officeId }, { onConflict: "id" });
    if (error) throw error;
    return { status: "applied" };
  }
  if (item.entityType === "fees") {
    const { error } = await supabase.from("fees").upsert({ case_id: item.entityId, ...item.payload }, { onConflict: "case_id" });
    if (error) throw error;
    return { status: "applied" };
  }
  const { data, error } = await supabase.rpc("apply_mobile_operation", {
    p_operation_id: item.operationId, p_office_id: item.officeId, p_entity_type: item.entityType,
    p_entity_id: item.entityId, p_operation: item.operation, p_payload: item.payload, p_base_updated_at: item.baseUpdatedAt,
  });
  if (error) throw error;
  return data as { status?: string; error?: string };
}

export async function syncPendingOperations(officeId?: string): Promise<SyncSummary> {
  if (activeSync) return activeSync;
  activeSync = (async () => {
    if (!(await online())) return { synced: 0, conflicts: 0, failed: 0, pending: (await listPendingOperations(officeId)).length };
    const items = await listPendingOperations(officeId); let synced = 0, conflicts = 0, failed = 0;
    for (const item of items) try {
      await updateOperation(item.operationId, { attempts: item.attempts + 1, lastError: null });
      const result = await push(item);
      if (result.status === "conflict") { conflicts++; await updateOperation(item.operationId, { status: "conflict", lastError: result.error || "تعارض مع تعديل أحدث" }); }
      else if (result.status === "rejected") { failed++; await updateOperation(item.operationId, { status: "error", lastError: result.error || "رفض الخادم العملية" }); }
      else { synced++; await removeOperation(item.operationId); }
    } catch (error) { failed++; await updateOperation(item.operationId, { lastError: error instanceof Error ? error.message : "تعذر الاتصال بالخادم" }); }
    return { synced, conflicts, failed, pending: (await listPendingOperations(officeId)).length };
  })();
  try { return await activeSync; } finally { activeSync = null; }
}
