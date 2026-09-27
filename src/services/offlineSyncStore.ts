export type SyncOperationType = 'create_order';

export type SyncOperationStatus = 'pending' | 'syncing' | 'failed' | 'completed';

export interface PendingSyncOperation {
  id: string;
  type: SyncOperationType;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  status: SyncOperationStatus;
  lastError?: string;
}

const DB_NAME = 'quickbite-offline';
const DB_VERSION = 1;
const STORE = 'sync_operations';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir la base local.'));
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Error en almacenamiento local.'));
    tx.onabort = () => reject(tx.error ?? new Error('Transacción local cancelada.'));
  });
}

export function isOfflineStorageAvailable() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

export async function enqueueSyncOperation(
  operation: Omit<PendingSyncOperation, 'id' | 'createdAt' | 'attempts' | 'status'>,
) {
  const item: PendingSyncOperation = {
    ...operation,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
  };
  await transaction('readwrite', (store) => store.put(item));
  return item;
}

export async function listPendingSyncOperations() {
  const db = await openDb();
  return new Promise<PendingSyncOperation[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).index('status').getAll('pending');
    request.onsuccess = () => resolve((request.result as PendingSyncOperation[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    request.onerror = () => reject(request.error ?? new Error('No se pudo leer la cola local.'));
  });
}

export async function updateSyncOperation(item: PendingSyncOperation) {
  await transaction('readwrite', (store) => store.put(item));
}

export async function removeSyncOperation(id: string) {
  await transaction('readwrite', (store) => store.delete(id));
}
