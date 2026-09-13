import AsyncStorage from "@react-native-async-storage/async-storage";

export type OfflineEntity = "sessions" | "tasks" | "expenses" | "fees" | "payments" | "financial_transactions";
export type OfflineOperation = "insert" | "update";
export type OutboxStatus = "pending" | "conflict" | "error";

export type OutboxItem = {
  operationId: string;
  officeId: string;
  entityType: OfflineEntity;
  entityId: string;
  operation: OfflineOperation;
  payload: Record<string, unknown>;
  baseUpdatedAt: string | null;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
};

const OUTBOX_KEY = "qayd-office:outbox";
const CACHE_KEY = "qayd-office:cache";

export function makeOfflineId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function readOutbox() { return JSON.parse((await AsyncStorage.getItem(OUTBOX_KEY)) || "[]") as OutboxItem[]; }
async function writeOutbox(items: OutboxItem[]) { await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(items)); }

export async function enqueueOperation(input: Omit<OutboxItem, "operationId" | "status" | "attempts" | "lastError" | "createdAt">) {
  const item: OutboxItem = { ...input, operationId: makeOfflineId(), status: "pending", attempts: 0, lastError: null, createdAt: new Date().toISOString() };
  const items = await readOutbox();
  items.push(item);
  await writeOutbox(items);
  return item;
}

export async function listPendingOperations(officeId?: string) {
  const items = await readOutbox();
  return items.filter((item) => (!officeId || item.officeId === officeId) && item.status === "pending");
}

export async function updateOperation(operationId: string, patch: Partial<Pick<OutboxItem, "status" | "attempts" | "lastError">>) {
  const items = await readOutbox();
  const item = items.find((entry) => entry.operationId === operationId);
  if (item) Object.assign(item, patch);
  await writeOutbox(items);
}

export async function removeOperation(operationId: string) {
  await writeOutbox((await readOutbox()).filter((item) => item.operationId !== operationId));
}

export async function cacheJson<T>(key: string, value: T) {
  const cache = JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) || "{}") as Record<string, unknown>;
  cache[key] = value;
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export async function readCachedJson<T>(key: string): Promise<T | null> {
  const cache = JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) || "{}") as Record<string, unknown>;
  return (cache[key] as T | undefined) ?? null;
}

export async function clearOfflineData() {
  await AsyncStorage.multiRemove([OUTBOX_KEY, CACHE_KEY]);
}
