import { Platform } from "react-native";

export type OfflineEntity = "sessions" | "tasks" | "expenses" | "fees" | "payments";
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

let databasePromise: Promise<any> | null = null;
const memoryOutbox: OutboxItem[] = [];
const memoryCache = new Map<string, string>();

export function makeOfflineId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function database() {
  if (Platform.OS === "web") return null;
  if (!databasePromise) {
    databasePromise = import("expo-sqlite").then(async ({ openDatabaseAsync }) => {
      const db = await openDatabaseAsync("qayd-office.sqlite");
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS outbox (
          operation_id TEXT PRIMARY KEY NOT NULL,
          office_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          payload TEXT NOT NULL,
          base_updated_at TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS outbox_status_idx ON outbox(status, created_at);
        CREATE TABLE IF NOT EXISTS cache (
          cache_key TEXT PRIMARY KEY NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return databasePromise;
}

export async function enqueueOperation(input: Omit<OutboxItem, "operationId" | "status" | "attempts" | "lastError" | "createdAt">) {
  const item: OutboxItem = {
    ...input,
    operationId: makeOfflineId(),
    status: "pending",
    attempts: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
  };
  const db = await database();
  if (!db) {
    memoryOutbox.push(item);
    return item;
  }
  await db.runAsync(
    `INSERT INTO outbox (operation_id, office_id, entity_type, entity_id, operation, payload, base_updated_at, status, attempts, last_error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    item.operationId, item.officeId, item.entityType, item.entityId, item.operation,
    JSON.stringify(item.payload), item.baseUpdatedAt, item.status, item.attempts, item.lastError, item.createdAt,
  );
  return item;
}

export async function listPendingOperations(officeId?: string) {
  const db = await database();
  if (!db) return memoryOutbox.filter((item) => (!officeId || item.officeId === officeId) && item.status === "pending");
  const rows = await db.getAllAsync(
    `SELECT operation_id, office_id, entity_type, entity_id, operation, payload, base_updated_at, status, attempts, last_error, created_at FROM outbox WHERE status = 'pending' ${officeId ? "AND office_id = ?" : ""} ORDER BY created_at ASC`,
    ...(officeId ? [officeId] : []),
  );
  return (rows as Array<Record<string, any>>).map((row) => ({
    operationId: row.operation_id,
    officeId: row.office_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation,
    payload: JSON.parse(row.payload),
    baseUpdatedAt: row.base_updated_at,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error,
    createdAt: row.created_at,
  })) as OutboxItem[];
}

export async function updateOperation(operationId: string, patch: Partial<Pick<OutboxItem, "status" | "attempts" | "lastError">>) {
  const db = await database();
  if (!db) {
    const item = memoryOutbox.find((entry) => entry.operationId === operationId);
    if (item) Object.assign(item, patch);
    return;
  }
  await db.runAsync(
    `UPDATE outbox SET status = COALESCE(?, status), attempts = COALESCE(?, attempts), last_error = COALESCE(?, last_error) WHERE operation_id = ?`,
    patch.status ?? null, patch.attempts ?? null, patch.lastError ?? null, operationId,
  );
}

export async function removeOperation(operationId: string) {
  const db = await database();
  if (!db) {
    const index = memoryOutbox.findIndex((entry) => entry.operationId === operationId);
    if (index >= 0) memoryOutbox.splice(index, 1);
    return;
  }
  await db.runAsync("DELETE FROM outbox WHERE operation_id = ?", operationId);
}

export async function cacheJson<T>(key: string, value: T) {
  const payload = JSON.stringify(value);
  const db = await database();
  if (!db) {
    memoryCache.set(key, payload);
    return;
  }
  await db.runAsync(
    "INSERT INTO cache (cache_key, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at",
    key, payload, new Date().toISOString(),
  );
}

export async function readCachedJson<T>(key: string): Promise<T | null> {
  const db = await database();
  if (!db) {
    const payload = memoryCache.get(key);
    return payload ? JSON.parse(payload) as T : null;
  }
  const row = await db.getFirstAsync("SELECT payload FROM cache WHERE cache_key = ?", key) as { payload: string } | null;
  return row ? JSON.parse(row.payload) as T : null;
}

export async function clearOfflineData() {
  const db = await database();
  if (!db) {
    memoryOutbox.splice(0, memoryOutbox.length);
    memoryCache.clear();
    return;
  }
  await db.execAsync("DELETE FROM outbox; DELETE FROM cache;");
}
