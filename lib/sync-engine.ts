import { supabase } from "@/lib/supabase";
import {
  listPendingOperations,
  removeOperation,
  updateOperation,
  type OutboxItem,
} from "@/lib/offline-store";

let activeSync: Promise<SyncSummary> | null = null;

export type SyncSummary = {
  synced: number;
  conflicts: number;
  failed: number;
  pending: number;
};

async function online() {
  try {
    const Network = await import("expo-network");
    const state = await Network.getNetworkStateAsync();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return true;
  }
}

async function push(item: OutboxItem) {
  const { data, error } = await supabase.rpc("apply_mobile_operation", {
    p_operation_id: item.operationId,
    p_office_id: item.officeId,
    p_entity_type: item.entityType,
    p_entity_id: item.entityId,
    p_operation: item.operation,
    p_payload: item.payload,
    p_base_updated_at: item.baseUpdatedAt,
  });
  if (error) throw error;
  return data as { status?: string; error?: string };
}

export async function syncPendingOperations(officeId?: string): Promise<SyncSummary> {
  if (activeSync) return activeSync;
  activeSync = (async () => {
    if (!(await online())) return { synced: 0, conflicts: 0, failed: 0, pending: (await listPendingOperations(officeId)).length };
    const items = await listPendingOperations(officeId);
    let synced = 0;
    let conflicts = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await updateOperation(item.operationId, { attempts: item.attempts + 1, lastError: null });
        const result = await push(item);
        if (result.status === "conflict") {
          conflicts += 1;
          await updateOperation(item.operationId, { status: "conflict", lastError: result.error || "تعارض مع تعديل أحدث على الخادم" });
        } else if (result.status === "rejected") {
          failed += 1;
          await updateOperation(item.operationId, { status: "error", lastError: result.error || "رفض الخادم العملية" });
        } else {
          synced += 1;
          await removeOperation(item.operationId);
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : "تعذر الاتصال بالخادم";
        // Keep the item pending so it is retried automatically when connectivity returns.
        await updateOperation(item.operationId, { lastError: message });
      }
    }

    return { synced, conflicts, failed, pending: (await listPendingOperations(officeId)).length };
  })();

  try {
    return await activeSync;
  } finally {
    activeSync = null;
  }
}
