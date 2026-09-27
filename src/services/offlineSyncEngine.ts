import { createCoreOrder } from './quickbiteDataApi';
import {
  isOfflineStorageAvailable,
  listPendingSyncOperations,
  removeSyncOperation,
  updateSyncOperation,
  type PendingSyncOperation,
} from './offlineSyncStore';

let syncRunning = false;

async function execute(item: PendingSyncOperation) {
  await updateSyncOperation({ ...item, status: 'syncing', attempts: item.attempts + 1 });
  try {
    if (item.type === 'create_order') {
      await createCoreOrder(item.payload as Parameters<typeof createCoreOrder>[0]);
    }
    await removeSyncOperation(item.id);
  } catch (error) {
    await updateSyncOperation({
      ...item,
      status: 'failed',
      attempts: item.attempts + 1,
      lastError: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function syncPendingOperations() {
  if (syncRunning || !isOfflineStorageAvailable() || !navigator.onLine) return;
  syncRunning = true;
  try {
    const pending = await listPendingSyncOperations();
    for (const item of pending) {
      await execute(item);
    }
  } finally {
    syncRunning = false;
  }
}

export function startOfflineSync() {
  if (typeof window === 'undefined') return () => undefined;
  const run = () => void syncPendingOperations();
  window.addEventListener('online', run);
  run();
  return () => window.removeEventListener('online', run);
}
